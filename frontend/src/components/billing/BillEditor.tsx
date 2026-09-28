import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  getSession,
} from "../../lib/auth";

import {
  getCustomers,
  saveBill,
} from "../../lib/api";

import type {
  BusinessProfile,
  Customer,
  InvoiceColumn,
  SavedBill,
} from "../../lib/api";

type BillItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  custom_values: Record<string, unknown>;
};

type BillEditorProps = {
  business: BusinessProfile;
  onCancel: () => void;
  onSaved: (bill: SavedBill) => void;
};

const DEFAULT_COLUMNS: InvoiceColumn[] = [
  {
    key: "item_name",
    label: "Product Description",
    type: "text",
    source: "core",
    position: 1,
    required: true,
  },
  {
    key: "quantity",
    label: "Qty",
    type: "number",
    source: "core",
    position: 2,
    required: true,
  },
  {
    key: "unit",
    label: "Unit",
    type: "text",
    source: "custom",
    position: 3,
    required: false,
  },
  {
    key: "unit_price",
    label: "Rate",
    type: "number",
    source: "core",
    position: 4,
    required: true,
  },
  {
    key: "line_total",
    label: "Amount",
    type: "number",
    source: "core",
    position: 5,
    required: true,
  },
];

function createItem(): BillItem {
  return {
    id: crypto.randomUUID(),
    item_name: "",
    quantity: 1,
    unit_price: 0,
    custom_values: {},
  };
}

function getInputValue(
  item: BillItem,
  column: InvoiceColumn,
): string | number {
  if (column.source === "core") {
    switch (column.key) {
      case "item_name":
        return item.item_name;

      case "quantity":
        return item.quantity;

      case "unit_price":
        return item.unit_price;

      case "line_total":
        return item.quantity * item.unit_price;

      default:
        return "";
    }
  }

  const value = item.custom_values[column.key];

  if (value === null || value === undefined) {
    return "";
  }

  return typeof value === "string" ||
    typeof value === "number"
    ? value
    : String(value);
}

function BillEditor({
  business,
  onCancel,
  onSaved,
}: BillEditorProps) {
  const invoiceColumns =
    business.invoice_columns.length > 0
      ? [...business.invoice_columns].sort(
          (a, b) => a.position - b.position,
        )
      : DEFAULT_COLUMNS;

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [customerAddress, setCustomerAddress] =
    useState("");

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] =
    useState("");

  const [isLoadingCustomers, setIsLoadingCustomers] =
    useState(true);

  const [customerLoadError, setCustomerLoadError] =
    useState<string | null>(null);

  const [items, setItems] = useState<BillItem[]>([]);

  const [draftItem, setDraftItem] =
    useState<BillItem>(createItem());

  const [editingItemId, setEditingItemId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    async function loadCustomers() {
      setIsLoadingCustomers(true);
      setCustomerLoadError(null);

      try {
        const session = await getSession();

        if (!session?.access_token) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        const savedCustomers = await getCustomers(
          session.access_token,
        );

        setCustomers(savedCustomers);
      } catch (err) {
        setCustomerLoadError(
          err instanceof Error
            ? err.message
            : "Unable to load saved customers.",
        );
      } finally {
        setIsLoadingCustomers(false);
      }
    }

    loadCustomers();
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + item.quantity * item.unit_price,
      0,
    );
  }, [items]);

  const total = subtotal;

  function isDraftItemValid() {
    if (!draftItem.item_name.trim()) {
        return false;
    }

    if (draftItem.quantity <= 0) {
        return false;
    }

    if (draftItem.unit_price < 0) {
        return false;
    }

    for (const column of invoiceColumns) {
        if (
        column.source === "custom" &&
        column.required
        ) {
        const value =
            draftItem.custom_values[column.key];

        if (
            value === undefined ||
            value === null ||
            String(value).trim() === ""
        ) {
            return false;
        }
        }
    }

    return true;
    }

    const canAddOrUpdateItem =
    isDraftItemValid();

    const canSaveBill =
    customerName.trim().length > 0 &&
    items.length > 0 &&
    !saving;

  function handleCustomerChange(
    customerId: string,
  ) {
    setSelectedCustomerId(customerId);

    if (!customerId) {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      return;
    }

    const customer = customers.find(
      (item) => item.id === customerId,
    );

    if (!customer) {
      return;
    }

    setCustomerName(customer.name);
    setCustomerPhone(customer.phone ?? "");
    setCustomerAddress(customer.address ?? "");
  }
