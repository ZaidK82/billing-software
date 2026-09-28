import { useState } from "react";

import type { BusinessProfile, InvoiceColumn } from "../../lib/api";

type InvoiceColumnManagerProps = {
  business: BusinessProfile;
  onBusinessChange: (business: BusinessProfile) => void;
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

const CORE_SOURCES = [
  {
    key: "item_name",
    label: "Product Description",
    type: "text",
  },
  {
    key: "quantity",
    label: "Quantity",
    type: "number",
  },
  {
    key: "unit_price",
    label: "Rate",
    type: "number",
  },
  {
    key: "line_total",
    label: "Amount",
    type: "number",
  },
];

function createCustomKey(label: string, existingColumns: InvoiceColumn[]) {
  const baseKey =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "custom_column";

  let key = baseKey;
  let counter = 2;

  while (existingColumns.some((column) => column.key === key)) {
    key = `${baseKey}_${counter}`;
    counter += 1;
  }

  return key;
}

function InvoiceColumnManager({
  business,
  onBusinessChange,
}: InvoiceColumnManagerProps) {
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnType, setNewColumnType] =
    useState("text");

  const columns =
    business.invoice_columns.length > 0
      ? [...business.invoice_columns].sort(
          (a, b) => a.position - b.position,
        )
      : DEFAULT_COLUMNS;

  function updateColumns(nextColumns: InvoiceColumn[]) {
    onBusinessChange({
      ...business,
      invoice_columns: nextColumns.map(
        (column, index) => ({
          ...column,
          position: index + 1,
        }),
      ),
    });
  }

  function updateColumn(
    key: string,
    changes: Partial<InvoiceColumn>,
  ) {
    updateColumns(
      columns.map((column) =>
        column.key === key
          ? {
              ...column,
              ...changes,
            }
          : column,
      ),
    );
  }

  function removeColumn(key: string) {
    const column = columns.find(
      (item) => item.key === key,
    );

    if (column?.required) {
      return;
    }

    updateColumns(
      columns.filter((column) => column.key !== key),
    );
  }

  function moveColumn(
    index: number,
    direction: "up" | "down",
  ) {
    const newIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      newIndex < 0 ||
      newIndex >= columns.length
    ) {
      return;
    }

    const nextColumns = [...columns];
    const [movedColumn] = nextColumns.splice(index, 1);

    nextColumns.splice(newIndex, 0, movedColumn);

    updateColumns(nextColumns);
  }

  function handleSourceChange(
    column: InvoiceColumn,
    value: string,
  ) {
    if (value === "custom") {
      updateColumn(column.key, {
        source: "custom",
        type:
          column.type === "number"
            ? "number"
            : "text",
      });

      return;
    }

    const coreSource = CORE_SOURCES.find(
      (source) => source.key === value,
    );

    if (!coreSource) {
      return;
    }

    const alreadyUsed = columns.some(
      (item) =>
        item.key === coreSource.key &&
        item.key !== column.key,
    );

    if (alreadyUsed) {
      return;
    }

    updateColumn(column.key, {
      key: coreSource.key,
      label: coreSource.label,
      type: coreSource.type,
      source: "core",
      required:
        coreSource.key === "item_name" ||
        coreSource.key === "quantity" ||
        coreSource.key === "unit_price" ||
        coreSource.key === "line_total",
    });
  }

  function addColumn() {
    const label = newColumnLabel.trim();

    if (!label) {
      return;
    }

    const key = createCustomKey(
      label,
      columns,
    );

    updateColumns([
      ...columns,
      {
        key,
        label,
        type: newColumnType,
        source: "custom",
        position: columns.length + 1,
        required: false,
      },
    ]);

    setNewColumnLabel("");
    setNewColumnType("text");
    setShowAddColumn(false);
  }

  function resetToDefault() {
    updateColumns(
      DEFAULT_COLUMNS.map((column) => ({
        ...column,
      })),
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Invoice Columns
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Choose the columns that will appear in the
          item table on your invoices. Custom columns
          are stored with each bill.
        </p>
      </div>

      <div className="space-y-3">
        {columns.map((column, index) => (
          <div
            key={column.key}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    moveColumn(index, "up")
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Move ${column.label} up`}
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={
                    index === columns.length - 1
                  }
                  onClick={() =>
                    moveColumn(index, "down")
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Move ${column.label} down`}
                >
                  ↓
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Column Name
                    </label>

                    <input
                      type="text"
                      value={column.label}
                      disabled={column.source === "core"}
                      onChange={(event) =>
                        updateColumn(column.key, {
                          label: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Data Source
                    </label>

                    <select
                      value={
                        column.source === "core"
                          ? column.key
                          : "custom"
                      }
                      onChange={(event) =>
                        handleSourceChange(
                          column,
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {CORE_SOURCES.map(
                        (source) => (
                          <option
                            key={source.key}
                            value={source.key}
                            disabled={columns.some(
                              (item) =>
                                item.key ===
                                  source.key &&
                                item.key !==
                                  column.key,
                            )}
                          >
                            {source.label}
                          </option>
                        ),
                      )}

                      <option value="custom">
                        Custom Field
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={column.required}
                      disabled={
                        column.source === "core"
                      }
                      onChange={(event) =>
                        updateColumn(column.key, {
                          required:
                            event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />

                    Required
                  </label>

                  <span className="text-xs text-slate-400">
                    Type: {column.type}
                  </span>

                  <span className="text-xs text-slate-400">
                    {column.source === "core"
                      ? "Core billing field"
                      : "Custom field"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={column.required}
                onClick={() =>
                  removeColumn(column.key)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Remove ${column.label}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddColumn ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Add Custom Column
          </h3>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-invoice-column-name"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Column Name
              </label>

              <input
                id="new-invoice-column-name"
                type="text"
                value={newColumnLabel}
                onChange={(event) =>
                  setNewColumnLabel(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Batch Number"
              />
            </div>

            <div>
              <label
                htmlFor="new-invoice-column-type"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Data Type
              </label>

              <select
                id="new-invoice-column-type"
                value={newColumnType}
                onChange={(event) =>
                  setNewColumnType(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={addColumn}
              disabled={!newColumnLabel.trim()}
              className="min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Column
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAddColumn(false);
                setNewColumnLabel("");
              }}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddColumn(true)}
          className="mt-4 min-h-11 w-full rounded-xl border border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
        >
          + Add Custom Column
        </button>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Changes are saved when you click
          <span className="font-medium">
            {" "}
            Save Business Profile
          </span>
          .
        </p>

        <button
          type="button"
          onClick={resetToDefault}
          className="text-left text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 sm:text-right"
        >
          Reset to default columns
        </button>
      </div>
    </section>
  );
}

export default InvoiceColumnManager;