"""Add invoice customer association and canonical unit snapshots.

Revision ID: c7d5e2a91f40
Revises: 8b1d4e6a9c20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c7d5e2a91f40"
down_revision: Union[str, Sequence[str], None] = "8b1d4e6a9c20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bills",
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_bills_customer_id_customers",
        "bills",
        "customers",
        ["customer_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_bills_customer_id",
        "bills",
        ["customer_id"],
        unique=False,
    )

    op.add_column(
        "bill_items",
        sa.Column(
            "base_unit_name",
            sa.String(length=30),
            nullable=True,
        ),
    )

    # Initialize canonical-unit labels for existing product-linked
    # invoice lines. Historical selling-unit and quantity snapshots
    # remain unchanged.
    op.execute(
        sa.text(
            """
            UPDATE bill_items AS bi
            SET base_unit_name = p.base_unit
            FROM products AS p
            WHERE bi.product_id = p.id
              AND bi.base_unit_name IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_column("bill_items", "base_unit_name")

    op.drop_index(
        "ix_bills_customer_id",
        table_name="bills",
    )

    op.drop_constraint(
        "fk_bills_customer_id_customers",
        "bills",
        type_="foreignkey",
    )

    op.drop_column("bills", "customer_id")