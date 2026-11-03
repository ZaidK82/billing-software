
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Bill, BillItem, Product
from app.services.reports import (
    REPORTING_TIMEZONE_NAME,
    get_reporting_datetime_range,
)


ZERO = Decimal("0.00")
CENT = Decimal("0.01")


def _money(value: Decimal | None) -> Decimal:
    if value is None:
        return ZERO

    return value.quantize(
        CENT,
        rounding=ROUND_HALF_UP,
    )


def _percentage(
    numerator: Decimal,
    denominator: Decimal,
) -> Decimal | None:
    if denominator <= 0:
        return None

    return (
        (numerator / denominator) * Decimal("100")
    ).quantize(
        CENT,
        rounding=ROUND_HALF_UP,
    )


def build_profitability_report(
    db: Session,
    business_id: UUID,
    start_date: date,
    end_date: date,
) -> dict:
    start_at, end_at = get_reporting_datetime_range(
        start_date,
        end_date,
    )

    invoice_filters = (
        Bill.business_id == business_id,
        Bill.created_at >= start_at,
        Bill.created_at < end_at,
    )

    has_known_cost = BillItem.purchase_price_snapshot.is_not(None)

    known_cost_expression = case(
        (
            has_known_cost,
            BillItem.quantity * BillItem.purchase_price_snapshot,
        ),
        else_=ZERO,
    )

    known_cost_revenue_expression = case(
        (
            has_known_cost,
            BillItem.line_total,
        ),
        else_=ZERO,
    )

    missing_cost_revenue_expression = case(
        (
            BillItem.purchase_price_snapshot.is_(None),
            BillItem.line_total,
        ),
        else_=ZERO,
    )

    # Aggregate historical invoice lines by their linked catalogue product.
    # Deleted or unlinked products are excluded from product-level reporting.
    product_rows = db.execute(
        select(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            func.count(BillItem.id).label("line_count"),
            func.count(
                BillItem.purchase_price_snapshot
            ).label("known_cost_line_count"),
            func.count(
                BillItem.base_quantity
            ).label("quantity_snapshot_count"),
            func.count(
                BillItem.base_unit_name
            ).label("unit_snapshot_count"),
            func.count(
                func.distinct(BillItem.base_unit_name)
            ).label("distinct_base_unit_count"),
            func.min(
                BillItem.base_unit_name
            ).label("base_unit_name"),
            func.sum(
                BillItem.base_quantity
            ).label("quantity_sold"),
            func.sum(
                BillItem.line_total
            ).label("revenue"),
            func.sum(
                known_cost_expression
            ).label("known_estimated_cost"),
            func.sum(
                known_cost_revenue_expression
            ).label("known_cost_revenue"),
            func.sum(
                missing_cost_revenue_expression
            ).label("missing_cost_revenue"),
            func.count(
                func.distinct(BillItem.bill_id)
            ).label("invoice_count"),
        )
        .join(
            BillItem,
            BillItem.product_id == Product.id,
        )
        .join(
            Bill,
            Bill.id == BillItem.bill_id,
        )
        .where(
            *invoice_filters,
            Product.business_id == business_id,
        )
        .group_by(
            Product.id,
            Product.name,
        )
    ).all()

    products = []

    for row in product_rows:
        line_count = row.line_count
        known_cost_line_count = row.known_cost_line_count
        missing_cost_line_count = (
            line_count - known_cost_line_count
        )

        revenue = _money(row.revenue)
        known_cost = _money(row.known_estimated_cost)
        known_cost_revenue = _money(row.known_cost_revenue)
        missing_cost_revenue = _money(row.missing_cost_revenue)

        estimated_gross_profit = (
            _money(known_cost_revenue - known_cost)
            if known_cost_line_count > 0
            else None
        )

        estimated_gross_margin = _percentage(
            estimated_gross_profit,
            known_cost_revenue,
        )

        if missing_cost_line_count == 0:
            profitability_status = "complete"
        elif known_cost_line_count > 0:
            profitability_status = "partial"
        else:
            profitability_status = "unavailable"

        # Report quantity only when every line has both historical
        # quantity snapshots and all lines use the same base-unit label.
        quantity_is_complete = (
            row.quantity_snapshot_count == line_count
            and row.unit_snapshot_count == line_count
            and row.distinct_base_unit_count == 1
        )

        quantity_sold = (
            row.quantity_sold
            if quantity_is_complete
            else None
        )

        products.append({
            "product_id": row.product_id,
            "product_name": row.product_name,
            "base_unit_name": (
                row.base_unit_name
                if quantity_is_complete
                else None
            ),
            "quantity_sold": quantity_sold,
            "invoice_count": row.invoice_count,
            "line_count": line_count,
            "revenue": revenue,
            "known_cost_revenue": known_cost_revenue,
            "known_estimated_cost": known_cost,
            "estimated_gross_profit": estimated_gross_profit,
            "estimated_gross_margin": estimated_gross_margin,
            "missing_cost_line_count": missing_cost_line_count,
            "missing_cost_revenue": missing_cost_revenue,
            "cost_coverage_percentage": _percentage(
                Decimal(known_cost_line_count),
                Decimal(line_count),
            ),
            "profitability_status": profitability_status,
        })

    # Rank products with known-cost profit first.
    # Products with unavailable cost data appear at the bottom.
    products.sort(
        key=lambda product: (
            product["estimated_gross_profit"] is not None,
            (
                product["estimated_gross_profit"]
                if product["estimated_gross_profit"] is not None
                else ZERO
            ),
            product["product_name"].casefold(),
        ),
        reverse=True,
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "reporting_timezone": REPORTING_TIMEZONE_NAME,
        "total_product_count": len(products),
        "complete_cost_product_count": sum(
            product["profitability_status"] == "complete"
            for product in products
        ),
        "partial_cost_product_count": sum(
            product["profitability_status"] == "partial"
            for product in products
        ),
        "unavailable_cost_product_count": sum(
            product["profitability_status"] == "unavailable"
            for product in products
        ),
        "products": products,
    }