function updateCoreItem(
  field:
    | "item_name"
    | "quantity"
    | "unit_price",
  value: string | number,
) {
  setDraftItem((currentItem) => ({
    ...currentItem,
    [field]: value,
  }));
}

function updateCustomValue(
  columnKey: string,
  value: string,
) {
  setDraftItem((currentItem) => ({
    ...currentItem,
    custom_values: {
      ...currentItem.custom_values,
      [columnKey]: value,
    },
  }));
}

function resetDraftItem() {
  setDraftItem(createItem());
  setEditingItemId(null);
}

function addOrUpdateItem() {
  if (editingItemId) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === editingItemId
          ? {
              ...draftItem,
              id: editingItemId,
            }
          : item,
      ),
    );

    resetDraftItem();
    return;
  }

  setItems((currentItems) => [
    ...currentItems,
    draftItem,
  ]);

  resetDraftItem();
}

function editItem(item: BillItem) {
  setDraftItem({
    ...item,
    custom_values: {
      ...item.custom_values,
    },
  });

  setEditingItemId(item.id);
}

function removeItem(itemId: string) {
  setItems((currentItems) =>
    currentItems.filter(
      (item) => item.id !== itemId,
    ),
  );

  if (editingItemId === itemId) {
    resetDraftItem();
  }
}
  
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);

    const trimmedCustomerName =
      customerName.trim();

    if (!trimmedCustomerName) {
      setError("Customer name is required.");
      return;
    }

    if (items.length === 0) {
    setError("Add at least one item.");
    return;
    }

    for (const item of items) {
      if (!item.item_name.trim()) {
        setError(
          "Every item must have a product or service name.",
        );
        return;
      }

      if (item.quantity <= 0) {
        setError(
          "Item quantity must be greater than zero.",
        );
        return;
      }

      if (item.unit_price < 0) {
        setError(
          "Item price cannot be negative.",
        );
        return;
      }

      for (const column of invoiceColumns) {
        if (
          column.source === "custom" &&
          column.required
        ) {
          const value =
            item.custom_values[column.key];

          if (
            value === undefined ||
            value === null ||
            String(value).trim() === ""
          ) {
            setError(
              `${column.label} is required for every item.`,
            );
            return;
          }
        }
      }
    }

    setSaving(true);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const savedBill = await saveBill(
        session.access_token,
        {
          customer_name: trimmedCustomerName,
          customer_phone:
            customerPhone.trim() || null,
          customer_address:
            customerAddress.trim() || null,
          invoice_columns: invoiceColumns,
          items: items.map((item) => ({
            item_name: item.item_name.trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
            custom_values: item.custom_values,
          })),
        },
      );

      onSaved(savedBill);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save bill.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <button
              type="button"
              onClick={onCancel}
              className="mb-4 rounded-lg px-2 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
            >
              ← Dashboard
            </button>

            <p className="text-sm font-medium text-blue-600">
              Billing Software
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Create Bill
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Enter customer details and add the items
              being billed.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-8"
          >
            <section>
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Customer Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="saved-customer"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Saved Customer
                  </label>

                  <select
                    id="saved-customer"
                    value={selectedCustomerId}
                    onChange={(event) =>
                      handleCustomerChange(
                        event.target.value,
                      )
                    }
                    disabled={
                      isLoadingCustomers ||
                      saving
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">
                      {isLoadingCustomers
                        ? "Loading customers..."
                        : customers.length > 0
                          ? "Enter customer manually"
                          : "No saved customers"}
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                        {customer.phone
                          ? ` — ${customer.phone}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {customerLoadError && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Saved customers could not be
                      loaded. You can still enter the
                      customer manually.
                    </p>
                  )}

                  {!isLoadingCustomers &&
                    !customerLoadError &&
                    customers.length > 0 && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Select a saved customer to
                        automatically fill their details.
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="customer-name"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Customer Name *
                    </label>

                    <input
                      id="customer-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(event) => {
                        setCustomerName(
                          event.target.value,
                        );
                        setSelectedCustomerId("");
                      }}
                      className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      placeholder="Customer name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Phone
                    </label>

                    <input
                      id="customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(event) => {
                        setCustomerPhone(
                          event.target.value,
                        );
                        setSelectedCustomerId("");
                      }}
                      className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="customer-address"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Address
                  </label>

                  <textarea
                    id="customer-address"
                    rows={3}
                    value={customerAddress}
                    onChange={(event) => {
                      setCustomerAddress(
                        event.target.value,
                      );
                      setSelectedCustomerId("");
                    }}
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Customer address"
                  />
                </div>
              </div>
            </section>

            <section>
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900">
                Items
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                Fill in the item details and add the item to
                the bill. Added items appear below.
                </p>
            </div>

            {/* Fixed item entry block */}
            <div className="rounded-xl border-2 border-blue-100 bg-blue-50/40 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">
                    {editingItemId
                        ? "Edit Item"
                        : "Add Item"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                    {editingItemId
                        ? "Update the item and save your changes."
                        : "Enter the details for the next item."}
                    </p>
                </div>

                {editingItemId && (
                    <button
                    type="button"
                    onClick={resetDraftItem}
                    className="rounded-lg px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-white active:bg-slate-100"
                    >
                    Cancel Edit
                    </button>
                )}
                </div>

                <div className="space-y-4">
                {invoiceColumns.map((column) => (
                    <div key={column.key}>
                    <label
                        htmlFor={`draft-item-${column.key}`}
                        className="mb-1 block text-xs font-medium text-slate-600"
                    >
                        {column.label}
                        {column.required ? " *" : ""}
                    </label>

                    {column.source === "core" &&
                        column.key === "item_name" && (
                        <input
                            id={`draft-item-${column.key}`}
                            type="text"
                            value={draftItem.item_name}
                            onChange={(event) =>
                            updateCoreItem(
                                "item_name",
                                event.target.value,
                            )
                            }
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            placeholder="Product or service"
                        />
                        )}

                    {column.source === "core" &&
                        column.key === "quantity" && (
                        <input
                            id={`draft-item-${column.key}`}
                            type="number"
                            min="1"
                            step="1"
                            value={draftItem.quantity}
                            onChange={(event) =>
                            updateCoreItem(
                                "quantity",
                                Number(event.target.value),
                            )
                            }
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                        )}

                    {column.source === "core" &&
                        column.key === "unit_price" && (
                        <input
                            id={`draft-item-${column.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={draftItem.unit_price}
                            onChange={(event) =>
                            updateCoreItem(
                                "unit_price",
                                Number(event.target.value),
                            )
                            }
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                        )}

                    {column.source === "core" &&
                        column.key === "line_total" && (
                        <div className="flex min-h-11 items-center rounded-lg bg-white px-3 py-2.5">
                            <span className="text-sm font-semibold text-slate-900">
                            ₹
                            {(
                                draftItem.quantity *
                                draftItem.unit_price
                            ).toFixed(2)}
                            </span>
                        </div>
                        )}

                    {column.source === "custom" &&
                        column.type === "number" && (
                        <input
                            id={`draft-item-${column.key}`}
                            type="number"
                            step="0.01"
                            value={
                            String(
                                draftItem.custom_values[
                                column.key
                                ] ?? "",
                            )
                            }
                            onChange={(event) =>
                            updateCustomValue(
                                column.key,
                                event.target.value,
                            )
                            }
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                        )}

                    {column.source === "custom" &&
                        column.type === "date" && (
                        <input
                            id={`draft-item-${column.key}`}
                            type="date"
                            value={String(
                            draftItem.custom_values[
                                column.key
                            ] ?? "",
                            )}
                            onChange={(event) =>
                            updateCustomValue(
                                column.key,
                                event.target.value,
                            )
                            }
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                        )}

                    {column.source === "custom" &&
                        column.type !== "number" &&
                        column.type !== "date" && (
                        <input
                            id={`draft-item-${column.key}`}
                            type="text"
                            value={String(
                            draftItem.custom_values[
                                column.key
                            ] ?? "",
                            )}
                            onChange={(event) =>
                            updateCustomValue(
                                column.key,
                                event.target.value,
                            )
                            }
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            placeholder={column.label}
                        />
                        )}
                    </div>
                ))}
                </div>

                <button
                type="button"
                onClick={addOrUpdateItem}
                disabled={!canAddOrUpdateItem || saving}
                className="mt-5 min-h-11 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                {editingItemId
                    ? "Update Item"
                    : "+ Add Item"}
                </button>
            </div>

            {/* Added item cards */}
            {items.length > 0 && (
                <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                    Added Items
                    </h3>

                    <span className="text-xs text-slate-500">
                    {items.length}{" "}
                    {items.length === 1
                        ? "item"
                        : "items"}
                    </span>
                </div>

                <div className="space-y-3">
                    {items.map((item, index) => {
                    const lineTotal =
                        item.quantity * item.unit_price;

                    return (
                        <article
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                            <p className="text-xs font-medium text-slate-500">
                                Item {index + 1}
                            </p>

                            <h4 className="mt-1 text-sm font-semibold text-slate-900">
                                {item.item_name}
                            </h4>
                            </div>

                            <div className="flex shrink-0 gap-1">
                            <button
                                type="button"
                                onClick={() =>
                                editItem(item)
                                }
                                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                removeItem(item.id)
                                }
                                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 active:bg-red-100"
                            >
                                Remove
                            </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {invoiceColumns
                            .filter(
                                (column) =>
                                column.key !==
                                "item_name",
                            )
                            .map((column) => {
                                let value:
                                | string
                                | number = "";

                                if (
                                column.source === "core"
                                ) {
                                if (
                                    column.key ===
                                    "quantity"
                                ) {
                                    value = item.quantity;
                                } else if (
                                    column.key ===
                                    "unit_price"
                                ) {
                                    value =
                                    `₹${item.unit_price.toFixed(2)}`;
                                } else if (
                                    column.key ===
                                    "line_total"
                                ) {
                                    value =
                                    `₹${lineTotal.toFixed(2)}`;
                                }
                                } else {
                                const customValue =
                                    item.custom_values[
                                    column.key
                                    ];

                                value =
                                    customValue ===
                                    undefined ||
                                    customValue === null
                                    ? "—"
                                    : String(
                                        customValue,
                                        );
                                }

                                return (
                                <div
                                    key={column.key}
                                    className="rounded-lg bg-slate-50 px-3 py-2"
                                >
                                    <p className="text-[11px] font-medium text-slate-500">
                                    {column.label}
                                    </p>

                                    <p className="mt-0.5 break-words text-xs font-semibold text-slate-800">
                                    {value}
                                    </p>
                                </div>
                                );
                            })}
                        </div>
                        </article>
                    );
                    })}
                </div>
                </div>
            )}
            </section>

            <section className="rounded-xl bg-slate-50 p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex justify-between gap-4 text-sm text-slate-600">
                  <span>Subtotal</span>

                  <span className="font-medium">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold text-slate-900 sm:text-lg">
                  <span>Total</span>

                  <span>
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <button
                type="submit"
                disabled={!canSaveBill}
                className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                {saving
                    ? "Saving..."
                    : "Save Bill"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default BillEditor;