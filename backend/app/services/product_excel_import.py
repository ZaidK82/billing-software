
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re

from openpyxl import load_workbook

from app.services.product_pdf_import import (
    UNIT_PATTERN,
    _normalize_unit,
    _build_base_unit,
)


class ProductExcelImportError(ValueError):
    """Raised when an Excel workbook cannot be interpreted."""


PURCHASE_PRICE_HEADERS = {
    "PURCHASE PRICE",
    "PURCHASE RATE",
    "COST PRICE",
    "BUYING PRICE",
    "PURCHASE",
}

PRODUCT_NAME_HEADERS = {
    "PRODUCT",
    "PRODUCT NAME",
    "ITEM",
    "ITEM NAME",
    "NAME",
}

DESCRIPTION_HEADERS = {
    "DESCRIPTION",
    "PRODUCT DESCRIPTION",
    "ITEM DESCRIPTION",
}

OPENING_STOCK_HEADERS = {
    "OPENING STOCK",
    "OPENING QUANTITY",
    "INITIAL STOCK",
    "STOCK QUANTITY",
    "STOCK",
    "QUANTITY IN STOCK",
}

def _normalize_header(value) -> str:
    if value is None:
        return ""

    return re.sub(
        r"\s+",
        " ",
        str(value).strip().upper(),
    )


def _parse_decimal(value) -> Decimal | None:
    if value is None:
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, Decimal):
        amount = value
    elif isinstance(value, (int, float)):
        amount = Decimal(str(value))
    else:
        cleaned = (
            str(value)
            .replace("₹", "")
            .replace(",", "")
            .strip()
        )

        if cleaned in {"", "-", "—", "–"}:
            return None

        try:
            amount = Decimal(cleaned)
        except InvalidOperation:
            return None

    if not amount.is_finite() or amount < 0:
        return None

    return amount.quantize(Decimal("0.01"))


def _parse_stock(value) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None

    try:
        amount = Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, ValueError):
        return None

    if not amount.is_finite() or amount < 0:
        return None

    return amount


def _identify_column(header: str) -> dict | None:
    normalized = _normalize_header(header)

    if normalized in PRODUCT_NAME_HEADERS:
        return {"kind": "name"}

    if normalized in DESCRIPTION_HEADERS:
        return {"kind": "description"}

    if normalized in PURCHASE_PRICE_HEADERS:
        return {"kind": "purchase_price"}

    if normalized in OPENING_STOCK_HEADERS:
        return {"kind": "opening_stock"}

    unit_match = UNIT_PATTERN.fullmatch(normalized)

    if unit_match:
        try:
            unit = _normalize_unit(normalized)
        except (ValueError, ArithmeticError):
            return None

        return {
            "kind": "selling_unit",
            **unit,
        }

    return None


def _detect_header_row(worksheet):
    """
    Search the first 30 rows for a product-name column
    and at least one supported selling-unit column.
    """

    for row_number, row in enumerate(
        worksheet.iter_rows(
            min_row=1,
            max_row=min(30, worksheet.max_row),
            values_only=True,
        ),
        start=1,
    ):
        columns = []
        seen_kinds = set()
        seen_units = set()
        duplicate = False

        for column_index, value in enumerate(row):
            if value is None:
                continue

            header = _normalize_header(value)
            identified = _identify_column(header)

            if identified is None:
                continue

            kind = identified["kind"]

            if kind in {
                "name",
                "purchase_price",
                "opening_stock",
            }:
                if kind in seen_kinds:
                    duplicate = True
                    break
                seen_kinds.add(kind)

            if kind == "selling_unit":
                unit_key = header

                if unit_key in seen_units:
                    duplicate = True
                    break

                seen_units.add(unit_key)

            columns.append({
                "index": column_index,
                "header": header,
                **identified,
            })

        if duplicate:
            continue

        has_name = "name" in seen_kinds
        has_selling_unit = any(
            column["kind"] == "selling_unit"
            for column in columns
        )

        if has_name and has_selling_unit:
            return row_number, columns

    return None, None


