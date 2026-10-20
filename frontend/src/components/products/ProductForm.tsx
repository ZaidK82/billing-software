
import { useEffect, useState } from "react";

import type { Product } from "../../lib/api";

type ProductFormValues = {
  name: string;
  description: string;
  default_unit_price: string;
};

type ProductFormProps = {
  product?: Product;
  isSaving: boolean;
  error: string | null;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
};

function ProductForm({
  product,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(
    product?.description ?? "",
  );
  const [defaultUnitPrice, setDefaultUnitPrice] = useState(
    product?.default_unit_price ?? "",
  );

  useEffect(() => {
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setDefaultUnitPrice(product?.default_unit_price ?? "");
  }, [product]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      default_unit_price: defaultUnitPrice,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="mb-5 min-h-10 rounded-lg px-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          ← Back to Products
        </button>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-bold text-slate-900">
            {product ? "Edit Product" : "Add Product"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Save the product details and default unit price for reuse in invoices.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="product-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Product name
              </label>
              <input
                id="product-name"
                required
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Design service"
              />
            </div>

            <div>
              <label
                htmlFor="product-description"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Description (optional)
              </label>
              <textarea
                id="product-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Additional product details"
              />
            </div>

            <div>
              <label
                htmlFor="product-price"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Default unit price
              </label>
              <input
                id="product-price"
                type="number"
                required
                min="0"
                max="9999999999.99"
                step="0.01"
                value={defaultUnitPrice}
                onChange={(event) =>
                  setDefaultUnitPrice(event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="0.00"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : product
                    ? "Save Changes"
                    : "Create Product"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default ProductForm;
