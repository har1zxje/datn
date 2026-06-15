from pathlib import Path
from io import BytesIO
import datetime
import json
import os
import sys
import uuid

from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///./freshfood_test.db")
os.environ.setdefault("ENABLE_METRICS", "True")

import models
from database import SessionLocal
from main import app


client = TestClient(app)


def _make_unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _create_and_login_user(username: str, password: str, *, is_admin: bool = False) -> str:
    register_response = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": password,
            "full_name": username.title(),
        },
    )
    assert register_response.status_code == 201

    with SessionLocal() as db:
        user = db.query(models.User).filter(models.User.username == username).first()
        assert user is not None
        if is_admin:
            user.role = models.UserRole.ADMIN
            db.commit()

    login_response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def _build_test_image_bytes() -> bytes:
    image = Image.new("RGB", (120, 120), (230, 245, 230))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_admin_can_view_and_mark_ai_feedback_as_read():
    admin_token = _create_and_login_user(_make_unique("admin"), "admin123", is_admin=True)
    user_token = _create_and_login_user(_make_unique("user"), "123456")

    create_feedback_response = client.post(
        "/api/scans/feedback-events",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "source": "quick_scan",
            "predicted_label": "apple",
            "predicted_status": "moderate",
            "predicted_confidence": 81.5,
            "is_correct": False,
            "corrected_label": "banana",
            "corrected_status": "fresh",
            "notes": "Need manual review",
        },
    )
    assert create_feedback_response.status_code == 200
    feedback_id = create_feedback_response.json()["id"]

    stats_response = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert stats_response.status_code == 200
    assert stats_response.json()["unread_feedback_count"] >= 1
    assert len(stats_response.json()["last_7_days"]) == 7
    assert all("revenue" in point and "orders" in point for point in stats_response.json()["last_7_days"])

    list_response = client.get(
        "/api/admin/feedback-events?status=unread",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["unread_count"] >= 1
    assert any(item["id"] == feedback_id for item in payload["items"])
    assert payload["global_disputed_count"] >= 1

    disputed_response = client.get(
        "/api/admin/feedback-events?verdict=disputed",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert disputed_response.status_code == 200
    disputed_payload = disputed_response.json()
    assert any(item["id"] == feedback_id for item in disputed_payload["items"])

    mark_read_response = client.put(
        f"/api/admin/feedback-events/{feedback_id}/read",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert mark_read_response.status_code == 200
    assert mark_read_response.json()["is_read"] is True

    with SessionLocal() as db:
        updated_feedback = db.query(models.ScanFeedbackEvent).filter(models.ScanFeedbackEvent.id == feedback_id).first()
        assert updated_feedback is not None
        assert updated_feedback.is_read is True
        assert updated_feedback.read_at is not None


def test_admin_can_list_and_export_freshness_verification_reports():
    admin_token = _create_and_login_user(_make_unique("fresh-admin"), "admin123", is_admin=True)
    user_token = _create_and_login_user(_make_unique("fresh-user"), "123456")

    with SessionLocal() as db:
        category_name = _make_unique("category")
        product_name = _make_unique("product")
        category = models.Category(name=category_name, slug=category_name, is_active=True)
        db.add(category)
        db.flush()
        product = models.Product(
            name=product_name,
            slug=product_name,
            description="freshness admin report product",
            category_id=category.id,
            price=12000,
            quantity=10,
            low_stock_threshold=2,
            unit="kg",
            stock_status="in_stock",
            is_active=True,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        product_id = product.id

    create_order_response = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "items": [{"product_id": product_id, "quantity": 1}],
            "shipping_address": "123 Test Street",
            "shipping_city": "Ho Chi Minh City",
            "shipping_phone": "0900000000",
            "payment_method": "cod",
        },
    )
    assert create_order_response.status_code == 200
    order_payload = create_order_response.json()
    order_id = order_payload["id"]
    order_item_id = order_payload["items"][0]["id"]

    with SessionLocal() as db:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        assert order is not None
        order.status = models.OrderStatus.DELIVERED
        order.delivered_at = datetime.datetime.utcnow()
        db.commit()

    payload = {
        "reviews": [
            {
                "order_item_id": order_item_id,
                "product_id": product_id,
                "image_field": "image_0",
                "predicted_label": "apple",
                "predicted_result": "fresh",
                "confidence": 0.62,
                "is_prediction_correct": False,
                "correct_label": "banana",
                "correct_result": "spoiled",
                "manual_note": "Need admin visibility",
                "is_public": True,
            }
        ]
    }
    submit_response = client.post(
        f"/api/orders/{order_id}/freshness-confirmation",
        headers={"Authorization": f"Bearer {user_token}"},
        data={"payload": json.dumps(payload)},
        files={"image_0": ("freshness.png", _build_test_image_bytes(), "image/png")},
    )
    assert submit_response.status_code == 200

    list_response = client.get(
        "/api/admin/freshness-verification-reports?prediction_correct=incorrect&correct_result=spoiled&has_voucher=yes",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] >= 1
    matching_item = next((item for item in list_payload["items"] if item["order_id"] == order_id), None)
    assert matching_item is not None
    assert matching_item["manual_note"] == "Need admin visibility"

    export_response = client.get(
        "/api/admin/freshness-verification-reports/export-excel",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


def test_admin_freshness_verification_reports_accept_blank_date_filters():
    admin_token = _create_and_login_user(_make_unique("fresh-blank-admin"), "admin123", is_admin=True)

    list_response = client.get(
        "/api/admin/freshness-verification-reports?date_from=&date_to=&prediction_correct=all&correct_result=all&has_voucher=all&page=1&limit=12",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_response.status_code == 200

    export_response = client.get(
        "/api/admin/freshness-verification-reports/export-excel?date_from=&date_to=&prediction_correct=all&correct_result=all&has_voucher=all",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert export_response.status_code == 200
