"""
Orders APIs: Create, Retrieve, Update, Cancel
"""
import datetime
import json
import random
import shutil
import string
import uuid
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, Query, status
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from api.auth import get_current_user
from api.rewards import (
    create_generated_voucher,
    get_voucher_config,
    get_voucher_expiry,
    resolve_active_voucher,
)
from database import get_db
from config import (
    TAX_RATE,
    FREE_SHIPPING_THRESHOLD,
    STANDARD_SHIPPING_FEE,
    FRESHNESS_REFUND_RATE,
    FRESHNESS_REWARD_CORRECT_BONUS,
    FRESHNESS_REWARD_INCORRECT_BONUS,
    SPOILED_AI_LABELS,
    BAD_MANUAL_RATINGS,
)
from models import PaymentStatus, ComplaintType, ComplaintResolutionStatus
from utils.freshness import (
    FRESHNESS_REWARD_POINTS,
    annotate_order_freshness_state,
    annotate_orders_freshness_state_batch,
    create_user_notification,
    get_freshness_expiry,
)
from utils.inventory import apply_stock_delta
from utils.file_validation import validate_image_upload, ALLOWED_IMAGE_EXTENSIONS

router = APIRouter(prefix="/orders", tags=["Orders"])
FRESHNESS_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "freshness_reviews"
ALLOWED_FRESHNESS_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def generate_order_number() -> str:
    """Generate unique order number"""
    prefix = "ORD"
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{timestamp}-{random_suffix}"

def ensure_customer_can_order(current_user: models.User) -> None:
    """Compatibility hook kept for older imports."""
    return None


def ensure_freshness_upload_dir():
    FRESHNESS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def build_order_page_meta(page: int, limit: int, total: int) -> tuple[int, int, bool]:
    total_pages = max(1, (total + limit - 1) // limit)
    safe_page = min(page, total_pages) if total else 1
    has_next = safe_page < total_pages
    return safe_page, total_pages, has_next


async def save_freshness_review_image_async(image_file: UploadFile) -> str:
    """[H2] Validate (extension + magic bytes + size) rồi lưu file."""
    content = await validate_image_upload(image_file, allowed_extensions=ALLOWED_FRESHNESS_IMAGE_EXTENSIONS)
    extension = Path(image_file.filename).suffix.lower()
    ensure_freshness_upload_dir()
    file_name = f"{uuid.uuid4().hex}{extension}"
    output_path = FRESHNESS_UPLOAD_DIR / file_name
    output_path.write_bytes(content)
    return f"/uploads/freshness_reviews/{file_name}"


def save_freshness_review_image(image_file: UploadFile) -> str:
    """Sync wrapper — chỉ kiểm tra extension (dùng khi không có async context)."""
    if not image_file.filename:
        raise HTTPException(status_code=400, detail="Ảnh xác nhận không hợp lệ")

    extension = Path(image_file.filename).suffix.lower()
    if extension not in ALLOWED_FRESHNESS_IMAGE_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_FRESHNESS_IMAGE_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"Định dạng ảnh không được hỗ trợ. Chỉ nhận: {allowed}")

    ensure_freshness_upload_dir()
    file_name = f"{uuid.uuid4().hex}{extension}"
    output_path = FRESHNESS_UPLOAD_DIR / file_name
    with output_path.open("wb") as file_stream:
        shutil.copyfileobj(image_file.file, file_stream)
    return f"/uploads/freshness_reviews/{file_name}"


def resolve_optional_freshness_image(form_data, image_field: Optional[str]) -> str:
    if not image_field:
        return ""

    upload = form_data.get(image_field)
    if not upload or not hasattr(upload, "filename") or not getattr(upload, "filename", ""):
        return ""

    return save_freshness_review_image(upload)


def get_user_order_with_items(db: Session, order_id: int, user_id: int) -> Optional[models.Order]:
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(
            models.Order.id == order_id,
            models.Order.user_id == user_id,
        )
        .first()
    )


