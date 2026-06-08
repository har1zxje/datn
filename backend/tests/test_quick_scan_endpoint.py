from pathlib import Path
import sys
import os

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///./freshfood_test.db")
os.environ.setdefault("ENABLE_METRICS", "True")
from main import app


client = TestClient(app)


def _build_test_image_bytes() -> bytes:
    image = Image.new("RGB", (200, 200), (242, 242, 242))
    draw = ImageDraw.Draw(image)
    draw.ellipse((30, 30, 170, 170), fill=(118, 175, 88))
    draw.ellipse((95, 95, 145, 145), fill=(90, 60, 35))
    from io import BytesIO

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_quick_scan_upload_endpoint():
    image_bytes = _build_test_image_bytes()

    response = client.post(
        "/api/scans/quick-analyze",
        data={
            "commodity_group": "produce",
            "spoilage_profile": "apple",
            "reference_width_mm": "24.26",
            "reference_width_px": "96",
        },
        files={"image_file": ("sample.png", image_bytes, "image/png")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["assessment_basis"] in {
        "visual_spoilage_quantification_v2",
        "model_inference_mock_v1",
    }
    assert payload["freshness_level"] in {"fresh", "good", "moderate", "expiring"}
    assert "quality_assessment" in payload
    assert "needs_manual_review" in payload
    assert isinstance(payload.get("review_reasons"), list)


def test_quick_scan_returns_ood_when_client_confidence_is_too_low():
    image_bytes = _build_test_image_bytes()

    response = client.post(
        "/api/scans/quick-analyze",
        data={
            "commodity_group": "produce",
            "spoilage_profile": "apple",
            "tfjs_predictions_json": "[0.12, 0.18, 0.16]",
            "order_id": "101",
        },
        files={"image_file": ("sample.png", image_bytes, "image/png")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ood"
    assert payload["assessment_basis"] == "tfjs_client_ood_v1"
    assert payload["needs_manual_review"] is True
    assert payload["max_confidence"] == 0.18
    assert "out_of_distribution_detected" in payload["review_reasons"]
