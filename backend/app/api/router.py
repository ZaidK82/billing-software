from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from datetime import date, datetime
import json

from fastapi import Form

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
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
from app.services.inventory import reconcile_bill_inventory
from app.services.reports import build_sales_report
from app.services.inventory_reports import build_inventory_report
from app.services.customer_reports import build_customer_report
from app.services.profitability_reports import (
    build_profitability_report,
)
from app.models import (
    Bill,
    BillItem,
    Business,
    BusinessMembership,
    Customer,
    Product,
)
from app.models.product import Product
from app.models.inventory_movement import InventoryMovement
from app.services.product_pdf_import import (
    ProductPDFImportError,
    extract_product_pdf,
)
from app.services.product_excel_import import (
    extract_product_excel,
    ProductExcelImportError,
)

router = APIRouter()

class InvoiceColumn(BaseModel):
    key: str
    label: str
    type: str
    source: str
    position: int
    required: bool = False


class InvoiceAppearanceSettings(BaseModel):
    invoice_title_size: int = Field(default=20, ge=14, le=28)
    business_name_size: int = Field(default=17, ge=12, le=24)
    business_details_size: float = Field(
        default=9, ge=7, le=14
    )
    table_text_size: float = Field(
        default=9, ge=7, le=13
    )
    logo_width_mm: float = Field(
        default=45, ge=15, le=65
    )
    logo_height_mm: float = Field(
        default=25, ge=10, le=40
    )
    signature_width_mm: float = Field(
        default=45, ge=15, le=65
    )
    signature_height_mm: float = Field(
        default=25, ge=10, le=40
    )


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
    id: UUID | None = None
    item_name: str
    product_id: UUID | None = None
    unit_name: str | None = Field(default=None, min_length=1, max_length=30)
    quantity: Decimal = Field(
        gt=0,
        max_digits=14,
        decimal_places=3,
    )
    unit_price: Decimal
    line_total: Decimal | None = None
    custom_values: dict = {}
    position: int | None = Field(default=None, ge=0)
    highlight_style: str | None = None

class PurchaseCostCorrection(BaseModel):
    purchase_price_snapshot: Decimal = Field(
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    @field_validator("purchase_price_snapshot")
    @classmethod
    def validate_purchase_cost(cls, value: Decimal) -> Decimal:
        if not value.is_finite():
            raise ValueError("Purchase cost must be finite.")
        return value

class BillCreate(BaseModel):
    customer_name: str
    customer_id: UUID | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    shipping_charge: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    invoice_columns: list[InvoiceColumn] | None = None
    appearance_settings: InvoiceAppearanceSettings = Field(
        default_factory=InvoiceAppearanceSettings
    )
    items: list[BillItemCreate]

    @field_validator("shipping_charge")
    @classmethod
    def validate_shipping_charge(cls, value: Decimal) -> Decimal:
        if not value.is_finite():
            raise ValueError("Shipping charge must be finite.")
        return value



class BillItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID | None = None
    item_name: str
    quantity: Decimal
    unit_name: str | None = None
    conversion_factor: Decimal | None = None
    base_unit_name: str | None = None
    base_quantity: Decimal | None = None
    unit_price: Decimal
    purchase_price_snapshot: Decimal | None = None
    line_total: Decimal
    custom_values: dict
    position: int
    highlight_style: str | None = None


class BillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    customer_id: UUID | None = None
    customer_name: str | None
    customer_phone: str | None
    customer_address: str | None
    subtotal: Decimal
    shipping_charge: Decimal
    total: Decimal
    created_at: object
    invoice_columns: list[InvoiceColumn]
    appearance_settings: InvoiceAppearanceSettings = Field(
        default_factory=InvoiceAppearanceSettings
    )
    terms_and_conditions: str | None
    items: list[BillItemResponse]

class BillListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    customer_name: str | None
    total: Decimal
    created_at: object

class SalesTrendPointResponse(BaseModel):
    date: date
    invoice_count: int
    sales_total: Decimal


class ProductSalesResponse(BaseModel):
    product_id: UUID
    item_name: str
    base_unit_name: str | None = None
    quantity: Decimal | None = None
    sales_total: Decimal
    invoice_count: int


class SalesReportResponse(BaseModel):
    start_date: date
    end_date: date
    reporting_timezone: str
    invoice_count: int
    sales_total: Decimal
    average_invoice_value: Decimal
    trend: list[SalesTrendPointResponse]
    products: list[ProductSalesResponse]

class InventoryStockItemResponse(BaseModel):
    product_id: UUID
    product_name: str
    base_unit: str
    stock_quantity: Decimal | None


class InventoryMovementSummaryResponse(BaseModel):
    movement_type: str
    movement_count: int

class CustomerInsightItemResponse(BaseModel):
    customer_id: UUID
    customer_name: str
    phone: str | None
    created_at: datetime
    is_new_customer: bool
    is_first_time_buyer: bool
    has_ever_purchased: bool
    invoice_count: int
    purchase_total: Decimal
    average_invoice_value: Decimal


class CustomerReportResponse(BaseModel):
    start_date: date
    end_date: date
    reporting_timezone: str
    total_customer_count: int
    new_customer_count: int
    first_time_buyer_count: int
    active_customer_count: int
    never_purchased_count: int
    previously_purchased_inactive_count: int
    customers: list[CustomerInsightItemResponse]

class InventoryMovementResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    movement_type: str
    quantity_delta: Decimal
    stock_after: Decimal
    reason: str
    bill_id: UUID | None
    created_at: datetime


class InventoryReportResponse(BaseModel):
    start_date: date
    end_date: date
    reporting_timezone: str
    tracked_product_count: int
    out_of_stock_count: int
    stock_overview: list[InventoryStockItemResponse]
    movement_summary: list[InventoryMovementSummaryResponse]
    movements: list[InventoryMovementResponse]


class ProductProfitabilityResponse(BaseModel):
    product_id: UUID
    product_name: str
    base_unit_name: str | None
    quantity_sold: Decimal | None
    invoice_count: int
    line_count: int
    revenue: Decimal
    known_cost_revenue: Decimal
    known_estimated_cost: Decimal
    estimated_gross_profit: Decimal | None
    estimated_gross_margin: Decimal | None
    missing_cost_line_count: int
    missing_cost_revenue: Decimal
    cost_coverage_percentage: Decimal | None
    profitability_status: str


class ProfitabilityReportResponse(BaseModel):
    start_date: date
    end_date: date
    reporting_timezone: str
    total_product_count: int
    complete_cost_product_count: int
    partial_cost_product_count: int
    unavailable_cost_product_count: int
    products: list[ProductProfitabilityResponse]

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

class CustomerMatchRequest(BaseModel):
    name: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)


class CustomerMatchCandidate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None

class CustomerMatchResponse(BaseModel):
    status: str
    match_type: str | None = None
    candidates: list[CustomerMatchCandidate] = Field(
        default_factory=list
    )


class ProductMatchRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)


class ProductMatchCandidate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    purchase_price: Decimal | None
    default_unit_price: Decimal
    base_unit: str
    selling_units: list[dict]
    is_stock_tracked: bool
    stock_quantity: Decimal | None


class ProductMatchResponse(BaseModel):
    status: str
    candidates: list[ProductMatchCandidate] = Field(
        default_factory=list
    )

class SellingUnitInput(BaseModel):
    name: str = Field(min_length=1, max_length=30)
    factor: Decimal = Field(gt=0, max_digits=14, decimal_places=6)
    price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Unit name cannot be blank.")
        return value

    @field_validator("factor")
    @classmethod
    def validate_factor(cls, value: Decimal) -> Decimal:
        if not value.is_finite() or value <= 0:
            raise ValueError(
                "Conversion factor must be finite and positive."
            )
        return value

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: Decimal | None) -> Decimal | None:
        if value is not None:
            if not value.is_finite() or value < 0:
                raise ValueError(
                    "Selling-unit price must be finite and non-negative."
                )
        return value


