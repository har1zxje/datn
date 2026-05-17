"""
Orders APIs: Create, Retrieve, Update, Cancel
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from decimal import Decimal
import models
import schemas
from database import get_db
from api.auth import get_current_user
import datetime
import random
import string

router = APIRouter(prefix="/orders", tags=["Orders"])

def generate_order_number() -> str:
    """Generate unique order number"""
    prefix = "ORD"
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{timestamp}-{random_suffix}"

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
    
    if not order_create.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must have at least one item"
        )
    
    # Calculate totals and fetch products
    subtotal = Decimal("0")
    order_items = []
    
    for item in order_create.items:
        product = db.query(models.Product).filter(
            models.Product.id == item.product_id,
            models.Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found"
            )
        
        if product.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product {product.name}"
            )
        
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
        
        # Reduce product quantity
        product.quantity -= item.quantity
    
    # Calculate taxes and fees
    tax = subtotal * Decimal("0.10")  # 10% tax
    shipping_fee = Decimal("30000") if subtotal < Decimal("500000") else Decimal("0")
    total = subtotal + tax + shipping_fee
    
    # Create order
    db_order = models.Order(
        order_number=generate_order_number(),
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
        payment_status="pending",
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
    
    query = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.user_id == current_user.id)
    )
    
    if status:
        query = query.filter(models.Order.status == status)
    
    orders = query.order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()
    
    return orders

@router.get("/{order_id}", response_model=schemas.OrderDetail)
def get_order(
    order_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order details by ID"""
    
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
    
    return order

@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel pending order"""
    
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
            product.quantity += item.quantity
    
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
