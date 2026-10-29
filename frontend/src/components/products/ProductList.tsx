
import { useState } from "react";

import type {
  InventoryMovement,
  Product,
} from "../../lib/api";

type ProductListProps = {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => Promise<void>;
  onRefresh: () => void;
  onBack: () => void;
  onInitializeStock: (
    product: Product,
    openingQuantity: number,
    reason: string,
    idempotencyKey: string,
  ) => Promise<void>;
  onAdjustStock: (
    product: Product,
    quantityDelta: number,
    reason: string,
    idempotencyKey: string,
  ) => Promise<void>;
  onLoadStockMovements: (
    product: Product,
  ) => Promise<InventoryMovement[]>;
  onUpdateStockTracking: (
    product: Product,
    isStockTracked: boolean,
  ) => Promise<void>;
};

type StockAction = "initialize" | "adjust";

type PendingStockRequest = {
  productId: string;
  action: StockAction;
  quantity: number;
  reason: string;
  idempotencyKey: string;
};

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function ProductList({
  products,
  isLoading,
  error,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onRefresh,
  onBack,
  onInitializeStock,
  onAdjustStock,
  onLoadStockMovements,
  onUpdateStockTracking,
}: ProductListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<StockAction>("initialize");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockSuccess, setStockSuccess] = useState<string | null>(null);
  const [isStockSaving, setIsStockSaving] = useState(false);
  const [pendingStockRequest, setPendingStockRequest] =
    useState<PendingStockRequest | null>(null);

  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [trackingProductId, setTrackingProductId] =
    useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" from your product catalogue? Existing invoices will not be changed.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(product.id);
    setDeleteError(null);

    try {
      await onDeleteProduct(product);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete product.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openStockForm(product: Product, action: StockAction) {
    setStockProduct(product);
    setStockAction(action);
    setStockQuantity("");
    setStockReason("");
    setStockError(null);
    setStockSuccess(null);
    setPendingStockRequest(null);
    setHistoryProduct(null);
  }

  function closeStockForm() {
    // A failed request may have reached the server. Keep its
    // original payload available for an exact retry.
    if (isStockSaving || pendingStockRequest) {
      return;
    }

    setStockProduct(null);
    setStockError(null);
  }

  async function handleStockSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!stockProduct || isStockSaving) {
      return;
    }

    let request = pendingStockRequest;

    if (request) {
      // A retry must use the exact original payload and key.
      if (
        request.productId !== stockProduct.id ||
        request.action !== stockAction
      ) {
        setStockError(
          "The pending request does not match this product. Close and resolve the pending request first.",
        );
        return;
      }
    } else {
      const quantityText = stockQuantity.trim();
      const quantity = Number(quantityText);
      const reason = stockReason.trim();

      const quantityPattern =
        stockAction === "initialize"
          ? /^\d+(\.\d{1,3})?$/
          : /^-?\d+(\.\d{1,3})?$/;

      if (
        !Number.isFinite(quantity) ||
        !quantityPattern.test(quantityText)
      ) {
        setStockError(
          "Enter a valid quantity with up to 3 decimal places.",
        );
        return;
      }

      if (stockAction === "initialize" && quantity < 0) {
        setStockError("Opening stock cannot be negative.");
        return;
      }

      if (stockAction === "adjust" && quantity === 0) {
        setStockError("Adjustment must be a non-zero quantity.");
        return;
      }

      if (!reason) {
        setStockError("A reason is required.");
        return;
      }

      request = {
        productId: stockProduct.id,
        action: stockAction,
        quantity,
        reason,
        idempotencyKey: createIdempotencyKey(),
      };

      setPendingStockRequest(request);
    }

    setIsStockSaving(true);
    setStockError(null);
    setStockSuccess(null);

    try {
      if (request.action === "initialize") {
        await onInitializeStock(
          stockProduct,
          request.quantity,
          request.reason,
          request.idempotencyKey,
        );
        setStockSuccess("Opening stock initialized successfully.");
      } else {
        await onAdjustStock(
          stockProduct,
          request.quantity,
          request.reason,
          request.idempotencyKey,
        );
        setStockSuccess("Stock adjustment saved successfully.");
      }

      setStockProduct(null);
      setPendingStockRequest(null);

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to update stock. Retry the same request.";

      setStockError(message);

      // A definitive negative-stock rejection did not apply the
      // adjustment. Allow the user to correct the quantity.
      if (
        request.action === "adjust" &&
        /stock cannot become negative|insufficient stock|negative stock/i.test(
          message,
        )
      ) {
        setPendingStockRequest(null);
      }
    } finally {
      setIsStockSaving(false);
    }

  }

  async function handleToggleStockTracking(product: Product) {
    if (trackingProductId !== null) {
      return;
    }

    const nextTrackingState = !product.is_stock_tracked;

    if (nextTrackingState && product.stock_quantity === null) {
      setTrackingError(
        "Initialize opening stock before enabling stock tracking.",
      );
      return;
    }

    const confirmed = window.confirm(
      nextTrackingState
        ? `Enable stock tracking for "${product.name}"? Future eligible invoice changes will affect its stock balance.`
        : `Disable stock tracking for "${product.name}"? Its current stock balance will be retained.`,
    );

    if (!confirmed) {
      return;
    }

    setTrackingProductId(product.id);
    setTrackingError(null);

    try {
      await onUpdateStockTracking(product, nextTrackingState);
    } catch (err) {
      setTrackingError(
        err instanceof Error
          ? err.message
          : "Unable to update stock tracking.",
      );
    } finally {
      setTrackingProductId(null);
    }
  }

  async function handleLoadHistory(product: Product) {
    setHistoryProduct(product);
    setMovements([]);
    setHistoryError(null);
    setIsHistoryLoading(true);
    setStockProduct(null);

    try {
      const result = await onLoadStockMovements(product);
      setMovements(result);
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Unable to load stock movement history.",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function formatQuantity(value: string | number) {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-10 self-start rounded-lg px-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            ← Dashboard
          </button>

          <button
            type="button"
            onClick={onAddProduct}
            className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
          >
            + Add Product
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Product Catalogue
            </h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage reusable products, prices, and stock.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="min-h-10 self-start rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {deleteError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        {trackingError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {trackingError}
          </div>
        )}

        {stockSuccess && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {stockSuccess}
          </div>
        )}

        {stockProduct && (
          <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {stockAction === "initialize"
                ? `Set opening stock — ${stockProduct.name}`
                : `Adjust stock — ${stockProduct.name}`}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {stockAction === "initialize"
                ? "This establishes the starting balance and enables stock tracking."
                : "Use a positive quantity to add stock or a negative quantity to remove stock."}
            </p>

            <form onSubmit={handleStockSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="stock-quantity"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {stockAction === "initialize"
                    ? "Opening quantity"
                    : "Quantity change"}
                </label>
                <input
                  id="stock-quantity"
                  type="number"
                  required
                  min={stockAction === "initialize" ? "0" : undefined}
                  step="0.001"
                  max="99999999999.999"
                  disabled={isStockSaving || Boolean(pendingStockRequest)}
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={stockAction === "initialize" ? "e.g. 100" : "e.g. 5 or -2"}
                />
              </div>

              <div>
                <label
                  htmlFor="stock-reason"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Reason
                </label>
                <textarea
                  id="stock-reason"
                  required
                  maxLength={500}
                  rows={2}
                  disabled={isStockSaving || Boolean(pendingStockRequest)}
                  value={stockReason}
                  onChange={(event) => setStockReason(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={
                    stockAction === "initialize"
                      ? "e.g. Initial physical stock count"
                      : "e.g. Damaged goods or stock recount"
                  }
                />
              </div>

              {stockError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {stockError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeStockForm}
                  disabled={isStockSaving || Boolean(pendingStockRequest)}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStockSaving || !stockQuantity.trim() || !stockReason.trim()}
                  className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isStockSaving
                    ? "Saving..."
                    : pendingStockRequest
                      ? "Retry Same Request"
                      : stockAction === "initialize"
                        ? "Initialize Stock"
                        : "Save Adjustment"}
                </button>
              </div>
            </form>
          </section>
        )}

        {historyProduct && (
          <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Stock movement history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {historyProduct.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="min-h-9 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {isHistoryLoading && (
              <p className="mt-4 text-sm text-slate-500">
                Loading movement history...
              </p>
            )}

            {historyError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {historyError}
              </p>
            )}

            {!isHistoryLoading && !historyError && movements.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No stock movements found.
              </p>
            )}

            {movements.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-3 font-medium">Date</th>
                      <th className="px-2 py-3 font-medium">Type</th>
                      <th className="px-2 py-3 text-right font-medium">Change</th>
                      <th className="px-2 py-3 text-right font-medium">Balance</th>
                      <th className="px-2 py-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-b border-slate-100">
                        <td className="whitespace-nowrap px-2 py-3 text-slate-600">
                          {new Date(movement.created_at).toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          {movement.movement_type.replaceAll("_", " ")}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right text-slate-700">
                          {Number(movement.quantity_delta) > 0 ? "+" : ""}
                          {formatQuantity(movement.quantity_delta)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right font-medium text-slate-900">
                          {formatQuantity(movement.stock_after)}
                        </td>
                        <td className="px-2 py-3 text-slate-600">
                          {movement.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {isLoading && products.length === 0 && !error && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Loading products...
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="font-medium text-slate-900">No products yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add a product to reuse its name and default price when creating invoices.
            </p>
            <button
              type="button"
              onClick={onAddProduct}
              className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              Add First Product
            </button>
          </div>
        )}

        {products.length > 0 && (
          <div className="space-y-3">
            {products.map((product) => {
              const initialized = product.stock_quantity !== null;
              const tracked = product.is_stock_tracked;

              return (
                <article
                  key={product.id}
                  className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold text-slate-900">
                        {product.name}
                      </h2>

                      {product.description && (
                        <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
                          {product.description}
                        </p>
                      )}

                      <p className="mt-2 text-sm font-medium text-slate-800">
                        Default unit price:{" "}
                        {Number(product.default_unit_price).toFixed(2)}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Base unit: <span className="font-medium">{product.base_unit}</span>
                      </p>

                      {product.selling_units.length > 0 && (
                        <p className="mt-1 text-sm text-slate-600">
                          Selling units:{" "}
                          {product.selling_units
                            .map((unit) => `${unit.name} (${unit.factor} ${product.base_unit})`)
                            .join(", ")}
                        </p>
                      )}

                      <div className="mt-3 space-y-1 text-sm">
                        <p className="text-slate-700">
                          Stock tracking:{" "}
                          <span className={tracked ? "font-semibold text-green-700" : "font-semibold text-slate-500"}>
                            {tracked ? "Enabled" : "Disabled"}
                          </span>
                        </p>

                        <p className="text-slate-700">
                          Stock balance:{" "}
                          <span className="font-semibold">
                            {initialized
                            ? `${formatQuantity(product.stock_quantity!)} ${product.base_unit}`
                            : "Not initialized"}
                          </span>
                        </p>

                        {!tracked && initialized && (
                          <p className="text-xs text-slate-500">
                            The saved balance is retained; invoice stock deduction is disabled.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>

                      {product.stock_quantity !== null && (
                        <button
                          type="button"
                          disabled={trackingProductId !== null}
                          onClick={() => void handleToggleStockTracking(product)}
                          className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          {trackingProductId === product.id
                            ? "Updating..."
                            : product.is_stock_tracked
                              ? "Disable Tracking"
                              : "Enable Tracking"}
                        </button>
                      )}

                      {!initialized ? (
                        <button
                          type="button"
                          onClick={() => openStockForm(product, "initialize")}
                          className="min-h-10 rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Set Opening Stock
                        </button>
                      ) : tracked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openStockForm(product, "adjust")}
                            className="min-h-10 rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Adjust Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleLoadHistory(product)}
                            className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            View History
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleLoadHistory(product)}
                          className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          View History
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => void handleDelete(product)}
                        className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default ProductList;
