import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getInventoryReport,
  type InventoryReport as InventoryReportData,
} from "../../lib/api";

import { getSession } from "../../lib/auth";


const MOVEMENT_LABELS: Record<string, string> = {
  opening: "Opening",
  adjustment: "Adjustment",
  invoice_deduction: "Invoice Deduction",
  invoice_reversal: "Invoice Reversal",
};


function getISTDateString(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}


function getPreviousDate(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day - days),
  );

  return date.toISOString().slice(0, 10);
}


function formatNumber(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function getStockStatus(quantity: string | number | null) {
  if (quantity === null) {
    return {
      label: "Not initialized",
      className: "bg-slate-100 text-slate-600",
    };
  }

  const numericQuantity = Number(quantity);

  if (numericQuantity === 0) {
    return {
      label: "Out of stock",
      className: "bg-red-100 text-red-700",
    };
  }

  if (numericQuantity < 0) {
    return {
      label: "Negative stock",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "In stock",
    className: "bg-green-100 text-green-700",
  };
}


function formatMovementQuantity(value: string | number) {
  const quantity = Number(value);

  if (quantity > 0) {
    return `+${formatNumber(quantity)}`;
  }

  return formatNumber(quantity);
}


function InventoryReport() {
  const today = getISTDateString();

  const [startDate, setStartDate] = useState(
    getPreviousDate(today, 29),
  );

  const [endDate, setEndDate] = useState(today);

  const [report, setReport] =
    useState<InventoryReportData | null>(null);

  const [movementFilter, setMovementFilter] =
    useState("all");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadReport = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (endDate < startDate) {
      setError("End date cannot be earlier than start date.");
      setReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await getSession();

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const data = await getInventoryReport(
        session.access_token,
        startDate,
        endDate,
      );

      if (requestId === requestIdRef.current) {
        setReport(data);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inventory report.",
        );

        setReport(null);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [startDate, endDate]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        void loadReport();
      }
    });

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
    };
  }, [loadReport]);

  const filteredMovements = useMemo(() => {
    if (!report) {
      return [];
    }

    if (movementFilter === "all") {
      return report.movements;
    }

    return report.movements.filter(
      (movement) =>
        movement.movement_type === movementFilter,
    );
  }, [report, movementFilter]);

  const summaryCards = [
    {
      label: "Tracked Products",
      value: report
        ? formatNumber(report.tracked_product_count)
        : "—",
    },
    {
      label: "Out of Stock",
      value: report
        ? formatNumber(report.out_of_stock_count)
        : "—",
    },
    {
      label: "Recorded Movements",
      value: report
        ? formatNumber(
            report.movement_summary.reduce(
              (total, item) => total + item.movement_count,
              0,
            ),
          )
        : "—",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Inventory Report
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Monitor current stock and review historical inventory movements.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            to="/reports"
            className="inline-flex w-fit items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            View Sales Report
          </Link>
          <Link
            to="/reports/customers"
            className="inline-flex w-fit items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
          View Customer Report
          </Link>
          <Link
            to="/reports/profitability"
            className="inline-flex w-fit items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            View Profitability Report
          </Link>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="inventory-start-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Start date
              </label>
              <input
                id="inventory-start-date"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="inventory-end-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                End date
              </label>
              <input
                id="inventory-end-date"
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Loading..." : "Refresh report"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Movement dates use Asia/Kolkata (IST). Current stock always shows the latest balances.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-slate-200 bg-white p-10 text-center"
          >
            <p className="text-sm text-slate-600">
              Loading inventory report...
            </p>
          </div>
        )}

        {!loading && report && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Current Stock Overview
                </h2>
                <p className="text-sm text-slate-500">
                  Latest stock balances for inventory-tracked products.
                </p>
              </div>

              {report.stock_overview.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No inventory-tracked products found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">Product</th>
                        <th className="px-3 py-3 text-right font-medium">
                          Current Stock
                        </th>
                        <th className="px-3 py-3 font-medium">Unit</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.stock_overview.map((product) => {
                        const status = getStockStatus(
                          product.stock_quantity,
                        );

                        return (
                          <tr
                            key={product.product_id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-3 font-medium text-slate-800">
                              {product.product_name}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {product.stock_quantity === null
                                ? "—"
                                : formatNumber(product.stock_quantity)}
                            </td>

                            <td className="px-3 py-3 text-slate-600">
                              {product.base_unit}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Movement Summary
                </h2>
                <p className="text-sm text-slate-500">
                  Number of recorded inventory movements in the selected period.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {report.movement_summary.map((item) => (
                  <div
                    key={item.movement_type}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="text-sm text-slate-500">
                      {MOVEMENT_LABELS[item.movement_type] ??
                        item.movement_type}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatNumber(item.movement_count)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Movements
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Movement History
                  </h2>
                  <p className="text-sm text-slate-500">
                    Individual stock changes recorded in the selected period.
                  </p>
                </div>

                <div className="w-full sm:w-64">
                  <label
                    htmlFor="inventory-movement-filter"
                    className="mb-1 block text-xs font-medium text-slate-600"
                  >
                    Filter by movement type
                  </label>
                  <select
                    id="inventory-movement-filter"
                    value={movementFilter}
                    onChange={(event) =>
                      setMovementFilter(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="all">All movements</option>
                    {report.movement_summary.map((item) => (
                      <option
                        key={item.movement_type}
                        value={item.movement_type}
                      >
                        {MOVEMENT_LABELS[item.movement_type] ??
                          item.movement_type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredMovements.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No inventory movements found for this filter and date range.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">Date & Time (IST)</th>
                        <th className="px-3 py-3 font-medium">Product</th>
                        <th className="px-3 py-3 font-medium">Movement</th>
                        <th className="px-3 py-3 text-right font-medium">
                          Change
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Stock After
                        </th>
                        <th className="px-3 py-3 font-medium">Reason</th>
                        <th className="px-3 py-3 font-medium">Invoice</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredMovements.map((movement) => (
                        <tr
                          key={movement.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                            {formatDateTime(movement.created_at)}
                          </td>

                          <td className="px-3 py-3 font-medium text-slate-800">
                            {movement.product_name}
                          </td>

                          <td className="px-3 py-3 text-slate-700">
                            {MOVEMENT_LABELS[movement.movement_type] ??
                              movement.movement_type}
                          </td>

                          <td
                            className={`px-3 py-3 text-right font-medium ${
                              Number(movement.quantity_delta) > 0
                                ? "text-green-700"
                                : Number(movement.quantity_delta) < 0
                                  ? "text-red-700"
                                  : "text-slate-700"
                            }`}
                          >
                            {formatMovementQuantity(
                              movement.quantity_delta,
                            )}
                          </td>

                          <td className="px-3 py-3 text-right text-slate-700">
                            {formatNumber(movement.stock_after)}
                          </td>

                          <td className="max-w-64 px-3 py-3 text-slate-600">
                            {movement.reason}
                          </td>

                          <td className="px-3 py-3 text-slate-600">
                            {movement.bill_id
                              ? movement.bill_id.slice(0, 8)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default InventoryReport;
