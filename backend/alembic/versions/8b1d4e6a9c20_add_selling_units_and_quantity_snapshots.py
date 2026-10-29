"""Add selling units and quantity snapshots.

Revision ID: 8b1d4e6a9c20
Revises: 7f4c2a1d9b60
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "8b1d4e6a9c20"
down_revision: Union[str, Sequence[str], None] = "7f4c2a1d9b60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "base_unit",
            sa.String(length=30),
            server_default="unit",
            nullable=False,
        ),
    )
    op.add_column(
        "products",
        sa.Column(
            "selling_units",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )

    op.add_column(
        "bill_items",
        sa.Column("unit_name", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "bill_items",
        sa.Column(
            "conversion_factor",
            sa.Numeric(14, 6),
            nullable=True,
        ),
    )
    op.add_column(
        "bill_items",
        sa.Column(
            "base_quantity",
            sa.Numeric(14, 3),
            nullable=True,
        ),
    )

    op.execute(
        sa.text(
            """
            UPDATE bill_items
            SET base_quantity = quantity
            WHERE base_quantity IS NULL
            """
        )
    )

    op.add_column(
        "inventory_movements",
        sa.Column(
            "entered_quantity",
            sa.Numeric(14, 3),
            nullable=True,
        ),
    )
    op.add_column(
        "inventory_movements",
        sa.Column("entered_unit", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "inventory_movements",
        sa.Column(
            "conversion_factor",
            sa.Numeric(14, 6),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("inventory_movements", "conversion_factor")
    op.drop_column("inventory_movements", "entered_unit")
    op.drop_column("inventory_movements", "entered_quantity")
    op.drop_column("bill_items", "base_quantity")
    op.drop_column("bill_items", "conversion_factor")
    op.drop_column("bill_items", "unit_name")
    op.drop_column("products", "selling_units")
    op.drop_column("products", "base_unit")