def validate_unit_names(base_unit: str, selling_units: list[SellingUnitInput]) -> None:
    normalized_base = base_unit.strip()
    if not normalized_base:
        raise ValueError("Base unit cannot be blank.")

    seen = {normalized_base.casefold()}
    for unit in selling_units:
        normalized_name = unit.name.strip()
        if not normalized_name:
            raise ValueError("Unit name cannot be blank.")
        if normalized_name.casefold() in seen:
            raise ValueError("Unit names must be unique and cannot match the base unit.")
        seen.add(normalized_name.casefold())


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0)
    default_unit_price: Decimal = Field(ge=0)
    base_unit: str = Field(default="unit", min_length=1, max_length=30)
    selling_units: list[SellingUnitInput] = Field(default_factory=list)

    @field_validator("base_unit")
    @classmethod
    def clean_base_unit(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Base unit cannot be blank.")
        return value

    @model_validator(mode="after")
    def validate_unit_configuration(self):
        validate_unit_names(self.base_unit, self.selling_units)
        return self


class ProductUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0)
    default_unit_price: Decimal = Field(ge=0)
    base_unit: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )
    selling_units: list[SellingUnitInput] | None = None

    @field_validator("base_unit")
    @classmethod
    def clean_base_unit(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        if not value:
            raise ValueError("Base unit cannot be blank.")
        return value

    @model_validator(mode="after")
    def validate_unit_configuration(self):
        if self.base_unit is not None and self.selling_units is not None:
            validate_unit_names(self.base_unit, self.selling_units)

        return self

class ProductStockTrackingUpdate(BaseModel):
    is_stock_tracked: bool

class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    purchase_price: Decimal | None = None
    default_unit_price: Decimal
    base_unit: str = "unit"
    selling_units: list[dict] = Field(default_factory=list)
    is_stock_tracked: bool
    stock_quantity: Decimal | None
    created_at: object
    updated_at: object


def validate_idempotency_key(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Idempotency key cannot be blank.")
    return value


class StockInitializeRequest(BaseModel):
    opening_quantity: Decimal = Field(
        ge=0,
        max_digits=14,
        decimal_places=3,
    )
    reason: str = Field(
        min_length=1,
        max_length=500,
    )
    idempotency_key: str = Field(
        min_length=1,
        max_length=200,
    )
    unit_name: str | None = Field(default=None, min_length=1, max_length=30)

    @field_validator("idempotency_key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        return validate_idempotency_key(value)


class StockAdjustmentRequest(BaseModel):
    quantity_delta: Decimal = Field(
        max_digits=14,
        decimal_places=3,
    )
    reason: str = Field(
        min_length=1,
        max_length=500,
    )
    idempotency_key: str = Field(
        min_length=1,
        max_length=200,
    )
    unit_name: str | None = Field(default=None, min_length=1, max_length=30)

    @field_validator("idempotency_key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        return validate_idempotency_key(value)


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

def validate_invoice_product_ids(
    product_ids: set[UUID],
    business_id: UUID,
    db: Session,
) -> None:
    if not product_ids:
        return

    products = db.scalars(
        select(Product).where(
            Product.id.in_(product_ids),
            Product.business_id == business_id,
        )
    ).all()

    found_ids = {product.id for product in products}

    if found_ids != product_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "One or more selected products are invalid "
                "or do not belong to this business."
            ),
        )

def get_customer_for_business(
    customer_id: UUID,
    business_id: UUID,
    db: Session,
) -> Customer:
    customer = db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business_id,
        )
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    return customer

STANDARD_UNIT_CATEGORIES = {
    "PCS": "count",
    "SET": "count",
    "PAIR": "count",
    "DOZEN": "count",
    "BOX": "count",
    "PACK": "count",
    "KG": "weight",
    "G": "weight",
    "MG": "weight",
    "TONNE": "weight",
    "LTR": "volume",
    "ML": "volume",
    "KL": "volume",
    "MTR": "length",
    "CM": "length",
    "MM": "length",
    "KM": "length",
    "SQ FT": "area",
    "SQ M": "area",
    "SQ YD": "area",
    "ROLL": "count",
    "UNIT": "count",
}


def validate_unit_compatibility(
    base_unit: str,
    selling_units: list["SellingUnitInput"],
) -> None:
    base_normalized = base_unit.strip().upper()
    base_category = STANDARD_UNIT_CATEGORIES.get(base_normalized)

    for unit in selling_units:
        selling_normalized = unit.name.strip().upper()
        selling_category = STANDARD_UNIT_CATEGORIES.get(selling_normalized)

        # Custom units remain supported because their physical
        # measurement category cannot be inferred from their name.
        if base_category is None or selling_category is None:
            continue

        if base_category != selling_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Selling unit '{unit.name}' is incompatible with "
                    f"base unit '{base_unit}'. Choose a unit from the "
                    "same measurement category."
                ),
            )


def normalize_unit_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit names cannot be blank.",
        )
    if len(normalized) > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit names cannot exceed 30 characters.",
        )
    return normalized


def validate_selling_units(
    base_unit: str,
    selling_units: list[SellingUnitInput],
) -> tuple[str, list[dict]]:
    normalized_base = normalize_unit_name(base_unit)
    seen = {normalized_base.casefold()}
    normalized_units: list[dict] = []

    for unit in selling_units:
        name = normalize_unit_name(unit.name)

        if name.casefold() in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Selling unit names must be unique and "
                    "distinct from the base unit."
                ),
            )

        factor = unit.factor

        if not factor.is_finite() or factor <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversion factors must be finite and positive.",
            )

        price = unit.price

        if price is not None and (
            not price.is_finite() or price < 0
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Selling-unit prices must be finite "
                    "and non-negative."
                ),
            )

        seen.add(name.casefold())

        normalized_unit = {
            "name": name,
            "factor": format(factor, "f"),
        }

        if price is not None:
            normalized_unit["price"] = format(
                price.quantize(Decimal("0.01")),
                "f",
            )

        normalized_units.append(normalized_unit)

    validate_unit_compatibility(normalized_base, selling_units)

    return normalized_base, normalized_units


def resolve_product_unit(
    product: Product,
    requested_unit: str | None,
) -> tuple[str, Decimal]:
    """Resolve a selling unit against the current product configuration."""
    base_unit = normalize_unit_name(product.base_unit or "unit")
    unit_name = (
        normalize_unit_name(requested_unit)
        if requested_unit is not None
        else base_unit
    )
    if unit_name.casefold() == base_unit.casefold():
        return base_unit, Decimal("1")

    for configured in product.selling_units or []:
        configured_name = str(configured.get("name", "")).strip()
        if configured_name.casefold() != unit_name.casefold():
            continue
        try:
            factor = Decimal(str(configured["factor"]))
        except (KeyError, ValueError, TypeError):
            break
        if not factor.is_finite() or factor <= 0:
            break
        return configured_name, factor

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"Unit '{unit_name}' is not configured for product "
            f"'{product.name}'."
        ),
    )

def to_base_stock_quantity(
    entered_quantity: Decimal,
    conversion_factor: Decimal,
) -> Decimal:
    """Convert an entered quantity to stock precision without silent rounding."""
    raw_quantity = entered_quantity * conversion_factor

    if not raw_quantity.is_finite():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Converted stock quantity must be finite.",
        )

    normalized = raw_quantity.quantize(Decimal("0.001"))

    if normalized != raw_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Converted quantity exceeds the supported precision "
                "of three decimal places in the base unit."
            ),
        )

    return normalized

def resolve_invoice_item_unit(
    item: BillItemCreate,
    db: Session,
) -> tuple[str | None, Decimal, Decimal, str | None]:
    """Return selling unit, conversion factor, base quantity and base unit."""

    if item.product_id is None:
        return None, Decimal("1"), item.quantity, None

    product = db.get(Product, item.product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected product was not found.",
        )

    unit_name, factor = resolve_product_unit(
        product,
        item.unit_name,
    )

    raw_base_quantity = item.quantity * factor

    if (
        not raw_base_quantity.is_finite()
        or raw_base_quantity > Decimal("99999999999.999")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Converted quantity exceeds the supported stock quantity.",
        )

    base_quantity = raw_base_quantity.quantize(
        Decimal("0.001")
    )

    if base_quantity != raw_base_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Converted quantity exceeds the supported precision "
                "of three decimal places in the base unit."
            ),
        )

    if base_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Converted quantity is below the supported stock precision.",
        )

    return unit_name, factor, base_quantity, product.base_unit


def find_idempotent_stock_movement(
    db: Session,
    business_id: UUID,
    idempotency_key: str,
) -> InventoryMovement | None:
    return db.scalar(
        select(InventoryMovement).where(
            InventoryMovement.business_id == business_id,
            InventoryMovement.idempotency_key == idempotency_key,
        )
    )


def is_idempotency_constraint_error(exc: IntegrityError) -> bool:

    original_error = getattr(exc, "orig", None)
    diagnostic = getattr(original_error, "diag", None)
    constraint_name = getattr(diagnostic, "constraint_name", None)

    return (
        constraint_name
        == "uq_inventory_movement_business_idempotency_key"
    )

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

