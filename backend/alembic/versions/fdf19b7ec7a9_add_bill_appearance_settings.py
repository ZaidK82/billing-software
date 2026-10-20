"""add bill appearance settings

Revision ID: fdf19b7ec7a9
Revises: e1f2a3b4c5d6
Create Date: 2026-10-18 14:17:49.336589

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fdf19b7ec7a9'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bills",
        sa.Column(
            "appearance_settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(
                """'{
                    "invoice_title_size": 20,
                    "business_name_size": 17,
                    "business_details_size": 9,
                    "table_text_size": 9,
                    "logo_width_mm": 45,
                    "logo_height_mm": 25,
                    "signature_width_mm": 45,
                    "signature_height_mm": 25
                }'::jsonb"""
            ),
        ),
    )


def downgrade() -> None:
    op.drop_column("bills", "appearance_settings")
