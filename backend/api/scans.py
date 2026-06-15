"""
Scans APIs: AI freshness detection and feedback logging.

Current behavior:
- Scan inference endpoint is still mock-based for Phase 1.
- Feedback endpoints are real and structured for retraining datasets.
"""
from typing import Optional, List, Any
import datetime
import json
import os
import random
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from sqlalchemy.orm import Session

import models
import schemas
from api.auth import get_current_user
from database import get_db
from observability import record_scan_event
from utils.ai_support import AI_SUPPORTED_CLASS_NAMES
from utils.file_validation import validate_image_upload
from utils.freshness_standards import evaluate_freshness_with_standards
from utils.visual_spoilage import evaluate_visual_spoilage

router = APIRouter(prefix="/scans", tags=["Scans"])
SCAN_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "scans"
ALLOWED_SCAN_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _compose_scan_payload(ai_result: dict[str, Any]) -> dict[str, Any]:
    quality_assessment = ai_result.get("quality_assessment") or {
        "component_scores": ai_result.get("component_scores"),
        "measured_indicators": ai_result.get("measured_indicators"),
        "standards_profile": ai_result.get("standards_profile"),
    }
    return {
        "assessment_basis": ai_result.get("assessment_basis", "model_inference_mock_v1"),
        "quality_assessment": quality_assessment,
        "needs_manual_review": bool(ai_result.get("needs_manual_review", False)),
        "review_reasons": ai_result.get("review_reasons") or [],
        "spoilage_ratio_pct": ai_result.get("spoilage_ratio_pct"),
        "spoilage_profile": ai_result.get("spoilage_profile"),
        "processing_time_ms": ai_result.get("processing_time_ms"),
    }


def get_ood_threshold() -> float:
    try:
        return float(os.getenv("OOD_THRESHOLD", "0.60"))
    except (TypeError, ValueError):
        return 0.60


def is_out_of_distribution(predictions: list[float], threshold: float = 0.60) -> bool:
    """
    Kiem tra anh dau vao co nam ngoai phan phoi dataset hay khong.

    Neu confidence cao nhat van thap hon threshold thi model khong du tu tin
    de tra ket qua nhan dien cho tap class da train.
    """
    if not predictions:
        return False
    max_confidence = max(predictions)
    return max_confidence < threshold


def _build_quick_scan_response(ai_result: dict[str, Any]) -> schemas.QuickScanResponse:
    payload = _compose_scan_payload(ai_result)
    return schemas.QuickScanResponse(
        status="ok",
        message=None,
        max_confidence=None,
        supported_classes=AI_SUPPORTED_CLASS_NAMES,
        freshness_score=ai_result.get("freshness_score"),
        freshness_level=ai_result.get("freshness_level"),
        detected_issues=ai_result.get("detected_issues") or [],
        ai_confidence=ai_result.get("ai_confidence"),
        assessment_basis=payload["assessment_basis"],
        quality_assessment=payload.get("quality_assessment"),
        needs_manual_review=bool(payload.get("needs_manual_review", False)),
        review_reasons=payload.get("review_reasons") or [],
        spoilage_ratio_pct=payload.get("spoilage_ratio_pct"),
        spoilage_profile=payload.get("spoilage_profile"),
    )


def _to_scan_result(scan: models.ScanResult) -> schemas.ScanResult:
    external_payload = scan.external_api_response or {}
    quality_assessment = external_payload.get("quality_assessment") or {}
    manual_review = quality_assessment.get("manual_review") if isinstance(quality_assessment, dict) else {}
    areas = quality_assessment.get("areas") if isinstance(quality_assessment, dict) else {}
    threshold_profile = quality_assessment.get("reference_threshold_profile") if isinstance(quality_assessment, dict) else {}

    return schemas.ScanResult(
        id=scan.id,
        user_id=scan.user_id,
        product_id=scan.product_id,
        freshness_score=scan.freshness_score,
        freshness_level=scan.freshness_level,
        detected_issues=scan.detected_issues,
        ai_confidence=scan.ai_confidence,
        status=scan.status,
        created_at=scan.created_at,
        processing_time=scan.processing_time,
        assessment_basis=external_payload.get("assessment_basis"),
        quality_assessment=quality_assessment,
        needs_manual_review=bool(
            external_payload.get("needs_manual_review")
            if external_payload.get("needs_manual_review") is not None
            else manual_review.get("needs_manual_review", False)
        ),
        review_reasons=external_payload.get("review_reasons") or manual_review.get("review_reasons") or [],
        spoilage_ratio_pct=external_payload.get("spoilage_ratio_pct") or areas.get("spoilage_ratio_pct"),
        spoilage_profile=external_payload.get("spoilage_profile") or threshold_profile.get("profile"),
    )


