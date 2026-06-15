"""add DB uniqueness fence for freshness review submissions

Revision ID: 20260610_01
Revises:
Create Date: 2026-06-10

This constraint is intentionally per (order_item_id, user_id). The application
stores one FreshnessReview row per order item, so a broader (order_id, user_id)
constraint would reject legitimate multi-item confirmations.
"""

from alembic import op


revision = "20260610_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM freshness_reviews fr
        USING freshness_reviews dup
        WHERE fr.id > dup.id
          AND fr.order_item_id = dup.order_item_id
          AND fr.user_id = dup.user_id
        """
    )
    op.create_unique_constraint(
        "uq_freshness_reviews_order_item_user",
        "freshness_reviews",
        ["order_item_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_freshness_reviews_order_item_user",
        "freshness_reviews",
        type_="unique",
    )
