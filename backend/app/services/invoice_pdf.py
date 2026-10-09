from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.bill import Bill, BillItem
from app.models.business import Business
from app.services.storage import download_business_asset


# ---------------------------------------------------------------------------
# Paths / fonts
# ---------------------------------------------------------------------------

FONT_DIR = Path(__file__).resolve().parent.parent / "fonts"

REGULAR_FONT_PATH = FONT_DIR / "arial.ttf"
BOLD_FONT_PATH = FONT_DIR / "arialbd.ttf"

REGULAR_FONT_NAME = "InvoiceArial"
BOLD_FONT_NAME = "InvoiceArialBold"


def _register_fonts() -> None:
    """Register the bundled Arial fonts used by invoice PDFs."""
    if not REGULAR_FONT_PATH.is_file():
        raise FileNotFoundError(
            f"Invoice PDF font not found: {REGULAR_FONT_PATH}. "
            "Place arial.ttf in backend/app/fonts/."
        )

    if not BOLD_FONT_PATH.is_file():
        raise FileNotFoundError(
            f"Invoice PDF bold font not found: {BOLD_FONT_PATH}. "
            "Place arialbd.ttf in backend/app/fonts/."
        )

    registered_fonts = pdfmetrics.getRegisteredFontNames()

    if REGULAR_FONT_NAME not in registered_fonts:
        pdfmetrics.registerFont(
            TTFont(
                REGULAR_FONT_NAME,
                str(REGULAR_FONT_PATH),
            )
        )

    if BOLD_FONT_NAME not in registered_fonts:
        pdfmetrics.registerFont(
            TTFont(
                BOLD_FONT_NAME,
                str(BOLD_FONT_PATH),
            )
        )


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _safe_text(value: Any) -> str:
    """
    Convert database/user content to safe ReportLab text.

    User-entered strings containing ReportLab markup such as <b> are
    escaped so they are rendered as plain text.
    """
    if value is None:
        return ""

    return escape(str(value))


def _clean_text(value: Any) -> str:
    """Return stripped, safely escaped text."""
    return _safe_text(value).strip()


def _decimal(value: Any) -> Decimal:
    """Convert a numeric value safely to Decimal."""
    if value is None:
        return Decimal("0.00")

    if isinstance(value, Decimal):
        return value

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0.00")


def _format_money(value: Any) -> str:
    """Format money using Indian-style grouping and two decimals."""
    amount = _decimal(value).quantize(Decimal("0.01"))

    sign = "-" if amount < 0 else ""
    amount = abs(amount)

    integer_part, decimal_part = f"{amount:.2f}".split(".")

    if len(integer_part) > 3:
        last_three = integer_part[-3:]
        remaining = integer_part[:-3]

        groups: list[str] = []

        while len(remaining) > 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]

        if remaining:
            groups.insert(0, remaining)

        integer_part = ",".join(groups + [last_three])

    return f"{sign}₹{integer_part}.{decimal_part}"


def _format_date(value: Any) -> str:
    """Format the invoice creation date."""
    if value is None:
        return ""

    if isinstance(value, datetime):
        return value.strftime("%d-%m-%Y")

    try:
        return value.strftime("%d-%m-%Y")
    except AttributeError:
        return _safe_text(value)


def _paragraph(
    text: str,
    style: ParagraphStyle,
) -> Paragraph:
    """Create a ReportLab Paragraph."""
    return Paragraph(text, style)


def _business_asset_image(
    storage_path: str | None,
    *,
    max_width: float,
    max_height: float,
) -> Image | None:
    """
    Download a private business asset and scale it proportionally.

    Optional business assets should never prevent invoice generation.
    """
    if not storage_path:
        return None

    try:
        image_bytes = download_business_asset(
            storage_path=storage_path,
        )

        image_reader = ImageReader(
            BytesIO(image_bytes)
        )

        image_width, image_height = image_reader.getSize()

        if image_width <= 0 or image_height <= 0:
            return None

        scale = min(
            max_width / image_width,
            max_height / image_height,
        )

        image = Image(
            BytesIO(image_bytes),
            width=image_width * scale,
            height=image_height * scale,
        )

        image.hAlign = "LEFT"

        return image

    except Exception:
        # Logo/signature are optional. PDF generation should continue
        # if an asset cannot be downloaded or decoded.
        return None


