from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import (
    JSONB,
    UUID as PostgreSQLUUID,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Bill(Base):
    __tablename__ = "bills"

    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "invoice_number",
            name="uq_bill_business_invoice_number",
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
    )

    invoice_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    customer_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    customer_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    customer_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    invoice_columns: Mapped[list[dict]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
    )


    appearance_settings: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {
            "invoice_title_size": 20,
            "business_name_size": 17,
            "business_details_size": 9,
            "table_text_size": 9,
            "logo_width_mm": 45,
            "logo_height_mm": 25,
            "signature_width_mm": 45,
            "signature_height_mm": 25,
        },
        server_default=(
            '{"invoice_title_size":20,'
            '"business_name_size":17,'
            '"business_details_size":9,'
            '"table_text_size":9,'
            '"logo_width_mm":45,'
            '"logo_height_mm":25,'
            '"signature_width_mm":45,'
            '"signature_height_mm":25}'
        ),
    )


    terms_and_conditions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    items: Mapped[list["BillItem"]] = relationship(
        back_populates="bill",
        cascade="all, delete-orphan",
        order_by="BillItem.position",
    )

class BillItem(Base):
    __tablename__ = "bill_items"

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    bill_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=False,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    item_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    line_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    custom_values: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    highlight_style: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        default=None,
    )

    bill: Mapped["Bill"] = relationship(
        back_populates="items",
    )