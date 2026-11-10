
import { useState } from "react";

import type { Product, SellingUnit } from "../../lib/api";


const STANDARD_UNITS = [
  { value: "PCS", label: "Pieces (PCS)" },
  { value: "SET", label: "Set (SET)" },
  { value: "PAIR", label: "Pair (PAIR)" },
  { value: "DOZEN", label: "Dozen (DOZEN)" },
  { value: "BOX", label: "Box (BOX)" },
  { value: "PACK", label: "Pack (PACK)" },
  { value: "KG", label: "Kilogram (KG)" },
  { value: "G", label: "Gram (G)" },
  { value: "MG", label: "Milligram (MG)" },
  { value: "TONNE", label: "Tonne (TONNE)" },
  { value: "LTR", label: "Litre (LTR)" },
  { value: "ML", label: "Millilitre (ML)" },
  { value: "KL", label: "Kilolitre (KL)" },
  { value: "MTR", label: "Metre (MTR)" },
  { value: "CM", label: "Centimetre (CM)" },
  { value: "MM", label: "Millimetre (MM)" },
  { value: "KM", label: "Kilometre (KM)" },
  { value: "SQ FT", label: "Square feet (SQ FT)" },
  { value: "SQ M", label: "Square metre (SQ M)" },
  { value: "SQ YD", label: "Square yard (SQ YD)" },
  { value: "ROLL", label: "Roll (ROLL)" },
  { value: "unit", label: "Other / generic unit (unit)" },
];

function getProductFormDefaults(product?: Product) {
  const existingBaseUnit = product?.base_unit ?? "PCS";
  const isStandardBaseUnit = STANDARD_UNITS.some(
    (unit) => unit.value === existingBaseUnit,
  );

  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    defaultUnitPrice: product?.default_unit_price ?? "",
    purchasePrice: product?.purchase_price ?? "",
    baseUnit: isStandardBaseUnit ? existingBaseUnit : "CUSTOM",
    customBaseUnit: isStandardBaseUnit ? "" : existingBaseUnit,
    useCustomBaseUnit: !isStandardBaseUnit,
    sellingUnits: product?.selling_units ?? [],
  };
}


type ProductFormValues = {
  name: string;
  description: string;
  purchase_price: string;
  default_unit_price: string;
  base_unit: string;
  selling_units: SellingUnit[];
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
  const defaults = getProductFormDefaults(product);

  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState(defaults.description);
  const [defaultUnitPrice, setDefaultUnitPrice] = useState(
    defaults.defaultUnitPrice,
  );
  const [purchasePrice, setPurchasePrice] = useState(
    defaults.purchasePrice,
  );
  const [baseUnit, setBaseUnit] = useState(defaults.baseUnit);
  const [customBaseUnit, setCustomBaseUnit] = useState(
    defaults.customBaseUnit,
  );
  const [useCustomBaseUnit, setUseCustomBaseUnit] = useState(
    defaults.useCustomBaseUnit,
  );
  const [useCustomSellingUnit, setUseCustomSellingUnit] = useState(false);
  const [sellingUnits, setSellingUnits] = useState<SellingUnit[]>(
    defaults.sellingUnits,
  );
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitFactor, setNewUnitFactor] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [unitError, setUnitError] = useState<string | null>(null);

function handleAddSellingUnit() {
  const name = newUnitName.trim();
  const factor = Number(newUnitFactor);
  const priceText = newUnitPrice.trim();

  if (!name) {
    setUnitError("Enter a selling unit name.");
    return;
  }

  if (name.length > 30) {
    setUnitError("Unit names must be 30 characters or fewer.");
    return;
  }

  if (name.toLowerCase() === baseUnit.trim().toLowerCase()) {
    setUnitError("The selling unit cannot be the same as the base unit.");
    return;
  }

  if (
    sellingUnits.some(
      (unit) => unit.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    setUnitError("This selling unit already exists.");
    return;
  }

  if (!Number.isFinite(factor) || factor <= 0) {
    setUnitError("Enter a conversion factor greater than zero.");
    return;
  }

  if (!Number.isInteger(factor * 1000)) {
    setUnitError(
      "The conversion factor must produce a base quantity with at most 3 decimal places.",
    );
    return;
  }

  let price: number | undefined;

  if (priceText !== "") {
    price = Number(priceText);

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(price * 100)
    ) {
      setUnitError("Enter a valid selling price with at most 2 decimal places.");
      return;
    }
  }

  setSellingUnits((current) => [
    ...current,
    {
      name,
      factor,
      ...(price !== undefined ? { price } : {}),
    },
  ]);

  setNewUnitName("");
  setNewUnitFactor("");
  setNewUnitPrice("");
  setUnitError(null);
}

