import datetime
from typing import Optional

from sqlalchemy.orm import Session

import models

FRESHNESS_CONFIRMATION_HOURS = 24
FRESHNESS_REWARD_POINTS = 50


def get_freshness_expiry(delivered_at: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    if not delivered_at:
        return None
    return delivered_at + datetime.timedelta(hours=FRESHNESS_CONFIRMATION_HOURS)


def order_has_freshness_review(db: Session, order_id: int, user_id: int) -> bool:
    return (
        db.query(models.FreshnessReview)
        .filter(
            models.FreshnessReview.order_id == order_id,
            models.FreshnessReview.user_id == user_id,
        )
        .first()
        is not None
    )


def _apply_freshness_state(order: models.Order, already_confirmed: bool) -> models.Order:
    """Gán freshness state vào order object (không query DB)."""
    expires_at = get_freshness_expiry(order.delivered_at)
    now = datetime.datetime.utcnow()
    is_delivered = order.status == models.OrderStatus.DELIVERED
    is_expired = bool(expires_at and now > expires_at)

    order.freshness_reward_points = FRESHNESS_REWARD_POINTS
    order.freshness_confirmation_expires_at = expires_at
    order.freshness_confirmation_completed = already_confirmed
    order.freshness_confirmation_expired = is_delivered and not already_confirmed and is_expired
    order.freshness_confirmation_available = (
        is_delivered and expires_at is not None and now <= expires_at and not already_confirmed
    )
    return order


def annotate_order_freshness_state(db: Session, order: models.Order, user_id: int) -> models.Order:
    """Annotate một order đơn lẻ — dùng cho get_order()."""
    already_confirmed = order_has_freshness_review(db, order.id, user_id)
    return _apply_freshness_state(order, already_confirmed)


def annotate_orders_freshness_state_batch(
    db: Session, orders: list, user_id: int
) -> list:
    """[H7] Batch annotate — 1 query cho tất cả orders thay vì N queries.

    Dùng cho list_orders() để tránh N+1.
    """
    if not orders:
        return orders

    order_ids = [o.id for o in orders]
    confirmed_ids: set[int] = {
        row.order_id
        for row in db.query(models.FreshnessReview.order_id)
        .filter(
            models.FreshnessReview.order_id.in_(order_ids),
            models.FreshnessReview.user_id == user_id,
        )
        .all()
    }

    for order in orders:
        _apply_freshness_state(order, order.id in confirmed_ids)

    return orders


def create_user_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    order_id: Optional[int] = None,
    expires_at: Optional[datetime.datetime] = None,
) -> models.UserNotification:
    notification = models.UserNotification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        order_id=order_id,
        expires_at=expires_at,
    )
    db.add(notification)
    db.flush()
    return notification


def ensure_delivered_notification(db: Session, order: models.Order) -> Optional[models.UserNotification]:
    if order.status != models.OrderStatus.DELIVERED:
        return None

    existing = (
        db.query(models.UserNotification)
        .filter(
            models.UserNotification.user_id == order.user_id,
            models.UserNotification.order_id == order.id,
            models.UserNotification.notification_type == "freshness_confirmation",
        )
        .first()
    )
    if existing:
        return existing

    expires_at = get_freshness_expiry(order.delivered_at)
    message = (
        f"Don hang #{order.order_number} da giao. "
        f"Chup anh xac nhan do tuoi trong 24 gio de nhan {FRESHNESS_REWARD_POINTS} diem thuong."
    )
    return create_user_notification(
        db,
        user_id=order.user_id,
        title="Xac nhan do tuoi sau giao hang",
        message=message,
        notification_type="freshness_confirmation",
        order_id=order.id,
        expires_at=expires_at,
    )


def mask_customer_name(full_name: Optional[str], username: Optional[str]) -> str:
    raw_name = (full_name or username or "Khach hang").strip()
    if not raw_name:
        return "Khach hang"

    parts = [part for part in raw_name.split() if part]
    if len(parts) == 1:
        base = parts[0]
        return f"{base[0].upper()}***"

    return " ".join(f"{part[0].upper()}." for part in parts[:2])


def get_customer_area(order: Optional[models.Order]) -> str:
    if not order:
        return "Khu vuc khac"
    if order.shipping_city:
        return order.shipping_city
    if order.shipping_address:
        chunks = [chunk.strip() for chunk in str(order.shipping_address).split(",") if chunk.strip()]
        if chunks:
            return chunks[-1]
    return "Khu vuc khac"