@router.delete("/business/{asset_type}")
def delete_business_asset_endpoint(
    asset_type: str,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if asset_type not in {"logo", "signature"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid business asset type.",
        )

    business = get_user_business(user_id, db)

    storage_path = (
        business.logo_path
        if asset_type == "logo"
        else business.signature_path
    )

    if not storage_path:
        return {
            "message": f"No {asset_type} to delete.",
            "asset_type": asset_type,
        }

    # Clear the database reference first.
    if asset_type == "logo":
        business.logo_path = None
    else:
        business.signature_path = None

    db.commit()
    db.refresh(business)

    # Delete the actual file from Supabase Storage.
    delete_business_asset(storage_path=storage_path)

    return {
        "message": f"Business {asset_type} deleted successfully.",
        "asset_type": asset_type,
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

    customer = (
        get_customer_for_business(
            customer_id=bill_data.customer_id,
            business_id=business.id,
            db=db,
        )
        if bill_data.customer_id is not None
        else None
    )

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

    validate_invoice_product_ids(
        {
            item.product_id
            for item in bill_data.items
            if item.product_id is not None
        },
        business.id,
        db,
    )

    for item in bill_data.items:
        item_name = item.item_name.strip()

        if not item_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Every bill item must have a name.",
            )

        if not item.quantity.is_finite() or item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item quantity must be a finite positive number.",
            )

        if item.unit_price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item price cannot be negative.",
            )


        if item.line_total is not None:
            if (
                not item.line_total.is_finite()
                or item.line_total < 0
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item total must be a valid non-negative amount.",
                )

            line_total = item.line_total.quantize(
                Decimal("0.01")
            )
        else:
            if (
                not item.unit_price.is_finite()
                or item.unit_price < 0
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item rate must be a valid non-negative amount.",
                )

            line_total = (
                Decimal(item.quantity) * item.unit_price
            ).quantize(Decimal("0.01"))

        if line_total > Decimal("9999999999.99"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item amount exceeds the supported limit.",
            )

        (
            unit_name,
            conversion_factor,
            base_quantity,
            base_unit_name,
        ) = resolve_invoice_item_unit(item, db)

        purchase_price_snapshot = None

        if item.product_id is not None:
            product = db.get(Product, item.product_id)

            if product is not None and product.purchase_price is not None:
                purchase_price_snapshot = (
                    product.purchase_price * conversion_factor
                ).quantize(Decimal("0.01"))

        cleaned_items.append(
            {
                "id": item.id,
                "item_name": item_name,
                "product_id": item.product_id,
                "unit_name": unit_name,
                "conversion_factor": conversion_factor,
                "base_quantity": base_quantity,
                "base_unit_name": base_unit_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "purchase_price_snapshot": purchase_price_snapshot,
                "line_total": line_total,
                "custom_values": item.custom_values,
                "highlight_style": item.highlight_style,
                "position": (
                    item.position
                    if item.position is not None
                    else len(cleaned_items)
                ),
            }
        )

    subtotal = sum(
        (
            item["line_total"]
            for item in cleaned_items
        ),
        Decimal("0.00"),
    ).quantize(Decimal("0.01"))

    shipping_charge = bill_data.shipping_charge.quantize(
        Decimal("0.01")
    )

    total = (subtotal + shipping_charge).quantize(
        Decimal("0.01")
    )

    if total > Decimal("9999999999.99"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice total exceeds the supported limit.",
        )

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
        customer_id=customer.id if customer else None,
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
        shipping_charge=shipping_charge,
        total=total,
        invoice_columns=[
            column.model_dump()
            for column in invoice_columns
        ],
        appearance_settings=(
            bill_data.appearance_settings.model_dump()
        ),
        terms_and_conditions=business.terms_and_conditions,
    )

    db.add(bill)
    db.flush()

    try:
        reconcile_bill_inventory(
            db=db,
            business_id=business.id,
            bill_id=bill.id,
            invoice_number=bill.invoice_number,
            old_items=[],
            new_items=cleaned_items,
        )

        for item_data in cleaned_items:
            bill_item = BillItem(
                bill_id=bill.id,
                product_id=item_data["product_id"],
                inventory_tracking_applied=item_data[
                    "inventory_tracking_applied"
                ],
                item_name=item_data["item_name"],
                quantity=item_data["quantity"],
                unit_name=item_data["unit_name"],
                conversion_factor=item_data["conversion_factor"],
                base_quantity=item_data["base_quantity"],
                base_unit_name=item_data["base_unit_name"],
                unit_price=item_data["unit_price"],
                purchase_price_snapshot=item_data[
                    "purchase_price_snapshot"
                ],
                line_total=item_data["line_total"],
                custom_values=item_data["custom_values"],
                position=item_data["position"],
                highlight_style=item_data["highlight_style"],
            )
            db.add(bill_item)

        db.commit()
        db.refresh(bill)
        return bill

    except Exception:
        db.rollback()
        raise

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

@router.get(
    "/reports/sales",
    response_model=SalesReportResponse,
)
async def get_sales_report(
    start_date: date,
    end_date: date,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be on or after start_date.",
        )

    business = get_user_business(user_id, db)

    return build_sales_report(
        db=db,
        business_id=business.id,
        start_date=start_date,
        end_date=end_date,
    )

@router.get(
    "/reports/inventory",
    response_model=InventoryReportResponse,
)
async def get_inventory_report(
    start_date: date,
    end_date: date,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be on or after start_date.",
        )

    business = get_user_business(user_id, db)

    return build_inventory_report(
        db=db,
        business_id=business.id,
        start_date=start_date,
        end_date=end_date,
    )

@router.get(
    "/reports/customers",
    response_model=CustomerReportResponse,
)
async def get_customer_report(
    start_date: date,
    end_date: date,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be on or after start_date.",
        )

    business = get_user_business(user_id, db)

    return build_customer_report(
        db=db,
        business_id=business.id,
        start_date=start_date,
        end_date=end_date,
    )

@router.get(
    "/reports/profitability",
    response_model=ProfitabilityReportResponse,
)
async def get_profitability_report(
    start_date: date,
    end_date: date,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be on or after start_date",
        )

    business = get_user_business(user_id, db)

    return build_profitability_report(
        db=db,
        business_id=business.id,
        start_date=start_date,
        end_date=end_date,
    )

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


