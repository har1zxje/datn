"""
Delivery Profiles API: CRUD cho sổ địa chỉ giao hàng của người dùng
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import get_db
from api.auth import get_current_user

router = APIRouter(prefix="/delivery-profiles", tags=["Delivery Profiles"])


def _ensure_customer(current_user: models.User) -> None:
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin không thể sử dụng sổ địa chỉ cá nhân",
        )


def _get_profile_or_404(profile_id: int, user_id: int, db: Session) -> models.DeliveryProfile:
    profile = db.query(models.DeliveryProfile).filter(
        models.DeliveryProfile.id == profile_id,
        models.DeliveryProfile.user_id == user_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy địa chỉ")
    return profile


@router.get("", response_model=List[schemas.DeliveryProfile])
def list_delivery_profiles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách địa chỉ giao hàng của người dùng, địa chỉ mặc định đứng đầu."""
    _ensure_customer(current_user)
    profiles = (
        db.query(models.DeliveryProfile)
        .filter(models.DeliveryProfile.user_id == current_user.id)
        .order_by(models.DeliveryProfile.is_default.desc(), models.DeliveryProfile.created_at.desc())
        .all()
    )
    return profiles


@router.post("", response_model=schemas.DeliveryProfile, status_code=status.HTTP_201_CREATED)
def create_delivery_profile(
    payload: schemas.DeliveryProfileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tạo địa chỉ giao hàng mới. Nếu is_default=True thì xóa default cũ."""
    _ensure_customer(current_user)

    if payload.is_default:
        # Bỏ default tất cả địa chỉ cũ
        db.query(models.DeliveryProfile).filter(
            models.DeliveryProfile.user_id == current_user.id,
            models.DeliveryProfile.is_default == True,
        ).update({"is_default": False})

    # Nếu chưa có địa chỉ nào, tự động set làm default
    existing_count = db.query(models.DeliveryProfile).filter(
        models.DeliveryProfile.user_id == current_user.id
    ).count()
    is_default = payload.is_default or (existing_count == 0)

    profile = models.DeliveryProfile(
        user_id=current_user.id,
        full_name=payload.full_name,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        is_default=is_default,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/{profile_id}", response_model=schemas.DeliveryProfile)
def update_delivery_profile(
    profile_id: int,
    payload: schemas.DeliveryProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin địa chỉ giao hàng."""
    _ensure_customer(current_user)
    profile = _get_profile_or_404(profile_id, current_user.id, db)

    if payload.is_default is True:
        db.query(models.DeliveryProfile).filter(
            models.DeliveryProfile.user_id == current_user.id,
            models.DeliveryProfile.is_default == True,
        ).update({"is_default": False})

    for field in ("full_name", "phone", "address", "city", "is_default"):
        value = getattr(payload, field, None)
        if value is not None:
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_profile(
    profile_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Xóa địa chỉ giao hàng. Nếu là default thì tự chuyển default cho địa chỉ còn lại."""
    _ensure_customer(current_user)
    profile = _get_profile_or_404(profile_id, current_user.id, db)

    was_default = profile.is_default
    db.delete(profile)
    db.commit()

    if was_default:
        # Tự động set default cho địa chỉ mới nhất còn lại
        next_profile = (
            db.query(models.DeliveryProfile)
            .filter(models.DeliveryProfile.user_id == current_user.id)
            .order_by(models.DeliveryProfile.created_at.desc())
            .first()
        )
        if next_profile:
            next_profile.is_default = True
            db.commit()


@router.put("/{profile_id}/set-default", response_model=schemas.DeliveryProfile)
def set_default_delivery_profile(
    profile_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đặt địa chỉ làm mặc định."""
    _ensure_customer(current_user)
    profile = _get_profile_or_404(profile_id, current_user.id, db)

    db.query(models.DeliveryProfile).filter(
        models.DeliveryProfile.user_id == current_user.id,
        models.DeliveryProfile.is_default == True,
    ).update({"is_default": False})

    profile.is_default = True
    db.commit()
    db.refresh(profile)
    return profile
