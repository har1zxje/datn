from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

try:
    import numpy as np
except Exception:  # pragma: no cover - optional dependency guard
    np = None  # type: ignore[assignment]

try:
    from PIL import Image
except Exception:  # pragma: no cover - optional dependency guard
    Image = None  # type: ignore[assignment]


PROFILE_THRESHOLDS: dict[str, dict[str, float]] = {
    "apple": {"excellent_max_pct": 1.2, "acceptable_max_pct": 3.5, "warning_max_pct": 7.0, "critical_max_pct": 13.0},
    "banana": {"excellent_max_pct": 2.5, "acceptable_max_pct": 6.0, "warning_max_pct": 12.0, "critical_max_pct": 22.0},
    "tomato": {"excellent_max_pct": 1.8, "acceptable_max_pct": 4.5, "warning_max_pct": 9.0, "critical_max_pct": 16.0},
    "leafy": {"excellent_max_pct": 1.0, "acceptable_max_pct": 3.0, "warning_max_pct": 7.0, "critical_max_pct": 12.0},
    "cucumber": {"excellent_max_pct": 1.5, "acceptable_max_pct": 4.0, "warning_max_pct": 8.0, "critical_max_pct": 14.0},
    "potato": {"excellent_max_pct": 2.0, "acceptable_max_pct": 5.0, "warning_max_pct": 10.0, "critical_max_pct": 18.0},
    "meat": {"excellent_max_pct": 0.8, "acceptable_max_pct": 2.5, "warning_max_pct": 6.0, "critical_max_pct": 10.0},
    "fish": {"excellent_max_pct": 0.8, "acceptable_max_pct": 2.5, "warning_max_pct": 5.0, "critical_max_pct": 9.0},
    "produce": {"excellent_max_pct": 1.8, "acceptable_max_pct": 4.5, "warning_max_pct": 9.0, "critical_max_pct": 16.0},
    "other": {"excellent_max_pct": 2.0, "acceptable_max_pct": 5.0, "warning_max_pct": 10.0, "critical_max_pct": 18.0},
}


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _resolve_local_image_path(image_url: str, uploads_root: Path) -> Path | None:
    candidate = image_url.strip()
    if not candidate:
        return None

    if candidate.startswith("/uploads/"):
        return (uploads_root.parent / candidate.lstrip("/")).resolve()

    if candidate.startswith("file://"):
        return Path(candidate[7:]).resolve()

    path_candidate = Path(candidate)
    if path_candidate.is_absolute():
        return path_candidate.resolve()

    cwd_candidate = (Path.cwd() / path_candidate).resolve()
    if cwd_candidate.exists():
        return cwd_candidate

    backend_candidate = (uploads_root.parent / path_candidate).resolve()
    if backend_candidate.exists():
        return backend_candidate

    return None


def _load_image_bytes(image_url: str, uploads_root: Path) -> bytes | None:
    lowered = image_url.lower()
    if lowered.startswith("http://") or lowered.startswith("https://"):
        try:
            response = httpx.get(image_url, timeout=8.0, follow_redirects=True)
            response.raise_for_status()
        except Exception as exc:
            logger.warning("visual_spoilage: failed to fetch remote image %r — %s", image_url, exc)
            return None
        return response.content

    image_path = _resolve_local_image_path(image_url, uploads_root)
    if not image_path:
        logger.warning("visual_spoilage: cannot resolve local path for %r", image_url)
        return None
    if not image_path.exists() or not image_path.is_file():
        logger.warning("visual_spoilage: resolved path does not exist: %s", image_path)
        return None
    try:
        return image_path.read_bytes()
    except OSError as exc:
        logger.warning("visual_spoilage: cannot read file %s — %s", image_path, exc)
        return None


def _safe_open_image(image_bytes: bytes) -> Any | None:
    if Image is None:
        return None
    try:
        image = Image.open(BytesIO(image_bytes))
    except Exception:
        return None
    return image.convert("RGB")


def _majority_filter(mask: Any, min_neighbors: int = 3, iterations: int = 1) -> Any:
    filtered = mask.astype(bool)
    for _ in range(max(1, iterations)):
        neighbors = filtered.astype(np.uint8)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                shifted = np.roll(np.roll(filtered, dy, axis=0), dx, axis=1)
                if dy == -1:
                    shifted[-1, :] = False
                elif dy == 1:
                    shifted[0, :] = False
                if dx == -1:
                    shifted[:, -1] = False
                elif dx == 1:
                    shifted[:, 0] = False
                neighbors += shifted.astype(np.uint8)
        filtered = neighbors >= min_neighbors
    return filtered


