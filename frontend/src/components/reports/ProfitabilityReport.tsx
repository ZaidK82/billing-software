
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getProfitabilityReport,
  type ProfitabilityReport as ProfitabilityReportData,
} from "../../lib/api";

import { getSession } from "../../lib/auth";


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


function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}


function formatNumber(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value));
}

function getProfitabilityStatus(status: string) {
  if (status === "complete") {
    return {
      label: "Complete",
      className: "bg-green-100 text-green-700",
    };
  }

  if (status === "partial") {
    return {
      label: "Partial",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Unavailable",
    className: "bg-red-100 text-red-700",
  };
}


function ProfitabilityReport() {
  const today = getISTDateString();

  const [startDate, setStartDate] = useState(
    getPreviousDate(today, 29),
  );

  const [endDate, setEndDate] = useState(today);

  const [report, setReport] =
    useState<ProfitabilityReportData | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const [statusFilter, setStatusFilter] = useState("all");

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

      const data = await getProfitabilityReport(
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
            : "Unable to load profitability report.",
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
    void loadReport();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadReport]);

  const filteredProducts = (report?.products ?? []).filter(
    (product) => {
      if (statusFilter === "all") {
        return true;
      }

      return product.profitability_status === statusFilter;
    },
  );

  const summaryCards = [
    {
      label: "Products Analysed",
      value: report
        ? formatNumber(report.total_product_count)
        : "—",
    },
    {
      label: "Complete Cost Data",
      value: report
        ? formatNumber(report.complete_cost_product_count)
        : "—",
    },
    {
      label: "Partial Cost Data",
      value: report
        ? formatNumber(report.partial_cost_product_count)
        : "—",
    },
    {
      label: "Cost Unavailable",
      value: report
        ? formatNumber(report.unavailable_cost_product_count)
        : "—",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Product Profitability
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Understand estimated product-level gross profit
            using historical purchase-price snapshots.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/reports"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Sales Report
            </Link>

            <Link
              to="/reports/inventory"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Inventory Report
            </Link>

            <Link
              to="/reports/customers"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Customer Report
            </Link>
          </div>
        </div>

        {/* Date filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">

            <div>
              <label
                htmlFor="profitability-start-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Start date
              </label>

              <input
                id="profitability-start-date"
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
                htmlFor="profitability-end-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                End date
              </label>

              <input
                id="profitability-end-date"
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
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Apply filters"}
            </button>

          </div>

          <p className="mt-3 text-xs text-slate-500">
            Reporting dates use Asia/Kolkata (IST).
          </p>
        </section>

        {/* Accounting limitation */}
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            Estimated profitability — not accounting profit
          </h2>

          <p className="mt-1 text-sm text-amber-800">
            Calculations use historical purchase-price snapshots.
            Partial results include only invoice lines with known
            costs. This report does not implement FIFO or
            weighted-average inventory costing.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-600">
              Loading profitability report...
            </p>
          </div>
        )}

        {/* Report content */}
        {!loading && report && (
          <>
            {/* Summary cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            {/* Product profitability */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Product Profitability
                  </h2>

                  <p className="text-sm text-slate-500">
                    Ranked by estimated gross profit on known-cost
                    invoice lines.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="profitability-status-filter"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Cost data status
                  </label>

                  <select
                    id="profitability-status-filter"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-52"
                  >
                    <option value="all">All products</option>
                    <option value="complete">Complete</option>
                    <option value="partial">Partial</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  {report.products.length === 0
                    ? "No catalogue-linked product sales found for this period."
                    : "No products match the selected cost-data status."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">
                          Product
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Quantity
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Revenue
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Cost-covered revenue
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Known estimated cost
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Estimated gross profit
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Margin
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Cost coverage
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map((product, index) => {
                        const status = getProfitabilityStatus(
                          product.profitability_status,
                        );

                        return (
                          <tr
                            key={product.product_id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-3">
                              <div className="font-medium text-slate-800">
                                {index + 1}. {product.product_name}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {formatNumber(product.invoice_count)} invoices
                                {" · "}
                                {formatNumber(product.line_count)} lines
                              </div>

                              {product.missing_cost_line_count > 0 && (
                                <div className="mt-1 text-xs text-amber-700">
                                  {formatNumber(
                                    product.missing_cost_line_count,
                                  )}{" "}
                                  lines missing cost
                                  {" · "}
                                  {formatCurrency(
                                    product.missing_cost_revenue,
                                  )}{" "}
                                  revenue affected
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {product.quantity_sold === null
                                ? "Unknown"
                                : `${formatNumber(product.quantity_sold)} ${product.base_unit_name ?? ""}`}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-900">
                              {formatCurrency(product.revenue)}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {formatCurrency(
                                product.known_cost_revenue,
                              )}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {formatCurrency(
                                product.known_estimated_cost,
                              )}
                            </td>

                            <td className="px-3 py-3 text-right font-semibold text-slate-900">
                            {product.estimated_gross_profit === null
                                ? "—"
                                : formatCurrency(product.estimated_gross_profit)}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {product.estimated_gross_margin === null
                                ? "—"
                                : `${formatNumber(product.estimated_gross_margin)}%`}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {product.cost_coverage_percentage === null
                                ? "—"
                                : `${formatNumber(product.cost_coverage_percentage)}%`}
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
          </>
        )}

        {/* Empty state */}
        {!loading && !error && report &&
          report.total_product_count === 0 && (
            <p className="text-center text-sm text-slate-500">
              No catalogue-linked product sales were found in this date range.
            </p>
          )}

      </div>
    </main>
  );
}

export default ProfitabilityReport;