def serialize_freshness_review(review: models.FreshnessReview) -> schemas.FreshnessReviewResponse:
    return schemas.FreshnessReviewResponse.model_validate(review, from_attributes=True)


def normalize_prediction_result(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized not in {"fresh", "spoiled"}:
        raise HTTPException(status_code=400, detail="Kết quả AI phải là fresh hoặc spoiled")
    return normalized


def derive_freshness_score(predicted_result: str, confidence: float) -> int:
    confidence_pct = max(0, min(100, int(round(float(confidence or 0) * 100))))
    if predicted_result == "fresh":
        return max(60, confidence_pct)
    return min(40, confidence_pct)


def build_freshness_voucher_response(voucher: models.GeneratedVoucher | None) -> schemas.FreshnessVoucherResponse | None:
    if voucher is None:
        return None

    config = get_voucher_config(voucher.reason)
    return schemas.FreshnessVoucherResponse(
        id=voucher.id,
        code=voucher.code,
        title=voucher.title,
        reason=voucher.reason,
        discount_percent=Decimal(config.get("discount_percent") or 0),
        discount_amount=Decimal("0"),
        expires_at=get_voucher_expiry(voucher.created_at),
        created_at=voucher.created_at,
    )


def submit_structured_freshness_confirmation(
    *,
    db: Session,
    order: models.Order,
    current_user: models.User,
    form_data,
    payload: schemas.FreshnessConfirmationSubmitPayload,
):
    order_items_by_id = {item.id: item for item in order.items}
    if len(payload.reviews) != len(order.items):
        raise HTTPException(status_code=400, detail="Cần upload đủ ảnh và xác nhận cho từng sản phẩm trong đơn")

    seen_item_ids = set()
    created_reviews: List[models.FreshnessReview] = []
    spoiled_review_found = False
    incorrect_prediction_found = False

    for review_payload in payload.reviews:
        order_item = order_items_by_id.get(review_payload.order_item_id)
        if not order_item:
            raise HTTPException(status_code=400, detail="Mục đơn hàng không thuộc đơn hàng này")
        if order_item.product_id != review_payload.product_id:
            raise HTTPException(status_code=400, detail="Sản phẩm xác nhận không khớp với đơn hàng")
        if order_item.id in seen_item_ids:
            raise HTTPException(status_code=400, detail="Mỗi order item chỉ được xác nhận một lần")
        seen_item_ids.add(order_item.id)

        upload = form_data.get(review_payload.image_field)
        if not upload or not hasattr(upload, "filename") or not getattr(upload, "filename", ""):
            raise HTTPException(status_code=400, detail="Vui lòng tải ảnh cho từng sản phẩm")

        predicted_result = normalize_prediction_result(review_payload.predicted_result)
        correct_label = review_payload.correct_label or review_payload.predicted_label
        correct_result = normalize_prediction_result(review_payload.correct_result or review_payload.predicted_result)

        if not review_payload.is_prediction_correct and not review_payload.correct_label:
            raise HTTPException(status_code=400, detail="Khi chọn AI đoán sai, bạn phải cung cấp nhãn đúng")

        if review_payload.is_prediction_correct:
            correct_label = review_payload.predicted_label
            correct_result = predicted_result

        image_url = save_freshness_review_image(upload)
        spoiled_review_found = spoiled_review_found or correct_result == "spoiled"
        incorrect_prediction_found = incorrect_prediction_found or not review_payload.is_prediction_correct

        review = models.FreshnessReview(
            order_id=order.id,
            order_item_id=order_item.id,
            user_id=current_user.id,
            product_id=order_item.product_id,
            image_url=image_url,
            ai_label=predicted_result,
            ai_confidence=review_payload.confidence,
            freshness_score=derive_freshness_score(predicted_result, review_payload.confidence),
            predicted_label=review_payload.predicted_label,
            predicted_result=predicted_result,
            is_prediction_correct=review_payload.is_prediction_correct,
            correct_label=correct_label,
            correct_result=correct_result,
            reward_points=0,
            manual_rating="spoiled" if correct_result == "spoiled" else "good",
            manual_note=review_payload.manual_note,
            is_public=review_payload.is_public,
        )
        db.add(review)
        created_reviews.append(review)

    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Đơn hàng này đã được xác nhận độ tươi trước đó",
        ) from exc

    awarded_points = FRESHNESS_REWARD_POINTS + (
        FRESHNESS_REWARD_INCORRECT_BONUS if incorrect_prediction_found else FRESHNESS_REWARD_CORRECT_BONUS
    )

    voucher = None
    if spoiled_review_found:
        voucher = create_generated_voucher(
            db,
            user_id=current_user.id,
            reason="freshness_spoiled_confirmation",
            source_order_id=order.id,
        )

    for review in created_reviews:
        review.reward_points = awarded_points
        if voucher is not None:
            review.voucher_id = voucher.id

    db.execute(
        update(models.User)
        .where(models.User.id == current_user.id)
        .values(
            loyalty_points=func.coalesce(models.User.loyalty_points, 0) + awarded_points
        )
    )
    create_user_notification(
        db,
        user_id=current_user.id,
        title="Nhận điểm thưởng xác nhận độ tươi",
        message=f"Bạn vừa nhận được {awarded_points} điểm sau khi xác nhận đơn hàng #{order.order_number}.",
        notification_type="loyalty_reward",
        order_id=order.id,
    )
    if voucher is not None:
        create_user_notification(
            db,
            user_id=current_user.id,
            title="Voucher xin lỗi đã sẵn sàng",
            message=f"Đơn hàng #{order.order_number} có mục hư hỏng. Voucher {voucher.code} đã được tạo cho bạn.",
            notification_type="freshness_voucher",
            order_id=order.id,
        )

    db.commit()
    for review in created_reviews:
        db.refresh(review)
    db.refresh(current_user)
    if voucher is not None:
        db.refresh(voucher)

    return {
        "success": True,
        "message": "Đã ghi nhận xác nhận độ tươi thành công",
        "awarded_points": awarded_points,
        "loyalty_points": int(current_user.loyalty_points or 0),
        "all_predictions_correct": not incorrect_prediction_found,
        "complaint_available": spoiled_review_found,
        "thank_you_message": (
            "Cảm ơn bạn đã giúp chúng tôi phát hiện lỗi của hệ thống AI. Dữ liệu của bạn sẽ giúp cải thiện chất lượng nhận diện trong tương lai."
            if incorrect_prediction_found
            else None
        ),
        "voucher": build_freshness_voucher_response(voucher),
        "reviews": [serialize_freshness_review(review) for review in created_reviews],
    }


