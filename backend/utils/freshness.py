import datetime
from typing import Optional

from sqlalchemy.orm import Session

import models
from config import (
    FRESHNESS_CONFIRMATION_HOURS,
    FRESHNESS_REWARD_POINTS,
    FRESHNESS_REWARD_INCORRECT_BONUS,
)


def get_freshness_expiry(delivered_at: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    if not delivered_at:
        return None
    return delivered_at + datetime.timedelta(hours=FRESHNESS_CONFIRMATION_HOURS)


def get_reported_order_item_ids(db: Session, order_id: int, user_id: int) -> set[int]:
    review_ids = {
        row.order_item_id
        for row in db.query(models.FreshnessReview.order_item_id)
        .filter(
            models.FreshnessReview.order_id == order_id,
            models.FreshnessReview.user_id == user_id,
        )
        .all()
    }
    verification_ids = {
        row.order_item_id
        for row in db.query(models.VerificationReport.order_item_id)
        .filter(
            models.VerificationReport.order_id == order_id,
            models.VerificationReport.user_id == user_id,
        )
        .all()
    }
    return review_ids | verification_ids


def order_has_freshness_review(db: Session, order_id: int, user_id: int) -> bool:
    return bool(get_reported_order_item_ids(db, order_id, user_id))


def order_has_completed_confirmation(db: Session, order: models.Order, user_id: int) -> bool:
    order_item_ids = {item.id for item in getattr(order, "items", []) if getattr(item, "id", None) is not None}
    if not order_item_ids:
        return False
    return order_item_ids.issubset(get_reported_order_item_ids(db, order.id, user_id))


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
    already_confirmed = order_has_completed_confirmation(db, order, user_id)
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
    review_pairs = db.query(models.FreshnessReview.order_id, models.FreshnessReview.order_item_id).filter(
        models.FreshnessReview.order_id.in_(order_ids),
        models.FreshnessReview.user_id == user_id,
    ).all()
    verification_pairs = db.query(
        models.VerificationReport.order_id,
        models.VerificationReport.order_item_id,
    ).filter(
        models.VerificationReport.order_id.in_(order_ids),
        models.VerificationReport.user_id == user_id,
    ).all()

    reported_by_order: dict[int, set[int]] = {}
    for order_id, order_item_id in [*review_pairs, *verification_pairs]:
        reported_by_order.setdefault(order_id, set()).add(order_item_id)

    for order in orders:
        total_item_ids = {item.id for item in getattr(order, "items", []) if getattr(item, "id", None) is not None}
        is_completed = bool(total_item_ids) and total_item_ids.issubset(reported_by_order.get(order.id, set()))
        _apply_freshness_state(order, is_completed)

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
        f"Đơn hàng #{order.order_number} đã giao. "
        f"Chụp ảnh xác nhận độ tươi trong 24 giờ để nhận từ {FRESHNESS_REWARD_POINTS} "
        f"đến {FRESHNESS_REWARD_POINTS + FRESHNESS_REWARD_INCORRECT_BONUS} điểm thưởng."
    )
    return create_user_notification(
        db,
        user_id=order.user_id,
        title="Xác nhận độ tươi sau giao hàng",
        message=message,
        notification_type="freshness_confirmation",
        order_id=order.id,
        expires_at=expires_at,
    )


def mask_customer_name(full_name: Optional[str], username: Optional[str]) -> str:
    raw_name = (full_name or username or "Khách hàng").strip()
    if not raw_name:
        return "Khách hàng"

    parts = [part for part in raw_name.split() if part]
    if len(parts) == 1:
        base = parts[0]
        return f"{base[0].upper()}***"

    return " ".join(f"{part[0].upper()}." for part in parts[:2])


def get_customer_area(order: Optional[models.Order]) -> str:
    if not order:
        return "Khu vực khác"
    if order.shipping_city:
        return order.shipping_city
    if order.shipping_address:
        chunks = [chunk.strip() for chunk in str(order.shipping_address).split(",") if chunk.strip()]
        if chunks:
            return chunks[-1]
    return "Khu vực khác"