def mock_ai_scan(
    image_url: str,
    product_id: Optional[int] = None,
    *,
    indicators: Optional[dict] = None,
    commodity_group: str = "produce",
) -> dict:
    """
    Multi-path scan:
    1) Standards-based scoring when structured indicators are available.
    2) Visual spoilage quantification from image.
    3) Mock fallback for development continuity.
    """
    allow_provisional = os.getenv("ALLOW_PROVISIONAL_FRESHNESS_THRESHOLDS", "False").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    standards_result = evaluate_freshness_with_standards(
        indicators,
        default_profile=commodity_group if commodity_group in {"produce", "meat", "fish"} else "produce",
        allow_provisional=allow_provisional,
    )
    if standards_result:
        return standards_result

    visual_result = evaluate_visual_spoilage(image_url, indicators=indicators)
    if visual_result:
        return visual_result

    freshness_score = random.randint(40, 95)
    if freshness_score >= 80:
        freshness_level = "fresh"
    elif freshness_score >= 60:
        freshness_level = "good"
    elif freshness_score >= 40:
        freshness_level = "moderate"
    else:
        freshness_level = "expiring"

    possible_issues = [
        "slight_bruising",
        "color_discoloration",
        "minor_mold",
        "stem_damage",
        "skin_wrinkles",
    ]
    detected_issues = []
    if freshness_score < 70:
        detected_issues = random.sample(possible_issues, random.randint(1, 2))

    needs_review = freshness_score < 60 or len(detected_issues) > 0
    review_reasons = ["fallback_mock_engine"] if needs_review else []

    return {
        "assessment_basis": "model_inference_mock_v1",
        "freshness_score": freshness_score,
        "freshness_level": freshness_level,
        "detected_issues": detected_issues,
        "ai_confidence": random.randint(75, 99),
        "processing_time_ms": random.randint(500, 2000),
        "needs_manual_review": needs_review,
        "review_reasons": review_reasons,
        "spoilage_ratio_pct": None,
        "spoilage_profile": commodity_group,
        "quality_assessment": {
            "method": "qualitative_fallback",
            "note": "No quantitative inspection indicators were provided.",
            "image_url": image_url,
            "product_id": product_id,
        },
    }


def _create_feedback_event(
    db: Session,
    current_user: models.User,
    feedback: schemas.ScanFeedbackCreate,
    scan: Optional[models.ScanResult] = None,
) -> models.ScanFeedbackEvent:
    event = models.ScanFeedbackEvent(
        scan_id=scan.id if scan else feedback.scan_id,
        user_id=current_user.id,
        source=feedback.source,
        image_url=feedback.image_url,
        model_version=feedback.model_version,
        predicted_label=feedback.predicted_label,
        predicted_status=feedback.predicted_status,
        predicted_confidence=feedback.predicted_confidence,
        is_correct=feedback.is_correct,
        corrected_label=feedback.corrected_label,
        corrected_status=feedback.corrected_status,
        notes=feedback.notes,
        extra_metadata=feedback.metadata,
    )
    db.add(event)
    db.flush()
    return event


