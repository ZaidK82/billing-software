import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getCustomerReport,
  type CustomerReport as CustomerReportData,
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
    maximumFractionDigits: 2,
  }).format(Number(value));
}


function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}


function getCustomerStatus(
  invoiceCount: number,
  hasEverPurchased: boolean,
) {
  if (invoiceCount > 0) {
    return {
      label: "Active",
      className: "bg-green-100 text-green-700",
    };
  }

  if (hasEverPurchased) {
    return {
      label: "Previously purchased",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Never purchased",
    className: "bg-slate-100 text-slate-600",
  };
}


function CustomerReport() {
  const today = getISTDateString();

  const [startDate, setStartDate] = useState(
    getPreviousDate(today, 29),
  );

  const [endDate, setEndDate] = useState(today);

  const [report, setReport] =
    useState<CustomerReportData | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [customerFilter, setCustomerFilter] =
    useState("all");

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

      const data = await getCustomerReport(
        session.access_token,
        startDate,
        endDate,
      );

      setReport(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customer report.",
      );

      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const filteredCustomers = (report?.customers ?? []).filter(
    (customer) => {
      if (customerFilter === "all") {
        return true;
      }

      if (customerFilter === "active") {
        return customer.invoice_count > 0;
      }

      if (customerFilter === "previously_purchased") {
        return (
          customer.invoice_count === 0 &&
          customer.has_ever_purchased
        );
      }

      if (customerFilter === "never_purchased") {
        return !customer.has_ever_purchased;
      }

      if (customerFilter === "new") {
        return customer.is_new_customer;
      }
      if (customerFilter === "first_time_buyers") {
        return customer.is_first_time_buyer;
      }

      return true;
    },
  );

  const summaryCards = [
    {
      label: "Total Customers",
      value: report
        ? formatNumber(report.total_customer_count)
        : "—",
    },
    {
      label: "New Customers",
      value: report
        ? formatNumber(report.new_customer_count)
        : "—",
    },
    {
      label: "First-Time Buyers",
      value: report
          ? formatNumber(report.first_time_buyer_count)
          : "—",
    },
    {
      label: "Active Customers",
      value: report
        ? formatNumber(report.active_customer_count)
        : "—",
    },
    {
      label: "Never Purchased",
      value: report
        ? formatNumber(report.never_purchased_count)
        : "—",
    },
    {
      label: "Previously Purchased",
      value: report
        ? formatNumber(
            report.previously_purchased_inactive_count,
          )
        : "—",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Customer Insights
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Understand customer activity, purchasing behaviour,
            and customer value.
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
              to="/reports/profitability"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Profitability Report
            </Link>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="customer-start-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Start date
              </label>

              <input
                id="customer-start-date"
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
                htmlFor="customer-end-date"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                End date
              </label>

              <input
                id="customer-end-date"
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
              {loading ? "Loading..." : "Refresh report"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Customer creation and invoice dates use Asia/Kolkata (IST).
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
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-600">
              Loading customer insights...
            </p>
          </div>
        )}

        {!loading && report && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Customer Purchase Ranking
                  </h2>

                  <p className="text-sm text-slate-500">
                    Customers ranked by purchase value in the selected period.
                  </p>
                </div>

                <div className="w-full sm:w-64">
                  <label
                    htmlFor="customer-filter"
                    className="mb-1 block text-xs font-medium text-slate-600"
                  >
                    Filter customers
                  </label>

                  <select
                    id="customer-filter"
                    value={customerFilter}
                    onChange={(event) =>
                      setCustomerFilter(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="all">All customers</option>
                    <option value="active">Active customers</option>
                    <option value="new">New customers</option>
                    <option value="first_time_buyers">First-time buyers</option>
                    <option value="previously_purchased">
                      Previously purchased
                    </option>
                    <option value="never_purchased">
                      Never purchased
                    </option>
                  </select>
                </div>
              </div>

              {filteredCustomers.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No customers found for this filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">
                          Customer
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Phone
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Status
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Invoices
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Purchase Total
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Average Invoice
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCustomers.map((customer, index) => {
                        const status = getCustomerStatus(
                          customer.invoice_count,
                          customer.has_ever_purchased,
                        );

                        return (
                          <tr
                            key={customer.customer_id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400">
                                  {index + 1}.
                                </span>

                                <div>
                                  <p className="font-medium text-slate-800">
                                    {customer.customer_name}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    Joined {formatDate(
                                      customer.created_at.slice(0, 10),
                                    )}
                                    {customer.is_new_customer && (
                                      <span className="ml-2 font-medium text-blue-600">
                                        New
                                      </span>
                                    )}
                                    {customer.is_first_time_buyer && (
                                    <span className="ml-2 font-medium text-emerald-600">
                                        First purchase
                                    </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3 text-slate-600">
                              {customer.phone || "—"}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {formatNumber(customer.invoice_count)}
                            </td>

                            <td className="px-3 py-3 text-right font-medium text-slate-900">
                              {formatCurrency(customer.purchase_total)}
                            </td>

                            <td className="px-3 py-3 text-right text-slate-700">
                              {formatCurrency(
                                customer.average_invoice_value,
                              )}
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
      </div>
    </main>
  );
}

export default CustomerReport;