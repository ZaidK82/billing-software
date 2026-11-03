from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Product
from app.models.inventory_movement import InventoryMovement
from app.services.reports import (
    REPORTING_TIMEZONE_NAME,
    get_reporting_datetime_range,
)


MOVEMENT_TYPES = (
    "opening",
    "adjustment",
    "invoice_deduction",
    "invoice_reversal",
)


def build_inventory_report(
    db: Session,
    business_id: UUID,
    start_date: date,
    end_date: date,
) -> dict:
    start_at, end_at = get_reporting_datetime_range(
        start_date,
        end_date,
    )

    # Current stock is independent of the selected movement date range.
    stock_products = db.scalars(
        select(Product)
        .where(
            Product.business_id == business_id,
            Product.is_stock_tracked.is_(True),
        )
        .order_by(Product.name.asc())
    ).all()

    stock_overview = [
        {
            "product_id": product.id,
            "product_name": product.name,
            "base_unit": product.base_unit,
            "stock_quantity": product.stock_quantity,
        }
        for product in stock_products
    ]

    tracked_product_count = len(stock_products)

    out_of_stock_count = sum(
        1
        for product in stock_products
        if product.stock_quantity == Decimal("0")
    )

    # Historical movement counts for the selected IST date range.
    movement_filters = (
        InventoryMovement.business_id == business_id,
        InventoryMovement.created_at >= start_at,
        InventoryMovement.created_at < end_at,
    )

    summary_rows = db.execute(
        select(
            InventoryMovement.movement_type,
            func.count(
                InventoryMovement.id
            ).label("movement_count"),
        )
        .where(*movement_filters)
        .group_by(InventoryMovement.movement_type)
    ).all()

    summary_by_type = {
        row.movement_type: row.movement_count
        for row in summary_rows
    }

    movement_summary = [
        {
            "movement_type": movement_type,
            "movement_count": summary_by_type.get(
                movement_type,
                0,
            ),
        }
        for movement_type in MOVEMENT_TYPES
    ]

    # Detailed movement history, including the product name at report time.
    movement_rows = db.execute(
        select(
            InventoryMovement,
            Product.name.label("product_name"),
        )
        .join(
            Product,
            Product.id == InventoryMovement.product_id,
        )
        .where(
            *movement_filters,
            Product.business_id == business_id,
        )
        .order_by(
            InventoryMovement.created_at.desc(),
            InventoryMovement.id.desc(),
        )
    ).all()

    movements = [
        {
            "id": row.InventoryMovement.id,
            "product_id": row.InventoryMovement.product_id,
            "product_name": row.product_name,
            "movement_type": row.InventoryMovement.movement_type,
            "quantity_delta": row.InventoryMovement.quantity_delta,
            "stock_after": row.InventoryMovement.stock_after,
            "reason": row.InventoryMovement.reason,
            "bill_id": row.InventoryMovement.bill_id,
            "created_at": row.InventoryMovement.created_at,
        }
        for row in movement_rows
    ]

    return {
        "start_date": start_date,
        "end_date": end_date,
        "reporting_timezone": REPORTING_TIMEZONE_NAME,
        "tracked_product_count": tracked_product_count,
        "out_of_stock_count": out_of_stock_count,
        "stock_overview": stock_overview,
        "movement_summary": movement_summary,
        "movements": movements,
    }