@router.post("", response_model=schemas.ScanResult)
def create_scan(
    scan_create: schemas.ScanCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create scan record and process with standards/visual quantification pipeline."""
    db_scan = models.ScanResult(
        user_id=current_user.id,
        product_id=scan_create.product_id,
        image_url=scan_create.image_url,
        scan_method=scan_create.scan_method,
        status="processing",
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)

    start_time = datetime.datetime.utcnow()
    try:
        inspection_indicators = scan_create.inspection_indicators or {}
        if scan_create.commodity_group:
            inspection_indicators = {
                **inspection_indicators,
                "commodity_group": scan_create.commodity_group,
            }

        ai_result = mock_ai_scan(
            scan_create.image_url,
            scan_create.product_id,
            indicators=inspection_indicators,
            commodity_group=scan_create.commodity_group or "produce",
        )
        processing_time_ms = round((datetime.datetime.utcnow() - start_time).total_seconds() * 1000.0, 2)
        if ai_result.get("processing_time_ms") is None:
            ai_result["processing_time_ms"] = processing_time_ms
        db_scan.freshness_score = ai_result["freshness_score"]
        db_scan.freshness_level = ai_result["freshness_level"]
        db_scan.detected_issues = ai_result["detected_issues"]
        db_scan.ai_confidence = ai_result["ai_confidence"]
        db_scan.external_api_response = _compose_scan_payload(ai_result)
        db_scan.status = "completed"
        db_scan.processing_time = (datetime.datetime.utcnow() - start_time).total_seconds()
        db.commit()
        db.refresh(db_scan)
        record_scan_event(
            outcome="completed",
            assessment_basis=ai_result.get("assessment_basis", "model_inference_mock_v1"),
        )
    except Exception as exc:
        db_scan.status = "failed"
        db.commit()
        record_scan_event(outcome="failed", assessment_basis="unknown")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan processing failed: {exc}",
        ) from exc

    return _to_scan_result(db_scan)


async def _save_scan_upload(image_file: UploadFile) -> str:
    """[H2] Validate (extension + magic bytes + size limit 10MB) rồi lưu file."""
    content = await validate_image_upload(image_file, allowed_extensions=ALLOWED_SCAN_EXTENSIONS)
    extension = Path(image_file.filename).suffix.lower()
    SCAN_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"scan_{uuid.uuid4().hex}{extension}"
    output_path = SCAN_UPLOAD_DIR / file_name
    output_path.write_bytes(content)
    return f"/uploads/scans/{file_name}"


def _parse_tfjs_predictions(raw_value: Optional[str]) -> list[float]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="tfjs_predictions_json không hợp lệ") from exc

    if not isinstance(parsed, list):
        raise HTTPException(status_code=400, detail="tfjs_predictions_json phải là mảng số")

    predictions: list[float] = []
    for value in parsed:
        numeric_value = _to_float(value)
        if numeric_value is None:
            raise HTTPException(status_code=400, detail="tfjs_predictions_json chứa giá trị không hợp lệ")
        predictions.append(float(numeric_value))
    return predictions


def _store_ood_log(
    db: Session,
    *,
    order_id: Optional[int],
    max_confidence: float,
) -> models.OODLog:
    ood_log = models.OODLog(
        user_id=None,
        order_id=order_id,
        max_confidence=max_confidence,
    )
    db.add(ood_log)
    db.commit()
    db.refresh(ood_log)
    return ood_log


@router.post("/quick-analyze", response_model=schemas.QuickScanResponse)
async def quick_analyze_scan(
    image_file: Optional[UploadFile] = File(default=None),
    image_url: Optional[str] = Form(default=None),
    commodity_group: str = Form(default="produce"),
    spoilage_profile: Optional[str] = Form(default=None),
    reference_width_mm: Optional[float] = Form(default=None),
    reference_width_px: Optional[float] = Form(default=None),
    tfjs_predictions_json: Optional[str] = Form(default=None),
    order_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
):
    """
    Quick scan endpoint for frontend upload flow.

    - Accepts multipart upload (`image_file`) or direct URL/path (`image_url`).
    - Returns quantified spoilage metrics + manual-review gate.
    - No auth required; does not persist scan history.
    """
    if image_file is None and not image_url:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp image_file hoặc image_url")

    resolved_image_url = image_url
    if image_file is not None:
        resolved_image_url = await _save_scan_upload(image_file)

    tfjs_predictions = _parse_tfjs_predictions(tfjs_predictions_json)
    ood_threshold = get_ood_threshold()

    # Lop bao ve OOD: neu xac suat cao nhat van thap hon nguong thi khong tra ket qua AI.
    if tfjs_predictions and is_out_of_distribution(tfjs_predictions, threshold=ood_threshold):
        max_confidence = round(max(tfjs_predictions), 4)
        _store_ood_log(
            db,
            order_id=order_id,
            max_confidence=max_confidence,
        )
        record_scan_event(outcome="ood", assessment_basis="tfjs_client_ood_v1")
        return schemas.QuickScanResponse(
            status="ood",
            message=(
                "Không nhận diện được thực phẩm này. Vui lòng chụp lại ảnh rõ hơn "
                "hoặc thực phẩm này chưa được AI hỗ trợ."
            ),
            max_confidence=max_confidence,
            supported_classes=AI_SUPPORTED_CLASS_NAMES,
            freshness_score=None,
            freshness_level=None,
            detected_issues=[],
            ai_confidence=round(max_confidence * 100.0, 2),
            assessment_basis="tfjs_client_ood_v1",
            quality_assessment={
                "ood_threshold": ood_threshold,
                "predictions_count": len(tfjs_predictions),
            },
            needs_manual_review=True,
            review_reasons=["out_of_distribution_detected"],
            spoilage_ratio_pct=None,
            spoilage_profile=spoilage_profile or commodity_group or "produce",
        )

    indicators: dict[str, Any] = {"commodity_group": commodity_group}
    if spoilage_profile:
        indicators["spoilage_profile"] = spoilage_profile
    if _to_float(reference_width_mm) and _to_float(reference_width_px):
        indicators["reference_width_mm"] = float(reference_width_mm)
        indicators["reference_width_px"] = float(reference_width_px)

    start_time = datetime.datetime.utcnow()
    ai_result = mock_ai_scan(
        str(resolved_image_url),
        None,
        indicators=indicators,
        commodity_group=commodity_group or "produce",
    )
    processing_time_ms = round((datetime.datetime.utcnow() - start_time).total_seconds() * 1000.0, 2)
    if ai_result.get("processing_time_ms") is None:
        ai_result["processing_time_ms"] = processing_time_ms

    record_scan_event(outcome="completed", assessment_basis=ai_result.get("assessment_basis", "unknown"))
    return _build_quick_scan_response(ai_result)


@router.get("", response_model=List[schemas.ScanResult])
def list_scans(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List current user's scan history."""
    query = db.query(models.ScanResult).filter(models.ScanResult.user_id == current_user.id)
    if status:
        query = query.filter(models.ScanResult.status == status)
    scans = query.order_by(models.ScanResult.created_at.desc()).offset(skip).limit(limit).all()
    return [_to_scan_result(scan) for scan in scans]


@router.get("/{scan_id}", response_model=schemas.ScanResult)
def get_scan(
    scan_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get scan details by ID."""
    scan = (
        db.query(models.ScanResult)
        .filter(models.ScanResult.id == scan_id, models.ScanResult.user_id == current_user.id)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    return _to_scan_result(scan)


@router.post("/feedback-events", response_model=schemas.ScanFeedbackResponse)
def create_feedback_event(
    feedback: schemas.ScanFeedbackCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Store scanner feedback as structured training data.

    This endpoint supports feedback from local TFJS scanner and future backend AI scan.
    """
    linked_scan = None
    if feedback.scan_id is not None:
        linked_scan = (
            db.query(models.ScanResult)
            .filter(
                models.ScanResult.id == feedback.scan_id,
                models.ScanResult.user_id == current_user.id,
            )
            .first()
        )
        if not linked_scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found for feedback",
            )

    if not feedback.is_correct and not feedback.corrected_label:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="corrected_label is required when is_correct is false",
        )

    event = _create_feedback_event(
        db=db,
        current_user=current_user,
        feedback=feedback,
        scan=linked_scan,
    )
    db.commit()
    db.refresh(event)
    return event


