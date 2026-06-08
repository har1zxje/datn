from pathlib import Path
import os
import sys
import uuid

from fastapi.testclient import TestClient

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

    list_response = client.get(
        "/api/admin/feedback-events?status=unread",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["unread_count"] >= 1
    assert any(item["id"] == feedback_id for item in payload["items"])

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
