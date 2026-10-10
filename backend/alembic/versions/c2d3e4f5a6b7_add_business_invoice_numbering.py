
"""Add business-specific invoice numbering settings.

Revision ID: c2d3e4f5a6b7
Revises: ad874b881aa9
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "ad874b881aa9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column(
            "invoice_prefix",
            sa.String(length=20),
            nullable=False,
            server_default="INV-",
        ),
    )

    op.add_column(
        "businesses",
        sa.Column(
            "next_invoice_number",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )

    op.execute(
        """
        UPDATE businesses AS business
        SET next_invoice_number = COALESCE(
            (
                SELECT CASE
                    WHEN MAX(
                        substring(
                            bill.invoice_number
                            FROM '^INV-([0-9]+)$'
                        )::numeric
                    ) >= 2147483647
                    THEN 2147483647
                    ELSE (
                        MAX(
                            substring(
                                bill.invoice_number
                                FROM '^INV-([0-9]+)$'
                            )::numeric
                        ) + 1
                    )::integer
                END
                FROM bills AS bill
                WHERE bill.business_id = business.id
                  AND bill.invoice_number ~ '^INV-[0-9]+$'
            ),
            1
        )
        """
    )


def downgrade() -> None:
    op.drop_column("businesses", "next_invoice_number")
    op.drop_column("businesses", "invoice_prefix")