@router.post("/{scan_id}/feedback")
def submit_scan_feedback(
    scan_id: int,
    feedback: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Backward-compatible feedback endpoint linked to an existing scan."""
    scan = (
        db.query(models.ScanResult)
        .filter(models.ScanResult.id == scan_id, models.ScanResult.user_id == current_user.id)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    if scan.external_api_response is None:
        scan.external_api_response = {}
    scan.external_api_response["user_feedback"] = feedback

    # Best-effort normalization into structured feedback event.
    normalized_feedback = schemas.ScanFeedbackCreate(
        source=str(feedback.get("source") or "legacy_scan_feedback"),
        scan_id=scan_id,
        image_url=feedback.get("image_url") or scan.image_url,
        model_version=feedback.get("model_version"),
        predicted_label=str(feedback.get("predicted_label") or "unknown"),
        predicted_status=str(feedback.get("predicted_status") or "unknown"),
        predicted_confidence=float(feedback.get("predicted_confidence") or 0.0),
        is_correct=bool(feedback.get("is_correct", True)),
        corrected_label=feedback.get("corrected_label"),
        corrected_status=feedback.get("corrected_status"),
        notes=feedback.get("notes"),
        metadata=feedback.get("metadata") if isinstance(feedback.get("metadata"), dict) else None,
    )

    _create_feedback_event(db=db, current_user=current_user, feedback=normalized_feedback, scan=scan)
    db.commit()

    return {
        "success": True,
        "message": "Feedback saved for model retraining.",
        "scan_id": scan.id,
    }
