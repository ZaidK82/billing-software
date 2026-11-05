
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re

from pypdf import PdfReader


PRICE_PATTERN = r"(?:₹\s*)?[\d,]+(?:\.\d+)?|[-—–]"

PURCHASE_PRICE_PATTERN = re.compile(
    r"\b(PURCHASE\s+PRICE|PURCHASE\s+RATE|COST\s+PRICE|"
    r"BUYING\s+PRICE|PURCHASE)\b",
    re.IGNORECASE,
)

UNIT_PATTERN = re.compile(
    r"(?<![A-Z0-9])"
    r"(?:(\d+(?:\.\d+)?)\s*)?"
    r"(KG|KGS|KILOGRAMS?|GMS?|GRAMS?|MG|MILLIGRAMS?|"
    r"LTRS?|LITRES?|LITERS?|MLS?|MILLILITERS?|MILLILITRES?|"
    r"PCS?|PIECES?|BOXES?|BOX|PACKS?|PACK)"
    r"(?![A-Z])",
    re.IGNORECASE,
)

UNIT_DEFINITIONS = {
    "KG": ("mass", "kg", Decimal("1")),
    "KGS": ("mass", "kg", Decimal("1")),
    "KILOGRAM": ("mass", "kg", Decimal("1")),
    "KILOGRAMS": ("mass", "kg", Decimal("1")),
    "GM": ("mass", "g", Decimal("0.001")),
    "GMS": ("mass", "g", Decimal("0.001")),
    "GRAM": ("mass", "g", Decimal("0.001")),
    "GRAMS": ("mass", "g", Decimal("0.001")),
    "MG": ("mass", "mg", Decimal("0.000001")),
    "MILLIGRAM": ("mass", "mg", Decimal("0.000001")),
    "MILLIGRAMS": ("mass", "mg", Decimal("0.000001")),
    "LTR": ("volume", "ltr", Decimal("1")),
    "LTRS": ("volume", "ltr", Decimal("1")),
    "LITRE": ("volume", "ltr", Decimal("1")),
    "LITRES": ("volume", "ltr", Decimal("1")),
    "LITER": ("volume", "ltr", Decimal("1")),
    "LITERS": ("volume", "ltr", Decimal("1")),
    "ML": ("volume", "ml", Decimal("0.001")),
    "MLS": ("volume", "ml", Decimal("0.001")),
    "MILLILITER": ("volume", "ml", Decimal("0.001")),
    "MILLILITERS": ("volume", "ml", Decimal("0.001")),
    "MILLILITRE": ("volume", "ml", Decimal("0.001")),
    "MILLILITRES": ("volume", "ml", Decimal("0.001")),
    "PC": ("count", "pcs", Decimal("1")),
    "PCS": ("count", "pcs", Decimal("1")),
    "PIECE": ("count", "pcs", Decimal("1")),
    "PIECES": ("count", "pcs", Decimal("1")),
    "BOX": ("package", "box", Decimal("1")),
    "BOXES": ("package", "box", Decimal("1")),
    "PACK": ("package", "pack", Decimal("1")),
    "PACKS": ("package", "pack", Decimal("1")),
}


class ProductPDFImportError(ValueError):
    """Raised when a PDF cannot be interpreted as a product price list."""


def _normalize_unit(header: str) -> dict:
    match = UNIT_PATTERN.search(header.upper())

    if not match:
        raise ProductPDFImportError(
            f"Unsupported selling-unit column: {header}"
        )

    quantity_text, unit_text = match.groups()

    quantity = Decimal(quantity_text or "1")
    if not quantity.is_finite() or quantity <= 0:
        raise ProductPDFImportError(
            f"Invalid quantity in unit column: {header}"
        )

    key = unit_text.upper()
    dimension, canonical_unit, multiplier = UNIT_DEFINITIONS[key]

    return {
        "name": header.strip(),
        "quantity": quantity,
        "dimension": dimension,
        "canonical_unit": canonical_unit,
        "normalized_quantity": quantity * multiplier,
    }