@router.put(
    "/bills/{bill_id}",
    response_model=BillResponse,
)
async def update_bill(
    bill_id: UUID,
    bill_data: BillCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    bill = db.scalar(
        select(Bill)
        .where(
            Bill.id == bill_id,
            Bill.business_id == business.id,
        )
        .with_for_update()
    )

    if bill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found.",
        )

    customer_name = bill_data.customer_name.strip()

    customer_id_was_submitted = (
        "customer_id" in bill_data.model_fields_set
    )

    customer = None

    if (
        customer_id_was_submitted
        and bill_data.customer_id is not None
    ):
        customer = get_customer_for_business(
            customer_id=bill_data.customer_id,
            business_id=business.id,
            db=db,
        )

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

    existing_items_by_id = {
        item.id: item
        for item in bill.items
    }

    validate_invoice_product_ids(
        {
            item.product_id
            for item in bill_data.items
            if item.product_id is not None
        },
        business.id,
        db,
    )
    for item in bill_data.items:
        item_name = item.item_name.strip()

        if not item_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Every bill item must have a name.",
            )

        if not item.quantity.is_finite() or item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item quantity must be a finite positive number.",
            )

        if (
            not item.unit_price.is_finite()
            or item.unit_price < 0
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item price must be a valid non-negative amount.",
            )


        if item.line_total is not None:
            if (
                not item.line_total.is_finite()
                or item.line_total < 0
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item total must be a valid non-negative amount.",
                )

            line_total = item.line_total.quantize(
                Decimal("0.01")
            )
        else:
            line_total = (
                Decimal(item.quantity) * item.unit_price
            ).quantize(Decimal("0.01"))

        if line_total > Decimal("9999999999.99"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item amount exceeds the supported limit.",
            )

        existing_item = (
            existing_items_by_id.get(item.id)
            if item.id is not None
            else None
        )

        # Preserve historical unit snapshots when the product,
        # entered quantity and selected selling unit are unchanged.
        preserve_snapshot = (
            existing_item is not None
            and existing_item.product_id == item.product_id
            and existing_item.quantity == item.quantity
            and existing_item.unit_name == item.unit_name
        )

        if preserve_snapshot:
            unit_name = existing_item.unit_name
            conversion_factor = existing_item.conversion_factor
            base_quantity = existing_item.base_quantity
            base_unit_name = existing_item.base_unit_name
        else:
            (
                unit_name,
                conversion_factor,
                base_quantity,
                base_unit_name,
            ) = resolve_invoice_item_unit(item, db)

        # Preserve historical purchase cost when the product remains the same.
        # Recalculate only when the selected selling unit changes.
        if (
            existing_item is not None
            and existing_item.product_id == item.product_id
        ):
            purchase_price_snapshot = (
                existing_item.purchase_price_snapshot
            )

            if (
                purchase_price_snapshot is not None
                and existing_item.unit_name != unit_name
            ):
                old_factor = existing_item.conversion_factor

                if old_factor is not None and old_factor > 0:
                    purchase_price_per_base_unit = (
                        purchase_price_snapshot / old_factor
                    )

                    purchase_price_snapshot = (
                        purchase_price_per_base_unit * conversion_factor
                    ).quantize(Decimal("0.01"))
                else:
                    purchase_price_snapshot = None

        else:
            # New item or changed product: use the current catalogue cost.
            purchase_price_snapshot = None

            if item.product_id is not None:
                product = db.get(Product, item.product_id)

                if (
                    product is not None
                    and product.purchase_price is not None
                ):
                    purchase_price_snapshot = (
                        product.purchase_price * conversion_factor
                    ).quantize(Decimal("0.01"))

        cleaned_items.append(
            {
                "id": item.id,
                "item_name": item_name,
                "product_id": item.product_id,
                "unit_name": unit_name,
                "conversion_factor": conversion_factor,
                "base_quantity": base_quantity,
                "base_unit_name": base_unit_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "purchase_price_snapshot": purchase_price_snapshot,
                "line_total": line_total,
                "custom_values": item.custom_values,
                "highlight_style": item.highlight_style,
                "position": (
                    item.position
                    if item.position is not None
                    else len(cleaned_items)
                ),
            }
        )

    subtotal = sum(
        (item["line_total"] for item in cleaned_items),
        Decimal("0.00"),
    ).quantize(Decimal("0.01"))

    shipping_charge = bill_data.shipping_charge.quantize(
        Decimal("0.01")
    )

    total = (subtotal + shipping_charge).quantize(
        Decimal("0.01")
    )

    if total > Decimal("9999999999.99"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice total exceeds the supported limit.",
        )

    old_items = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "inventory_tracking_applied": item.inventory_tracking_applied,
            "position": item.position,
        }
        for item in bill.items
    ]

    submitted_ids = [
        item["id"]
        for item in cleaned_items
        if item.get("id") is not None
    ]
    if len(submitted_ids) != len(set(submitted_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice item IDs must be unique.",
        )

    # Only IDs belonging to this invoice may identify existing rows.
    # Unknown IDs represent new rows and will receive server-generated IDs.
    for item_data in cleaned_items:
        if item_data.get("id") not in existing_items_by_id:
            item_data["id"] = None

    try:
        # Update editable fields on the existing invoice.
        # Deliberately preserve id, business_id, invoice_number,
        # created_at, and terms_and_conditions.
        bill.customer_name = customer_name
        if customer_id_was_submitted:
            bill.customer_id = (
                customer.id if customer is not None else None
            )
        bill.customer_phone = (
            bill_data.customer_phone.strip()
            if bill_data.customer_phone
            else None
        )
        bill.customer_address = (
            bill_data.customer_address.strip()
            if bill_data.customer_address
            else None
        )
        bill.subtotal = subtotal
        bill.shipping_charge = shipping_charge
        bill.total = total

        # Keep the saved invoice's column snapshot when the
        # request does not explicitly supply one.

        if bill_data.invoice_columns is not None:
            bill.invoice_columns = [
                column.model_dump()
                for column in bill_data.invoice_columns
            ]

        # Save the appearance settings with this invoice.
        bill.appearance_settings = (
            bill_data.appearance_settings.model_dump()
        )

        reconcile_bill_inventory(
            db=db,
            business_id=business.id,
            bill_id=bill.id,
            invoice_number=bill.invoice_number,
            old_items=old_items,
            new_items=cleaned_items,
        )

        replacement_items: list[BillItem] = []
        for item_data in cleaned_items:
            existing_item = (
                existing_items_by_id.get(item_data["id"])
                if item_data.get("id") is not None
                else None
            )
            if existing_item is not None:
                existing_item.item_name = item_data["item_name"]
                existing_item.product_id = item_data["product_id"]
                existing_item.inventory_tracking_applied = item_data[
                    "inventory_tracking_applied"
                ]
                existing_item.quantity = item_data["quantity"]
                existing_item.unit_name = item_data["unit_name"]
                existing_item.conversion_factor = item_data[
                    "conversion_factor"
                ]
                existing_item.base_quantity = item_data["base_quantity"]
                existing_item.base_unit_name = item_data["base_unit_name"]
                existing_item.unit_price = item_data["unit_price"]
                existing_item.purchase_price_snapshot = item_data[
                    "purchase_price_snapshot"
                ]
                existing_item.line_total = item_data["line_total"]
                existing_item.custom_values = item_data["custom_values"]
                existing_item.position = item_data["position"]
                existing_item.highlight_style = item_data[
                    "highlight_style"
                ]
                replacement_items.append(existing_item)
            else:
                replacement_items.append(
                    BillItem(
                        item_name=item_data["item_name"],
                        product_id=item_data["product_id"],
                        inventory_tracking_applied=item_data[
                            "inventory_tracking_applied"
                        ],
                        quantity=item_data["quantity"],
                        unit_name=item_data["unit_name"],
                        conversion_factor=item_data["conversion_factor"],
                        base_quantity=item_data["base_quantity"],
                        base_unit_name=item_data["base_unit_name"],
                        unit_price=item_data["unit_price"],
                        purchase_price_snapshot=item_data[
                            "purchase_price_snapshot"
                        ],
                        line_total=item_data["line_total"],
                        custom_values=item_data["custom_values"],
                        position=item_data["position"],
                        highlight_style=item_data["highlight_style"],
                    )
                )

        bill.items[:] = replacement_items

        db.commit()
        db.refresh(bill)

        return bill

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update bill.",
        ) from exc

@router.patch(
    "/bills/{bill_id}/items/{item_id}/purchase-cost",
)
def correct_invoice_item_purchase_cost(
    bill_id: UUID,
    item_id: UUID,
    payload: PurchaseCostCorrection,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    bill = db.scalar(
        select(Bill)
        .where(
            Bill.id == bill_id,
            Bill.business_id == business.id,
        )
        .with_for_update()
    )

    if bill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found.",
        )

    bill_item = next(
        (item for item in bill.items if item.id == item_id),
        None,
    )

    if bill_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found.",
        )

    bill_item.purchase_price_snapshot = (
        payload.purchase_price_snapshot
    )

    try:
        db.commit()
        db.refresh(bill_item)
        return bill_item

    except Exception:
        db.rollback()
        raise

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
        select(Bill)
        .where(
            Bill.id == bill_id,
            Bill.business_id == business.id,
        )
        .with_for_update()
    )

    if bill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found.",
        )

    old_items = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "inventory_tracking_applied": item.inventory_tracking_applied,
        }
        for item in bill.items
    ]

    try:
        reconcile_bill_inventory(
            db=db,
            business_id=business.id,
            bill_id=bill.id,
            invoice_number=bill.invoice_number,
            old_items=old_items,
            new_items=[],
        )

        db.delete(bill)
        db.commit()

    except Exception:
        db.rollback()
        raise

    return Response(status_code=status.HTTP_204_NO_CONTENT)

def normalize_match_text(value: str | None) -> str:
    if not value:
        return ""

    return " ".join(value.casefold().split())


def normalize_match_phone(value: str | None) -> str:
    if not value:
        return ""

    # Compare digits only so spaces, +, -, and parentheses
    # do not prevent otherwise identical phone numbers matching.
    return "".join(character for character in value if character.isdigit())


@router.post(
    "/customers/match",
    response_model=CustomerMatchResponse,
)
async def match_customer(
    payload: CustomerMatchRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    normalized_phone = normalize_match_phone(payload.phone)
    normalized_name = normalize_match_text(payload.name)

    if not normalized_phone and not normalized_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a customer name or phone number.",
        )

    # Phone is the preferred identity signal.
    if normalized_phone:
        customers = db.scalars(
            select(Customer).where(
                Customer.business_id == business.id,
                Customer.phone.is_not(None),
            )
        ).all()

        phone_matches = [
            customer
            for customer in customers
            if normalize_match_phone(customer.phone) == normalized_phone
        ]

        if len(phone_matches) == 1:
            return CustomerMatchResponse(
                status="matched",
                match_type="phone",
                candidates=phone_matches,
            )

        if len(phone_matches) > 1:
            return CustomerMatchResponse(
                status="ambiguous",
                match_type="phone",
                candidates=phone_matches,
            )

    # If no phone match exists, use exact normalized name.
    if normalized_name:
        customers = db.scalars(
            select(Customer).where(
                Customer.business_id == business.id,
            )
        ).all()

        name_matches = [
            customer
            for customer in customers
            if normalize_match_text(customer.name) == normalized_name
        ]

        if len(name_matches) == 1:
            return CustomerMatchResponse(
                status="matched",
                match_type="name",
                candidates=name_matches,
            )

        if len(name_matches) > 1:
            return CustomerMatchResponse(
                status="ambiguous",
                match_type="name",
                candidates=name_matches,
            )

    return CustomerMatchResponse(
        status="not_found",
        candidates=[],
    )


@router.post(
    "/products/match",
    response_model=ProductMatchResponse,
)
async def match_product(
    payload: ProductMatchRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    normalized_name = normalize_match_text(payload.name)

    if not normalized_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product name is required.",
        )

    products = db.scalars(
        select(Product).where(
            Product.business_id == business.id,
        )
    ).all()

    matches = [
        product
        for product in products
        if normalize_match_text(product.name) == normalized_name
    ]

    if len(matches) == 1:
        return ProductMatchResponse(
            status="matched",
            candidates=matches,
        )

    if len(matches) > 1:
        return ProductMatchResponse(
            status="ambiguous",
            candidates=matches,
        )

    return ProductMatchResponse(
        status="not_found",
        candidates=[],
    )

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


