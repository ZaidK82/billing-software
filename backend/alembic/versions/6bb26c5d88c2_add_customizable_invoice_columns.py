"""Add customizable invoice columns

Revision ID: 6bb26c5d88c2
Revises: 1f30f77ef752
Create Date: 2026-09-28 13:16:22.934892

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6bb26c5d88c2'
down_revision: Union[str, Sequence[str], None] = '1f30f77ef752'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'bill_items',
        sa.Column(
            'custom_values',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default='{}',
            nullable=False,
        ),
    )

    op.add_column(
        'bills',
        sa.Column(
            'invoice_columns',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default='[]',
            nullable=False,
        ),
    )

    op.add_column(
        'businesses',
        sa.Column(
            'invoice_columns',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default='[]',
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('businesses', 'invoice_columns')
    op.drop_column('bills', 'invoice_columns')
    op.drop_column('bill_items', 'custom_values')
