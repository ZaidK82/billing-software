from decimal import Decimal
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user_id
from app.core.config import settings
from app.core.database import engine, get_db
from app.services.invoice_pdf import build_invoice_pdf
from app.services.storage import (
    create_business_asset_signed_url,
    delete_business_asset,
    upload_business_asset,
)
from app.models import (
    Bill,
    BillItem,
    Business,
    BusinessMembership,
    Customer,
)


router = APIRouter()

class InvoiceColumn(BaseModel):
    key: str
    label: str
    type: str
    source: str
    position: int
    required: bool = False


class BusinessProfileResponse(BaseModel):
    id: UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None
    city: str | None
    state: str | None
    pincode: str | None
    gstin: str | None
    udyam_number: str | None
    logo_path: str | None
    signature_path: str | None
    terms_and_conditions: str | None    
    invoice_columns: list[InvoiceColumn]
    invoice_prefix: str
    next_invoice_number: int


class BusinessProfileUpdate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gstin: str | None = None
    udyam_number: str | None = None
    terms_and_conditions: str | None = None
    invoice_columns: list[InvoiceColumn] = []
    invoice_prefix: str = Field(
        default="INV-",
        min_length=1,
        max_length=20,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9 /-]*$",
    )

    next_invoice_number: int = Field(
        default=1,
        ge=1,
        le=2147483647,
    )

class BillItemCreate(BaseModel):
    item_name: str
    quantity: int
    unit_price: Decimal
    custom_values: dict = {}

class BillCreate(BaseModel):
    customer_name: str
    customer_phone: str | None = None
    customer_address: str | None = None
    invoice_columns: list[InvoiceColumn] | None = None
    items: list[BillItemCreate]


class BillItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    custom_values: dict


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
    invoice_columns: list[InvoiceColumn]
    terms_and_conditions: str | None
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

    business.gstin = (
        profile.gstin.strip()
        if profile.gstin
        else None
    )

    business.udyam_number = (
        profile.udyam_number.strip()
        if profile.udyam_number
        else None
    )
    
    business.terms_and_conditions = (
        profile.terms_and_conditions.strip()
        if profile.terms_and_conditions
        else None
    )

    business.invoice_columns = [
        column.model_dump()
        for column in profile.invoice_columns
    ]

    invoice_prefix = profile.invoice_prefix.strip()

    if not invoice_prefix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice prefix cannot be empty.",
        )

    business.invoice_prefix = invoice_prefix
    business.next_invoice_number = profile.next_invoice_number

    if not business.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business name is required.",
        )

    db.commit()
    db.refresh(business)

    return business

@router.post("/business/{asset_type}")
async def upload_business_asset_endpoint(
    asset_type: str,
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if asset_type not in {"logo", "signature"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid business asset type.",
        )

    business = get_user_business(user_id, db)

    previous_storage_path = (
        business.logo_path
        if asset_type == "logo"
        else business.signature_path
    )

    storage_path = await upload_business_asset(
        business_id=business.id,
        asset_type=asset_type,
        file=file,
    )

    if asset_type == "logo":
        business.logo_path = storage_path
    else:
        business.signature_path = storage_path

    db.commit()
    db.refresh(business)

    if (
        previous_storage_path
        and previous_storage_path != storage_path
    ):
        delete_business_asset(
            storage_path=previous_storage_path,
        )

    return {
        "asset_type": asset_type,
        "path": storage_path,
    }

@router.get("/business/{asset_type}/url")
def get_business_asset_url(
    asset_type: str,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    if asset_type == "logo":
        storage_path = business.logo_path
    elif asset_type == "signature":
        storage_path = business.signature_path
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid business asset type.",
        )

    if not storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {asset_type} has been uploaded.",
        )

    signed_url = create_business_asset_signed_url(
        storage_path=storage_path,
    )

    return {
        "asset_type": asset_type,
        "url": signed_url,
    }

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

    invoice_columns = (
        bill_data.invoice_columns
        if bill_data.invoice_columns is not None
        else [
            InvoiceColumn(**column)
            for column in business.invoice_columns
        ]
    )

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
                "custom_values": item.custom_values,
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

    # Lock this business row so invoice-number allocation for
    # the same business is serialized across concurrent requests.
    locked_business = db.scalar(
        select(Business)
        .where(Business.id == business.id)
        .with_for_update()
    )

    if locked_business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    prefix = locked_business.invoice_prefix
    prefix_length = len(prefix)

    # Reconcile the configured sequence against existing
    # numeric invoice suffixes for this prefix.
    existing_numbers = db.scalars(
        select(Bill.invoice_number).where(
            Bill.business_id == locked_business.id,
            Bill.invoice_number.startswith(prefix),
        )
    ).all()

    highest_existing_number = 0

    for existing_invoice_number in existing_numbers:
        suffix = existing_invoice_number[prefix_length:]

        if suffix.isdigit():
            highest_existing_number = max(
                highest_existing_number,
                int(suffix),
            )

    allocated_number = max(
        locked_business.next_invoice_number,
        highest_existing_number + 1,
    )

    if allocated_number >= 2147483647:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invoice number sequence has reached its limit.",
        )

    invoice_number = f"{prefix}{allocated_number:04d}"

    locked_business.next_invoice_number = allocated_number + 1

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
        invoice_columns=[
            column.model_dump()
            for column in invoice_columns
        ],
        terms_and_conditions=business.terms_and_conditions,
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
            custom_values=item_data["custom_values"],
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

@router.delete(
    "/bills/{bill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_bill(
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

    try:
        db.delete(bill)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete bill.",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)

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