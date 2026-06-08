from pathlib import Path
import importlib.util
import os
import sys
import uuid

from fastapi.testclient import TestClient
import pytest

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


def _create_product(quantity: int = 10) -> models.Product:
    category_name = _make_unique("category")
    product_name = _make_unique("product")

    with SessionLocal() as db:
        category = models.Category(
            name=category_name,
            slug=category_name,
            is_active=True,
        )
        db.add(category)
        db.flush()

        product = models.Product(
            name=product_name,
            slug=product_name,
            description="test product",
            category_id=category.id,
            price=10000,
            quantity=quantity,
            low_stock_threshold=2,
            unit="kg",
            stock_status="in_stock" if quantity > 0 else "out_of_stock",
            is_active=True,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product


def test_manual_stock_transaction_updates_inventory_and_blocks_overdraw():
    token = _create_and_login_user(_make_unique("admin"), "admin123", is_admin=True)
    product = _create_product(quantity=10)

    export_response = client.post(
        "/api/admin/stock-transactions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": product.id,
            "type": "export",
            "quantity": 3,
            "note": "xuat test",
        },
    )
    assert export_response.status_code == 200
    assert export_response.json()["type"] == "export"
    assert export_response.json()["quantity"] == 3

    with SessionLocal() as db:
        updated_product = db.query(models.Product).filter(models.Product.id == product.id).first()
        assert updated_product is not None
        assert updated_product.quantity == 7
        assert updated_product.stock_status == "in_stock"

    overdraw_response = client.post(
        "/api/admin/stock-transactions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": product.id,
            "type": "export",
            "quantity": 99,
            "note": "qua ton",
        },
    )
    assert overdraw_response.status_code == 400

    with SessionLocal() as db:
        updated_product = db.query(models.Product).filter(models.Product.id == product.id).first()
        assert updated_product is not None
        assert updated_product.quantity == 7


def test_order_flow_records_stock_movements():
    token = _create_and_login_user(_make_unique("customer"), "123456")
    product = _create_product(quantity=5)

    create_response = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [{"product_id": product.id, "quantity": 2}],
            "shipping_address": "123 Test Street",
            "shipping_city": "Ho Chi Minh City",
            "shipping_phone": "0900000000",
            "payment_method": "cod",
            "notes": "test order",
        },
    )
    assert create_response.status_code == 200
    order_payload = create_response.json()
    order_id = order_payload["id"]
    order_number = order_payload["order_number"]

    with SessionLocal() as db:
        updated_product = db.query(models.Product).filter(models.Product.id == product.id).first()
        assert updated_product is not None
        assert updated_product.quantity == 3

        export_tx = (
            db.query(models.StockTransaction)
            .filter(models.StockTransaction.product_id == product.id)
            .order_by(models.StockTransaction.created_at.desc())
            .first()
        )
        assert export_tx is not None
        assert export_tx.type == models.TransactionType.EXPORT
        assert order_number in (export_tx.note or "")

    cancel_response = client.post(
        f"/api/orders/{order_id}/cancel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cancel_response.status_code == 200

    with SessionLocal() as db:
        restored_product = db.query(models.Product).filter(models.Product.id == product.id).first()
        assert restored_product is not None
        assert restored_product.quantity == 5

        import_tx = (
            db.query(models.StockTransaction)
            .filter(models.StockTransaction.product_id == product.id)
            .order_by(models.StockTransaction.created_at.desc())
            .first()
        )
        assert import_tx is not None
        assert import_tx.type == models.TransactionType.IMPORT
        assert order_number in (import_tx.note or "")


def test_stock_transactions_excel_import_and_export():
    if importlib.util.find_spec("openpyxl") is None:
        pytest.skip("openpyxl is not installed in this environment")

    import openpyxl

    token = _create_and_login_user(_make_unique("admin"), "admin123", is_admin=True)
    product = _create_product(quantity=10)

    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = "stock_transactions"
    worksheet.append(["product_id", "type", "quantity", "transaction_date", "note"])
    worksheet.append([product.id, "import", 5, "2026-06-08", "nhap excel"])
    worksheet.append([product.id, "export", 3, "2026-06-08", "xuat excel"])

    from io import BytesIO

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    import_response = client.post(
        "/api/admin/stock-transactions/import-excel",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "excel_file": (
                "stock-transactions.xlsx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert import_response.status_code == 200
    payload = import_response.json()
    assert payload["imported_count"] == 2

    with SessionLocal() as db:
        updated_product = db.query(models.Product).filter(models.Product.id == product.id).first()
        assert updated_product is not None
        assert updated_product.quantity == 12

    export_response = client.get(
        "/api/admin/stock-transactions/export-excel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "stock-transactions" in export_response.headers.get("content-disposition", "")
