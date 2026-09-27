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
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Import your existing SQLAlchemy models.
# Adjust this import ONLY if your project's model module has a different path.
from app.models.bill import Bill, BillItem
from app.models.business import Business


# ---------------------------------------------------------------------------
# Paths / fonts
# ---------------------------------------------------------------------------

# invoice_pdf.py:
#   backend/
#     app/
#       services/
#         invoice_pdf.py
#       fonts/
#         arial.ttf
#         arialbd.ttf
#
# parents[0] = services/
# parents[1] = app/
FONT_DIR = Path(__file__).resolve().parent.parent / "fonts"

REGULAR_FONT_PATH = FONT_DIR / "arial.ttf"
BOLD_FONT_PATH = FONT_DIR / "arialbd.ttf"

REGULAR_FONT_NAME = "InvoiceArial"
BOLD_FONT_NAME = "InvoiceArialBold"


def _register_fonts() -> None:
    """
    Register the bundled Arial fonts with ReportLab.

    The fonts are loaded from backend/app/fonts rather than from
    C:\\Windows\\Fonts, making the PDF generation deployment-safe.
    """
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
    Convert a database value to safe text for ReportLab Paragraphs.

    This prevents database/user content containing strings such as
    <b>...</b>, <br>, etc. from being interpreted as ReportLab markup.
    """
    if value is None:
        return ""

    return escape(str(value))


def _clean_text(value: Any) -> str:
    """Return stripped, safely escaped text."""
    return _safe_text(value).strip()


def _decimal(value: Any) -> Decimal:
    """Convert numeric values safely to Decimal."""
    if value is None:
        return Decimal("0.00")

    if isinstance(value, Decimal):
        return value

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0.00")


def _format_money(value: Any) -> str:
    """
    Format money using Indian-style grouping and two decimal places.

    Examples:
        100       -> ₹100.00
        1250.50   -> ₹1,250.50
        100000    -> ₹1,00,000.00
    """
    amount = _decimal(value).quantize(Decimal("0.01"))

    sign = "-" if amount < 0 else ""
    amount = abs(amount)

    integer_part, decimal_part = f"{amount:.2f}".split(".")

    # Indian number grouping.
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
    """Format the invoice creation date consistently."""
    if value is None:
        return ""

    if isinstance(value, datetime):
        return value.strftime("%d-%m-%Y")

    # Defensive fallback if the model returns another date-like object.
    try:
        return value.strftime("%d-%m-%Y")
    except AttributeError:
        return _safe_text(value)


def _paragraph(
    text: str,
    style: ParagraphStyle,
) -> Paragraph:
    """Small helper to create ReportLab Paragraph objects."""
    return Paragraph(text, style)


# ---------------------------------------------------------------------------
# PDF builder
# ---------------------------------------------------------------------------

def build_invoice_pdf(
    bill: Bill,
    business: Business,
) -> bytes:
    """
    Build a professional A4 portrait invoice PDF.

    Parameters
    ----------
    bill:
        Existing Bill SQLAlchemy model instance, including bill.items.

    business:
        Existing Business SQLAlchemy model instance.

    Returns
    -------
    bytes
        Generated PDF contents.
    """

    _register_fonts()

    buffer = BytesIO()

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
        fontSize=21,
        leading=24,
        textColor=colors.HexColor("#111827"),
        alignment=TA_RIGHT,
        spaceAfter=5,
    )

    invoice_meta_label_style = ParagraphStyle(
        "InvoiceMetaLabel",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#6B7280"),
        alignment=TA_RIGHT,
    )

    invoice_meta_value_style = ParagraphStyle(
        "InvoiceMetaValue",
        parent=styles["Normal"],
        fontName=REGULAR_FONT_NAME,
        fontSize=9.2,
        leading=12,
        textColor=colors.HexColor("#111827"),
        alignment=TA_RIGHT,
    )

    section_title_style = ParagraphStyle(
        "InvoiceSectionTitle",
        parent=styles["Normal"],
        fontName=BOLD_FONT_NAME,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#374151"),
        alignment=TA_LEFT,
        spaceAfter=4,
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

    # -----------------------------------------------------------------------
    # Business information
    # -----------------------------------------------------------------------

    business_name = _clean_text(business.name) or "Business"

    business_lines: list[str] = []

    if business.phone:
        business_lines.append(
            f"Phone: {_clean_text(business.phone)}"
        )

    if business.email:
        business_lines.append(
            f"Email: {_clean_text(business.email)}"
        )

    address_parts: list[str] = []

    if business.address:
        address_parts.append(_clean_text(business.address))

    location_parts: list[str] = []

    if business.city:
        location_parts.append(_clean_text(business.city))

    if business.state:
        location_parts.append(_clean_text(business.state))

    if business.pincode:
        location_parts.append(_clean_text(business.pincode))

    if location_parts:
        address_parts.append(", ".join(location_parts))

    if address_parts:
        business_lines.append("<br/>".join(address_parts))

    if business_lines:
        business_details = "<br/>".join(business_lines)
    else:
        business_details = ""

    business_block: list[Paragraph] = [
        _paragraph(
            business_name,
            business_name_style,
        )
    ]

    if business_details:
        business_block.append(
            _paragraph(
                business_details,
                business_details_style,
            )
        )

    # -----------------------------------------------------------------------
    # Invoice metadata
    # -----------------------------------------------------------------------

    invoice_number = _clean_text(bill.invoice_number)

    invoice_meta = Table(
        [
            [
                _paragraph("INVOICE NO.", invoice_meta_label_style),
                _paragraph(invoice_number, invoice_meta_value_style),
            ],
            [
                _paragraph("DATE", invoice_meta_label_style),
                _paragraph(
                    _format_date(bill.created_at),
                    invoice_meta_value_style,
                ),
            ],
        ],
        colWidths=[30 * mm, 34 * mm],
        hAlign="RIGHT",
    )

    invoice_meta.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )

    header_table = Table(
        [
            [
                business_block,
                [
                    _paragraph("INVOICE", invoice_title_style),
                    invoice_meta,
                ],
            ]
        ],
        colWidths=[
            108 * mm,
            64 * mm,
        ],
    )

    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Customer information
    # -----------------------------------------------------------------------

    customer_content: list[Paragraph] = [
        _paragraph("BILL TO", section_title_style)
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
                f"Phone: {_clean_text(bill.customer_phone)}",
                customer_style,
            )
        )

    if bill.customer_address:
        customer_content.append(
            _paragraph(
                _clean_text(bill.customer_address),
                customer_style,
            )
        )

    # If no customer information exists, keep the section stable.
    if len(customer_content) == 1:
        customer_content.append(
            _paragraph(
                "Walk-in Customer",
                customer_style,
            )
        )

    customer_box = Table(
        [[customer_content]],
        colWidths=[172 * mm],
    )

    customer_box.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, -1),
                    colors.HexColor("#F9FAFB"),
                ),
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#E5E7EB"),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
            ]
        )
    )

    # -----------------------------------------------------------------------
    # Items table
    # -----------------------------------------------------------------------

    item_rows: list[list[Any]] = [
        [
            _paragraph("ITEM", table_header_style),
            _paragraph("QTY", table_header_right_style),
            _paragraph("UNIT PRICE", table_header_right_style),
            _paragraph("TOTAL", table_header_right_style),
        ]
    ]

    bill_items = list(bill.items or [])

    for item in bill_items:
        item_name = _clean_text(item.item_name) or "Item"

        quantity = item.quantity if item.quantity is not None else 0

        unit_price = _format_money(item.unit_price)
        line_total = _format_money(item.line_total)

        item_rows.append(
            [
                _paragraph(item_name, item_style),
                _paragraph(
                    _safe_text(quantity),
                    item_right_style,
                ),
                _paragraph(
                    unit_price,
                    item_right_style,
                ),
                _paragraph(
                    line_total,
                    item_right_style,
                ),
            ]
        )

    # Keep enough width for wrapped item names while preserving right-aligned
    # numeric columns.
    items_table = Table(
        item_rows,
        colWidths=[
            82 * mm,
            20 * mm,
            34 * mm,
            36 * mm,
        ],
        repeatRows=1,
        hAlign="LEFT",
    )

    items_table.setStyle(
        TableStyle(
            [
                # Header
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#1F2937"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, 0),
                    7,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, 0),
                    7,
                ),

                # Body
                (
                    "TOPPADDING",
                    (0, 1),
                    (-1, -1),
                    6,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 1),
                    (-1, -1),
                    6,
                ),
                (
                    "LINEBELOW",
                    (0, 1),
                    (-1, -1),
                    0.4,
                    colors.HexColor("#E5E7EB"),
                ),

                # Outer border
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
    # Totals
    # -----------------------------------------------------------------------

    subtotal = _format_money(bill.subtotal)
    total = _format_money(bill.total)

    totals_table = Table(
        [
            [
                "",
                _paragraph("Subtotal", total_label_style),
                _paragraph(subtotal, subtotal_value_style),
            ],
            [
                "",
                _paragraph("TOTAL", total_label_style),
                _paragraph(total, total_value_style),
            ],
        ],
        colWidths=[
            92 * mm,
            43 * mm,
            37 * mm,
        ],
        hAlign="RIGHT",
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

    story: list[Any] = []

    story.append(header_table)
    story.append(Spacer(1, 7 * mm))

    # Header separator.
    separator = Table(
        [[""]],
        colWidths=[172 * mm],
        rowHeights=[0.7 * mm],
    )

    separator.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, -1),
                    colors.HexColor("#D1D5DB"),
                ),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    story.append(separator)
    story.append(Spacer(1, 6 * mm))

    story.append(customer_box)
    story.append(Spacer(1, 7 * mm))

    story.append(items_table)
    story.append(Spacer(1, 5 * mm))

    story.append(totals_table)
    story.append(Spacer(1, 9 * mm))

    story.append(footer)

    # -----------------------------------------------------------------------
    # Generate PDF
    # -----------------------------------------------------------------------

    document.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes