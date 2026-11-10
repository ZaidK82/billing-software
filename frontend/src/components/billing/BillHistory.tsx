
import { useState } from "react";
import type { BillListItem } from "../../lib/api";

type BillHistoryProps = {
  bills: BillListItem[];
  isLoading: boolean;
  error: string | null;
  onViewBill: (billId: string) => void;
  onEditBill: (billId: string) => void;
  onCreateBill: () => void;
  onRefresh: () => void;
  onDeleteBill: (billId: string) => Promise<void>;
  onBack: () => void;
};

function BillHistory({
  bills,
  isLoading,
  error,
  onViewBill,
  onEditBill,
  onCreateBill,
  onRefresh,
  onDeleteBill,
  onBack,
}: BillHistoryProps) {
  const [deletingBillId, setDeletingBillId] =
    useState<string | null>(null);

  const [deleteError, setDeleteError] =
    useState<string | null>(null);

  async function handleDeleteBill(bill: BillListItem) {
    if (deletingBillId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete invoice ${bill.invoice_number}?\n\n` +
        "This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingBillId(bill.id);
    setDeleteError(null);

    try {
      await onDeleteBill(bill.id);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this invoice. Please try again.",
      );
    } finally {
      setDeletingBillId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">

        {/* Page actions */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-ghost btn-sm self-start"
          >
            ← Dashboard
          </button>

          <button
            type="button"
            onClick={onCreateBill}
            className="btn btn-primary w-full sm:w-auto"
          >
            + Create New Bill
          </button>
        </div>

        {/* Page heading */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              Billing workspace
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Bills & Invoices
              </h1>

              {!isLoading && !error && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {bills.length} {bills.length === 1 ? "invoice" : "invoices"}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-slate-500">
              View, manage and maintain your saved billing records.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="btn btn-secondary btn-sm self-start sm:self-auto"
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {/* Delete error */}
        {deleteError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {deleteError}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              Loading invoices...
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please wait while your billing records are retrieved.
            </p>
          </div>
        )}

        {/* General error */}
        {error && !isLoading && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5"
          >
            <p className="font-semibold text-red-800">
              Unable to load invoices
            </p>
            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-secondary btn-sm mt-3"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && bills.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
              +
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No invoices yet
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Your saved billing records will appear here.
              Create your first invoice to get started.
            </p>

            <button
              type="button"
              onClick={onCreateBill}
              className="btn btn-primary mt-5"
            >
              + Create Your First Bill
            </button>
          </div>
        )}

        {/* Invoice list */}
        {!isLoading && !error && bills.length > 0 && (
          <div className="space-y-3">
            {bills.map((bill) => (
              <article
                key={bill.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* Invoice information */}
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                        IN
                      </div>

                      <div className="min-w-0">
                        <p className="break-all text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                          {bill.invoice_number}
                        </p>

                        <p className="mt-1 truncate text-sm font-medium text-slate-600">
                          {bill.customer_name || "Walk-in Customer"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(
                            bill.created_at,
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Invoice total */}
                    <div className="rounded-xl bg-slate-50 px-4 py-3 sm:min-w-40 sm:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Invoice total
                      </p>

                      <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">
                        ₹
                        {Number(bill.total).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => onViewBill(bill.id)}
                      disabled={deletingBillId !== null}
                      className="btn btn-primary btn-sm"
                    >
                      View Invoice →
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditBill(bill.id)}
                      disabled={deletingBillId !== null}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteBill(bill)}
                      disabled={deletingBillId !== null}
                      className="btn btn-danger btn-sm"
                    >
                      {deletingBillId === bill.id
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

export default BillHistory;
