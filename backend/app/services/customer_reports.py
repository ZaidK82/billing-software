from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Bill, Customer
from app.services.reports import (
    REPORTING_TIMEZONE_NAME,
    get_reporting_datetime_range,
)


def build_customer_report(
    db: Session,
    business_id: UUID,
    start_date: date,
    end_date: date,
) -> dict:
    start_at, end_at = get_reporting_datetime_range(
        start_date,
        end_date,
    )

    # All registered customers belonging to this business.
    # Only invoices linked through customer_id are attributed.
    customer_rows = db.execute(
        select(
            Customer.id.label("customer_id"),
            Customer.name.label("customer_name"),
            Customer.phone.label("phone"),
            Customer.created_at.label("created_at"),
            func.count(Bill.id).label("invoice_count"),
            func.coalesce(
                func.sum(Bill.total),
                Decimal("0.00"),
            ).label("purchase_total"),
            func.avg(Bill.total).label("average_invoice_value"),
        )
        .outerjoin(
            Bill,
            (
                (Bill.customer_id == Customer.id)
                & (Bill.business_id == business_id)
                & (Bill.created_at >= start_at)
                & (Bill.created_at < end_at)
            ),
        )
        .where(
            Customer.business_id == business_id,
        )
        .group_by(
            Customer.id,
            Customer.name,
            Customer.phone,
            Customer.created_at,
        )
        .order_by(
            func.coalesce(
                func.sum(Bill.total),
                Decimal("0.00"),
            ).desc(),
            Customer.name.asc(),
        )
    ).all()

    # First-ever linked invoice timestamp for each customer.
    # This query intentionally has no date-range filter.
    first_invoice_rows = db.execute(
        select(
            Bill.customer_id.label("customer_id"),
            func.min(Bill.created_at).label("first_invoice_at"),
        )
        .where(
            Bill.business_id == business_id,
            Bill.customer_id.is_not(None),
        )
        .group_by(Bill.customer_id)
    ).all()

    first_invoice_by_customer = {
        row.customer_id: row.first_invoice_at
        for row in first_invoice_rows
    }

    customers = []

    new_customer_count = 0
    active_customer_count = 0
    never_purchased_count = 0
    previously_purchased_inactive_count = 0
    first_time_buyer_count = 0

    for row in customer_rows:
        is_new_customer = (
            start_at <= row.created_at < end_at
        )

        first_invoice_at = first_invoice_by_customer.get(
            row.customer_id
        )

        has_ever_purchased = first_invoice_at is not None

        is_first_time_buyer = (
            first_invoice_at is not None
            and start_at <= first_invoice_at < end_at
        )

        is_active = row.invoice_count > 0

        if is_new_customer:
            new_customer_count += 1

        if is_first_time_buyer:
            first_time_buyer_count += 1

        if is_active:
            active_customer_count += 1
        elif has_ever_purchased:
            previously_purchased_inactive_count += 1
        else:
            never_purchased_count += 1

        average_invoice_value = row.average_invoice_value

        if average_invoice_value is None:
            average_invoice_value = Decimal("0.00")
        else:
            average_invoice_value = average_invoice_value.quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )

        customers.append({
            "customer_id": row.customer_id,
            "customer_name": row.customer_name,
            "phone": row.phone,
            "created_at": row.created_at,
            "is_new_customer": is_new_customer,
            "is_first_time_buyer": is_first_time_buyer,
            "has_ever_purchased": has_ever_purchased,
            "invoice_count": row.invoice_count,
            "purchase_total": row.purchase_total,
            "average_invoice_value": average_invoice_value,
        })

    return {
        "start_date": start_date,
        "end_date": end_date,
        "reporting_timezone": REPORTING_TIMEZONE_NAME,
        "total_customer_count": len(customer_rows),
        "new_customer_count": new_customer_count,
        "first_time_buyer_count": first_time_buyer_count,
        "active_customer_count": active_customer_count,
        "never_purchased_count": never_purchased_count,
        "previously_purchased_inactive_count": (
            previously_purchased_inactive_count
        ),
        "customers": customers,
    }