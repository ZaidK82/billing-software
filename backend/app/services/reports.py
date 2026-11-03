from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.models import Bill, BillItem


REPORTING_TIMEZONE = ZoneInfo("Asia/Kolkata")
REPORTING_TIMEZONE_NAME = REPORTING_TIMEZONE.key


def get_reporting_datetime_range(
    start_date: date,
    end_date: date,
) -> tuple[datetime, datetime]:
    """Convert inclusive IST dates into timezone-aware [start, end) bounds."""

    if end_date < start_date:
        raise ValueError("end_date must be on or after start_date.")

    start_at = datetime.combine(
        start_date,
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )

    end_at = datetime.combine(
        end_date + timedelta(days=1),
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )

    return start_at, end_at

def build_sales_report(
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

    # Overall invoice summary.
    summary_row = db.execute(
        select(
            func.count(Bill.id),
            func.coalesce(
                func.sum(Bill.total),
                Decimal("0.00"),
            ),
            func.avg(Bill.total),
        ).where(*invoice_filters)
    ).one()

    invoice_count = summary_row[0]
    sales_total = summary_row[1]
    average_invoice_value = summary_row[2]

    if average_invoice_value is None:
        average_invoice_value = Decimal("0.00")
    else:
        average_invoice_value = average_invoice_value.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    # Convert invoice timestamps to IST before extracting the date.
    local_invoice_date = cast(
        func.timezone(
            REPORTING_TIMEZONE_NAME,
            Bill.created_at,
        ),
        Date,
    ).label("report_date")

    trend_rows = db.execute(
        select(
            local_invoice_date,
            func.count(Bill.id).label("invoice_count"),
            func.sum(Bill.total).label("sales_total"),
        )
        .where(*invoice_filters)
        .group_by(local_invoice_date)
        .order_by(local_invoice_date)
    ).all()

    trend_by_date = {
        row.report_date: {
            "invoice_count": row.invoice_count,
            "sales_total": row.sales_total or Decimal("0.00"),
        }
        for row in trend_rows
    }

    # Include dates with zero sales as well.
    trend = []
    current_date = start_date

    while current_date <= end_date:
        day_data = trend_by_date.get(current_date, {})

        trend.append({
            "date": current_date,
            "invoice_count": day_data.get("invoice_count", 0),
            "sales_total": day_data.get(
                "sales_total",
                Decimal("0.00"),
            ),
        })

        current_date += timedelta(days=1)

    # Product-wise sales using historical invoice-item snapshots.
    product_rows = db.execute(
        select(
            BillItem.product_id.label("product_id"),
            BillItem.item_name.label("item_name"),
            BillItem.base_unit_name.label("base_unit_name"),
            func.sum(
                BillItem.base_quantity
            ).label("quantity"),
            func.count(
                BillItem.id
            ).label("line_count"),
            func.count(
                BillItem.base_quantity
            ).label("quantity_snapshot_count"),
            func.count(
                BillItem.base_unit_name
            ).label("unit_snapshot_count"),
            func.sum(
                BillItem.line_total
            ).label("sales_total"),
            func.count(
                func.distinct(BillItem.bill_id)
            ).label("invoice_count"),
        )
        .join(
            Bill,
            Bill.id == BillItem.bill_id,
        )
        .where(
            *invoice_filters,
            BillItem.product_id.is_not(None),
        )
        .group_by(
            BillItem.product_id,
            BillItem.item_name,
            BillItem.base_unit_name,
        )
        .order_by(
            func.sum(BillItem.line_total).desc(),
            BillItem.item_name.asc(),
        )
    ).all()

    products = [
        {
            "product_id": row.product_id,
            "item_name": row.item_name,
            "base_unit_name": row.base_unit_name,

            # If any line lacks a historical quantity snapshot,
            # do not report a potentially incomplete quantity.
            "quantity": (
                row.quantity
                if (
                    row.quantity_snapshot_count == row.line_count
                    and row.unit_snapshot_count == row.line_count
                )
                else None
            ),

            "sales_total": (
                row.sales_total or Decimal("0.00")
            ),
            "invoice_count": row.invoice_count,
        }
        for row in product_rows
    ]

    return {
        "start_date": start_date,
        "end_date": end_date,
        "reporting_timezone": REPORTING_TIMEZONE_NAME,
        "invoice_count": invoice_count,
        "sales_total": sales_total,
        "average_invoice_value": average_invoice_value,
        "trend": trend,
        "products": products,
    }