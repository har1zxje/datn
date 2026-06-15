from io import BytesIO
from pathlib import Path
import json
import os
import sys
import uuid
import datetime

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from sqlalchemy.exc import IntegrityError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///./freshfood_test.db")
os.environ.setdefault("ENABLE_METRICS", "True")

import models
from database import SessionLocal
from main import app


client = TestClient(app)


def _make_unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _create_and_login_user(username: str, password: str) -> str:
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

    login_response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def _create_product(
    quantity: int = 5,
    *,
    ai_supported: bool = False,
    ai_class_name: str | None = None,
) -> models.Product:
    category_name = _make_unique("category")
    product_name = _make_unique("product")

    with SessionLocal() as db:
        category = models.Category(name=category_name, slug=category_name, is_active=True)
        db.add(category)
        db.flush()

        product = models.Product(
            name=product_name,
            slug=product_name,
            description="freshness confirmation test product",
            category_id=category.id,
            price=12000,
            quantity=quantity,
            low_stock_threshold=2,
            unit="kg",
            stock_status="in_stock",
            is_active=True,
            ai_supported=ai_supported,
            ai_class_name=ai_class_name,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product


def _build_test_image_bytes() -> bytes:
    image = Image.new("RGB", (220, 220), (242, 242, 242))
    draw = ImageDraw.Draw(image)
    draw.ellipse((30, 30, 190, 190), fill=(118, 175, 88))
    draw.ellipse((95, 95, 145, 145), fill=(90, 60, 35))

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_submit_freshness_confirmation_records_review_and_rewards_points():
    token = _create_and_login_user(_make_unique("customer"), "123456")
    product = _create_product(quantity=5)

    create_order_response = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [{"product_id": product.id, "quantity": 1}],
            "shipping_address": "123 Test Street",
            "shipping_city": "Ho Chi Minh City",
            "shipping_phone": "0900000000",
            "payment_method": "cod",
            "notes": "freshness confirmation flow",
        },
    )
    assert create_order_response.status_code == 200
    order_payload = create_order_response.json()
    order_id = order_payload["id"]
    order_item_id = order_payload["items"][0]["id"]
    user_id = order_payload["user_id"]

    delivered_at = datetime.datetime.utcnow() - datetime.timedelta(hours=2)
    with SessionLocal() as db:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        assert order is not None
        order.status = models.OrderStatus.DELIVERED
        order.delivered_at = delivered_at
        db.commit()

    eligibility_response = client.get(
        f"/api/orders/{order_id}/freshness-confirmation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert eligibility_response.status_code == 200
    eligibility_payload = eligibility_response.json()
    assert eligibility_payload["is_available"] is True
    assert eligibility_payload["already_confirmed"] is False
    assert eligibility_payload["reward_points"] == 100
    assert eligibility_payload["correct_bonus_points"] == 50
    assert eligibility_payload["incorrect_bonus_points"] == 100

    image_bytes = _build_test_image_bytes()
    payload = {
        "reviews": [
            {
                "order_item_id": order_item_id,
                "product_id": product.id,
                "image_field": "image_0",
                "is_public": True,
                "predicted_label": "apple",
                "predicted_result": "fresh",
                "confidence": 0.91,
                "is_prediction_correct": True,
            }
        ]
    }

    submit_response = client.post(
        f"/api/orders/{order_id}/freshness-confirmation",
        headers={"Authorization": f"Bearer {token}"},
        data={"payload": json.dumps(payload)},
        files={"image_0": ("freshness.png", image_bytes, "image/png")},
    )
    assert submit_response.status_code == 200
    submit_payload = submit_response.json()
    assert submit_payload["success"] is True
    assert submit_payload["awarded_points"] == 150
    assert submit_payload["loyalty_points"] >= 150
    assert submit_payload["all_predictions_correct"] is True
    assert submit_payload["complaint_available"] is False
    assert submit_payload["voucher"] is None
    assert len(submit_payload["reviews"]) == 1
    assert submit_payload["reviews"][0]["freshness_score"] == 91
    assert submit_payload["reviews"][0]["predicted_label"] == "apple"
    assert submit_payload["reviews"][0]["correct_label"] == "apple"
    assert submit_payload["reviews"][0]["correct_result"] == "fresh"
    assert submit_payload["reviews"][0]["reward_points"] == 150

    with SessionLocal() as db:
        review = db.query(models.FreshnessReview).filter(models.FreshnessReview.order_id == order_id).first()
        assert review is not None
        assert review.user_id == user_id
        assert review.product_id == product.id
        assert review.freshness_score == 91
        assert review.ai_label == "fresh"
        assert review.predicted_label == "apple"
        assert review.correct_label == "apple"
        assert review.correct_result == "fresh"
        assert review.reward_points == 150
        assert review.voucher_id is None
        assert review.image_url.startswith("/uploads/freshness_reviews/")

        user = db.query(models.User).filter(models.User.id == user_id).first()
        assert user is not None
        assert int(user.loyalty_points or 0) >= 150


def test_freshness_confirmation_eligibility_returns_ai_support_flags():
    token = _create_and_login_user(_make_unique("customer"), "123456")
    product = _create_product(quantity=3, ai_supported=True, ai_class_name="apple")

    create_order_response = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [{"product_id": product.id, "quantity": 1}],
            "shipping_address": "123 Test Street",
            "shipping_city": "Ho Chi Minh City",
            "shipping_phone": "0900000000",
            "payment_method": "cod",
        },
    )
    assert create_order_response.status_code == 200
    order_id = create_order_response.json()["id"]

    with SessionLocal() as db:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        assert order is not None
        order.status = models.OrderStatus.DELIVERED
        order.delivered_at = datetime.datetime.utcnow()
        db.commit()

    eligibility_response = client.get(
        f"/api/orders/{order_id}/freshness-confirmation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert eligibility_response.status_code == 200
    item_payload = eligibility_response.json()["items"][0]
    assert item_payload["ai_supported"] is True
    assert item_payload["ai_class_name"] == "apple"


def test_submit_freshness_confirmation_incorrect_prediction_and_spoiled_result_creates_voucher():
    token = _create_and_login_user(_make_unique("customer"), "123456")
    product = _create_product(quantity=5, ai_supported=False, ai_class_name=None)

    create_order_response = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [{"product_id": product.id, "quantity": 1}],
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

    image_bytes = _build_test_image_bytes()
    payload = {
        "reviews": [
            {
                "order_item_id": order_item_id,
                "product_id": product.id,
                "image_field": "image_0",
                "predicted_label": "apple",
                "predicted_result": "fresh",
                "confidence": 0.77,
                "is_prediction_correct": False,
                "correct_label": "banana",
                "correct_result": "spoiled",
                "manual_note": "Sai nhãn và thực tế sản phẩm đã hỏng",
                "is_public": True,
            }
        ]
    }

    submit_response = client.post(
        f"/api/orders/{order_id}/freshness-confirmation",
        headers={"Authorization": f"Bearer {token}"},
        data={"payload": json.dumps(payload)},
        files={"image_0": ("freshness.png", image_bytes, "image/png")},
    )
    assert submit_response.status_code == 200
    submit_payload = submit_response.json()
    assert submit_payload["awarded_points"] == 200
    assert submit_payload["all_predictions_correct"] is False
    assert submit_payload["complaint_available"] is True
    assert submit_payload["voucher"] is not None
    assert submit_payload["reviews"][0]["correct_label"] == "banana"
    assert submit_payload["reviews"][0]["correct_result"] == "spoiled"
    assert submit_payload["reviews"][0]["reward_points"] == 200

    with SessionLocal() as db:
        review = db.query(models.FreshnessReview).filter(models.FreshnessReview.order_id == order_id).first()
        assert review is not None
        assert review.manual_rating == "spoiled"
        assert review.manual_note == "Sai nhãn và thực tế sản phẩm đã hỏng"
        assert review.ai_label == "fresh"
        assert review.correct_result == "spoiled"
        assert review.voucher_id is not None

        voucher = db.query(models.GeneratedVoucher).filter(models.GeneratedVoucher.id == review.voucher_id).first()
        assert voucher is not None
        assert voucher.source_order_id == order_id


def test_submit_freshness_confirmation_allows_multiple_items_in_same_order():
    token = _create_and_login_user(_make_unique("customer"), "123456")
    product_a = _create_product(quantity=5, ai_supported=False, ai_class_name=None)
    product_b = _create_product(quantity=5, ai_supported=False, ai_class_name=None)

    create_order_response = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [
                {"product_id": product_a.id, "quantity": 1},
                {"product_id": product_b.id, "quantity": 1},
            ],
            "shipping_address": "123 Test Street",
            "shipping_city": "Ho Chi Minh City",
            "shipping_phone": "0900000000",
            "payment_method": "cod",
        },
    )
    assert create_order_response.status_code == 200
    order_payload = create_order_response.json()
    order_id = order_payload["id"]
    order_items = order_payload["items"]

    with SessionLocal() as db:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        assert order is not None
        order.status = models.OrderStatus.DELIVERED
        order.delivered_at = datetime.datetime.utcnow()
        db.commit()

    image_bytes = _build_test_image_bytes()
    payload = {
        "reviews": [
            {
                "order_item_id": order_items[0]["id"],
                "product_id": product_a.id,
                "image_field": "image_0",
                "predicted_label": "apple",
                "predicted_result": "fresh",
                "confidence": 0.83,
                "is_prediction_correct": True,
                "is_public": True,
            },
            {
                "order_item_id": order_items[1]["id"],
                "product_id": product_b.id,
                "image_field": "image_1",
                "predicted_label": "banana",
                "predicted_result": "fresh",
                "confidence": 0.71,
                "is_prediction_correct": True,
                "is_public": True,
            },
        ]
    }

    submit_response = client.post(
        f"/api/orders/{order_id}/freshness-confirmation",
        headers={"Authorization": f"Bearer {token}"},
        data={"payload": json.dumps(payload)},
        files={
            "image_0": ("freshness-a.png", image_bytes, "image/png"),
            "image_1": ("freshness-b.png", image_bytes, "image/png"),
        },
    )
    assert submit_response.status_code == 200
    submit_payload = submit_response.json()
    assert submit_payload["success"] is True
    assert submit_payload["awarded_points"] == 150
    assert len(submit_payload["reviews"]) == 2


