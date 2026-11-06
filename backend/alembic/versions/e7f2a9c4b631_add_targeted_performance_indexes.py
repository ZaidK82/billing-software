
"""Add targeted performance indexes.

Revision ID: e7f2a9c4b631
Revises: cb5a42e9ed0d
"""

from alembic import op
from sqlalchemy import text


revision = "e7f2a9c4b631"
down_revision = "cb5a42e9ed0d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # CREATE INDEX CONCURRENTLY cannot run inside a transaction.
    with op.get_context().autocommit_block():

        # Business-scoped invoice history and date-filtered reports.
        op.create_index(
            "ix_bills_business_created_at",
            "bills",
            [
                "business_id",
                text("created_at DESC"),
            ],
            postgresql_concurrently=True,
        )

        # Ordered bill-item relationship loading.
        op.create_index(
            "ix_bill_items_bill_position",
            "bill_items",
            ["bill_id", "position"],
            postgresql_concurrently=True,
        )

        # Latest inventory movement lookup per product.
        op.create_index(
            "ix_inventory_movements_business_product_created_id",
            "inventory_movements",
            [
                "business_id",
                "product_id",
                text("created_at DESC"),
                text("id DESC"),
            ],
            postgresql_concurrently=True,
        )

        # Business-scoped customer listing.
        op.create_index(
            "ix_customers_business_name",
            "customers",
            ["business_id", "name"],
            postgresql_concurrently=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():

        op.drop_index(
            "ix_customers_business_name",
            table_name="customers",
            postgresql_concurrently=True,
        )

        op.drop_index(
            "ix_inventory_movements_business_product_created_id",
            table_name="inventory_movements",
            postgresql_concurrently=True,
        )

        op.drop_index(
            "ix_bill_items_bill_position",
            table_name="bill_items",
            postgresql_concurrently=True,
        )

        op.drop_index(
            "ix_bills_business_created_at",
            table_name="bills",
            postgresql_concurrently=True,
        )
