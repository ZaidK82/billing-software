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
  Customer,
  SavedBill,
} from "../../lib/api";

type BillItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
};

type BillEditorProps = {
  onCancel: () => void;
  onSaved: (bill: SavedBill) => void;
};

function createItem(): BillItem {
  return {
    id: crypto.randomUUID(),
    item_name: "",
    quantity: 1,
    unit_price: 0,
  };
}

function BillEditor({
  onCancel,
  onSaved,
}: BillEditorProps) {
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

  const [items, setItems] = useState<BillItem[]>([
    createItem(),
  ]);

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

  function updateItem(
    itemId: string,
    field: keyof Omit<BillItem, "id">,
    value: string | number,
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      createItem(),
    ]);
  }

  function removeItem(itemId: string) {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter(
        (item) => item.id !== itemId,
      );
    });
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
          "Every item must have a name.",
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
          items: items.map((item) => ({
            item_name: item.item_name.trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
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
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Items
                </h2>

                <button
                  type="button"
                  onClick={addItem}
                  className="self-start rounded-lg px-2 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 active:bg-blue-100 sm:self-auto"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => {
                  const lineTotal =
                    item.quantity *
                    item.unit_price;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4 sm:p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">
                          Item {index + 1}
                        </p>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                item.id,
                              )
                            }
                            className="rounded-lg px-2 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 active:bg-red-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor={`item-name-${item.id}`}
                            className="mb-1 block text-xs font-medium text-slate-600"
                          >
                            Item Name *
                          </label>

                          <input
                            id={`item-name-${item.id}`}
                            type="text"
                            value={item.item_name}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "item_name",
                                event.target.value,
                              )
                            }
                            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            placeholder="Product or service"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
                          <div>
                            <label
                              htmlFor={`item-quantity-${item.id}`}
                              className="mb-1 block text-xs font-medium text-slate-600"
                            >
                              Quantity
                            </label>

                            <input
                              id={`item-quantity-${item.id}`}
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  "quantity",
                                  Number(
                                    event.target
                                      .value,
                                  ),
                                )
                              }
                              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`item-price-${item.id}`}
                              className="mb-1 block text-xs font-medium text-slate-600"
                            >
                              Unit Price
                            </label>

                            <input
                              id={`item-price-${item.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  "unit_price",
                                  Number(
                                    event.target
                                      .value,
                                  ),
                                )
                              }
                              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="flex min-h-11 items-end">
                            <div className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 lg:min-w-36">
                              <span className="text-xs font-medium text-slate-500 lg:hidden">
                                Line Total
                              </span>

                              <span className="text-sm font-semibold text-slate-900">
                                ₹
                                {lineTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              <div className="rounded-xl bg-blue-50 p-3 text-sm leading-5 text-blue-800">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
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