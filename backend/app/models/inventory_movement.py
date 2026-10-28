
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "idempotency_key",
            name="uq_inventory_movement_business_idempotency_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    business_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Positive delta increases stock; negative delta decreases stock.
    quantity_delta: Mapped[Decimal] = mapped_column(
        Numeric(14, 3),
        nullable=False,
    )

    # Balance immediately after this movement.
    stock_after: Mapped[Decimal] = mapped_column(
        Numeric(14, 3),
        nullable=False,
    )

    # Examples: opening, adjustment, invoice_deduction,
    # invoice_reversal.
    movement_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # Nullable so a movement can survive invoice deletion.
    bill_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("bills.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Reserved for operations that need retry protection.
    # Application code must generate and enforce its semantics.
    idempotency_key: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