@router.get("/products", response_model=list[ProductResponse])
async def list_products(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    return db.scalars(
        select(Product)
        .where(Product.business_id == business.id)
        .order_by(Product.name.asc())
    ).all()

MAX_PRODUCT_PDF_SIZE_BYTES = 15 * 1024 * 1024
MAX_PRODUCT_EXCEL_SIZE_BYTES = 15 * 1024 * 1024

def _import_decimal(value) -> Decimal | None:
    """Safely convert a stored or extracted value to Decimal."""
    if value is None:
        return None

    try:
        result = Decimal(str(value))
    except Exception:
        return None

    if not result.is_finite():
        return None

    return result


def _format_import_price(value: Decimal | None) -> str | None:
    if value is None:
        return None

    return str(value.quantize(Decimal("0.01")))


def _get_current_selling_unit_price(
    product: Product,
    unit_name: str,
) -> Decimal | None:
    """
    Resolve the current price for a selling unit.

    Explicit independent unit prices take precedence.
    Older units without a price retain the proportional fallback.
    """
    normalized_name = normalize_match_text(unit_name)

    for unit in product.selling_units or []:
        if normalize_match_text(unit.get("name")) != normalized_name:
            continue

        explicit_price = _import_decimal(unit.get("price"))

        if explicit_price is not None:
            return explicit_price

        factor = _import_decimal(unit.get("factor"))

        if factor is None or factor <= 0:
            return None

        base_price = _import_decimal(product.default_unit_price)

        if base_price is None:
            return None

        return base_price * factor

    return None


def _build_product_import_preview(
    extracted: dict,
    products_by_name: dict[str, list[Product]],
) -> dict:
    """
    Build a common product-import preview row.

    Shared by PDF and Excel imports so matching and price
    comparisons behave consistently.
    """
    product_name = extracted["name"]
    normalized_name = normalize_match_text(product_name)

    candidates = products_by_name.get(normalized_name, [])

    match_status = "new"
    matched_product = None
    candidate_ids = []

    if len(candidates) == 1:
        match_status = "exact_match"
        matched_product = candidates[0]
    elif len(candidates) > 1:
        match_status = "ambiguous"
        candidate_ids = [
            str(candidate.id)
            for candidate in candidates
        ]

    supplier_base_price = None
    base_price_column_count = 0

    for unit in extracted.get("selling_units", []):
        factor = _import_decimal(unit.get("factor_to_base"))

        if factor == Decimal("1"):
            base_price_column_count += 1
            supplier_base_price = _import_decimal(unit.get("rate"))

    if base_price_column_count > 1:
        supplier_base_price = None

    current_base_price = None
    base_price_changed = None
    base_unit_matches = None

    if matched_product is not None:
        extracted_base_unit = extracted.get("base_unit")

        base_unit_matches = (
            normalize_match_text(matched_product.base_unit)
            == normalize_match_text(extracted_base_unit)
            if extracted_base_unit
            else False
        )

        if base_unit_matches:
            current_base_price = _import_decimal(
                matched_product.default_unit_price
            )

            if (
                supplier_base_price is not None
                and current_base_price is not None
            ):
                base_price_changed = (
                    supplier_base_price != current_base_price
                )

    preview_units = []

    for unit in extracted.get("selling_units", []):
        supplier_rate = _import_decimal(unit.get("rate"))

        current_rate = None
        price_changed = None

        if matched_product is not None and base_unit_matches:
            current_rate = _get_current_selling_unit_price(
                matched_product,
                unit["name"],
            )

            if supplier_rate is not None and current_rate is not None:
                price_changed = supplier_rate != current_rate

        preview_units.append({
            "name": unit["name"],
            "factor_to_base": unit.get("factor_to_base"),
            "supplier_rate": _format_import_price(supplier_rate),
            "current_rate": _format_import_price(current_rate),
            "price_changed": price_changed,
        })

    row_warnings = list(extracted.get("warnings", []))

    if extracted.get("base_unit") is None:
        row_warnings.append(
            "Base unit could not be determined. Manual review required."
        )

    if base_price_column_count == 0:
        row_warnings.append(
            "No selling-unit column represents exactly one base unit. "
            "A base-unit selling price cannot be determined."
        )
    elif base_price_column_count > 1:
        row_warnings.append(
            "Multiple selling-unit columns represent one base unit. "
            "Select the correct base-unit price manually."
        )

    if matched_product is not None and not base_unit_matches:
        row_warnings.append(
            "Existing product uses a different base unit. "
            "Price comparison requires manual review."
        )

    if match_status == "ambiguous":
        row_warnings.append(
            "Multiple existing products have this exact name. "
            "Select the correct product manually."
        )

    supplier_purchase_price = _import_decimal(
        extracted.get("purchase_price")
    )

    current_purchase_price = (
        _import_decimal(matched_product.purchase_price)
        if matched_product is not None
        else None
    )

    purchase_price_changed = None

    if (
        supplier_purchase_price is not None
        and current_purchase_price is not None
    ):
        purchase_price_changed = (
            supplier_purchase_price != current_purchase_price
        )

    return {
        "serial_number": extracted["serial_number"],
        "name": product_name,
        "source_page": extracted.get("source_page"),
        "source_row": extracted.get("source_row"),
        "base_unit": extracted.get("base_unit"),
        "match_status": match_status,
        "matched_product_id": (
            str(matched_product.id)
            if matched_product is not None
            else None
        ),
        "matched_product_name": (
            matched_product.name
            if matched_product is not None
            else None
        ),
        "candidate_product_ids": candidate_ids,
        "current_base_unit": (
            matched_product.base_unit
            if matched_product is not None
            else None
        ),
        "supplier_base_price": _format_import_price(
            supplier_base_price
        ),
        "current_base_price": _format_import_price(
            current_base_price
        ),
        "base_price_changed": base_price_changed,
        "base_unit_matches": base_unit_matches,
        "selling_units": preview_units,
        "purchase_price": extracted.get("purchase_price"),
        "supplier_purchase_price": _format_import_price(
            supplier_purchase_price
        ),
        "current_purchase_price": _format_import_price(
            current_purchase_price
        ),
        "purchase_price_changed": purchase_price_changed,
        "opening_stock": extracted.get("opening_stock"),
        "warnings": row_warnings,
    }


@router.post("/products/import/pdf/preview")
async def preview_product_pdf_import(
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    # Validate the filename.
    filename = file.filename or ""

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF file.",
        )

    # Read at most one byte beyond the permitted limit.
    pdf_bytes = await file.read(
        MAX_PRODUCT_PDF_SIZE_BYTES + 1
    )

    if len(pdf_bytes) > MAX_PRODUCT_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF file exceeds the 15 MB upload limit.",
        )

    # Check the PDF signature rather than trusting the MIME type.
    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid PDF.",
        )

    try:
        extraction = extract_product_pdf(pdf_bytes)
    except ProductPDFImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Only load products belonging to the authenticated business.
    existing_products = db.scalars(
        select(Product).where(
            Product.business_id == business.id
        )
    ).all()

    products_by_name: dict[str, list[Product]] = {}

    for product in existing_products:
        key = normalize_match_text(product.name)

        if key:
            products_by_name.setdefault(key, []).append(product)

    preview_products = [
        _build_product_import_preview(
            extracted,
            products_by_name,
        )
        for extracted in extraction["products"]
    ]

    return {
        "filename": filename,
        "page_count": extraction["page_count"],
        "processed_pages": extraction["processed_pages"],
        "product_count": extraction["product_count"],
        "price_columns": extraction["price_columns"],
        "products": preview_products,
        "warnings": extraction["warnings"],
    }

@router.post("/products/import/excel/preview")
async def preview_product_excel_import(
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    filename = file.filename or ""

    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload an .xlsx Excel workbook.",
        )

    excel_bytes = await file.read(
        MAX_PRODUCT_EXCEL_SIZE_BYTES + 1
    )

    if not excel_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded Excel file is empty.",
        )

    if len(excel_bytes) > MAX_PRODUCT_EXCEL_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Excel file exceeds the 15 MB upload limit.",
        )

    if not excel_bytes.startswith(b"PK"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid XLSX workbook.",
        )

    try:
        extraction = extract_product_excel(excel_bytes)
    except ProductExcelImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    existing_products = db.scalars(
        select(Product).where(
            Product.business_id == business.id
        )
    ).all()

    products_by_name: dict[str, list[Product]] = {}

    for product in existing_products:
        key = normalize_match_text(product.name)

        if key:
            products_by_name.setdefault(key, []).append(product)

    preview_products = [
        _build_product_import_preview(
            extracted,
            products_by_name,
        )
        for extracted in extraction["products"]
    ]

    return {
        "filename": filename,
        "sheet_name": extraction["sheet_name"],
        "product_count": extraction["product_count"],
        "price_columns": extraction["price_columns"],
        "has_purchase_price_column": extraction[
            "has_purchase_price_column"
        ],
        "has_opening_stock_column": extraction[
            "has_opening_stock_column"
        ],
        "products": preview_products,
        "warnings": extraction["warnings"],
    }


