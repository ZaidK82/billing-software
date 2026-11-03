"""Add product purchase prices and invoice purchase cost snapshots.

Revision ID: 4a9c2e7b1d60
Revises: c7d5e2a91f40
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4a9c2e7b1d60"
down_revision: Union[str, Sequence[str], None] = "c7d5e2a91f40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Current product purchase price per base unit.
    # NULL preserves existing products without inventing a cost.
    op.add_column(
        "products",
        sa.Column(
            "purchase_price",
            sa.Numeric(12, 2),
            nullable=True,
        ),
    )

    # Historical purchase cost per selected invoice unit.
    # NULL preserves existing invoices whose historical cost is unknown.
    op.add_column(
        "bill_items",
        sa.Column(
            "purchase_price_snapshot",
            sa.Numeric(12, 2),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "bill_items",
        "purchase_price_snapshot",
    )

    op.drop_column(
        "products",
        "purchase_price",
    )