function updateSellingUnitPrice(name: string, value: string) {
  setSellingUnits((current) =>
    current.map((unit) => {
      if (unit.name !== name) {
        return unit;
      }

      if (value.trim() === "") {
        const unitWithoutPrice = { ...unit };
        delete unitWithoutPrice.price;
        return unitWithoutPrice;
      }

      return {
        ...unit,
        price: value,
      };
    }),
  );
}

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      purchase_price: purchasePrice,
      default_unit_price: defaultUnitPrice,
      base_unit: (
        useCustomBaseUnit ? customBaseUnit : baseUnit
      ).trim(),
      selling_units: sellingUnits,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={onCancel}
          className="mb-5 min-h-10 rounded-lg px-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          ← Back to Products
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Product catalogue
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {product ? "Edit Product" : "Add Product"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Configure product information, measurement units and pricing for reuse in invoices.
          </p>

          </div>
          <div className="p-5 sm:p-7">
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
                htmlFor="product-base-unit"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Base unit
              </label>

              <select
                id="product-base-unit"
                required
                value={useCustomBaseUnit ? "CUSTOM" : baseUnit}
                onChange={(event) => {
                  const value = event.target.value;
                  setUseCustomBaseUnit(value === "CUSTOM");
                  if (value !== "CUSTOM") {
                    setBaseUnit(value);
                  }
                  setUnitError(null);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {STANDARD_UNITS.filter((unit) => unit.value !== "unit").map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
                <option value="CUSTOM">Custom unit...</option>
              </select>

              {useCustomBaseUnit && (
                <>
                  <label
                    htmlFor="product-custom-base-unit"
                    className="form-label mt-2"
                  >
                    Custom base unit
                  </label>

                  <input
                    id="product-custom-base-unit"
                    required
                    maxLength={30}
                    value={customBaseUnit}
                    onChange={(event) => {
                      setCustomBaseUnit(event.target.value);
                      setUnitError(null);
                    }}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter custom base unit, e.g. BUNDLE"
                  />
                </>
              )}

              <p className="mt-1 text-xs text-slate-500">
                Stock is tracked in this unit. Selling-unit conversion factors are
                measured relative to the base unit.
              </p>
            </div>


            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <h2 className="text-base font-bold tracking-tight text-slate-950">
                Selling units
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Define additional units customers can purchase. Each unit can have its own conversion factor and optional independent selling price.
              </p>

              {sellingUnits.length > 0 && (
                <div className="mt-3 space-y-2">
                  {sellingUnits.map((unit) => (
                    <div
                      key={unit.name}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">{unit.name}</span>
                          <span className="ml-2 text-slate-500">
                            1 {unit.name} = {unit.factor} {baseUnit || "base units"}
                          </span>
                        </div>

                        <div className="mt-2">
                          <label
                            htmlFor={`selling-unit-price-${unit.name}`}
                            className="mb-1 block text-xs font-medium text-slate-600"
                          >
                            Independent selling price (optional)
                          </label>

                          <input
                            id={`selling-unit-price-${unit.name}`}
                            type="number"
                            min="0"
                            max="9999999999.99"
                            step="0.01"
                            value={unit.price ?? ""}
                            onChange={(event) =>
                              updateSellingUnitPrice(
                                unit.name,
                                event.target.value,
                              )
                            }
                            className="min-h-10 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                            placeholder="Leave empty for proportional price"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSellingUnits((current) =>
                            current.filter((item) => item.name !== unit.name),
                          );
                          setUnitError(null);
                        }}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
              <label
                htmlFor="selling-unit-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Selling unit name
              </label>

              <select
                id="selling-unit-name"
                value={useCustomSellingUnit ? "CUSTOM" : newUnitName}
                onChange={(event) => {
                  const value = event.target.value;
                  setUseCustomSellingUnit(value === "CUSTOM");
                  setNewUnitName(value === "CUSTOM" ? "" : value);
                  setUnitError(null);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select selling unit</option>

                {STANDARD_UNITS.filter(
                  (unit) =>
                    unit.value !== "unit" &&
                    unit.value !== baseUnit &&
                    !sellingUnits.some(
                      (existing) =>
                        existing.name.trim().toUpperCase() === unit.value,
                    ),
                ).map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}

                <option value="CUSTOM">Custom unit...</option>
              </select>

              {useCustomSellingUnit && (
                <>
                  <label
                    htmlFor="product-custom-selling-unit"
                    className="form-label mt-2"
                  >
                    Custom selling unit
                  </label>

                  <input
                    id="product-custom-selling-unit"
                    autoFocus
                    required
                    maxLength={30}
                    value={newUnitName}
                    onChange={(event) => {
                      setNewUnitName(event.target.value);
                      setUnitError(null);
                    }}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter custom selling unit"
                  />
                </>
              )}
                </div>

                <div>
                  <label
                    htmlFor="selling-unit-factor"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Base units per selling unit
                  </label>
                  <input
                    id="selling-unit-factor"
                    type="number"
                    min="0.000001"
                    step="any"
                    value={newUnitFactor}
                    onChange={(event) => {
                      setNewUnitFactor(event.target.value);
                      setUnitError(null);
                    }}
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. 12"
                  />
                </div>

                <div>
                  <label
                    htmlFor="selling-unit-price"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Independent selling price
                  </label>

                  <input
                    id="selling-unit-price"
                    type="number"
                    min="0"
                    max="9999999999.99"
                    step="0.01"
                    value={newUnitPrice}
                    onChange={(event) => {
                      setNewUnitPrice(event.target.value);
                      setUnitError(null);
                    }}
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddSellingUnit}
                className="mt-3 min-h-10 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Add selling unit
              </button>

              {unitError && (
                <p className="mt-2 text-sm text-red-600">{unitError}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2 sm:p-5">
              <div className="sm:col-span-2">
                <h2 className="text-base font-bold tracking-tight text-slate-950">
                  Product pricing
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set the acquisition cost and default customer selling price.
                </p>
              </div>

              {/* Purchase price */}
              <div>
                <label
                  htmlFor="product-purchase-price"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Purchase price per base unit (optional)
                </label>

                <input
                  id="product-purchase-price"
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(event) => setPurchasePrice(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Leave empty if unknown"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Your current acquisition cost per base unit. Used for historical
                  invoice cost and gross-profit calculations.
                </p>
              </div>

              {/* Default selling price */}
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
                  onChange={(event) => setDefaultUnitPrice(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="0.00"
                />
              </div>
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
          </div>
        </section>
      </div>
    </main>
  );
}

export default ProductForm;
