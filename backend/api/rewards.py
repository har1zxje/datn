import datetime
import secrets
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from api.auth import get_current_user
from database import get_db

router = APIRouter(tags=["Rewards"])
VOUCHER_VALID_DAYS = 3
VOUCHER_REASON_CONFIG = {
    "wrong_scan_correct_feedback": {
        "title": "Voucher tri an",
        "discount_percent": Decimal("10"),
    },
    "freshness_spoiled_confirmation": {
        "title": "Voucher xin loi do tuoi",
        "discount_percent": Decimal("15"),
    },
}


def generate_voucher_code() -> str:
    return f"TRIAN-{secrets.token_hex(4).upper()}"


def get_voucher_expiry(created_at: datetime.datetime) -> datetime.datetime:
    return created_at + datetime.timedelta(days=VOUCHER_VALID_DAYS)


def get_voucher_config(reason: str) -> dict:
    return VOUCHER_REASON_CONFIG.get(
        reason,
        {
            "title": "Voucher tri an",
            "discount_percent": Decimal("10"),
        },
    )


def create_generated_voucher(
    db: Session,
    *,
    user_id: int,
    reason: str,
    source_order_id: int | None = None,
) -> models.GeneratedVoucher:
    if source_order_id is not None:
        existing = db.query(models.GeneratedVoucher).filter(
            models.GeneratedVoucher.user_id == user_id,
            models.GeneratedVoucher.reason == reason,
            models.GeneratedVoucher.source_order_id == source_order_id,
        ).first()
        if existing:
            return existing

    created_at = datetime.datetime.utcnow()
    config = get_voucher_config(reason)
    voucher = models.GeneratedVoucher(
        user_id=user_id,
        source_order_id=source_order_id,
        code=generate_voucher_code(),
        reason=reason,
        title=config["title"],
        created_at=created_at,
    )
    db.add(voucher)
    db.flush()
    return voucher


def calculate_voucher_discount(order_total: Decimal, config: dict) -> Decimal:
    total = Decimal(order_total or 0)
    discount_percent = Decimal(config.get("discount_percent") or 0)
    if total <= 0 or discount_percent <= 0:
        return Decimal("0")
    return (total * discount_percent / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def serialize_voucher(voucher: models.GeneratedVoucher, used_codes: set[str]) -> schemas.VoucherSummaryResponse:
    expires_at = get_voucher_expiry(voucher.created_at)
    config = get_voucher_config(voucher.reason)
    is_used = voucher.code in used_codes
    is_expired = datetime.datetime.utcnow() > expires_at
    return schemas.VoucherSummaryResponse(
        code=voucher.code,
        title=voucher.title or config["title"],
        reason=voucher.reason,
        discount_percent=Decimal(config.get("discount_percent") or 0),
        discount_amount=Decimal("0"),
        created_at=voucher.created_at,
        expires_at=expires_at,
        is_used=is_used,
        is_expired=is_expired,
    )


def resolve_active_voucher(
    db: Session,
    *,
    user_id: int,
    voucher_code: str | None,
    order_total: Decimal | None = None,
) -> tuple[models.GeneratedVoucher | None, Decimal]:
    if not voucher_code:
        return None, Decimal("0")

    voucher = db.query(models.GeneratedVoucher).filter(
        models.GeneratedVoucher.user_id == user_id,
        models.GeneratedVoucher.code == voucher_code,
    ).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher khong ton tai hoac khong thuoc tai khoan cua ban")

    if datetime.datetime.utcnow() > get_voucher_expiry(voucher.created_at):
        raise HTTPException(status_code=400, detail="Voucher da het han su dung")

    used_order = db.query(models.Order).filter(
        models.Order.user_id == user_id,
        models.Order.voucher_code == voucher.code,
    ).first()
    if used_order:
        raise HTTPException(status_code=400, detail="Voucher nay da duoc su dung")

    config = get_voucher_config(voucher.reason)
    discount_amount = calculate_voucher_discount(Decimal(order_total or 0), config)
    return voucher, discount_amount


@router.patch("/user/points", response_model=schemas.UserPointsUpdateResponse)
def patch_user_points(
    payload: schemas.UserPointsUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.loyalty_points = int(current_user.loyalty_points or 0) + int(payload.delta or 0)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "success": True,
        "delta": int(payload.delta or 0),
        "loyalty_points": int(current_user.loyalty_points or 0),
    }


@router.post("/vouchers/generate", response_model=schemas.VoucherGenerateResponse)
def generate_voucher(
    payload: schemas.VoucherGenerateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin and payload.userId != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban khong the tao voucher cho tai khoan khac",
        )

    config = get_voucher_config(payload.reason)
    voucher = create_generated_voucher(
        db,
        user_id=payload.userId,
        reason=payload.reason,
    )
    db.commit()
    db.refresh(voucher)

    return {
        "success": True,
        "code": voucher.code,
        "title": voucher.title,
        "reason": voucher.reason,
        "discount_percent": Decimal(config.get("discount_percent") or 0),
        "discount_amount": Decimal("0"),
        "expires_at": get_voucher_expiry(voucher.created_at),
        "created_at": voucher.created_at,
    }


@router.get("/vouchers/mine", response_model=list[schemas.VoucherSummaryResponse])
def get_my_vouchers(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    used_codes = {
        code
        for code, in db.query(models.Order.voucher_code).filter(
            models.Order.user_id == current_user.id,
            models.Order.voucher_code.isnot(None),
        ).all()
        if code
    }
    vouchers = db.query(models.GeneratedVoucher).filter(
        models.GeneratedVoucher.user_id == current_user.id,
    ).order_by(models.GeneratedVoucher.created_at.desc()).all()
    return [serialize_voucher(voucher, used_codes) for voucher in vouchers]
