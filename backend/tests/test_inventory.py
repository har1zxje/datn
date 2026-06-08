"""
[M6] Unit tests — utils/inventory.py
Covers: derive_stock_status, apply_stock_delta (with mocked DB session & product),
        set_product_quantity.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

import models
from utils.inventory import derive_stock_status, apply_stock_delta, set_product_quantity


def _make_product(quantity: int, product_id: int = 1) -> MagicMock:
    product = MagicMock(spec=models.Product)
    product.id = product_id
    product.quantity = quantity
    product.stock_status = "in_stock" if quantity > 0 else "out_of_stock"
    return product


def _make_db() -> MagicMock:
    db = MagicMock()
    db.add = MagicMock()
    return db


class TestDeriveStockStatus:
    def test_positive_quantity_is_in_stock(self):
        assert derive_stock_status(10) == "in_stock"

    def test_zero_quantity_is_out_of_stock(self):
        assert derive_stock_status(0) == "out_of_stock"

    def test_negative_quantity_is_out_of_stock(self):
        assert derive_stock_status(-1) == "out_of_stock"


class TestApplyStockDelta:
    def test_import_increases_quantity(self):
        product = _make_product(10)
        db = _make_db()
        apply_stock_delta(db, product, delta=5, user_id=1, note="test import")
        assert product.quantity == 15
        assert product.stock_status == "in_stock"

    def test_export_decreases_quantity(self):
        product = _make_product(10)
        db = _make_db()
        apply_stock_delta(db, product, delta=-4, user_id=1)
        assert product.quantity == 6

    def test_export_to_zero_sets_out_of_stock(self):
        product = _make_product(5)
        db = _make_db()
        apply_stock_delta(db, product, delta=-5, user_id=1)
        assert product.quantity == 0
        assert product.stock_status == "out_of_stock"

    def test_export_below_zero_raises(self):
        product = _make_product(3)
        db = _make_db()
        with pytest.raises(HTTPException) as exc_info:
            apply_stock_delta(db, product, delta=-10, user_id=1)
        assert exc_info.value.status_code == 400

    def test_zero_delta_returns_none(self):
        product = _make_product(5)
        db = _make_db()
        result = apply_stock_delta(db, product, delta=0, user_id=1)
        assert result is None

    def test_import_creates_transaction(self):
        product = _make_product(0)
        db = _make_db()
        tx = apply_stock_delta(db, product, delta=20, user_id=7, note="initial stock")
        assert tx is not None
        assert tx.type == models.TransactionType.IMPORT
        assert tx.quantity == 20

    def test_export_creates_transaction(self):
        product = _make_product(20)
        db = _make_db()
        tx = apply_stock_delta(db, product, delta=-3, user_id=2)
        assert tx is not None
        assert tx.type == models.TransactionType.EXPORT
        assert tx.quantity == 3


class TestSetProductQuantity:
    def test_sets_absolute_quantity(self):
        product = _make_product(10)
        db = _make_db()
        set_product_quantity(db, product, new_quantity=25, user_id=1)
        assert product.quantity == 25

    def test_none_quantity_only_refreshes_status(self):
        product = _make_product(5)
        db = _make_db()
        result = set_product_quantity(db, product, new_quantity=None, user_id=1)
        assert result is None
        assert product.quantity == 5

    def test_reduce_quantity_below_current(self):
        product = _make_product(20)
        db = _make_db()
        set_product_quantity(db, product, new_quantity=10, user_id=1)
        assert product.quantity == 10

    def test_increase_to_same_returns_none(self):
        product = _make_product(10)
        db = _make_db()
        result = set_product_quantity(db, product, new_quantity=10, user_id=1)
        assert result is None