def ensure_freshness_confirmation_is_available(
    db: Session,
    order: models.Order,
    user_id: int,
) -> models.Order:
    annotate_order_freshness_state(db, order, user_id)
    if order.status != models.OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Chỉ đơn hàng đã giao mới được xác nhận độ tươi")
    if order.freshness_confirmation_completed:
        raise HTTPException(status_code=400, detail="Đơn hàng này đã được xác nhận độ tươi trước đó")
    if order.freshness_confirmation_expired:
        raise HTTPException(status_code=400, detail="Đã quá 24 giờ nên không thể xác nhận độ tươi nữa")
    return order

# ============ ORDER ENDPOINTS ============

@router.post("", response_model=schemas.OrderDetail)
def create_order(
    order_create: schemas.OrderCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create new order
    
    **Request:**
    - items: Array of {product_id, quantity}
    - shipping_address: Delivery address
    - shipping_city: City
    - shipping_phone: Phone number
    - payment_method: "cod", "card", "bank_transfer"
    - notes: Optional order notes
    
    **Returns:** Created order with details
    """
    
    ensure_customer_can_order(current_user)

    if not order_create.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn hàng phải có ít nhất một sản phẩm"
        )
    
    # Calculate totals and fetch products
    subtotal = Decimal("0")
    order_items = []
    order_number = generate_order_number()
    
    for item in order_create.items:
        # Kiểm tra sản phẩm tồn tại trước
        product = db.query(models.Product).filter(
            models.Product.id == item.product_id,
            models.Product.is_active == True
        ).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy sản phẩm {item.product_id}"
            )

        # [C7] Atomic stock deduction — UPDATE với WHERE quantity >= requested
        # Tránh race condition: nếu hai request đồng thời, chỉ một sẽ thành công
        new_quantity = int(product.quantity or 0) - item.quantity
        result = db.execute(
            update(models.Product)
            .where(
                models.Product.id == item.product_id,
                models.Product.is_active == True,
                models.Product.quantity >= item.quantity,
            )
            .values(
                quantity=models.Product.quantity - item.quantity,
                stock_status="in_stock" if new_quantity > 0 else "out_of_stock",
            )
        )

        if result.rowcount == 0:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tồn kho không đủ cho sản phẩm {product.name}"
            )

        # Reload product sau update để lấy state mới nhất
        db.refresh(product)

        # Calculate item subtotal
        item_subtotal = product.price * item.quantity
        subtotal += item_subtotal

        # Create order item
        order_item = models.OrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_purchase=product.price,
            subtotal=item_subtotal
        )
        order_items.append(order_item)

        # Ghi stock transaction log (không cần apply_stock_delta vì đã deduct ở trên)
        from utils.inventory import record_stock_transaction
        record_stock_transaction(
            db=db,
            product=product,
            user_id=current_user.id,
            transaction_type=models.TransactionType.EXPORT,
            quantity=item.quantity,
            note=f"Xuất kho do đơn hàng {order_number}",
        )
    
    # Calculate taxes, voucher discount and points discount
    tax = subtotal * TAX_RATE
    shipping_fee = STANDARD_SHIPPING_FEE if subtotal < FREE_SHIPPING_THRESHOLD else Decimal("0")
    total_before_discount = subtotal + tax + shipping_fee

    voucher = None
    voucher_discount = Decimal("0")
    if order_create.voucher_code:
        voucher, voucher_discount = resolve_active_voucher(
            db,
            user_id=current_user.id,
            voucher_code=order_create.voucher_code,
            order_total=total_before_discount,
        )

    remaining_after_voucher = max(Decimal("0"), total_before_discount - voucher_discount)
    requested_points = int(order_create.points_to_redeem or 0)
    available_points = int(current_user.loyalty_points or 0)
    if requested_points > available_points:
        raise HTTPException(status_code=400, detail="Số điểm sử dụng vượt quá số điểm hiện có")

    max_points_by_total = int(remaining_after_voucher.quantize(Decimal("1.")))
    if requested_points > max_points_by_total:
        raise HTTPException(status_code=400, detail="Số điểm sử dụng vượt quá giá trị đơn hàng")

    points_redeemed = requested_points
    total_discount = voucher_discount + Decimal(points_redeemed)
    total = max(Decimal("0"), total_before_discount - total_discount)
    
    # Create order
    db_order = models.Order(
        order_number=order_number,
        user_id=current_user.id,
        subtotal=subtotal,
        tax=tax,
        shipping_fee=shipping_fee,
        discount=total_discount,
        total=total,
        shipping_address=order_create.shipping_address,
        shipping_city=order_create.shipping_city,
        shipping_phone=order_create.shipping_phone,
        payment_method=order_create.payment_method,
        payment_status=PaymentStatus.PENDING,
        status=models.OrderStatus.PENDING,
        voucher_code=voucher.code if voucher else None,
        points_redeemed=points_redeemed,
        notes=order_create.notes
    )
    
    db_order.items = order_items
    if points_redeemed > 0:
        current_user.loyalty_points = int(current_user.loyalty_points or 0) - points_redeemed
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    db.refresh(current_user)
    
    return schemas.OrderDetail(
        id=db_order.id,
        order_number=db_order.order_number,
        user_id=db_order.user_id,
        subtotal=db_order.subtotal,
        tax=db_order.tax,
        shipping_fee=db_order.shipping_fee,
        discount=db_order.discount,
        total=db_order.total,
        status=db_order.status.value,
        payment_method=db_order.payment_method,
        payment_status=db_order.payment_status,
        voucher_code=db_order.voucher_code,
        points_redeemed=int(db_order.points_redeemed or 0),
        created_at=db_order.created_at,
        shipped_at=db_order.shipped_at,
        delivered_at=db_order.delivered_at,
        owner=schemas.UserBase(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            full_name=current_user.full_name,
            role=current_user.role.value,
            is_active=current_user.is_active,
            created_at=current_user.created_at,
            loyalty_points=int(current_user.loyalty_points or 0),
            voucher_balance=current_user.voucher_balance,
        ),
        items=[schemas.OrderItemDetail(
            id=item.id,
            product_id=item.product_id,
            product=db.query(models.Product).filter(models.Product.id == item.product_id).first(),
            quantity=item.quantity,
            price_at_purchase=item.price_at_purchase,
            subtotal=item.subtotal
        ) for item in db_order.items],
        notes=db_order.notes
    )

@router.get("", response_model=List[schemas.Order])
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List current user's orders
    
    **Filters:**
    - status: Filter by order status (pending, confirmed, shipped, delivered, cancelled)
    """
    
    ensure_customer_can_order(current_user)

    query = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.user_id == current_user.id)
    )
    
    if status:
        query = query.filter(models.Order.status == status)
    
    orders = query.order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()
    # [H7] Batch annotate — 1 query duy nhất thay vì N queries
    annotate_orders_freshness_state_batch(db, orders, current_user.id)
    return orders


