"""add structured freshness verification fields

Revision ID: 20260615_01
Revises: 20260610_01
Create Date: 2026-06-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260615_01"
down_revision = "20260610_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("freshness_reviews", sa.Column("predicted_label", sa.String(length=120), nullable=True))
    op.add_column("freshness_reviews", sa.Column("predicted_result", sa.String(length=40), nullable=True))
    op.add_column("freshness_reviews", sa.Column("is_prediction_correct", sa.Boolean(), nullable=True))
    op.add_column("freshness_reviews", sa.Column("correct_label", sa.String(length=120), nullable=True))
    op.add_column("freshness_reviews", sa.Column("correct_result", sa.String(length=40), nullable=True))
    op.add_column("freshness_reviews", sa.Column("reward_points", sa.Integer(), nullable=True))
    op.add_column("freshness_reviews", sa.Column("voucher_id", sa.Integer(), nullable=True))
    op.create_index("ix_freshness_reviews_voucher_id", "freshness_reviews", ["voucher_id"])

    op.add_column("generated_vouchers", sa.Column("source_order_id", sa.Integer(), nullable=True))
    op.create_index("ix_generated_vouchers_source_order_id", "generated_vouchers", ["source_order_id"])


def downgrade() -> None:
    op.drop_index("ix_generated_vouchers_source_order_id", table_name="generated_vouchers")
    op.drop_column("generated_vouchers", "source_order_id")

    op.drop_index("ix_freshness_reviews_voucher_id", table_name="freshness_reviews")
    op.drop_column("freshness_reviews", "voucher_id")
    op.drop_column("freshness_reviews", "reward_points")
    op.drop_column("freshness_reviews", "correct_result")
    op.drop_column("freshness_reviews", "correct_label")
    op.drop_column("freshness_reviews", "is_prediction_correct")
    op.drop_column("freshness_reviews", "predicted_result")
    op.drop_column("freshness_reviews", "predicted_label")