@router.post("/products/import/excel/confirm")
async def confirm_product_excel_import(
    file: UploadFile = File(...),
    decisions_json: str = Form(...),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    filename = file.filename or ""

    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload an .xlsx Excel workbook.",
        )

    excel_bytes = await file.read(
        MAX_PRODUCT_EXCEL_SIZE_BYTES + 1
    )

    if not excel_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded Excel file is empty.",
        )

    if len(excel_bytes) > MAX_PRODUCT_EXCEL_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Excel file exceeds the 15 MB upload limit.",
        )

    if not excel_bytes.startswith(b"PK"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid XLSX workbook.",
        )

    try:
        extraction = extract_product_excel(excel_bytes)
    except ProductExcelImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    try:
        decisions = json.loads(decisions_json)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid import decisions.",
        )

    if not isinstance(decisions, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import decisions must be a list.",
        )

    extracted_products = extraction["products"]

    extracted_by_serial = {
        item["serial_number"]: item
        for item in extracted_products
    }

    if len(extracted_by_serial) != len(extracted_products):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Excel file contains duplicate product serial numbers.",
        )

    decisions_by_serial = {}

    for decision in decisions:
        if not isinstance(decision, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each import decision must be an object.",
            )

        serial = decision.get("serial_number")
        action = decision.get("action")

        if (
            not isinstance(serial, int)
            or isinstance(serial, bool)
            or serial not in extracted_by_serial
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product serial number: {serial}.",
            )

        if serial in decisions_by_serial:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate decision for product {serial}.",
            )

        if action not in {"create", "update", "skip"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action for product {serial}.",
            )

        decisions_by_serial[serial] = decision

    if set(decisions_by_serial) != set(extracted_by_serial):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide exactly one decision for every Excel product.",
        )

    created_count = 0
    updated_count = 0
    skipped_count = 0
    initialized_stock_count = 0
    processed_product_ids = set()

    try:
        existing_product_names = set()

        if any(
            decision["action"] == "create"
            for decision in decisions_by_serial.values()
        ):
            existing_product_names = {
                normalize_match_text(name)
                for name in db.scalars(
                    select(Product.name).where(
                        Product.business_id == business.id
                    )
                ).all()
            }

        for serial, extracted in extracted_by_serial.items():
            decision = decisions_by_serial[serial]
            action = decision["action"]

            if action == "skip":
                skipped_count += 1
                continue

            # Do not silently ignore invalid supplier data.
            invalid_warnings = [
                warning
                for warning in extracted.get("warnings", [])
                if "invalid" in warning.casefold()
            ]

            if invalid_warnings:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} ({extracted['name']}) "
                        f"contains invalid data: {'; '.join(invalid_warnings)}"
                    ),
                )

            base_unit = extracted.get("base_unit")

            if not base_unit:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} ({extracted['name']}) "
                        "has no valid base unit."
                    ),
                )

            # Exactly one factor-1 unit must provide the base price.
            base_price_units = [
                unit
                for unit in extracted["selling_units"]
                if _import_decimal(
                    unit.get("factor_to_base")
                ) == Decimal("1")
            ]

            if len(base_price_units) != 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} ({extracted['name']}) "
                        "must have exactly one base-unit price."
                    ),
                )

            base_price = _import_decimal(
                base_price_units[0].get("rate")
            )

            if base_price is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} ({extracted['name']}) "
                        "has no valid base-unit price."
                    ),
                )

            # Prepare independently priced alternative selling units.
            supplier_units = []

            for unit in extracted["selling_units"]:
                factor = _import_decimal(
                    unit.get("factor_to_base")
                )
                rate = _import_decimal(unit.get("rate"))

                if factor is None or factor <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Invalid conversion factor for "
                            f"{extracted['name']} / {unit['name']}."
                        ),
                    )

                # A blank alternative selling-unit price means that
                # this unit is not imported/configured.
                if rate is None:
                    continue

                if factor == Decimal("1"):
                    continue

                try:
                    supplier_unit = SellingUnitInput(
                        name=unit["name"],
                        factor=factor,
                        price=rate,
                    )
                except Exception as exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Invalid selling unit for "
                            f"{extracted['name']}: {exc}"
                        ),
                    ) from exc

                supplier_units.append(supplier_unit)

            normalized_base, normalized_units = (
                validate_selling_units(
                    base_unit,
                    supplier_units,
                )
            )

            supplier_purchase_price = _import_decimal(
                extracted.get("purchase_price")
            )

            opening_stock = _import_decimal(
                extracted.get("opening_stock")
            )

            initialize_stock = decision.get(
                "initialize_stock",
                False,
            )

            if not isinstance(initialize_stock, bool):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Invalid stock decision for product {serial}."
                    ),
                )

            if initialize_stock and opening_stock is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} has no opening stock value."
                    ),
                )

            product = None

            if action == "create":
                # Recheck for duplicates using the confirmation-time
                # catalogue snapshot and names created in this import.
                normalized_product_name = normalize_match_text(
                    extracted["name"]
                )

                duplicate = (
                    normalized_product_name in existing_product_names
                )

                if duplicate:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Product '{extracted['name']}' already exists. "
                            "Refresh the preview and select update instead."
                        ),
                    )

                product = Product(
                    business_id=business.id,
                    name=extracted["name"].strip(),
                    description=extracted.get("description"),
                    purchase_price=supplier_purchase_price,
                    default_unit_price=base_price,
                    base_unit=normalized_base,
                    selling_units=normalized_units,
                    is_stock_tracked=False,
                    stock_quantity=None,
                )

                db.add(product)
                db.flush()

                existing_product_names.add(
                    normalize_match_text(product.name)
                )

                created_count += 1

            else:
                product_id_value = decision.get("product_id")

                try:
                    product_id = UUID(str(product_id_value))
                except (ValueError, TypeError, AttributeError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"An existing product ID is required "
                            f"for Excel row {serial}."
                        ),
                    )

                if product_id in processed_product_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "The same existing product cannot be "
                            "updated by multiple Excel rows."
                        ),
                    )

                product = db.scalar(
                    select(Product)
                    .where(
                        Product.id == product_id,
                        Product.business_id == business.id,
                    )
                    .with_for_update()
                )

                if product is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=(
                            f"Product selected for row {serial} "
                            "was not found."
                        ),
                    )

                if (
                    normalize_match_text(product.name)
                    != normalize_match_text(extracted["name"])
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Product name mismatch for row {serial}."
                        ),
                    )

                if (
                    normalize_match_text(product.base_unit)
                    != normalize_match_text(base_unit)
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Base-unit mismatch for '{product.name}'. "
                            "Existing inventory configuration was not changed."
                        ),
                    )

                # Preserve the existing unit configuration.
                updated_units = [
                    dict(unit)
                    for unit in (product.selling_units or [])
                ]

                existing_units = {
                    normalize_match_text(unit.get("name")): unit
                    for unit in updated_units
                }

                updated_units_by_name = {
                    normalize_match_text(unit.get("name")): unit
                    for unit in updated_units
                }

                for supplier_unit in supplier_units:
                    key = normalize_match_text(supplier_unit.name)
                    existing_unit = existing_units.get(key)

                    if existing_unit is None:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=(
                                f"Supplier unit '{supplier_unit.name}' "
                                f"is not configured for '{product.name}'."
                            ),
                        )

                    existing_factor = _import_decimal(
                        existing_unit.get("factor")
                    )

                    if existing_factor != supplier_unit.factor:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=(
                                f"Conversion factor mismatch for "
                                f"'{product.name}' / '{supplier_unit.name}'."
                            ),
                        )

                    updated_units_by_name[key]["price"] = format(
                        supplier_unit.price.quantize(
                            Decimal("0.01")
                        ),
                        "f",
                    )

                product.default_unit_price = base_price
                product.selling_units = updated_units

                if supplier_purchase_price is not None:
                    product.purchase_price = supplier_purchase_price

                processed_product_ids.add(product.id)
                updated_count += 1

            # Opening stock must be recorded as a ledger movement.
            # Never overwrite an already initialized stock balance.
            if initialize_stock:
                idempotency_key = decision.get(
                    "stock_idempotency_key"
                )

                if (
                    not isinstance(idempotency_key, str)
                    or not idempotency_key.strip()
                    or len(idempotency_key) > 200
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"A valid stock idempotency key is required "
                            f"for product {serial}."
                        ),
                    )

                opening_quantity = to_base_stock_quantity(
                    opening_stock,
                    Decimal("1"),
                )

                reason = (
                    f"Opening stock imported from Excel: "
                    f"{filename}, row {extracted.get('source_row')}"
                )[:500]

                existing_movement = find_idempotent_stock_movement(
                    db=db,
                    business_id=business.id,
                    idempotency_key=idempotency_key.strip(),
                )

                if existing_movement is not None:
                    # A retry must match the original operation exactly.
                    if (
                        existing_movement.product_id != product.id
                        or existing_movement.movement_type != "opening"
                        or existing_movement.quantity_delta != opening_quantity
                        or existing_movement.stock_after != opening_quantity
                        or existing_movement.entered_quantity != opening_stock
                        or existing_movement.entered_unit != normalized_base
                        or existing_movement.conversion_factor != Decimal("1")
                        or existing_movement.reason != reason
                    ):
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=(
                                "Stock idempotency key was already used "
                                "for a different operation."
                            ),
                        )

                    # The product balance and ledger must agree.
                    if product.stock_quantity != existing_movement.stock_after:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=(
                                f"Stock ledger and product balance disagree "
                                f"for '{product.name}'. Manual review is required."
                            ),
                        )

                    initialized_stock_count += 1

                else:
                    if product.stock_quantity is not None:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=(
                                f"Stock for '{product.name}' is already "
                                "initialized. Existing stock was preserved."
                            ),
                        )

                    product.stock_quantity = opening_quantity
                    product.is_stock_tracked = True

                    db.add(
                        InventoryMovement(
                            business_id=business.id,
                            product_id=product.id,
                            quantity_delta=opening_quantity,
                            stock_after=opening_quantity,
                            movement_type="opening",
                            reason=reason,
                            idempotency_key=idempotency_key.strip(),
                            entered_quantity=opening_stock,
                            entered_unit=normalized_base,
                            conversion_factor=Decimal("1"),
                        )
                    )

                    initialized_stock_count += 1

        db.commit()

    except IntegrityError as exc:
        db.rollback()

        if is_idempotency_constraint_error(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A stock import operation with this idempotency key "
                    "already exists. Refresh the product catalogue and "
                    "review the import before retrying."
                ),
            ) from exc

        raise

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Excel product import completed.",
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "stock_initialized": initialized_stock_count,
        "total": len(extracted_products),
    }


