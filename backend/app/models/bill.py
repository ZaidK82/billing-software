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
    Boolean,
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

    customer_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    customer: Mapped["Customer | None"] = relationship()

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

    # Optional link to the catalogue product.
    # Invoice snapshots remain valid if a product is later deleted.
    product_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Records whether stock tracking was applied when this
    # invoice line was saved. Preserves historical behavior
    # if the product's tracking setting changes later.
    inventory_tracking_applied: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
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

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 3),
        nullable=False,
    )

    # Historical selling-unit snapshot. NULL means a legacy invoice line.
    unit_name: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    conversion_factor: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 6),
        nullable=True,
    )

    # Quantity normalized to the product's canonical stock unit.
    base_quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 3),
        nullable=True,
    )

    # Historical canonical-unit label corresponding to base_quantity.
    # NULL is retained for legacy or non-product invoice lines.
    base_unit_name: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    # Historical selling price per selected invoice unit.
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    # Historical purchase cost per selected invoice unit.
    # NULL means the historical purchase cost is unknown,
    # such as for invoices created before this feature.
    purchase_price_snapshot: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
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
