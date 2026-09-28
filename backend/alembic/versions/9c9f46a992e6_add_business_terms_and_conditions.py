"""add business terms and conditions

Revision ID: 9c9f46a992e6
Revises: 6bb26c5d88c2
Create Date: 2026-09-28 19:02:53.478440

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c9f46a992e6"
down_revision: Union[str, Sequence[str], None] = "6bb26c5d88c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "businesses",
        sa.Column(
            "terms_and_conditions",
            sa.Text(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column(
        "businesses",
        "terms_and_conditions",
    )