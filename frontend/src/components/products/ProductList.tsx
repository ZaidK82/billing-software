
import { useState } from "react";

import type { Product } from "../../lib/api";

type ProductListProps = {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => Promise<void>;
  onRefresh: () => void;
  onBack: () => void;
};

function ProductList({
  products,
  isLoading,
  error,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onRefresh,
  onBack,
}: ProductListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        err instanceof Error
          ? err.message
          : "Unable to delete product.",
      );
    } finally {
      setDeletingId(null);
    }
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
              Manage reusable products and their default unit prices.
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

        {isLoading && products.length === 0 && !error && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Loading products...
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="font-medium text-slate-900">
              No products yet
            </p>
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
            {products.map((product) => (
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
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === product.id}
                      onClick={() => void handleDelete(product)}
                      className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === product.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default ProductList;
