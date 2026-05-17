from decimal import Decimal
from typing import List, Optional
import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from api.auth import get_current_user
from database import get_db
from utils.auth import hash_password

router = APIRouter(tags=["Admin"])

STATUS_ALIASES = {
    "Cho xac nhan": models.OrderStatus.PENDING,
    "Chờ xác nhận": models.OrderStatus.PENDING,
    "pending": models.OrderStatus.PENDING,
    "Da xac nhan": models.OrderStatus.CONFIRMED,
    "Đã xác nhận": models.OrderStatus.CONFIRMED,
    "confirmed": models.OrderStatus.CONFIRMED,
    "Dang giao": models.OrderStatus.SHIPPED,
    "Đang giao": models.OrderStatus.SHIPPED,
    "shipped": models.OrderStatus.SHIPPED,
    "Da giao": models.OrderStatus.DELIVERED,
    "Đã giao": models.OrderStatus.DELIVERED,
    "delivered": models.OrderStatus.DELIVERED,
    "Da huy": models.OrderStatus.CANCELLED,
    "Đã hủy": models.OrderStatus.CANCELLED,
    "cancelled": models.OrderStatus.CANCELLED,
    "returned": models.OrderStatus.RETURNED,
}


class AdminProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    category_id: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    img: Optional[str] = None
    stock: Optional[int] = None
    quantity: Optional[int] = None
    unit: Optional[str] = "kg"
    stock_status: Optional[str] = None
    rating: Optional[float] = 5.0


def get_current_admin_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập tài nguyên Admin",
        )
    return current_user


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def normalize_order_status(value: str) -> models.OrderStatus:
    if value in STATUS_ALIASES:
        return STATUS_ALIASES[value]
    lowered = value.lower()
    if lowered in STATUS_ALIASES:
        return STATUS_ALIASES[lowered]
    valid = ", ".join(status.value for status in models.OrderStatus)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Trạng thái không hợp lệ. Hãy chọn một trong: {valid}",
    )


@router.post("/products/add")
def add_product(
    product: AdminProductCreate,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    category_id = product.category_id

    if category_id:
        category = db.query(models.Category).filter(models.Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    else:
        category_name = (product.category or "Khác").strip()
        category = db.query(models.Category).filter(models.Category.name == category_name).first()
        if not category:
            category = models.Category(
                name=category_name,
                slug=slugify(category_name),
                is_active=True,
            )
            db.add(category)
            db.flush()
        category_id = category.id

    new_product = models.Product(
        name=product.name,
        slug=slugify(product.name),
        description=product.description or "",
        price=product.price,
        category_id=category_id,
        image_url=product.image_url or product.img,
        quantity=product.quantity if product.quantity is not None else (product.stock or 0),
        unit=product.unit or "kg",
        stock_status=product.stock_status or ("in_stock" if (product.quantity or product.stock or 0) > 0 else "out_of_stock"),
        rating=product.rating or 5.0,
        is_active=True,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return {"message": "Thêm sản phẩm thành công", "product": new_product}


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    product.is_active = False
    db.commit()
    return {"message": "Đã ẩn sản phẩm khỏi cửa hàng", "product_id": product_id}


@router.get("/admin/users", response_model=List[schemas.UserResponse])
def get_all_users(
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(models.User).all()


@router.get("/admin/stats")
def get_stats(
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    total_revenue = sum(order.total or Decimal("0") for order in db.query(models.Order).all())
    low_stock_products = db.query(models.Product).filter(
        models.Product.is_active == True,
        models.Product.quantity <= models.Product.low_stock_threshold,
    ).count()

    return {
        "total_users": db.query(models.User).count(),
        "total_products": db.query(models.Product).filter(models.Product.is_active == True).count(),
        "total_orders": db.query(models.Order).count(),
        "pending_orders": db.query(models.Order).filter(
            models.Order.status == models.OrderStatus.PENDING
        ).count(),
        "total_revenue": float(total_revenue),
        "low_stock_products": low_stock_products,
        "system_status": "ổn định",
    }


@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    if db_user.is_admin:
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản admin")

    db.delete(db_user)
    db.commit()
    return {"message": f"Đã xóa người dùng ID {user_id}"}


@router.get("/admin/orders", response_model=List[schemas.Order])
def get_all_orders(
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .order_by(models.Order.created_at.desc())
        .all()
    )


@router.get("/admin/orders/{order_id}", response_model=schemas.OrderDetail)
def get_order_detail(
    order_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")
    return order


@router.put("/admin/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_data: schemas.OrderStatusUpdate,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")

    new_status = normalize_order_status(status_data.new_status)
    order.status = new_status
    if new_status == models.OrderStatus.SHIPPED:
        import datetime
        order.shipped_at = datetime.datetime.utcnow()
    elif new_status == models.OrderStatus.DELIVERED:
        import datetime
        order.delivered_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(order)
    return {"message": "Cập nhật trạng thái thành công", "order": order}


@router.delete("/admin/orders/{order_id}")
def delete_order(
    order_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")

    db.delete(order)
    db.commit()
    return {"message": f"Đã xóa đơn hàng ID {order_id}"}


@router.get("/users/{user_id}/orders", response_model=List[schemas.Order])
def get_user_orders(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Không có quyền xem đơn hàng này")
    return db.query(models.Order).filter(models.Order.user_id == user_id).all()


@router.get("/admin/orders/user/{user_id}", response_model=List[schemas.Order])
def get_user_orders_admin(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Order).filter(models.Order.user_id == user_id).all()


@router.get("/user/orders", response_model=List[schemas.Order])
def get_current_user_orders(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Order).filter(models.Order.user_id == current_user.id).all()


@router.get("/user/profile", response_model=schemas.UserProfileResponse)
def get_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/user/profile", response_model=schemas.UserProfileResponse)
def update_user_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = user_update.model_dump(exclude_unset=True)
    password = update_data.pop("password", None)

    for field, value in update_data.items():
        setattr(current_user, field, value)
    if password:
        current_user.hashed_password = hash_password(password)

    db.commit()
    db.refresh(current_user)
    return current_user
