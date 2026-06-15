"""Helper utilities for stock movements and inventory consistency."""

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import models


def derive_stock_status(quantity: int) -> str:
    return "in_stock" if quantity > 0 else "out_of_stock"


def apply_stock_delta(
    db: Session,
    product: models.Product,
    delta: int,
    user_id: int,
    note: Optional[str] = None,
    transaction_date: Optional[datetime] = None,
) -> Optional[models.StockTransaction]:
    """Apply a stock delta and persist a matching stock transaction.

    Positive delta => import, negative delta => export.
    """

    current_quantity = int(product.quantity or 0)
    next_quantity = current_quantity + int(delta)
    if next_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số lượng tồn kho không đủ. Hiện tại: {current_quantity}, thay đổi: {delta}",
        )

    product.quantity = next_quantity
    product.stock_status = derive_stock_status(next_quantity)

    if delta == 0:
        return None

    transaction = models.StockTransaction(
        product_id=product.id,
        user_id=user_id,
        type=models.TransactionType.IMPORT if delta > 0 else models.TransactionType.EXPORT,
        quantity=abs(int(delta)),
        note=note,
        transaction_date=transaction_date,
    )
    db.add(transaction)
    return transaction


def record_stock_transaction(
    db: Session,
    product: models.Product,
    user_id: int,
    transaction_type: models.TransactionType,
    quantity: int,
    note: Optional[str] = None,
    transaction_date: Optional[datetime] = None,
) -> models.StockTransaction:
    """Persist a stock transaction without mutating the product quantity."""

    transaction = models.StockTransaction(
        product_id=product.id,
        user_id=user_id,
        type=transaction_type,
        quantity=abs(int(quantity)),
        note=note,
        transaction_date=transaction_date,
    )
    db.add(transaction)
    return transaction


def set_product_quantity(
    db: Session,
    product: models.Product,
    new_quantity: Optional[int],
    user_id: int,
    note: Optional[str] = None,
    transaction_date: Optional[datetime] = None,
) -> Optional[models.StockTransaction]:
    """Set absolute stock level, logging the difference as a stock movement."""

    if new_quantity is None:
        product.stock_status = derive_stock_status(int(product.quantity or 0))
        return None

    target_quantity = int(new_quantity)
    current_quantity = int(product.quantity or 0)
    return apply_stock_delta(
        db=db,
        product=product,
        delta=target_quantity - current_quantity,
        user_id=user_id,
        note=note,
        transaction_date=transaction_date,
    )