def _number_to_words_under_1000(number: int) -> str:
    """Convert an integer from 0 to 999 into English words."""
    ones = [
        "Zero",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ]

    tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ]

    if number < 20:
        return ones[number]

    if number < 100:
        remainder = number % 10

        if remainder == 0:
            return tens[number // 10]

        return f"{tens[number // 10]} {ones[remainder]}"

    remainder = number % 100

    if remainder == 0:
        return f"{ones[number // 100]} Hundred"

    return (
        f"{ones[number // 100]} Hundred "
        f"{_number_to_words_under_1000(remainder)}"
    )


def _number_to_words(number: int) -> str:
    """Convert an integer into English words using Indian numbering."""
    if number == 0:
        return "Zero"

    parts: list[str] = []

    crore = number // 10_000_000
    number %= 10_000_000

    lakh = number // 100_000
    number %= 100_000

    thousand = number // 1_000
    number %= 1_000

    if crore:
        parts.append(
            f"{_number_to_words_under_1000(crore)} Crore"
        )

    if lakh:
        parts.append(
            f"{_number_to_words_under_1000(lakh)} Lakh"
        )

    if thousand:
        parts.append(
            f"{_number_to_words_under_1000(thousand)} Thousand"
        )

    if number:
        parts.append(
            _number_to_words_under_1000(number)
        )

    return " ".join(parts)


def _amount_in_words(value: Any) -> str:
    """Convert a monetary amount into invoice-friendly English words."""
    amount = _decimal(value).quantize(Decimal("0.01"))
    amount = abs(amount)

    rupees = int(amount)
    paise = int(
        (amount - Decimal(rupees)) * 100
    )

    words = _number_to_words(rupees)

    if paise:
        return (
            f"{words} Rupees And "
            f"{_number_to_words_under_1000(paise)} Paise Only"
        )

    return f"{words} Only"


def _get_invoice_columns(
    bill: Bill,
) -> list[dict[str, Any]]:
    """
    Return the invoice-column snapshot stored on the bill.

    Historical invoices therefore continue using the column configuration
    that existed when the invoice was created.
    """
    columns = getattr(bill, "invoice_columns", None) or []

    return sorted(
        columns,
        key=lambda column: int(
            column.get("position", 0)
        ),
    )


def _get_item_column_value(
    item: BillItem,
    column: dict[str, Any],
) -> str:
    """Resolve a configured invoice column to a bill-item value."""
    source = column.get("source")
    key = column.get("key")

    if source == "core":
        if key == "item_name":
            return _clean_text(item.item_name) or "Item"

        if key == "quantity":
            return _safe_text(
                item.quantity
                if item.quantity is not None
                else 0
            )

        if key == "unit_price":
            return _format_money(item.unit_price)

        if key == "line_total":
            return _format_money(item.line_total)

        return ""

    custom_values = (
        getattr(item, "custom_values", None) or {}
    )

    value = custom_values.get(key)

    if value is None or str(value).strip() == "":
        return "—"

    column_type = column.get("type")

    if column_type == "number":
        try:
            return f"{Decimal(str(value)):.2f}"
        except (InvalidOperation, ValueError, TypeError):
            return _safe_text(value)

    return _clean_text(value)


# ---------------------------------------------------------------------------
# PDF builder
# ---------------------------------------------------------------------------

def build_invoice_pdf(
    bill: Bill,
    business: Business,
) -> bytes:
    """
    Build an A4 portrait invoice PDF.

    The layout prioritizes readability and uses adaptive vertical density
    for invoices with larger numbers of rows.
    """

    _register_fonts()

    buffer = BytesIO()

    # -----------------------------------------------------------------------
    # Invoice density
    # -----------------------------------------------------------------------
    #
    # We reduce spacing before reducing font sizes. This keeps text readable
    # while allowing normal and moderately long invoices to fit more
    # efficiently on one page.
    # -----------------------------------------------------------------------

    bill_items = list(bill.items or [])
    item_count = len(bill_items)

    if item_count <= 5:
        density = "normal"
    elif item_count <= 10:
        density = "compact"
    else:
        density = "dense"

    if density == "normal":
        section_gap = 5 * mm
        table_body_padding = 6
        table_header_padding = 7
        amount_words_gap = 7 * mm
        terms_gap = 7 * mm
        signature_gap = 5 * mm
    elif density == "compact":
        section_gap = 4 * mm
        table_body_padding = 4
        table_header_padding = 5
        amount_words_gap = 5 * mm
        terms_gap = 5 * mm
        signature_gap = 4 * mm
    else:
        section_gap = 3 * mm
        table_body_padding = 3
        table_header_padding = 4
        amount_words_gap = 4 * mm
        terms_gap = 4 * mm
        signature_gap = 3 * mm

    # -----------------------------------------------------------------------
    # Document
    # -----------------------------------------------------------------------

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title=f"Invoice {_clean_text(bill.invoice_number)}",
        author=_clean_text(business.name),
        subject="Invoice",
    )

    content_width = (
        A4[0]
        - document.leftMargin
        - document.rightMargin
    )

    # -----------------------------------------------------------------------
    # Styles
    # -----------------------------------------------------------------------

    styles = getSampleStyleSheet()

    business_name_style = ParagraphStyle(
        "InvoiceBusinessName",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#111827"),
        alignment=TA_LEFT,
        spaceAfter=3,
    )

    business_details_style = ParagraphStyle(
        "InvoiceBusinessDetails",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=8.8,
        leading=12,
        textColor=colors.HexColor("#4B5563"),
        alignment=TA_LEFT,
    )

    invoice_title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=20,
        leading=22,
        textColor=colors.HexColor("#1F2937"),
        alignment=TA_CENTER,
    )

    invoice_meta_label_style = ParagraphStyle(
        "InvoiceMetaLabel",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#374151"),
        alignment=TA_LEFT,
    )

    invoice_meta_value_style = ParagraphStyle(
        "InvoiceMetaValue",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#111827"),
        alignment=TA_LEFT,
    )

    bill_to_title_style = ParagraphStyle(
        "InvoiceBillToTitle",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1F2937"),
        alignment=TA_LEFT,
        spaceAfter=3,
    )

    customer_style = ParagraphStyle(
        "InvoiceCustomer",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#111827"),
    )

    customer_name_style = ParagraphStyle(
        "InvoiceCustomerName",
        parent=customer_style,
        fontName=BOLD_FONT_NAME,
        fontSize=10,
        leading=13,
        spaceAfter=1,
    )

    table_header_style = ParagraphStyle(
        "InvoiceTableHeader",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=TA_LEFT,
    )

    table_header_right_style = ParagraphStyle(
        "InvoiceTableHeaderRight",
        parent=table_header_style,
        alignment=TA_RIGHT,
    )

    item_style = ParagraphStyle(
        "InvoiceItem",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=8.8,
        leading=12,
        textColor=colors.HexColor("#111827"),
        alignment=TA_LEFT,
    )

    item_right_style = ParagraphStyle(
        "InvoiceItemRight",
        parent=item_style,
        alignment=TA_RIGHT,
    )

    total_label_style = ParagraphStyle(
        "InvoiceTotalLabel",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#374151"),
        alignment=TA_RIGHT,
    )

    subtotal_value_style = ParagraphStyle(
        "InvoiceSubtotalValue",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#111827"),
        alignment=TA_RIGHT,
    )

    total_value_style = ParagraphStyle(
        "InvoiceTotalValue",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#111827"),
        alignment=TA_RIGHT,
    )

    footer_style = ParagraphStyle(
        "InvoiceFooter",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#6B7280"),
        alignment=TA_CENTER,
    )

    amount_words_label_style = ParagraphStyle(
        "InvoiceAmountWordsLabel",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#374151"),
        alignment=TA_LEFT,
    )

    amount_words_style = ParagraphStyle(
        "InvoiceAmountWords",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#111827"),
        alignment=TA_LEFT,
    )

    terms_title_style = ParagraphStyle(
        "InvoiceTermsTitle",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#374151"),
        alignment=TA_LEFT,
    )

    terms_style = ParagraphStyle(
        "InvoiceTerms",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#374151"),
        alignment=TA_LEFT,
    )

    signatory_style = ParagraphStyle(
        "InvoiceSignatory",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#374151"),
        alignment=TA_CENTER,
    )

    # -----------------------------------------------------------------------
    # Business assets
    # -----------------------------------------------------------------------

    business_logo = _business_asset_image(
        getattr(business, "logo_path", None),
        max_width=45 * mm,
        max_height=25 * mm,
    )

    business_signature = _business_asset_image(
        getattr(business, "signature_path", None),
        max_width=45 * mm,
        max_height=25 * mm,
    )

    business_name = _clean_text(business.name) or "Business"

    # -----------------------------------------------------------------------
    # Seller information
    # -----------------------------------------------------------------------

    seller_lines: list[str] = []

    if business.address:
        seller_lines.append(
            _clean_text(business.address)
        )

    location_parts: list[str] = []

    if business.city:
        location_parts.append(
            _clean_text(business.city)
        )

    if business.pincode:
        location_parts.append(
            _clean_text(business.pincode)
        )

    if location_parts:
        seller_lines.append(
            ", ".join(location_parts)
        )

    if business.state:
        seller_lines.append(
            f"State: {_clean_text(business.state)}"
        )

    if business.gstin:
        seller_lines.append(
            f"GSTIN: {_clean_text(business.gstin)}"
        )

    if business.udyam_number:
        seller_lines.append(
            f"Udyam No.: {_clean_text(business.udyam_number)}"
        )

    if business.phone:
        seller_lines.append(
            f"Phone: {_clean_text(business.phone)}"
        )

    if business.email:
        seller_lines.append(
            f"Email: {_clean_text(business.email)}"
        )

    seller_details = "<br/>".join(seller_lines)

    business_block: list[Any] = [
        _paragraph(
            business_name,
            business_name_style,
        )
    ]

    if seller_details:
        business_block.append(
            _paragraph(
                seller_details,
                business_details_style,
            )
        )

    # -----------------------------------------------------------------------
    # Invoice title
    # -----------------------------------------------------------------------

    invoice_title_block = Table(
        [
            [
                _paragraph(
                    "INVOICE",
                    invoice_title_style,
                )
            ]
        ],
        colWidths=[content_width],
        hAlign="CENTER",
    )

    invoice_title_block.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Logo
    # -----------------------------------------------------------------------

    logo_block: list[Any] = []

    if business_logo:
        business_logo.hAlign = "RIGHT"
        logo_block.append(business_logo)

    # Important:
    # No logo means no placeholder. This prevents unnecessary empty
    # vertical space in the header.

    # -----------------------------------------------------------------------
    # Seller + logo row
    # -----------------------------------------------------------------------

    seller_logo_table = Table(
        [
            [
                business_block,
                logo_block,
            ]
        ],
        colWidths=[
            content_width * 0.72,
            content_width * 0.28,
        ],
        hAlign="LEFT",
    )

    seller_logo_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (0, 0), "LEFT"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Complete top header
    # -----------------------------------------------------------------------

    header_table = Table(
        [
            [invoice_title_block],
            [seller_logo_table],
        ],
        colWidths=[content_width],
        hAlign="LEFT",
    )

    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (0, 0), 3 * mm),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Customer + invoice metadata
    # -----------------------------------------------------------------------

    customer_content: list[Any] = [
        _paragraph(
            "Bill To:",
            bill_to_title_style,
        )
    ]

    if bill.customer_name:
        customer_content.append(
            _paragraph(
                _clean_text(bill.customer_name),
                customer_name_style,
            )
        )

    if bill.customer_phone:
        customer_content.append(
            _paragraph(
                _clean_text(bill.customer_phone),
                customer_style,
            )
        )

    if bill.customer_address:
        customer_content.append(
            _paragraph(
                _clean_text(bill.customer_address).replace(
                    "\n",
                    "<br/>",
                ),
                customer_style,
            )
        )

    if len(customer_content) == 1:
        customer_content.append(
            _paragraph(
                "Walk-in Customer",
                customer_style,
            )
        )

    invoice_number = _clean_text(bill.invoice_number)

    invoice_info_width = content_width * 0.28

    invoice_info_table = Table(
        [
            [
                _paragraph(
                    "Invoice No:",
                    invoice_meta_label_style,
                ),
                _paragraph(
                    invoice_number,
                    invoice_meta_value_style,
                ),
            ],
            [
                _paragraph(
                    "Invoice Date:",
                    invoice_meta_label_style,
                ),
                _paragraph(
                    _format_date(bill.created_at),
                    invoice_meta_value_style,
                ),
            ],
        ],
        colWidths=[
            invoice_info_width * 0.42,
            invoice_info_width * 0.58,
        ],
        hAlign="RIGHT",
    )

    invoice_info_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    customer_invoice_table = Table(
        [
            [
                customer_content,
                invoice_info_table,
            ]
        ],
        colWidths=[
            content_width * 0.72,
            content_width * 0.28,
        ],
        hAlign="LEFT",
    )

    customer_invoice_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (0, 0), "LEFT"),
                ("ALIGN", (1, 0), (1, 0), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Items table
    # -----------------------------------------------------------------------

    invoice_columns = _get_invoice_columns(bill)

    if not invoice_columns:
        invoice_columns = [
            {
                "key": "item_name",
                "label": "Item",
                "type": "text",
                "source": "core",
                "position": 1,
                "required": True,
            },
            {
                "key": "quantity",
                "label": "Qty",
                "type": "number",
                "source": "core",
                "position": 2,
                "required": True,
            },
            {
                "key": "unit_price",
                "label": "Unit Price",
                "type": "number",
                "source": "core",
                "position": 3,
                "required": True,
            },
            {
                "key": "line_total",
                "label": "Total",
                "type": "number",
                "source": "core",
                "position": 4,
                "required": True,
            },
        ]

    item_rows: list[list[Any]] = []

    header_row: list[Any] = []

    for column in invoice_columns:
        label = _clean_text(
            column.get("label") or column.get("key") or ""
        )

        is_numeric = (
            column.get("type") == "number"
            or (
                column.get("source") == "core"
                and column.get("key")
                in {
                    "quantity",
                    "unit_price",
                    "line_total",
                }
            )
        )

        header_row.append(
            _paragraph(
                label.upper(),
                (
                    table_header_right_style
                    if is_numeric
                    else table_header_style
                ),
            )
        )

    item_rows.append(header_row)

    for item in bill_items:
        row: list[Any] = []

        for column in invoice_columns:
            value = _get_item_column_value(
                item,
                column,
            )

            is_numeric = (
                column.get("type") == "number"
                or (
                    column.get("source") == "core"
                    and column.get("key")
                    in {
                        "quantity",
                        "unit_price",
                        "line_total",
                    }
                )
            )

            row.append(
                _paragraph(
                    value,
                    (
                        item_right_style
                        if is_numeric
                        else item_style
                    ),
                )
            )

        item_rows.append(row)

    # -----------------------------------------------------------------------
    # Dynamic column widths
    # -----------------------------------------------------------------------

    column_count = len(invoice_columns)

    numeric_columns = sum(
        1
        for column in invoice_columns
        if (
            column.get("type") == "number"
            or (
                column.get("source") == "core"
                and column.get("key")
                in {
                    "quantity",
                    "unit_price",
                    "line_total",
                }
            )
        )
    )

    text_columns = max(
        column_count - numeric_columns,
        0,
    )

    if text_columns and numeric_columns:
        numeric_width = min(
            28 * mm,
            content_width * 0.20,
        )

        remaining_width = (
            content_width
            - numeric_width * numeric_columns
        )

        text_width = (
            remaining_width / text_columns
        )

        column_widths = []

        for column in invoice_columns:
            is_numeric = (
                column.get("type") == "number"
                or (
                    column.get("source") == "core"
                    and column.get("key")
                    in {
                        "quantity",
                        "unit_price",
                        "line_total",
                    }
                )
            )

            column_widths.append(
                numeric_width
                if is_numeric
                else text_width
            )
    else:
        column_widths = [
            content_width / column_count
            for _ in invoice_columns
        ]

    items_table = Table(
        item_rows,
        colWidths=column_widths,
        repeatRows=1,
        hAlign="LEFT",
    )

    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, 0),
                    table_header_padding,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, 0),
                    table_header_padding,
                ),

                (
                    "TOPPADDING",
                    (0, 1),
                    (-1, -1),
                    table_body_padding,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 1),
                    (-1, -1),
                    table_body_padding,
                ),

                (
                    "LINEBELOW",
                    (0, 1),
                    (-1, -1),
                    0.4,
                    colors.HexColor("#E5E7EB"),
                ),

                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#D1D5DB"),
                ),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Totals / amount in words
    # -----------------------------------------------------------------------

    subtotal = _format_money(bill.subtotal)
    total = _format_money(bill.total)
    amount_in_words = _amount_in_words(bill.total)

    totals_table = Table(
        [
            [
                "",
                _paragraph(
                    "Subtotal",
                    total_label_style,
                ),
                _paragraph(
                    subtotal,
                    subtotal_value_style,
                ),
            ],
            [
                "",
                _paragraph(
                    "TOTAL",
                    total_label_style,
                ),
                _paragraph(
                    total,
                    total_value_style,
                ),
            ],
        ],
        colWidths=[
            content_width * 0.52,
            content_width * 0.24,
            content_width * 0.24,
        ],
        hAlign="LEFT",
    )

    totals_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, 0), 5),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
                ("TOPPADDING", (0, 1), (-1, 1), 7),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 7),
                (
                    "LINEABOVE",
                    (1, 1),
                    (-1, 1),
                    0.8,
                    colors.HexColor("#1F2937"),
                ),
            ]
        )
    )

    amount_words_table = Table(
        [
            [
                _paragraph(
                    "Amount in Words:",
                    amount_words_label_style,
                ),
                _paragraph(
                    amount_in_words,
                    amount_words_style,
                ),
            ]
        ],
        colWidths=[
            content_width * 0.17,
            content_width * 0.83,
        ],
        hAlign="LEFT",
    )

    amount_words_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Terms & conditions
    # -----------------------------------------------------------------------

    terms_block = None

    terms_and_conditions = getattr(
        bill,
        "terms_and_conditions",
        None,
    )

    if terms_and_conditions and terms_and_conditions.strip():
        terms_block = Table(
            [
                [
                    _paragraph(
                        "Terms & Conditions",
                        terms_title_style,
                    )
                ],
                [
                    _paragraph(
                        _clean_text(
                            terms_and_conditions
                        ).replace("\n", "<br/>"),
                        terms_style,
                    )
                ],
            ],
            colWidths=[content_width],
            hAlign="LEFT",
        )

        terms_block.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

    # -----------------------------------------------------------------------
    # Authorized signature
    # -----------------------------------------------------------------------
    #
    # The signature section is completely optional.
    #
    # If no authorized signature exists, neither the image nor the
    # "Authorized Signatory" label is rendered and no space is reserved.
    # -----------------------------------------------------------------------

    signature_block = None

    if business_signature:
        signature_content: list[Any] = [
            business_signature,
            Spacer(1, 1.5 * mm),
            _paragraph(
                "Authorized Signatory",
                signatory_style,
            ),
        ]

        signature_block = Table(
            [[signature_content]],
            colWidths=[content_width * 0.32],
            hAlign="RIGHT",
        )

        signature_block.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

    # -----------------------------------------------------------------------
    # Footer
    # -----------------------------------------------------------------------

    footer = _paragraph(
        "Thank you for your business.",
        footer_style,
    )

    # -----------------------------------------------------------------------
    # Build story
    # -----------------------------------------------------------------------

    story: list[Any] = [
        header_table,
        Spacer(1, section_gap),
        customer_invoice_table,
        Spacer(1, section_gap),
        items_table,
        Spacer(1, section_gap),
        totals_table,
        Spacer(1, section_gap),
        amount_words_table,
    ]

    if terms_block:
        story.extend(
            [
                Spacer(1, terms_gap),
                terms_block,
            ]
        )

    if signature_block:
        story.extend(
            [
                Spacer(1, signature_gap),
                signature_block,
            ]
        )

    story.extend(
        [
            Spacer(1, section_gap),
            footer,
        ]
    )

    # -----------------------------------------------------------------------
    # Generate PDF
    # -----------------------------------------------------------------------

    document.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes