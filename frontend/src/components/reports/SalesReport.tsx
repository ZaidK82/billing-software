import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";

import {
  getSalesReport,
  type SalesReport as SalesReportData,
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


function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  return `${day}-${month}-${year}`;
}


function SalesReport() {
  const today = getISTDateString();

  const [startDate, setStartDate] = useState(
    getPreviousDate(today, 29),
  );

  const [endDate, setEndDate] = useState(today);

  const [report, setReport] =
    useState<SalesReportData | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (endDate < startDate) {
      setError("End date cannot be earlier than start date.");
      setReport(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const data = await getSalesReport(
        session.access_token,
        startDate,
        endDate,
      );

      setReport(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sales report.",
      );

      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const summaryCards = [
    {
      label: "Total Sales",
      value: report
        ? formatCurrency(report.sales_total)
        : "—",
    },
    {
      label: "Invoices",
      value: report
        ? formatNumber(report.invoice_count)
        : "—",
    },
    {
      label: "Average Invoice Value",
      value: report
        ? formatCurrency(report.average_invoice_value)
        : "—",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        <div>
        <h1 className="text-2xl font-bold text-slate-900">
            Sales Report
        </h1>
        <p className="mt-1 text-sm text-slate-600">
            Understand your sales performance and
            best-selling products.
        </p>

        <Link
            to="/reports/inventory"
            className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
            View Inventory Report
        </Link>

        <Link
            to="/reports/customers"
            className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
            View Customer Report
        </Link>
        <Link
            to="/reports/profitability"
            className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
            View Profitability Report
        </Link>
        </div>

        {/* Date filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">

            <div>
              <label
                htmlFor="sales-start-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Start date
              </label>

              <input
                id="sales-start-date"
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
                htmlFor="sales-end-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                End date
              </label>

              <input
                id="sales-end-date"
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
              Loading sales report...
            </p>
          </div>
        )}

        {/* Report content */}
        {!loading && report && (
          <>
            {/* Summary cards */}
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

            {/* Sales trend */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Daily Sales
                </h2>

                <p className="text-sm text-slate-500">
                  Sales and invoice count by IST calendar date.
                </p>
              </div>

              {report.trend.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No trend data available.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">
                          Date
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Invoices
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Sales
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.trend.map((item) => (
                        <tr
                          key={item.date}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-3 py-3 text-slate-700">
                            {formatDate(item.date)}
                          </td>

                          <td className="px-3 py-3 text-right text-slate-700">
                            {formatNumber(item.invoice_count)}
                          </td>

                          <td className="px-3 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(item.sales_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Product ranking */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Product Sales
                </h2>

                <p className="text-sm text-slate-500">
                  Products ranked by sales value.
                </p>
              </div>

              {report.products.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No catalogue-linked product sales found
                  for this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">
                          Product
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Quantity
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Invoices
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Sales
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.products.map((product, index) => (
                        <tr
                          key={`${product.product_id}-${product.base_unit_name ?? "unknown"}`}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400">
                                {index + 1}.
                              </span>

                              <span className="font-medium text-slate-800">
                                {product.item_name}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-right text-slate-700">
                            {product.quantity === null
                              ? "Unknown"
                              : `${formatNumber(product.quantity)} ${product.base_unit_name ?? ""}`}
                          </td>

                          <td className="px-3 py-3 text-right text-slate-700">
                            {formatNumber(product.invoice_count)}
                          </td>

                          <td className="px-3 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(product.sales_total)}
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

        {/* Empty state */}
        {!loading && !error && report &&
          report.invoice_count === 0 && (
            <p className="text-center text-sm text-slate-500">
              No saved invoices were found in this date range.
            </p>
          )}

      </div>
    </main>
  );
}

export default SalesReport;