def _find_components(mask: Any, max_components: int = 400) -> list[list[tuple[int, int]]]:
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    points = np.argwhere(mask)
    components: list[list[tuple[int, int]]] = []

    for y, x in points:
        if visited[y, x]:
            continue
        stack = [(int(y), int(x))]
        visited[y, x] = True
        comp: list[tuple[int, int]] = []
        while stack:
            cy, cx = stack.pop()
            comp.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    stack.append((ny, nx))
        components.append(comp)
        if len(components) >= max_components:
            break
    return components


def _largest_component(mask: Any) -> Any:
    components = _find_components(mask, max_components=600)
    if not components:
        return mask
    largest = max(components, key=len)
    filtered = np.zeros_like(mask, dtype=bool)
    for y, x in largest:
        filtered[y, x] = True
    return filtered


def _remove_small_components(mask: Any, min_area: int) -> Any:
    if min_area <= 1:
        return mask
    components = _find_components(mask, max_components=1200)
    filtered = np.zeros_like(mask, dtype=bool)
    for comp in components:
        if len(comp) < min_area:
            continue
        for y, x in comp:
            filtered[y, x] = True
    return filtered


def _mask_bbox(mask: Any) -> tuple[int, int, int, int] | None:
    ys, xs = np.where(mask)
    if ys.size == 0 or xs.size == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def _choose_spoilage_profile(indicators: dict[str, Any] | None) -> str:
    if not indicators:
        return "produce"
    raw = str(indicators.get("spoilage_profile") or indicators.get("commodity_group") or "produce").strip().lower()
    aliases = {
        "apples": "apple",
        "banana": "banana",
        "tomato": "tomato",
        "leafy_green": "leafy",
        "leafy_veg": "leafy",
        "greens": "leafy",
        "cucumber": "cucumber",
        "potato": "potato",
        "meat": "meat",
        "fish": "fish",
        "produce": "produce",
    }
    return aliases.get(raw, raw if raw in PROFILE_THRESHOLDS else "other")


def _score_from_spoilage_ratio(spoilage_ratio_pct: float, profile: str) -> float:
    cfg = PROFILE_THRESHOLDS.get(profile, PROFILE_THRESHOLDS["other"])
    excellent = cfg["excellent_max_pct"]
    acceptable = cfg["acceptable_max_pct"]
    warning = cfg["warning_max_pct"]
    critical = cfg["critical_max_pct"]

    points = [
        (0.0, 100.0),
        (excellent, 96.0),
        (acceptable, 82.0),
        (warning, 64.0),
        (critical, 38.0),
        (critical * 2.1, 10.0),
        (100.0, 0.0),
    ]
    value = max(0.0, min(100.0, spoilage_ratio_pct))
    for idx in range(1, len(points)):
        x0, y0 = points[idx - 1]
        x1, y1 = points[idx]
        if value <= x1:
            if x1 == x0:
                return y1
            ratio = (value - x0) / (x1 - x0)
            return y0 + ratio * (y1 - y0)
    return 0.0


def _to_level(score: float) -> str:
    if score >= 80:
        return "fresh"
    if score >= 65:
        return "good"
    if score >= 45:
        return "moderate"
    return "expiring"


def _measurement_scale(indicators: dict[str, Any] | None) -> float | None:
    if not indicators:
        return None
    reference_width_mm = _to_float(indicators.get("reference_width_mm"))
    reference_width_px = _to_float(indicators.get("reference_width_px"))
    if reference_width_mm and reference_width_px and reference_width_mm > 0 and reference_width_px > 0:
        return reference_width_mm / reference_width_px

    reference_diameter_mm = _to_float(indicators.get("reference_diameter_mm"))
    reference_diameter_px = _to_float(indicators.get("reference_diameter_px"))
    if (
        reference_diameter_mm
        and reference_diameter_px
        and reference_diameter_mm > 0
        and reference_diameter_px > 0
    ):
        return reference_diameter_mm / reference_diameter_px
    return None


def _laplacian_sharpness(luminance: Any, object_mask: Any) -> float:
    lap = (
        -4.0 * luminance
        + np.roll(luminance, 1, axis=0)
        + np.roll(luminance, -1, axis=0)
        + np.roll(luminance, 1, axis=1)
        + np.roll(luminance, -1, axis=1)
    )
    lap[0, :] = 0.0
    lap[-1, :] = 0.0
    lap[:, 0] = 0.0
    lap[:, -1] = 0.0
    values = lap[object_mask]
    if values.size == 0:
        return 0.0
    return float(np.var(values))