def test_freshness_review_unique_constraint_is_per_order_item_and_user():
    token = _create_and_login_user(_make_unique("customer"), "123456")
    product_a = _create_product(quantity=5)
    product_b = _create_product(quantity=5)

    create_order_response = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [
                {"product_id": product_a.id, "quantity": 1},
                {"product_id": product_b.id, "quantity": 1},
            ],
            "shipping_address": "123 Test Street",
            "shipping_city": "Ho Chi Minh City",
            "shipping_phone": "0900000000",
            "payment_method": "cod",
        },
    )
    assert create_order_response.status_code == 200
    order_payload = create_order_response.json()
    order_id = order_payload["id"]
    user_id = order_payload["user_id"]
    first_item_id = order_payload["items"][0]["id"]
    second_item_id = order_payload["items"][1]["id"]

    with SessionLocal() as db:
        db.add_all(
            [
                models.FreshnessReview(
                    order_id=order_id,
                    order_item_id=first_item_id,
                    user_id=user_id,
                    product_id=product_a.id,
                    image_url="/uploads/freshness_reviews/review-1.png",
                    predicted_label="apple",
                    predicted_result="fresh",
                    correct_label="apple",
                    correct_result="fresh",
                    is_public=True,
                ),
                models.FreshnessReview(
                    order_id=order_id,
                    order_item_id=second_item_id,
                    user_id=user_id,
                    product_id=product_b.id,
                    image_url="/uploads/freshness_reviews/review-2.png",
                    predicted_label="banana",
                    predicted_result="fresh",
                    correct_label="banana",
                    correct_result="fresh",
                    is_public=True,
                ),
            ]
        )
        db.commit()

        db.add(
            models.FreshnessReview(
                order_id=order_id,
                order_item_id=first_item_id,
                user_id=user_id,
                product_id=product_a.id,
                image_url="/uploads/freshness_reviews/review-3.png",
                predicted_label="apple",
                predicted_result="fresh",
                correct_label="apple",
                correct_result="fresh",
                is_public=True,
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
