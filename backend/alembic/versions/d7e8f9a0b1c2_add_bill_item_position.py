"""Add persistent ordering to bill items."""

from alembic import op
import sqlalchemy as sa


revision = "d7e8f9a0b1c2"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bill_items",
        sa.Column(
            "position",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Assign a deterministic initial order to existing items.
    # Existing item IDs provide a stable tie-breaker.
    op.execute(
        """
        WITH ranked_items AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY bill_id
                    ORDER BY id
                ) - 1 AS item_position
            FROM bill_items
        )
        UPDATE bill_items
        SET position = ranked_items.item_position
        FROM ranked_items
        WHERE bill_items.id = ranked_items.id
        """
    )

    op.alter_column(
        "bill_items",
        "position",
        existing_type=sa.Integer(),
        nullable=False,
        server_default="0",
    )


def downgrade() -> None:
    op.drop_column("bill_items", "position")