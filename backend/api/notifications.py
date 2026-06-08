from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

import models
import schemas
from api.auth import get_current_user
from database import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[schemas.UserNotificationResponse])
def get_user_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.UserNotification).filter(
        models.UserNotification.user_id == current_user.id
    )
    if unread_only:
        query = query.filter(models.UserNotification.is_read == False)

    return (
        query.order_by(
            models.UserNotification.is_read.asc(),
            models.UserNotification.created_at.desc(),
        )
        .limit(limit)
        .all()
    )


@router.put("/{notification_id}/read", response_model=schemas.UserNotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(models.UserNotification)
        .filter(
            models.UserNotification.id == notification_id,
            models.UserNotification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thong bao khong ton tai")

    if not notification.is_read:
        notification.is_read = True
        db.commit()
        db.refresh(notification)

    return notification