def extract_product_excel(excel_bytes: bytes) -> dict:
    """
    Extract product information from an XLSX workbook.

    Supports:
    - Product names and descriptions
    - Optional purchase prices
    - Multiple independently priced selling units
    - Unit conversion factors
    - Optional opening stock

    This function does not access or modify the database.
    """

    if not excel_bytes:
        raise ProductExcelImportError(
            "The uploaded Excel file is empty."
        )

    try:
        workbook = load_workbook(
            BytesIO(excel_bytes),
            read_only=True,
            data_only=True,
        )
    except Exception as exc:
        raise ProductExcelImportError(
            "The uploaded file could not be opened as an Excel workbook."
        ) from exc

    products = []
    warnings = []
    detected_sheet = None
    header_columns = None
    header_row_number = None

    try:
        for worksheet in workbook.worksheets:
            if worksheet.sheet_state != "visible":
                continue

            row_number, columns = _detect_header_row(worksheet)

            if columns is not None:
                detected_sheet = worksheet
                header_columns = columns
                header_row_number = row_number
                break

        if detected_sheet is None:
            raise ProductExcelImportError(
                "No worksheet containing a product-name column "
                "and supported selling-unit columns was found."
            )

        selling_unit_columns = [
            column
            for column in header_columns
            if column["kind"] == "selling_unit"
        ]

        purchase_columns = [
            column
            for column in header_columns
            if column["kind"] == "purchase_price"
        ]

        stock_columns = [
            column
            for column in header_columns
            if column["kind"] == "opening_stock"
        ]

        if len(purchase_columns) > 1:
            raise ProductExcelImportError(
                "Multiple purchase-price columns were detected. "
                "Please keep only one purchase-price column."
            )

        if len(stock_columns) > 1:
            raise ProductExcelImportError(
                "Multiple opening-stock columns were detected. "
                "Please keep only one stock column."
            )

        base_unit, unit_warnings = _build_base_unit(
            selling_unit_columns
        )

        warnings.extend(unit_warnings)

        dimensions = {
            column["dimension"]
            for column in selling_unit_columns
        }

        if len(dimensions) != 1:
            base_unit = None

        if base_unit is not None:
            dimension = next(iter(dimensions))

            if dimension in {"mass", "volume"}:
                base_column = max(
                    selling_unit_columns,
                    key=lambda column: column["normalized_quantity"],
                )
                base_quantity = base_column["normalized_quantity"]
            else:
                base_quantity = Decimal("1")

        else:
            base_quantity = None

        serial_number = 0

        for row_number, row in enumerate(
            detected_sheet.iter_rows(
                min_row=header_row_number + 1,
                values_only=True,
            ),
            start=header_row_number + 1,
        ):
            def get_value(column):
                index = column["index"]
                return row[index] if index < len(row) else None

            name_column = next(
                column
                for column in header_columns
                if column["kind"] == "name"
            )

            raw_name = get_value(name_column)

            if raw_name is None or not str(raw_name).strip():
                continue

            name = str(raw_name).strip()

            # Ignore repeated header rows inside the worksheet.
            if _normalize_header(name) in PRODUCT_NAME_HEADERS:
                continue

            serial_number += 1
            product_warnings = []
            selling_units = []

            for column in selling_unit_columns:
                raw_rate = get_value(column)
                rate = _parse_decimal(raw_rate)

                factor = None

                if base_quantity is not None:
                    factor = (
                        column["normalized_quantity"]
                        / base_quantity
                    )

                if raw_rate is not None and rate is None:
                    product_warnings.append(
                        f"Invalid rate in {column['name']}."
                    )

                selling_units.append({
                    "name": column["name"],
                    "factor_to_base": (
                        str(factor)
                        if factor is not None
                        else None
                    ),
                    "rate": (
                        str(rate)
                        if rate is not None
                        else None
                    ),
                })

            purchase_price = None

            if purchase_columns:
                raw_purchase = get_value(purchase_columns[0])
                purchase_price = _parse_decimal(raw_purchase)

                if raw_purchase is not None and purchase_price is None:
                    product_warnings.append(
                        "Purchase price is invalid."
                    )

            opening_stock = None

            if stock_columns:
                raw_stock = get_value(stock_columns[0])
                opening_stock = _parse_stock(raw_stock)

                if raw_stock is not None and opening_stock is None:
                    product_warnings.append(
                        "Opening stock is invalid."
                    )

            description_columns = [
                column
                for column in header_columns
                if column["kind"] == "description"
            ]

            description = None

            if description_columns:
                raw_description = get_value(description_columns[0])

                if raw_description is not None:
                    description = str(raw_description).strip() or None

            products.append({
                "serial_number": serial_number,
                "name": name,
                "description": description,
                "base_unit": base_unit,
                "selling_units": selling_units,
                "purchase_price": (
                    str(purchase_price)
                    if purchase_price is not None
                    else None
                ),
                "opening_stock": (
                    str(opening_stock)
                    if opening_stock is not None
                    else None
                ),
                "source_page": None,
                "source_row": row_number,
                "warnings": product_warnings,
            })

        if not products:
            raise ProductExcelImportError(
                "No product rows could be extracted from the workbook."
            )

        return {
            "sheet_name": detected_sheet.title,
            "product_count": len(products),
            "price_columns": [
                column["name"]
                for column in selling_unit_columns
            ],
            "has_purchase_price_column": bool(purchase_columns),
            "has_opening_stock_column": bool(stock_columns),
            "products": products,
            "warnings": warnings,
        }

    finally:
        workbook.close()
