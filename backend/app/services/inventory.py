
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.inventory_movement import InventoryMovement
from app.models.product import Product


ZERO = Decimal("0")

def get_inventory_quantity(item: dict) -> Decimal:
    """Return base-unit quantity, falling back for legacy invoice items."""
    raw_quantity = item.get("base_quantity")
    quantity = Decimal(
        str(item["quantity"] if raw_quantity is None else raw_quantity)
    )

    if not quantity.is_finite() or quantity <= ZERO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inventory quantities must be finite and positive.",
        )

    return quantity

def validate_inventory_ledger_balance(
    db: Session,
    business_id: UUID,
    product: Product,
) -> None:
    """Reject reconciliation when the stored balance disagrees with the ledger."""
    latest_movement = db.scalar(
        select(InventoryMovement)
        .where(
            InventoryMovement.business_id == business_id,
            InventoryMovement.product_id == product.id,
        )
        .order_by(
            InventoryMovement.created_at.desc(),
            InventoryMovement.id.desc(),
        )
        .limit(1)
    )

    if latest_movement is None:
        # A product without movements is valid only if it has no
        # initialized balance.
        if product.stock_quantity is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Stock balance for '{product.name}' is initialized, "
                    "but no inventory movement history exists."
                ),
            )
        return

    if product.stock_quantity != latest_movement.stock_after:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Stock balance for '{product.name}' does not match its "
                "latest inventory movement. Review the stock history "
                "before reconciling this invoice."
            ),
        )


def reconcile_bill_inventory(
    db: Session,
    business_id: UUID,
    bill_id: UUID,
    invoice_number: str,
    old_items: list[dict],
    new_items: list[dict],
) -> None:
    """
    Reverse the invoice's previous recorded inventory effect and
    apply eligible deductions for its replacement lines.

    Each item dictionary must contain:
      product_id, quantity, inventory_tracking_applied

    The function modifies inventory_tracking_applied in new_items.
    It never commits or rolls back; the caller owns the transaction.
    """

    existing_product_rows = db.execute(
        select(InventoryMovement.product_id)
        .where(
            InventoryMovement.business_id == business_id,
            InventoryMovement.bill_id == bill_id,
            InventoryMovement.movement_type.in_(
                ["invoice_deduction", "invoice_reversal"]
            ),
        )
        .distinct()
    ).all()
    existing_product_ids = {
        row[0] for row in existing_product_rows
    }

    old_items_by_id = {
        item["id"]: item
        for item in old_items
        if item.get("id") is not None
    }

    new_product_ids: set[UUID] = set()

    for item in new_items:
        product_id = item.get("product_id")
        item["inventory_tracking_applied"] = False
        if product_id is None:
            continue

        get_inventory_quantity(item)

        new_product_ids.add(product_id)

    product_ids = existing_product_ids | new_product_ids

    if not product_ids:
        return

    products = db.scalars(
        select(Product)
        .where(
            Product.id.in_(product_ids),
            Product.business_id == business_id,
        )
        .order_by(Product.id)
        .with_for_update()
    ).all()

    products_by_id = {product.id: product for product in products}

    if set(products_by_id) != product_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A catalogue product required for inventory "
                "reconciliation is missing or belongs to another business."
            ),
        )

    for product_id in sorted(product_ids, key=str):
        validate_inventory_ledger_balance(
            db=db,
            business_id=business_id,
            product=products_by_id[product_id],
        )

    existing_rows = db.execute(
        select(
            InventoryMovement.product_id,
            func.sum(InventoryMovement.quantity_delta),
        )
        .where(
            InventoryMovement.business_id == business_id,
            InventoryMovement.bill_id == bill_id,
            InventoryMovement.movement_type.in_(
                ["invoice_deduction", "invoice_reversal"]
            ),
        )
        .group_by(InventoryMovement.product_id)
    ).all()

    existing_net = {
        product_id: Decimal(str(net))
        for product_id, net in existing_rows
        if net is not None and Decimal(str(net)) != ZERO
    }

    # Compute the balance after reversing the invoice's previous effect.
    projected_balances: dict[UUID, Decimal] = {}

    for product_id in product_ids:
        product = products_by_id[product_id]

        if product.stock_quantity is None:
            if product_id in existing_net:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Stock for '{product.name}' is uninitialized; "
                        "its previous invoice effect cannot be reversed safely."
                    ),
                )

            projected_balances[product_id] = ZERO
            continue

        if not product.stock_quantity.is_finite():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stock balance for '{product.name}' is invalid.",
            )

        projected_balance = (
            product.stock_quantity
            - existing_net.get(product_id, ZERO)
        )

        if projected_balance < ZERO:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Reversing the previous invoice effect for "
                    f"'{product.name}' would produce negative stock. "
                    "Review the stock adjustments and invoice history first."
                ),
            )

        projected_balances[product_id] = projected_balance

    # Conservatively preserve historical tracking eligibility by product.
    new_quantities: dict[UUID, Decimal] = {}

    for item in new_items:
        product_id = item.get("product_id")
        if product_id is None:
            continue

        product = products_by_id[product_id]

        old_item = old_items_by_id.get(item.get("id"))
        is_same_historical_product = (
            old_item is not None
            and old_item.get("product_id") == product_id
        )
        if is_same_historical_product:
            # Retain the tracking decision for an existing line
            # linked to the same product.
            eligible = bool(
                old_item.get("inventory_tracking_applied", False)
            )
        else:
            # A new line, or a line linked to a different product,
            # follows the product's current tracking setting.
            eligible = product.is_stock_tracked
        item["inventory_tracking_applied"] = eligible

        if not eligible:
            continue

        if product.stock_quantity is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Opening stock for '{product.name}' has not been "
                    "initialized. Establish its stock balance first."
                ),
            )

        quantity = get_inventory_quantity(item)

        new_quantities[product_id] = (
            new_quantities.get(product_id, ZERO) + quantity
        )
    # Check every replacement deduction before modifying any balances.
    for product_id, quantity in new_quantities.items():
        available = projected_balances[product_id]
        product = products_by_id[product_id]

        if quantity > available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient stock for '{product.name}'. "
                    f"Available after reversal: {available}; "
                    f"requested: {quantity}."
                ),
            )

    # Record reversals for all previously recorded net effects.
    for product_id in sorted(existing_net, key=str):
        product = products_by_id[product_id]
        reversal_delta = -existing_net[product_id]

        product.stock_quantity = projected_balances[product_id]

        db.add(
            InventoryMovement(
                business_id=business_id,
                product_id=product_id,
                quantity_delta=reversal_delta,
                stock_after=product.stock_quantity,
                movement_type="invoice_reversal",
                reason=f"Reverse inventory effect for invoice {invoice_number}",
                bill_id=bill_id,
            )
        )

    # Record the replacement invoice's deductions.
    for product_id in sorted(new_quantities, key=str):
        product = products_by_id[product_id]
        quantity = new_quantities[product_id]

        product.stock_quantity = (
            projected_balances[product_id] - quantity
        )

        db.add(
            InventoryMovement(
                business_id=business_id,
                product_id=product_id,
                quantity_delta=-quantity,
                stock_after=product.stock_quantity,
                movement_type="invoice_deduction",
                reason=f"Stock deducted for invoice {invoice_number}",
                bill_id=bill_id,
            )
        )