def _detect_price_columns(header_line: str) -> list[dict]:
    columns = []

    matches = []

    for match in UNIT_PATTERN.finditer(header_line.upper()):
        matches.append({
            "start": match.start(),
            "end": match.end(),
            "column": {
                **_normalize_unit(match.group(0)),
                "kind": "selling_unit",
            },
        })

    for match in PURCHASE_PRICE_PATTERN.finditer(header_line.upper()):
        matches.append({
            "start": match.start(),
            "end": match.end(),
            "column": {
                "name": match.group(0).strip(),
                "kind": "purchase_price",
            },
        })

    matches.sort(key=lambda item: item["start"])

    unique = []
    seen = set()

    for item in matches:
        column = item["column"]
        key = (column["kind"], column["name"].upper())

        if key not in seen:
            seen.add(key)
            unique.append(column)

    if not any(c["kind"] == "selling_unit" for c in unique):
        raise ProductPDFImportError(
            "No supported selling-unit columns were found in the PDF."
        )

    return unique


def _parse_price(value: str) -> Decimal | None:
    cleaned = value.replace("₹", "").replace(",", "").strip()

    if cleaned in {"-", "—", "–", ""}:
        return None

    try:
        amount = Decimal(cleaned)
    except InvalidOperation:
        return None

    if not amount.is_finite() or amount < 0:
        return None

    return amount.quantize(Decimal("0.01"))


def _parse_product_row(
    line: str,
    price_column_count: int,
) -> dict | None:
    price_group = r"\s+".join(
        [f"({PRICE_PATTERN})"] * price_column_count
    )

    pattern = re.compile(
        rf"^\s*(\d+)\s+(.+?)\s+{price_group}\s*$"
    )

    match = pattern.match(line)

    if not match:
        return None

    serial_number = int(match.group(1))
    product_name = match.group(2).strip()
    raw_prices = match.groups()[2:]

    if not product_name:
        return None

    return {
        "serial_number": serial_number,
        "name": product_name,
        "raw_prices": raw_prices,
    }


def _build_base_unit(columns: list[dict]) -> tuple[str | None, list[str]]:
    warnings = []

    STANDARD_UNIT_CODES = {
        "kg": "KG",
        "g": "G",
        "mg": "MG",
        "ltr": "LTR",
        "ml": "ML",
        "pcs": "PCS",
        "box": "BOX",
        "pack": "PACK",
    }

    dimensions = {
        column["dimension"]
        for column in columns
    }

    if len(dimensions) != 1:
        warnings.append(
            "Selling-unit columns contain incompatible dimensions. "
            "Base-unit conversion requires manual review."
        )
        return None, warnings

    dimension = next(iter(dimensions))

    if dimension == "mass":
        base = max(
            columns,
            key=lambda column: column["normalized_quantity"],
        )
        return (
            STANDARD_UNIT_CODES.get(
                base["canonical_unit"],
                base["canonical_unit"].upper(),
            ),
            warnings,
        )

    if dimension == "volume":
        base = max(
            columns,
            key=lambda column: column["normalized_quantity"],
        )
        return (
            STANDARD_UNIT_CODES.get(
                base["canonical_unit"],
                base["canonical_unit"].upper(),
            ),
            warnings,
        )

    # Count and packaging units must not be assumed interchangeable.
    if dimension in {"count", "package"}:
        canonical_units = {
            column["canonical_unit"]
            for column in columns
        }

        if len(canonical_units) != 1:
            warnings.append(
                "Different count/package units were detected. "
                "Their conversion factors require manual review."
            )
            return None, warnings

        canonical_unit = next(iter(canonical_units))
        return (
            STANDARD_UNIT_CODES.get(
                canonical_unit,
                canonical_unit.upper(),
            ),
            warnings,
        )

    return None, warnings