@router.get("/paginated", response_model=schemas.UserOrderListResponse)
def list_orders_paginated(
    page: int = Query(1, ge=1),
    limit: int = Query(6, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.user_id == current_user.id)
    )

    if status:
        query = query.filter(models.Order.status == status)

    total = query.count()
    safe_page, total_pages, has_next = build_order_page_meta(page, limit, total)

    status_rows = (
        query.with_entities(models.Order.status, func.count(models.Order.id))
        .group_by(models.Order.status)
        .all()
    )
    status_counts = {order_status.value: 0 for order_status in models.OrderStatus}
    for order_status_value, count in status_rows:
        key = order_status_value.value if hasattr(order_status_value, "value") else str(order_status_value)
        status_counts[key] = count

    items = (
        query.order_by(models.Order.created_at.desc(), models.Order.id.desc())
        .offset((safe_page - 1) * limit)
        .limit(limit)
        .all()
    )
    annotate_orders_freshness_state_batch(db, items, current_user.id)

    return {
        "items": items,
        "total": total,
        "page": safe_page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": has_next,
        "status_counts": status_counts,
    }

@router.get("/{order_id}", response_model=schemas.OrderDetail)
def get_order(
    order_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order details by ID"""
    ensure_customer_can_order(current_user)
    
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(
            models.Order.id == order_id,
            models.Order.user_id == current_user.id
        )
        .first()
    )
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn hàng"
        )
    annotate_order_freshness_state(db, order, current_user.id)
    return order

@router.put("/{order_id}", response_model=schemas.OrderDetail)
def update_order(
    order_id: int,
    order_update: schemas.OrderUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update order (user can only update notes before confirmation)
    """
    
    ensure_customer_can_order(current_user)

    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn hàng"
        )
    
    # Only allow certain updates based on status
    if order.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể chỉnh sửa đơn hàng đang chờ xác nhận"
        )
    
    editable_fields = [
        "shipping_address",
        "shipping_city",
        "shipping_phone",
        "payment_method",
        "notes",
    ]
    for field in editable_fields:
        value = getattr(order_update, field, None)
        if value is not None:
            setattr(order, field, value)
    
    order.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(order)
    annotate_order_freshness_state(db, order, current_user.id)
    return order