@router.post("/products/import/pdf/confirm")
async def confirm_product_pdf_import(
    file: UploadFile = File(...),
    decisions_json: str = Form(...),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF file.",
        )

    pdf_bytes = await file.read(MAX_PRODUCT_PDF_SIZE_BYTES + 1)

    if len(pdf_bytes) > MAX_PRODUCT_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF file exceeds the 15 MB upload limit.",
        )

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid PDF.",
        )

    try:
        extraction = extract_product_pdf(pdf_bytes)
    except ProductPDFImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    try:
        decisions = json.loads(decisions_json)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid import decisions.",
        )

    if not isinstance(decisions, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import decisions must be a list.",
        )

    extracted_products = extraction["products"]
    extracted_by_serial = {
        item["serial_number"]: item
        for item in extracted_products
    }

    if len(extracted_by_serial) != len(extracted_products):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The PDF contains duplicate serial numbers. "
                   "Resolve these before importing.",
        )

    decisions_by_serial = {}

    for decision in decisions:
        if not isinstance(decision, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each import decision must be an object.",
            )

        serial = decision.get("serial_number")
        action = decision.get("action")

        if (
            not isinstance(serial, int)
            or isinstance(serial, bool)
            or serial not in extracted_by_serial
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product serial number: {serial}.",
            )

        if serial in decisions_by_serial:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate decision for serial number {serial}.",
            )

        if action not in {"create", "update", "skip"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action for serial number {serial}.",
            )

        decisions_by_serial[serial] = decision

    if set(decisions_by_serial) != set(extracted_by_serial):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide exactly one decision for every PDF product.",
        )

    updated_product_ids = set()
    created_count = 0
    updated_count = 0
    skipped_count = 0

    try:
        existing_product_names = set()

        if any(
            decision["action"] == "create"
            for decision in decisions_by_serial.values()
        ):
            existing_product_names = {
                normalize_match_text(name)
                for name in db.scalars(
                    select(Product.name).where(
                        Product.business_id == business.id
                    )
                ).all()
            }

        for serial, extracted in extracted_by_serial.items():
            decision = decisions_by_serial[serial]
            action = decision["action"]

            if action == "skip":
                skipped_count += 1
                continue

            base_unit = extracted["base_unit"]

            if not base_unit:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} ({extracted['name']}) "
                        "has no valid base unit. Manual review required."
                    ),
                )

            # Find the supplier's base-unit price.
            base_price_units = []

            for unit in extracted["selling_units"]:
                factor = _import_decimal(
                    unit.get("factor_to_base")
                )

                if factor == Decimal("1"):
                    base_price_units.append(unit)

            if len(base_price_units) != 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} ({extracted['name']}) "
                        "does not have exactly one identifiable "
                        "base-unit price."
                    ),
                )

            base_price = _import_decimal(
                base_price_units[0].get("rate")
            )

            if base_price is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product {serial} ({extracted['name']}) "
                        "has no valid base-unit price."
                    ),
                )

            # Prepare independently priced alternative units.
            supplier_units = []

            for unit in extracted["selling_units"]:
                factor = _import_decimal(
                    unit.get("factor_to_base")
                )

                rate = _import_decimal(unit.get("rate"))

                if factor is None or factor <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Invalid conversion factor for "
                            f"{extracted['name']} ({unit['name']})."
                        ),
                    )

                if rate is None:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Missing supplier rate for "
                            f"{extracted['name']} ({unit['name']})."
                        ),
                    )

                # The factor-1 column supplies default_unit_price.
                if factor == Decimal("1"):
                    continue

                try:
                    selling_unit = SellingUnitInput(
                        name=unit["name"],
                        factor=factor,
                        price=rate,
                    )
                except Exception as exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Invalid selling-unit configuration for "
                            f"{extracted['name']}: {exc}"
                        ),
                    ) from exc

                supplier_units.append(selling_unit)

            if action == "create":
                # Recheck for duplicates using the confirmation-time
                # catalogue snapshot and names created in this import.
                normalized_product_name = normalize_match_text(
                    extracted["name"]
                )

                duplicate = (
                    normalized_product_name in existing_product_names
                )

                if duplicate:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Product '{extracted['name']}' already "
                            "exists. Review it as an update instead."
                        ),
                    )

                normalized_base, normalized_units = (
                    validate_selling_units(
                        base_unit,
                        supplier_units,
                    )
                )

                product = Product(
                    business_id=business.id,
                    name=extracted["name"].strip(),
                    description=None,
                    purchase_price=_import_decimal(
                        extracted.get("purchase_price")
                    ),
                    default_unit_price=base_price,
                    base_unit=normalized_base,
                    selling_units=normalized_units,
                    is_stock_tracked=False,
                    stock_quantity=None,
                )

                db.add(product)
                db.flush()

                existing_product_names.add(
                    normalize_match_text(product.name)
                )

                created_count += 1
                continue

            # Existing product update.
            product_id_value = decision.get("product_id")

            try:
                product_id = UUID(str(product_id_value))
            except (ValueError, TypeError, AttributeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"An existing product ID is required "
                        f"for serial number {serial}."
                    ),
                )

            if product_id in updated_product_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The same existing product cannot be "
                           "updated by multiple PDF rows.",
                )

            product = db.scalar(
                select(Product)
                .where(
                    Product.id == product_id,
                    Product.business_id == business.id,
                )
                .with_for_update()
            )

            if product is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Existing product for serial number "
                        f"{serial} was not found."
                    ),
                )

            if (
                normalize_match_text(product.name)
                != normalize_match_text(extracted["name"])
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product name mismatch for serial number {serial}."
                    ),
                )

            if (
                normalize_match_text(product.base_unit)
                != normalize_match_text(base_unit)
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Base unit mismatch for '{product.name}'. "
                        "Existing inventory configuration was not changed."
                    ),
                )

            # Update prices only when supplier units exactly match
            # the existing unit names and conversion factors.
            existing_units = {
                normalize_match_text(unit.get("name")): unit
                for unit in (product.selling_units or [])
            }

            updated_units = []

            for unit in (product.selling_units or []):
                updated_units.append(dict(unit))

            updated_units_by_name = {
                normalize_match_text(unit.get("name")): unit
                for unit in updated_units
            }

            for supplier_unit in supplier_units:
                key = normalize_match_text(supplier_unit.name)
                existing = existing_units.get(key)

                if existing is None:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Supplier unit '{supplier_unit.name}' "
                            f"is not configured for '{product.name}'. "
                            "Review the unit configuration manually."
                        ),
                    )

                existing_factor = _import_decimal(
                    existing.get("factor")
                )

                if existing_factor != supplier_unit.factor:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Conversion factor mismatch for "
                            f"'{product.name}' / '{supplier_unit.name}'. "
                            "Existing inventory configuration was not changed."
                        ),
                    )

                target_unit = updated_units_by_name[key]
                target_unit["price"] = format(
                    supplier_unit.price.quantize(Decimal("0.01")),
                    "f",
                )

            product.default_unit_price = base_price
            product.selling_units = updated_units

            supplier_purchase_price = _import_decimal(
                extracted.get("purchase_price")
            )

            if supplier_purchase_price is not None:
                product.purchase_price = supplier_purchase_price

            updated_product_ids.add(product_id)
            updated_count += 1

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "PDF product import completed.",
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "total": len(extracted_products),
    }


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
)
async def get_product(
    product_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    product = db.scalar(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return product


@router.post(
    "/products/{product_id}/stock/initialize",
    response_model=ProductResponse,
)
async def initialize_product_stock(
    product_id: UUID,
    payload: StockInitializeRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    try:
        product = db.scalar(
            select(Product)
            .where(
                Product.id == product_id,
                Product.business_id == business.id,
            )
            .with_for_update()
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        unit_name, factor = resolve_product_unit(product, payload.unit_name)
        opening_quantity = to_base_stock_quantity(
            payload.opening_quantity,
            factor,
        )

        existing_movement = find_idempotent_stock_movement(
            db=db,
            business_id=business.id,
            idempotency_key=payload.idempotency_key,
        )

        if existing_movement is not None:
            if (
                existing_movement.product_id != product.id
                or existing_movement.movement_type != "opening"
                or existing_movement.quantity_delta != opening_quantity
                or existing_movement.entered_quantity != payload.opening_quantity
                or existing_movement.entered_unit != unit_name
                or existing_movement.conversion_factor != factor
                or existing_movement.reason != payload.reason.strip()
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency key was already used for a different stock operation.",
                )

            db.commit()
            db.refresh(product)
            return product

        if product.stock_quantity is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Opening stock has already been initialized.",
            )


        reason = payload.reason.strip()
        if not reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A reason is required for stock initialization.",
            )

        product.stock_quantity = opening_quantity
        product.is_stock_tracked = True


        db.add(
            InventoryMovement(
                business_id=business.id,
                product_id=product.id,
                quantity_delta=opening_quantity,
                stock_after=opening_quantity,
                movement_type="opening",
                reason=reason,
                idempotency_key=payload.idempotency_key,
                entered_quantity=payload.opening_quantity,
                entered_unit=unit_name,
                conversion_factor=factor,
            )
        )

        db.commit()
        db.refresh(product)
        return product

    except IntegrityError as exc:
        db.rollback()
        if not is_idempotency_constraint_error(exc):
            raise
        existing_movement = find_idempotent_stock_movement(
            db=db,
            business_id=business.id,
            idempotency_key=payload.idempotency_key,
        )
        if existing_movement is not None:
            retry_product = db.scalar(
                select(Product).where(
                    Product.id == product_id,
                    Product.business_id == business.id,
                )
            )
            if retry_product is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found.",
                )

            retry_unit_name, retry_factor = resolve_product_unit(
                retry_product,
                payload.unit_name,
            )
            retry_opening_quantity = to_base_stock_quantity(
                payload.opening_quantity,
                retry_factor,
            )
            if (
                existing_movement.product_id == product_id
                and existing_movement.movement_type == "opening"
                and existing_movement.quantity_delta == retry_opening_quantity
                and existing_movement.entered_quantity == payload.opening_quantity
                and existing_movement.entered_unit == retry_unit_name
                and existing_movement.conversion_factor == retry_factor
                and existing_movement.reason == payload.reason.strip()
            ):
                return retry_product
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Idempotency key was already used for a different "
                    "stock operation."
                ),
            )
        raise
    except Exception:
        db.rollback()
        raise