def extract_product_pdf(pdf_bytes: bytes) -> dict:
    """
    Extract product rows and independently priced selling units
    from a digital PDF.

    This function does not access the database or modify products.
    """

    if not pdf_bytes:
        raise ProductPDFImportError("The uploaded PDF is empty.")

    try:
        reader = PdfReader(BytesIO(pdf_bytes))
    except Exception as exc:
        raise ProductPDFImportError(
            "The uploaded file could not be opened as a PDF."
        ) from exc

    if reader.is_encrypted:
        raise ProductPDFImportError(
            "Password-protected PDFs are not supported."
        )

    if not reader.pages:
        raise ProductPDFImportError("The PDF contains no pages.")

    page_texts = []

    for page_number, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""

        if text.strip():
            page_texts.append((page_number, text))

    if not page_texts:
        raise ProductPDFImportError(
            "No selectable text was found. "
            "This PDF may be scanned and require OCR."
        )

    header_columns = None
    products = []
    warnings = []
    seen_serial_numbers = set()

    for page_number, page_text in page_texts:
        lines = [
            line.strip()
            for line in page_text.splitlines()
            if line.strip()
        ]

        for line in lines:
            upper_line = line.upper()

            # Detect the table header wherever it repeats.
            if (
                "PRODUCT" in upper_line
                and ("SR" in upper_line or "NO" in upper_line)
            ):
                detected = _detect_price_columns(line)

                if header_columns is None:
                    header_columns = detected
                elif [
                    c["name"].upper() for c in detected
                ] != [
                    c["name"].upper() for c in header_columns
                ]:
                    warnings.append(
                        f"Page {page_number}: table headers differ "
                        "from the first page. Review this page."
                    )

                continue

            if header_columns is None:
                continue

            parsed = _parse_product_row(
                line,
                len(header_columns),
            )

            if parsed is None:
                continue

            serial = parsed["serial_number"]

            if serial in seen_serial_numbers:
                warnings.append(
                    f"Duplicate serial number {serial} "
                    f"detected on page {page_number}."
                )
            seen_serial_numbers.add(serial)

            product_warnings = []
            selling_units = []
            purchase_price = None

            for column, raw_price in zip(
                header_columns,
                parsed["raw_prices"],
            ):
                rate = _parse_price(raw_price)

                if column["kind"] == "purchase_price":
                    purchase_price = str(rate) if rate is not None else None

                    if rate is None:
                        product_warnings.append(
                            "Purchase price is missing or invalid."
                        )

                    continue

                if rate is None:
                    product_warnings.append(
                        f"Missing or invalid rate for {column['name']}."
                    )

                selling_units.append({
                    "name": column["name"],
                    "factor_to_base": None,
                    "rate": str(rate) if rate is not None else None,
                })

            products.append({
                "serial_number": serial,
                "name": parsed["name"],
                "base_unit": None,
                "selling_units": selling_units,
                "purchase_price": purchase_price,
                "opening_stock": None,
                "source_page": page_number,
                "warnings": product_warnings,
            })

    if header_columns is None:
        raise ProductPDFImportError(
            "Could not identify a product table header."
        )

    selling_unit_columns = [
        column
        for column in header_columns
        if column["kind"] == "selling_unit"
    ]

    base_unit, unit_warnings = _build_base_unit(
        selling_unit_columns
    )
    warnings.extend(unit_warnings)

    dimensions = {
        column["dimension"]
        for column in selling_unit_columns
    }

    if len(dimensions) == 1 and base_unit is not None:
        dimension = next(iter(dimensions))

        if dimension in {"mass", "volume"}:
            base_column = max(
                header_columns,
                key=lambda column: column["normalized_quantity"],
            )
            base_quantity = base_column["normalized_quantity"]
        else:
            # Count/package units use one canonical piece,
            # box, or pack as their base.
            base_quantity = Decimal("1")

        for product in products:
            product["base_unit"] = base_unit

            for selling_unit, column in zip(
                product["selling_units"],
                selling_unit_columns,
            ):
                factor = (
                    column["normalized_quantity"] / base_quantity
                )

                selling_unit["factor_to_base"] = str(factor)

    if not products:
        raise ProductPDFImportError(
            "No product rows could be extracted from the PDF."
        )

    return {
        "page_count": len(reader.pages),
        "processed_pages": len(page_texts),
        "product_count": len(products),
        "price_columns": [
            column["name"]
            for column in selling_unit_columns
        ],
        "products": products,
        "warnings": warnings,
    }