@router.get("/{order_id}/freshness-confirmation", response_model=schemas.FreshnessConfirmationEligibilityResponse)
def get_freshness_confirmation_eligibility(
    order_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_customer_can_order(current_user)

    order = get_user_order_with_items(db, order_id, current_user.id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đơn hàng")

    annotate_order_freshness_state(db, order, current_user.id)
    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "delivered_at": order.delivered_at,
        "expires_at": order.freshness_confirmation_expires_at,
        "is_available": order.freshness_confirmation_available,
        "is_expired": order.freshness_confirmation_expired,
        "already_confirmed": order.freshness_confirmation_completed,
        "reward_points": FRESHNESS_REWARD_POINTS,
        "correct_bonus_points": FRESHNESS_REWARD_CORRECT_BONUS,
        "incorrect_bonus_points": FRESHNESS_REWARD_INCORRECT_BONUS,
        "items": order.items,
    }


@router.post("/{order_id}/freshness-confirmation", response_model=schemas.FreshnessConfirmationSubmitResponse)
async def submit_freshness_confirmation(
    order_id: int,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_customer_can_order(current_user)

    order = get_user_order_with_items(db, order_id, current_user.id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đơn hàng")

    ensure_freshness_confirmation_is_available(db, order, current_user.id)

    form_data = await request.form()
    raw_payload = form_data.get("payload")
    if not raw_payload:
        raise HTTPException(status_code=400, detail="Thiếu payload xác nhận độ tươi")

    try:
        payload = schemas.FreshnessConfirmationSubmitPayload.model_validate_json(str(raw_payload))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Payload xác nhận không hợp lệ: {exc}") from exc

    order_items_by_id = {item.id: item for item in order.items}
    if len(payload.reviews) != len(order.items):
        raise HTTPException(status_code=400, detail="Cần upload đủ ảnh cho từng sản phẩm trong đơn hàng")

    seen_item_ids = set()
    created_reviews: List[models.FreshnessReview] = []
    return submit_structured_freshness_confirmation(
        db=db,
        order=order,
        current_user=current_user,
        form_data=form_data,
        payload=payload,
    )

    has_low_score_reviews = False

    # Ghi nhận từng ảnh theo từng order item để dễ trình bày trước hội đồng.
    for review_payload in payload.reviews:
        order_item = order_items_by_id.get(review_payload.order_item_id)
        if not order_item:
            raise HTTPException(status_code=400, detail="Mục đơn hàng không thuộc đơn hàng này")
        if order_item.product_id != review_payload.product_id:
            raise HTTPException(status_code=400, detail="Sản phẩm xác nhận không khớp với đơn hàng")
        if order_item.id in seen_item_ids:
            raise HTTPException(status_code=400, detail="Mỗi sản phẩm chỉ được xác nhận một lần")
        seen_item_ids.add(order_item.id)

        is_manual_review = (
            review_payload.review_mode == "manual"
            or review_payload.manual_rating is not None
        )

        if is_manual_review:
            if not review_payload.manual_rating:
                raise HTTPException(status_code=400, detail="Đánh giá thủ công cần có manual_rating")

            # Review thủ công cho sản phẩm ngoài dataset AI có thể gửi mà không cần ảnh.
            image_url = resolve_optional_freshness_image(form_data, review_payload.image_field)
            ai_label = None
            ai_confidence = None
            freshness_score = None
            manual_rating = review_payload.manual_rating
            manual_note = review_payload.manual_note

            # [C1] Manual review "bad"/"poor" cũng đánh dấu là low quality
            if manual_rating in ("bad", "poor", "spoiled"):
                has_low_score_reviews = True
        else:
            if not review_payload.image_field:
                raise HTTPException(status_code=400, detail="Đánh giá AI cần có image_field")

            upload = form_data.get(review_payload.image_field)
            if not upload or not hasattr(upload, "filename"):
                raise HTTPException(status_code=400, detail="Vui lòng tải ảnh cho từng sản phẩm")

            image_url = save_freshness_review_image(upload)
            # [C1] Chỉ lưu ai_label, KHÔNG tin freshness_score từ client để tránh fraud
            # Score chỉ dùng cho display, không dùng để trigger refund
            ai_label = None if review_payload.skipped_ai else review_payload.ai_label
            ai_confidence = None if review_payload.skipped_ai else review_payload.ai_confidence
            # Score từ client — lưu để display nhưng không dùng cho business logic
            freshness_score = None if review_payload.skipped_ai else review_payload.freshness_score
            manual_rating = None
            manual_note = None

            # [C1] Dựa vào ai_label (server-side classification) thay vì score từ client
            if ai_label and ai_label in SPOILED_AI_LABELS:
                has_low_score_reviews = True

        review = models.FreshnessReview(
            order_id=order.id,
            order_item_id=order_item.id,
            user_id=current_user.id,
            product_id=order_item.product_id,
            image_url=image_url,
            ai_label=ai_label,
            ai_confidence=ai_confidence,
            freshness_score=freshness_score,
            manual_rating=manual_rating,
            manual_note=manual_note,
            is_public=review_payload.is_public,
        )
        db.add(review)
        created_reviews.append(review)

    # Thưởng điểm chỉ cộng một lần cho mỗi đơn xác nhận thành công.
    try:
        # Flush reviews before rewarding points so duplicate submissions lose at the DB boundary.
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Đơn hàng này đã được xác nhận độ tươi trước đó",
        ) from exc

    db.execute(
        update(models.User)
        .where(models.User.id == current_user.id)
        .values(
            loyalty_points=func.coalesce(models.User.loyalty_points, 0) + FRESHNESS_REWARD_POINTS
        )
    )
    create_user_notification(
        db,
        user_id=current_user.id,
        title="Nhận điểm thưởng xác nhận độ tươi",
        message=f"Bạn vừa nhận được {FRESHNESS_REWARD_POINTS} điểm thưởng sau khi xác nhận đơn hàng #{order.order_number}.",
        notification_type="loyalty_reward",
        order_id=order.id,
    )

    db.commit()
    for review in created_reviews:
        db.refresh(review)
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Đã ghi nhận xác nhận độ tươi thành công",
        "awarded_points": FRESHNESS_REWARD_POINTS,
        "loyalty_points": int(current_user.loyalty_points or 0),
        "has_low_score_reviews": has_low_score_reviews,
        "reviews": [serialize_freshness_review(review) for review in created_reviews],
    }


@router.post("/{order_id}/freshness-complaints", response_model=schemas.FreshnessComplaintResponse)
def create_freshness_complaint(
    order_id: int,
    payload: schemas.FreshnessComplaintCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_customer_can_order(current_user)

    order = get_user_order_with_items(db, order_id, current_user.id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đơn hàng")

    # [C1] Kiểm tra dựa trên ai_label (server-side) HOẶC manual_rating — không tin score từ client
    low_score_reviews = (
        db.query(models.FreshnessReview)
        .filter(
            models.FreshnessReview.order_id == order.id,
            models.FreshnessReview.user_id == current_user.id,
        )
        .all()
    )

    qualifying_reviews = [
        r for r in low_score_reviews
        if (r.correct_result == "spoiled")
        or (r.ai_label and r.ai_label in SPOILED_AI_LABELS)
        or (r.manual_rating and r.manual_rating in BAD_MANUAL_RATINGS)
    ]

    if not qualifying_reviews:
        raise HTTPException(
            status_code=400,
            detail="Không có đánh giá sản phẩm hỏng/ôi để yêu cầu bồi thường. "
                   "AI phải phân loại là hư hỏng hoặc bạn đánh giá 'bad/poor/spoiled'."
        )

    existing = (
        db.query(models.FreshnessComplaint)
        .filter(
            models.FreshnessComplaint.order_id == order.id,
            models.FreshnessComplaint.user_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Đơn hàng này đã có yêu cầu bồi thường trước đó")

    complaint = models.FreshnessComplaint(
        order_id=order.id,
        user_id=current_user.id,
        complaint_type=ComplaintType(payload.complaint_type),
        notes=payload.notes,
    )
    db.add(complaint)

    if payload.complaint_type == ComplaintType.REFUND:
        # [C1] KHÔNG auto-credit tiền — chuyển sang pending_review để admin duyệt
        refund_amount = (order.total or Decimal("0")) * FRESHNESS_REFUND_RATE
        complaint.refund_amount = refund_amount
        complaint.resolution_status = ComplaintResolutionStatus.PENDING_REVIEW
        # current_user.voucher_balance KHÔNG được cộng ở đây — admin sẽ approve sau
        create_user_notification(
            db,
            user_id=current_user.id,
            title="Khiếu nại đã được ghi nhận",
            message=(
                f"Khiếu nại hoàn tiền 30% ({refund_amount:,.0f}đ) cho đơn #{order.order_number} "
                f"đang được xem xét. Admin sẽ phê duyệt trong 1-3 ngày làm việc."
            ),
            notification_type="freshness_refund_pending",
            order_id=order.id,
        )
    else:
        replacement_order_number = generate_order_number()
        replacement_items = []

        # Don doi hang duoc tao tu dong va mien phi van chuyen de de demo flow nghiep vu.
        for item in order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Không tìm thấy sản phẩm #{item.product_id} để đổi hàng")
            if int(product.quantity or 0) < int(item.quantity or 0):
                raise HTTPException(
                    status_code=400,
                    detail=f"Tồn kho không đủ để tạo đơn đổi cho sản phẩm {product.name}",
                )

            replacement_items.append(
                models.OrderItem(
                    product_id=item.product_id,
                    quantity=item.quantity,
                    price_at_purchase=item.price_at_purchase,
                    subtotal=item.subtotal,
                )
            )
            apply_stock_delta(
                db=db,
                product=product,
                delta=-int(item.quantity or 0),
                user_id=current_user.id,
                note=f"Xuất kho do đơn đổi hàng {replacement_order_number}",
            )

        replacement_order = models.Order(
            order_number=replacement_order_number,
            user_id=current_user.id,
            subtotal=order.subtotal,
            tax=Decimal("0"),
            shipping_fee=Decimal("0"),
            discount=order.subtotal,
            total=Decimal("0"),
            shipping_address=order.shipping_address,
            shipping_city=order.shipping_city,
            shipping_phone=order.shipping_phone,
            payment_method="replacement",
            payment_status=PaymentStatus.WAIVED,
            status=models.OrderStatus.PENDING,
            notes=f"Đơn đổi hàng miễn phí từ đơn {order.order_number}",
            order_type="replacement",
            replacement_parent_order_id=order.id,
        )
        replacement_order.items = replacement_items
        db.add(replacement_order)
        db.flush()

        complaint.replacement_order_id = replacement_order.id
        create_user_notification(
            db,
            user_id=current_user.id,
            title="Đã tạo đơn đổi hàng miễn phí",
            message=f"FreshFood AI đã tạo đơn đổi hàng #{replacement_order.order_number} cho đơn #{order.order_number}.",
            notification_type="freshness_replacement",
            order_id=replacement_order.id,
        )

    db.commit()
    db.refresh(complaint)
    return complaint

@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel pending order"""
    ensure_customer_can_order(current_user)
    
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn hàng"
        )
    
    # Only allow cancelling pending orders
    if order.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể hủy đơn hàng đang chờ xác nhận"
        )
    
    # Restore product quantities
    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            apply_stock_delta(
                db=db,
                product=product,
                delta=item.quantity,
                user_id=current_user.id,
                note=f"Nhập kho do hủy đơn hàng {order.order_number}",
            )
    
    order.status = models.OrderStatus.CANCELLED
    order.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(order)
    
    return {
        "success": True,
        "message": "Hủy đơn hàng thành công",
        "order_id": order.id,
        "status": order.status.value
    }