@router.post(
    "/products/{product_id}/stock/adjust",
    response_model=ProductResponse,
)
async def adjust_product_stock(
    product_id: UUID,
    payload: StockAdjustmentRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    try:
        product = db.scalar(
            select(Product)
            .where(
                Product.id == product_id,
                Product.business_id == business.id,
            )
            .with_for_update()
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        unit_name, factor = resolve_product_unit(product, payload.unit_name)

        quantity_delta = to_base_stock_quantity(
            payload.quantity_delta,
            factor,
        )

        existing_movement = find_idempotent_stock_movement(
            db=db,
            business_id=business.id,
            idempotency_key=payload.idempotency_key,
        )

        if existing_movement is not None:
            if (
                existing_movement.product_id != product.id
                or existing_movement.movement_type != "adjustment"
                or existing_movement.quantity_delta != quantity_delta
                or existing_movement.entered_quantity != payload.quantity_delta
                or existing_movement.entered_unit != unit_name
                or existing_movement.conversion_factor != factor
                or existing_movement.reason != payload.reason.strip()
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency key was already used for a different stock operation.",
                )

            db.commit()
            db.refresh(product)
            return product

        if product.stock_quantity is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Opening stock must be initialized first.",
            )

        if not product.is_stock_tracked:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stock tracking is not enabled for this product.",
            )

        if not quantity_delta.is_finite() or quantity_delta == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock adjustment must be a finite non-zero quantity.",
            )

        reason = payload.reason.strip()
        if not reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A reason is required for stock adjustment.",
            )

        stock_after = product.stock_quantity + quantity_delta
        if stock_after < 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stock adjustment cannot result in negative stock.",
            )

        product.stock_quantity = stock_after

        db.add(
            InventoryMovement(
                business_id=business.id,
                product_id=product.id,
                quantity_delta=quantity_delta,
                stock_after=stock_after,
                movement_type="adjustment",
                reason=reason,
                idempotency_key=payload.idempotency_key,
                entered_quantity=payload.quantity_delta,
                entered_unit=unit_name,
                conversion_factor=factor,
            )
        )

        db.commit()
        db.refresh(product)
        return product

    except IntegrityError as exc:
        db.rollback()
        if not is_idempotency_constraint_error(exc):
            raise
        existing_movement = find_idempotent_stock_movement(
            db=db,
            business_id=business.id,
            idempotency_key=payload.idempotency_key,
        )
        if existing_movement is not None:
            retry_product = db.scalar(
                select(Product).where(
                    Product.id == product_id,
                    Product.business_id == business.id,
                )
            )
            if retry_product is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found.",
                )

            retry_unit_name, retry_factor = resolve_product_unit(
                retry_product,
                payload.unit_name,
            )
            retry_quantity_delta = to_base_stock_quantity(
                payload.quantity_delta,
                retry_factor,
            )
            if (
                existing_movement.product_id == product_id
                and existing_movement.movement_type == "adjustment"
                and existing_movement.quantity_delta == retry_quantity_delta
                and existing_movement.entered_quantity == payload.quantity_delta
                and existing_movement.entered_unit == retry_unit_name
                and existing_movement.conversion_factor == retry_factor
                and existing_movement.reason == payload.reason.strip()
            ):
                return retry_product
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Idempotency key was already used for a different "
                    "stock operation."
                ),
            )
        raise
    except Exception:
        db.rollback()
        raise


@router.get(
    "/products/{product_id}/stock/movements",
)
async def get_product_stock_movements(
    product_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    product = db.scalar(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    movements = db.scalars(
        select(InventoryMovement)
        .where(
            InventoryMovement.product_id == product.id,
            InventoryMovement.business_id == business.id,
        )
        .order_by(
            InventoryMovement.created_at.desc(),
            InventoryMovement.id.desc(),
        )
    ).all()

    return movements


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    payload: ProductCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product name is required.",
        )

    description = (
        payload.description.strip()
        if payload.description and payload.description.strip()
        else None
    )

    if not payload.default_unit_price.is_finite():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product price must be a valid amount.",
        )

    base_unit, selling_units = validate_selling_units(
        payload.base_unit,
        payload.selling_units,
    )
    product = Product(
        business_id=business.id,
        name=name,
        description=description,
        purchase_price=payload.purchase_price,
        default_unit_price=payload.default_unit_price,
        base_unit=base_unit,
        selling_units=selling_units,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


@router.put(
    "/products/{product_id}",
    response_model=ProductResponse,
)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    product = db.scalar(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product name is required.",
        )

    if not payload.default_unit_price.is_finite():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product price must be a valid amount.",
        )

    requested_base_unit = (
        payload.base_unit
        if payload.base_unit is not None
        else (product.base_unit or "unit")
    )

    requested_selling_units = (
        payload.selling_units
        if payload.selling_units is not None
        else [
            SellingUnitInput(
                name=str(unit["name"]),
                factor=Decimal(str(unit["factor"])),
                price=(
                    Decimal(str(unit["price"]))
                    if unit.get("price") is not None
                    else None
                ),
            )
            for unit in (product.selling_units or [])
        ]
    )

    base_unit, selling_units = validate_selling_units(
        requested_base_unit,
        requested_selling_units,
    )
    if base_unit.casefold() != (product.base_unit or "unit").casefold():
        has_invoice_history = db.scalar(
            select(BillItem.id)
            .where(BillItem.product_id == product.id)
            .limit(1)
        )

        if has_invoice_history is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The base unit cannot be changed after the product "
                    "has been used in an invoice."
                ),
            )

        has_movement = db.scalar(
            select(InventoryMovement.id)
            .where(InventoryMovement.product_id == product.id)
            .limit(1)
        )
        if product.stock_quantity is not None or has_movement is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The base unit cannot be changed after stock is "
                    "initialized or inventory history exists."
                ),
            )

    product.name = name
    product.description = (
        payload.description.strip()
        if payload.description and payload.description.strip()
        else None
    )
    if "purchase_price" in payload.model_fields_set:
        product.purchase_price = payload.purchase_price

    product.default_unit_price = payload.default_unit_price
    product.base_unit = base_unit
    product.selling_units = selling_units

    db.commit()
    db.refresh(product)

    return product

@router.patch(
    "/products/{product_id}/stock/tracking",
    response_model=ProductResponse,
)
async def update_product_stock_tracking(
    product_id: UUID,
    payload: ProductStockTrackingUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    try:
        product = db.scalar(
            select(Product)
            .where(
                Product.id == product_id,
                Product.business_id == business.id,
            )
            .with_for_update()
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        if payload.is_stock_tracked and product.stock_quantity is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Initialize opening stock before enabling stock tracking.",
            )

        product.is_stock_tracked = payload.is_stock_tracked

        db.commit()
        db.refresh(product)
        return product

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_product(
    product_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    business = get_user_business(user_id, db)

    product = db.scalar(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    has_inventory_history = db.scalar(
        select(InventoryMovement.id)
        .where(
            InventoryMovement.product_id == product.id,
            InventoryMovement.business_id == business.id,
        )
        .limit(1)
    )

    if has_inventory_history is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This product cannot be deleted because it has inventory "
                "history. Disable or archive it instead."
            ),
        )

    db.delete(product)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
