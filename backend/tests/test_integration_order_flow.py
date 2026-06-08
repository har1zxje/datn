"""
[M6] Integration tests — order creation + stock deduction flow.
Uses TestClient with in-memory SQLite (see conftest.py).
"""
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

import models
from utils.auth import hash_password, create_access_token


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _create_user(db, *, username="testuser", email="test@example.com", is_admin=False):
    role = models.UserRole.ADMIN if is_admin else models.UserRole.CUSTOMER
    user = models.User(
        username=username,
        email=email,
        hashed_password=hash_password("Password123"),
        full_name="Test User",
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def _create_category(db):
    cat = models.Category(name="Rau cu", slug="rau-cu", is_active=True)
    db.add(cat)
    db.flush()
    return cat


def _create_product(db, category_id, *, name="Rau Muong", price=50000, quantity=20):
    product = models.Product(
        name=name,
        slug=name.lower().replace(" ", "-"),
        price=Decimal(str(price)),
        category_id=category_id,
        quantity=quantity,
        stock_status="in_stock",
        is_active=True,
    )
    db.add(product)
    db.flush()
    return product


def _auth_headers(user_id: int) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


# ─── Tests ───────────────────────────────────────────────────────────────────

class TestAuthEndpoints:
    def test_register_success(self, client, db_session):
        resp = client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "Password123",
            "full_name": "New User",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data

    def test_register_duplicate_email_fails(self, client, db_session):
        _create_user(db_session, username="dup_user", email="dup@example.com")
        db_session.commit()

        resp = client.post("/api/auth/register", json={
            "username": "dup_user2",
            "email": "dup@example.com",
            "password": "Password123",
            "full_name": "Dup",
        })
        assert resp.status_code in (400, 409)

    def test_login_success(self, client, db_session):
        _create_user(db_session, username="loginuser", email="login@example.com")
        db_session.commit()

        resp = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "Password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password_fails(self, client, db_session):
        _create_user(db_session, username="wrongpw", email="wrongpw@example.com")
        db_session.commit()

        resp = client.post("/api/auth/login", json={
            "email": "wrongpw@example.com",
            "password": "WrongPassword",
        })
        assert resp.status_code == 401


class TestOrderCreation:
    def test_create_order_success_deducts_stock(self, client, db_session):
        user = _create_user(db_session, username="buyer1", email="buyer1@example.com")
        cat = _create_category(db_session)
        product = _create_product(db_session, cat.id, quantity=10)
        db_session.commit()

        resp = client.post(
            "/api/orders",
            json={
                "items": [{"product_id": product.id, "quantity": 2}],
                "shipping_address": "123 Test St",
                "shipping_city": "Hanoi",
                "shipping_phone": "0901234567",
                "payment_method": "cod",
            },
            headers=_auth_headers(user.id),
        )
        assert resp.status_code == 200, resp.text

        db_session.refresh(product)
        assert product.quantity == 8

    def test_create_order_insufficient_stock_fails(self, client, db_session):
        user = _create_user(db_session, username="buyer2", email="buyer2@example.com")
        cat = _create_category(db_session)
        product = _create_product(db_session, cat.id, quantity=1)
        db_session.commit()

        resp = client.post(
            "/api/orders",
            json={
                "items": [{"product_id": product.id, "quantity": 5}],
                "shipping_address": "123 Test St",
                "shipping_city": "Hanoi",
                "shipping_phone": "0901234567",
                "payment_method": "cod",
            },
            headers=_auth_headers(user.id),
        )
        assert resp.status_code == 400

    def test_create_order_calculates_tax_and_shipping(self, client, db_session):
        user = _create_user(db_session, username="buyer3", email="buyer3@example.com")
        cat = _create_category(db_session)
        product = _create_product(db_session, cat.id, price=100000, quantity=5)
        db_session.commit()

        resp = client.post(
            "/api/orders",
            json={
                "items": [{"product_id": product.id, "quantity": 1}],
                "shipping_address": "456 St",
                "shipping_city": "HCMC",
                "shipping_phone": "0909090909",
                "payment_method": "cod",
            },
            headers=_auth_headers(user.id),
        )
        assert resp.status_code == 200
        data = resp.json()
        # Subtotal = 100000; tax = 10000; shipping = 30000 (below threshold)
        assert float(data["subtotal"]) == 100000.0
        assert float(data["tax"]) == pytest.approx(10000.0, abs=1)
        assert float(data["shipping_fee"]) == pytest.approx(30000.0, abs=1)

    def test_admin_cannot_create_order(self, client, db_session):
        admin = _create_user(db_session, username="admin1", email="admin1@example.com", is_admin=True)
        cat = _create_category(db_session)
        product = _create_product(db_session, cat.id, quantity=10)
        db_session.commit()

        resp = client.post(
            "/api/orders",
            json={
                "items": [{"product_id": product.id, "quantity": 1}],
                "shipping_address": "X",
                "shipping_city": "Y",
                "shipping_phone": "0000000000",
                "payment_method": "cod",
            },
            headers=_auth_headers(admin.id),
        )
        assert resp.status_code == 403

    def test_create_order_free_shipping_above_threshold(self, client, db_session):
        user = _create_user(db_session, username="buyer4", email="buyer4@example.com")
        cat = _create_category(db_session)
        product = _create_product(db_session, cat.id, price=600000, quantity=5)
        db_session.commit()

        resp = client.post(
            "/api/orders",
            json={
                "items": [{"product_id": product.id, "quantity": 1}],
                "shipping_address": "Y",
                "shipping_city": "DN",
                "shipping_phone": "0911111111",
                "payment_method": "bank_transfer",
            },
            headers=_auth_headers(user.id),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["shipping_fee"]) == 0.0
