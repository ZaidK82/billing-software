from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status , Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user_id
from app.core.config import settings
from app.core.database import engine, get_db
from app.services.invoice_pdf import build_invoice_pdf
from app.models import (
    Bill,
    BillItem,
    Business,
    BusinessMembership,
    Customer,
)


router = APIRouter()


class BusinessProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None
    city: str | None
    state: str | None
    pincode: str | None


class BusinessProfileUpdate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None

class BillItemCreate(BaseModel):
    item_name: str
    quantity: int
    unit_price: Decimal


class BillCreate(BaseModel):
    customer_name: str
    customer_phone: str | None = None
    customer_address: str | None = None
    items: list[BillItemCreate]


class BillItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class BillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    customer_name: str | None
    customer_phone: str | None
    customer_address: str | None
    subtotal: Decimal
    total: Decimal
    created_at: object
    items: list[BillItemResponse]

class BillListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    customer_name: str | None
    total: Decimal
    created_at: object

class CustomerCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class CustomerUpdate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None
    created_at: object
    updated_at: object

def get_user_business(
    user_id: UUID,
    db: Session,
) -> Business:
    membership = db.scalar(
        select(BusinessMembership).where(
            BusinessMembership.user_id == user_id,
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found for this user.",
        )

    business = db.get(Business, membership.business_id)

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    return business


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "billing-api",
        "version": settings.app_version,
        "database_configured": bool(settings.database_url),
    }


@router.get("/health/database")
async def database_health_check():
    if engine is None:
        return {
            "status": "not_configured",
        }

    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        return {
            "status": "ok",
        }

    except Exception:
        return {
            "status": "error",
        }


@router.get("/auth/me")
async def get_me(
    user_id: UUID = Depends(get_current_user_id),
):
    return {
        "user_id": str(user_id),
    }


@router.post("/business")
async def create_business(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    existing_membership = db.scalar(
        select(BusinessMembership).where(
            BusinessMembership.user_id == user_id,
        )
    )

    if existing_membership:
        business = db.get(
            Business,
            existing_membership.business_id,
        )

        if business is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Business membership exists but business was not found.",
            )

        return {
            "business_id": str(business.id),
            "business_name": business.name,
            "role": existing_membership.role,
            "created": False,
        }

    business = Business(
        name="My Business",
    )

    db.add(business)
    db.flush()

    membership = BusinessMembership(
        business_id=business.id,
        user_id=user_id,
        role="owner",
    )

    db.add(membership)
    db.commit()

    return {
        "business_id": str(business.id),
        "business_name": business.name,
        "role": membership.role,
        "created": True,
    }


@router.get(
    "/business",
    response_model=BusinessProfileResponse,
)
async def get_business(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_user_business(user_id, db)


@router.put(
    "/business",
    response_model=BusinessProfileResponse,
)
async def update_business(
    profile: BusinessProfileUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    business.name = profile.name.strip()
    business.phone = (
        profile.phone.strip()
        if profile.phone
        else None
    )
    business.email = (
        profile.email.strip()
        if profile.email
        else None
    )
    business.address = (
        profile.address.strip()
        if profile.address
        else None
    )
    business.city = (
        profile.city.strip()
        if profile.city
        else None
    )
    business.state = (
        profile.state.strip()
        if profile.state
        else None
    )
    business.pincode = (
        profile.pincode.strip()
        if profile.pincode
        else None
    )

    if not business.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business name is required.",
        )

    db.commit()
    db.refresh(business)

    return business

@router.post(
    "/bills",
    response_model=BillResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_bill(
    bill_data: BillCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    customer_name = bill_data.customer_name.strip()

    if not customer_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer name is required.",
        )

    if not bill_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one bill item is required.",
        )

    cleaned_items: list[dict] = []

    for item in bill_data.items:
        item_name = item.item_name.strip()

        if not item_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Every bill item must have a name.",
            )

        if item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item quantity must be greater than zero.",
            )

        if item.unit_price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item price cannot be negative.",
            )

        line_total = (
            Decimal(item.quantity)
            * item.unit_price
        ).quantize(Decimal("0.01"))

        cleaned_items.append(
            {
                "item_name": item_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": line_total,
            }
        )

    subtotal = sum(
        (
            item["line_total"]
            for item in cleaned_items
        ),
        Decimal("0.00"),
    ).quantize(Decimal("0.01"))

    total = subtotal

    latest_invoice_number = db.scalar(
        select(func.max(Bill.invoice_number)).where(
            Bill.business_id == business.id,
        )
    )

    if latest_invoice_number:
        try:
            latest_number = int(
                latest_invoice_number.removeprefix(
                    "INV-"
                )
            )
        except ValueError:
            latest_number = 0
    else:
        latest_number = 0

    invoice_number = (
        f"INV-{latest_number + 1:04d}"
    )

    bill = Bill(
        business_id=business.id,
        invoice_number=invoice_number,
        customer_name=customer_name,
        customer_phone=(
            bill_data.customer_phone.strip()
            if bill_data.customer_phone
            else None
        ),
        customer_address=(
            bill_data.customer_address.strip()
            if bill_data.customer_address
            else None
        ),
        subtotal=subtotal,
        total=total,
    )

    db.add(bill)
    db.flush()

    for item_data in cleaned_items:
        bill_item = BillItem(
            bill_id=bill.id,
            item_name=item_data["item_name"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            line_total=item_data["line_total"],
        )

        db.add(bill_item)

    db.commit()
    db.refresh(bill)

    return bill

@router.get(
    "/bills",
    response_model=list[BillListItemResponse],
)
async def get_bills(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    bills = db.scalars(
        select(Bill)
        .where(
            Bill.business_id == business.id,
        )
        .order_by(
            Bill.created_at.desc(),
        )
    ).all()

    return bills

@router.get("/bills/{bill_id}/pdf")
async def get_bill_pdf(
    bill_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    bill = db.scalar(
        select(Bill).where(
            Bill.id == bill_id,
            Bill.business_id == business.id,
        )
    )

    if bill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found.",
        )

    pdf_bytes = build_invoice_pdf(
        bill=bill,
        business=business,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="'
                f'{bill.invoice_number}.pdf"'
            ),
        },
    )

@router.get(
    "/bills/{bill_id}",
    response_model=BillResponse,
)
async def get_bill(
    bill_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    bill = db.scalar(
        select(Bill).where(
            Bill.id == bill_id,
            Bill.business_id == business.id,
        )
    )

    if bill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found.",
        )

    return bill

@router.post(
    "/customers",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_customer(
    customer_data: CustomerCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    name = customer_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer name is required.",
        )

    customer = Customer(
        business_id=business.id,
        name=name,
        phone=customer_data.phone,
        email=customer_data.email,
        address=customer_data.address,
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer

@router.get(
    "/customers",
    response_model=list[CustomerResponse],
)
async def get_customers(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    customers = db.scalars(
        select(Customer)
        .where(
            Customer.business_id == business.id,
        )
        .order_by(
            Customer.name.asc(),
        )
    ).all()

    return customers

@router.get(
    "/customers/{customer_id}",
    response_model=CustomerResponse,
)
async def get_customer(
    customer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    customer = db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business.id,
        )
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    return customer

@router.put(
    "/customers/{customer_id}",
    response_model=CustomerResponse,
)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    customer = db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business.id,
        )
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    name = customer_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer name is required.",
        )

    customer.name = name
    customer.phone = customer_data.phone
    customer.email = customer_data.email
    customer.address = customer_data.address

    db.commit()
    db.refresh(customer)

    return customer