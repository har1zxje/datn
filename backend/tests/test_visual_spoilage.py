from pathlib import Path

from PIL import Image, ImageDraw

from utils.visual_spoilage import evaluate_visual_spoilage


def _create_synthetic_food_image(path: Path) -> None:
    image = Image.new("RGB", (220, 220), (245, 245, 245))
    draw = ImageDraw.Draw(image)

    # Simulated food body.
    draw.ellipse((35, 35, 185, 185), fill=(120, 180, 90))
    # Simulated dark/brown damaged patch.
    draw.ellipse((95, 95, 145, 145), fill=(95, 65, 35))

    image.save(path)


def test_visual_spoilage_returns_none_when_image_not_found(tmp_path: Path) -> None:
    result = evaluate_visual_spoilage(str(tmp_path / "missing.jpg"))
    assert result is None


def test_visual_spoilage_quantification_from_local_file(tmp_path: Path) -> None:
    image_path = tmp_path / "food.jpg"
    _create_synthetic_food_image(image_path)

    result = evaluate_visual_spoilage(
        str(image_path),
        indicators={
            "reference_width_mm": 24.0,
            "reference_width_px": 60.0,
        },
    )

    assert result is not None
    assert result["assessment_basis"] == "visual_spoilage_quantification_v2"
    assert 0 <= result["freshness_score"] <= 100
    assert result["freshness_level"] in {"fresh", "good", "moderate", "expiring"}
    assert result["ai_confidence"] >= 0
    assert "needs_manual_review" in result
    assert isinstance(result["review_reasons"], list)

    quality_assessment = result["quality_assessment"]
    assert quality_assessment["method"] == "image_area_ratio_quantification_v2"

    spoilage_ratio_pct = quality_assessment["areas"]["spoilage_ratio_pct"]
    assert 5.0 <= spoilage_ratio_pct <= 30.0

    measurement_scale = quality_assessment["measurement_scale"]
    assert measurement_scale["mm_per_px"] is not None
    assert measurement_scale["object_width_mm"] is not None
    assert measurement_scale["object_height_mm"] is not None