def evaluate_visual_spoilage(
    image_url: str,
    *,
    indicators: dict[str, Any] | None = None,
    uploads_root: Path | None = None,
) -> dict[str, Any] | None:
    if np is None or Image is None:
        return None

    uploads_dir = uploads_root or (Path(__file__).resolve().parent.parent / "uploads")
    image_bytes = _load_image_bytes(image_url, uploads_dir)
    if not image_bytes:
        return None

    image = _safe_open_image(image_bytes)
    if image is None:
        return None

    # Downscale to keep connected-component steps responsive.
    max_side = 640
    width, height = image.size
    scale = min(1.0, float(max_side) / float(max(width, height)))
    if scale < 1.0:
        image = image.resize((int(width * scale), int(height * scale)))

    rgb = np.asarray(image, dtype=np.uint8)
    if rgb.ndim != 3 or rgb.shape[2] != 3:
        return None

    height_px, width_px = rgb.shape[:2]
    rgb_f = rgb.astype(np.float32)
    r = rgb_f[:, :, 0]
    g = rgb_f[:, :, 1]
    b = rgb_f[:, :, 2]
    max_c = np.max(rgb_f, axis=2)
    min_c = np.min(rgb_f, axis=2)
    sat = max_c - min_c
    luminance = 0.299 * r + 0.587 * g + 0.114 * b

    border = np.concatenate(
        [rgb_f[0, :, :], rgb_f[-1, :, :], rgb_f[:, 0, :], rgb_f[:, -1, :]],
        axis=0,
    )
    bg_mean = border.mean(axis=0)
    color_dist = np.sqrt(np.sum((rgb_f - bg_mean) ** 2, axis=2))
    dist_threshold = max(16.0, float(np.percentile(color_dist, 60)))

    object_mask = ((color_dist > dist_threshold) | (sat > 20.0)) & (luminance > 8.0)
    object_mask = _majority_filter(object_mask, min_neighbors=4, iterations=2)
    object_mask = _largest_component(object_mask)

    object_area_px = int(np.count_nonzero(object_mask))
    total_area_px = int(height_px * width_px)
    if object_area_px <= 0 or (object_area_px / max(total_area_px, 1)) < 0.025:
        return None

    object_bbox = _mask_bbox(object_mask)
    if object_bbox is None:
        return None
    x0, y0, x1, y1 = object_bbox
    object_width_px = x1 - x0 + 1
    object_height_px = y1 - y0 + 1

    object_lum = luminance[object_mask]
    object_sat = sat[object_mask]
    lum_p25 = float(np.percentile(object_lum, 25))
    lum_p50 = float(np.percentile(object_lum, 50))
    sat_p50 = float(np.percentile(object_sat, 50))
    median_rgb = np.median(rgb_f[object_mask], axis=0)
    color_delta = np.sqrt(np.sum((rgb_f - median_rgb) ** 2, axis=2))

    dark_damage = luminance < max(22.0, lum_p25 * 0.70)
    brownish_damage = (r > g * 1.02) & (g > b) & (sat > max(11.0, sat_p50 * 0.35)) & (r > 50.0)
    discolor_damage = (color_delta > max(16.0, float(np.percentile(color_delta[object_mask], 70)))) & (
        luminance < lum_p50 * 1.12
    )
    damage_mask = object_mask & (dark_damage | brownish_damage | discolor_damage)
    damage_mask = _majority_filter(damage_mask, min_neighbors=4, iterations=1)
    damage_mask = _remove_small_components(
        damage_mask,
        min_area=max(8, int(object_area_px * 0.0035)),
    )

    damage_area_px = int(np.count_nonzero(damage_mask))
    spoilage_ratio_pct = round(100.0 * damage_area_px / max(object_area_px, 1), 2)

    profile = _choose_spoilage_profile(indicators)
    thresholds = PROFILE_THRESHOLDS.get(profile, PROFILE_THRESHOLDS["other"])
    freshness_score = round(max(0.0, min(100.0, _score_from_spoilage_ratio(spoilage_ratio_pct, profile))), 2)

    coverage = object_area_px / max(total_area_px, 1)
    coverage_quality = max(0.0, 1.0 - abs(coverage - 0.45) / 0.45)
    bg_lum = luminance[~object_mask]
    if bg_lum.size == 0:
        contrast = 0.45
    else:
        contrast = min(1.0, abs(float(np.mean(object_lum)) - float(np.mean(bg_lum))) / 85.0)
    sharpness = _laplacian_sharpness(luminance, object_mask)
    sharpness_quality = min(1.0, sharpness / 180.0)
    ai_confidence = round(
        min(97.0, 45.0 + 20.0 * coverage_quality + 15.0 * contrast + 17.0 * sharpness_quality),
        2,
    )

    manual_review_reasons: list[str] = []
    if ai_confidence < 68.0:
        manual_review_reasons.append("low_model_confidence")
    if sharpness < 45.0:
        manual_review_reasons.append("image_blur_or_low_texture")
    if coverage < 0.08:
        manual_review_reasons.append("object_too_small_in_frame")
    if coverage > 0.9:
        manual_review_reasons.append("object_touching_frame_edges")
    if object_area_px < 5000:
        manual_review_reasons.append("insufficient_object_pixels")
    if abs(spoilage_ratio_pct - thresholds["acceptable_max_pct"]) <= 0.7:
        manual_review_reasons.append("ratio_near_acceptance_boundary")
    if abs(spoilage_ratio_pct - thresholds["warning_max_pct"]) <= 1.0:
        manual_review_reasons.append("ratio_near_warning_boundary")
    needs_manual_review = bool(manual_review_reasons)

    scale_mm_per_px = _measurement_scale(indicators)
    object_width_mm = None
    object_height_mm = None
    object_area_mm2 = None
    damage_area_mm2 = None
    if scale_mm_per_px is not None:
        object_width_mm = round(object_width_px * scale_mm_per_px, 2)
        object_height_mm = round(object_height_px * scale_mm_per_px, 2)
        pixel_area_mm2 = scale_mm_per_px * scale_mm_per_px
        object_area_mm2 = round(object_area_px * pixel_area_mm2, 2)
        damage_area_mm2 = round(damage_area_px * pixel_area_mm2, 2)

    issues: list[str] = []
    if spoilage_ratio_pct >= thresholds["critical_max_pct"]:
        issues.append("critical_spoilage_area")
    elif spoilage_ratio_pct >= thresholds["warning_max_pct"]:
        issues.append("warning_spoilage_area")
    elif spoilage_ratio_pct >= thresholds["acceptable_max_pct"]:
        issues.append("minor_spoilage_area")
    if np.count_nonzero(object_mask & dark_damage) > (0.03 * object_area_px):
        issues.append("dark_discoloration_detected")
    if np.count_nonzero(object_mask & brownish_damage) > (0.02 * object_area_px):
        issues.append("brown_spot_like_region_detected")
    if needs_manual_review:
        issues.append("manual_review_recommended")

    return {
        "assessment_basis": "visual_spoilage_quantification_v2",
        "freshness_score": freshness_score,
        "freshness_level": _to_level(freshness_score),
        "detected_issues": sorted(set(issues)),
        "ai_confidence": ai_confidence,
        "processing_time_ms": None,
        "needs_manual_review": needs_manual_review,
        "review_reasons": sorted(set(manual_review_reasons)),
        "spoilage_ratio_pct": spoilage_ratio_pct,
        "spoilage_profile": profile,
        "quality_assessment": {
            "method": "image_area_ratio_quantification_v2",
            "formula": {
                "spoilage_ratio_pct": "100 * A_hong / A_tong",
                "freshness_score": "profile_piecewise_penalty(spoilage_ratio_pct)",
                "scale_mm_per_px": "reference_width_mm/reference_width_px (optional)",
            },
            "reference_threshold_profile": {
                **thresholds,
                "profile": profile,
            },
            "manual_review": {
                "needs_manual_review": needs_manual_review,
                "review_reasons": sorted(set(manual_review_reasons)),
            },
            "image_geometry": {
                "width_px": width_px,
                "height_px": height_px,
                "object_bbox_xyxy": [x0, y0, x1, y1],
                "object_width_px": object_width_px,
                "object_height_px": object_height_px,
            },
            "measurement_scale": {
                "mm_per_px": round(scale_mm_per_px, 6) if scale_mm_per_px is not None else None,
                "object_width_mm": object_width_mm,
                "object_height_mm": object_height_mm,
                "object_area_mm2": object_area_mm2,
                "damage_area_mm2": damage_area_mm2,
            },
            "areas": {
                "object_area_px": object_area_px,
                "damage_area_px": damage_area_px,
                "spoilage_ratio_pct": spoilage_ratio_pct,
            },
            "diagnostics": {
                "coverage_ratio": round(coverage, 4),
                "foreground_background_contrast": round(contrast, 4),
                "sharpness_variance_laplacian": round(sharpness, 2),
                "median_object_rgb": [round(float(v), 2) for v in median_rgb.tolist()],
            },
        },
    }
