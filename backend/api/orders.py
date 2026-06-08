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
from sqlalchemy import update
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from api.auth import get_current_user
from database import get_db
from config import (
    TAX_RATE,
    FREE_SHIPPING_THRESHOLD,
    STANDARD_SHIPPING_FEE,
    FRESHNESS_REFUND_RATE,
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
    """Admin accounts are management-only and cannot use customer order flows."""
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin chi duoc quan tri he thong, khong the mua hoac dat hang",
        )


def ensure_freshness_upload_dir():
    FRESHNESS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
        raise HTTPException(status_code=400, detail="Anh xac nhan khong hop le")

    extension = Path(image_file.filename).suffix.lower()
    if extension not in ALLOWED_FRESHNESS_IMAGE_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_FRESHNESS_IMAGE_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"Dinh dang anh khong duoc ho tro. Chi nhan: {allowed}")

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


def ensure_freshness_confirmation_is_available(
    db: Session,
    order: models.Order,
    user_id: int,
) -> models.Order:
    annotate_order_freshness_state(db, order, user_id)
    if order.status != models.OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Chi don hang da giao moi duoc xac nhan do tuoi")
    if order.freshness_confirmation_completed:
        raise HTTPException(status_code=400, detail="Don hang nay da duoc xac nhan do tuoi truoc do")
    if order.freshness_confirmation_expired:
        raise HTTPException(status_code=400, detail="Da qua 24 gio nen khong the xac nhan do tuoi nua")
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
            detail="Order must have at least one item"
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
                detail=f"Product {item.product_id} not found"
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
                detail=f"Insufficient stock for product {product.name}"
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
            note=f"Xuat kho do don hang {order_number}",
        )
    
    # Calculate taxes and fees
    tax = subtotal * TAX_RATE
    shipping_fee = STANDARD_SHIPPING_FEE if subtotal < FREE_SHIPPING_THRESHOLD else Decimal("0")
    total = subtotal + tax + shipping_fee
    
    # Create order
    db_order = models.Order(
        order_number=order_number,
        user_id=current_user.id,
        subtotal=subtotal,
        tax=tax,
        shipping_fee=shipping_fee,
        discount=Decimal("0"),
        total=total,
        shipping_address=order_create.shipping_address,
        shipping_city=order_create.shipping_city,
        shipping_phone=order_create.shipping_phone,
        payment_method=order_create.payment_method,
        payment_status=PaymentStatus.PENDING,
        status=models.OrderStatus.PENDING,
        notes=order_create.notes
    )
    
    db_order.items = order_items
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
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
            created_at=current_user.created_at
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
            detail="Order not found"
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
            detail="Order not found"
        )
    
    # Only allow certain updates based on status
    if order.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only modify pending orders"
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    ensure_freshness_confirmation_is_available(db, order, current_user.id)

    form_data = await request.form()
    raw_payload = form_data.get("payload")
    if not raw_payload:
        raise HTTPException(status_code=400, detail="Thieu payload xac nhan do tuoi")

    try:
        payload = schemas.FreshnessConfirmationSubmitPayload.model_validate_json(str(raw_payload))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Payload xac nhan khong hop le: {exc}") from exc

    order_items_by_id = {item.id: item for item in order.items}
    if len(payload.reviews) != len(order.items):
        raise HTTPException(status_code=400, detail="Can upload du anh cho tung san pham trong don hang")

    seen_item_ids = set()
    created_reviews: List[models.FreshnessReview] = []
    has_low_score_reviews = False

    # Ghi nhận từng ảnh theo từng order item để dễ trình bày trước hội đồng.
    for review_payload in payload.reviews:
        order_item = order_items_by_id.get(review_payload.order_item_id)
        if not order_item:
            raise HTTPException(status_code=400, detail="Order item khong thuoc don hang nay")
        if order_item.product_id != review_payload.product_id:
            raise HTTPException(status_code=400, detail="San pham xac nhan khong khop voi don hang")
        if order_item.id in seen_item_ids:
            raise HTTPException(status_code=400, detail="Moi san pham chi duoc xac nhan mot lan")
        seen_item_ids.add(order_item.id)

        is_manual_review = (
            review_payload.review_mode == "manual"
            or review_payload.manual_rating is not None
        )

        if is_manual_review:
            if not review_payload.manual_rating:
                raise HTTPException(status_code=400, detail="Danh gia thu cong can co manual_rating")

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
                raise HTTPException(status_code=400, detail="Review AI can co image_field")

            upload = form_data.get(review_payload.image_field)
            if not upload or not hasattr(upload, "filename"):
                raise HTTPException(status_code=400, detail="Vui long tai anh cho tung san pham")

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
    current_user.loyalty_points = int(current_user.loyalty_points or 0) + FRESHNESS_REWARD_POINTS
    create_user_notification(
        db,
        user_id=current_user.id,
        title="Nhan diem thuong xac nhan do tuoi",
        message=f"Ban vua nhan duoc {FRESHNESS_REWARD_POINTS} diem thuong sau khi xac nhan don hang #{order.order_number}.",
        notification_type="loyalty_reward",
        order_id=order.id,
    )

    db.commit()
    for review in created_reviews:
        db.refresh(review)
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Da ghi nhan xac nhan do tuoi thanh cong",
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

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
        if (r.ai_label and r.ai_label in SPOILED_AI_LABELS)
        or (r.manual_rating and r.manual_rating in BAD_MANUAL_RATINGS)
    ]

    if not qualifying_reviews:
        raise HTTPException(
            status_code=400,
            detail="Khong co danh gia sp hong/oi de yeu cau boi thuong. "
                   "AI phai phan loai la hu hong hoac ban danh gia 'bad/poor/spoiled'."
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
        raise HTTPException(status_code=409, detail="Don hang nay da co yeu cau boi thuong truoc do")

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
            title="Khieu nai da duoc ghi nhan",
            message=(
                f"Khieu nai hoan tien 30% ({refund_amount:,.0f}đ) cho don #{order.order_number} "
                f"dang duoc xem xet. Admin se phe duyet trong 1-3 ngay lam viec."
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
                raise HTTPException(status_code=404, detail=f"Khong tim thay san pham #{item.product_id} de doi hang")
            if int(product.quantity or 0) < int(item.quantity or 0):
                raise HTTPException(
                    status_code=400,
                    detail=f"Ton kho khong du de tao don doi cho san pham {product.name}",
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
                note=f"Xuat kho do don doi hang {replacement_order_number}",
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
            notes=f"Don doi hang mien phi tu don {order.order_number}",
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
            title="Da tao don doi hang mien phi",
            message=f"FreshFood AI da tao don doi hang #{replacement_order.order_number} cho don #{order.order_number}.",
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
            detail="Order not found"
        )
    
    # Only allow cancelling pending orders
    if order.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending orders"
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
                note=f"Nhap kho do huy don hang {order.order_number}",
            )
    
    order.status = models.OrderStatus.CANCELLED
    order.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(order)
    
    return {
        "success": True,
        "message": "Order cancelled successfully",
        "order_id": order.id,
        "status": order.status.value
    }
