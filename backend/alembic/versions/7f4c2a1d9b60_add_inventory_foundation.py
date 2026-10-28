
"""Add inventory foundation.

Revision ID: 7f4c2a1d9b60
Revises: e3a842545855
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f4c2a1d9b60"
down_revision: Union[str, Sequence[str], None] = "e3a842545855"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing products remain non-stock-tracked until explicitly enabled.
    op.add_column(
        "products",
        sa.Column(
            "is_stock_tracked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # NULL means no opening balance has been established.
    op.add_column(
        "products",
        sa.Column(
            "stock_quantity",
            sa.Numeric(14, 3),
            nullable=True,
        ),
    )

    # Catalogue linkage is optional to preserve custom invoice lines.
    op.add_column(
        "bill_items",
        sa.Column(
            "product_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    op.add_column(
        "bill_items",
        sa.Column(
            "inventory_tracking_applied",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.create_foreign_key(
        "fk_bill_items_product_id_products",
        "bill_items",
        "products",
        ["product_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_bill_items_product_id",
        "bill_items",
        ["product_id"],
        unique=False,
    )

    op.alter_column(
        "bill_items",
        "quantity",
        existing_type=sa.Integer(),
        type_=sa.Numeric(14, 3),
        existing_nullable=False,
        postgresql_using="quantity::numeric(14,3)",
    )

    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("business_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column(
            "quantity_delta",
            sa.Numeric(14, 3),
            nullable=False,
        ),
        sa.Column(
            "stock_after",
            sa.Numeric(14, 3),
            nullable=False,
        ),
        sa.Column(
            "movement_type",
            sa.String(length=40),
            nullable=False,
        ),
        sa.Column(
            "reason",
            sa.String(length=500),
            nullable=False,
        ),
        sa.Column("bill_id", sa.UUID(), nullable=True),
        sa.Column(
            "idempotency_key",
            sa.String(length=200),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["bill_id"],
            ["bills.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "business_id",
            "idempotency_key",
            name="uq_inventory_movement_business_idempotency_key",
        ),
    )

    op.create_index(
        "ix_inventory_movements_business_id",
        "inventory_movements",
        ["business_id"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_movements_product_id",
        "inventory_movements",
        ["product_id"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_movements_bill_id",
        "inventory_movements",
        ["bill_id"],
        unique=False,
    )



def downgrade() -> None:
    # Check before any destructive downgrade operations.
    connection = op.get_bind()
    has_fractional_quantities = connection.execute(
        sa.text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM bill_items
                WHERE quantity != TRUNC(quantity)
            )
            """
        )
    ).scalar()
    if has_fractional_quantities:
        raise RuntimeError(
            "Cannot downgrade inventory migration: bill_items.quantity "
            "contains fractional values. Convert them explicitly before "
            "downgrading."
        )

    op.drop_index(
        "ix_inventory_movements_bill_id",
        table_name="inventory_movements",
    )
    op.drop_index(
        "ix_inventory_movements_product_id",
        table_name="inventory_movements",
    )
    op.drop_index(
        "ix_inventory_movements_business_id",
        table_name="inventory_movements",
    )
    op.drop_table("inventory_movements")

    op.alter_column(
        "bill_items",
        "quantity",
        existing_type=sa.Numeric(14, 3),
        type_=sa.Integer(),
        existing_nullable=False,
    )

    op.drop_index(
        "ix_bill_items_product_id",
        table_name="bill_items",
    )
    op.drop_constraint(
        "fk_bill_items_product_id_products",
        "bill_items",
        type_="foreignkey",
    )
    op.drop_column("bill_items", "inventory_tracking_applied")
    op.drop_column("bill_items", "product_id")

    op.drop_column("products", "stock_quantity")
    op.drop_column("products", "is_stock_tracked")
