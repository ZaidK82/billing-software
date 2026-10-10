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
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-10 self-start rounded-lg px-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 active:bg-blue-100"
          >
            ← Dashboard
          </button>

          <button
            type="button"
            onClick={onCreateBill}
            className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 sm:w-auto"
          >
            New Bill
          </button>
        </div>

        {deleteError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {deleteError}
          </div>
        )}

        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Bills
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              View your saved invoices.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="min-h-10 self-start rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm sm:p-8">
            Loading bills...
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:p-5">
            {error}
          </div>
        )}

        {!isLoading && !error && bills.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="font-medium text-slate-900">
              No bills yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create your first bill to see it here.
            </p>

            <button
              type="button"
              onClick={onCreateBill}
              className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 sm:w-auto"
            >
              Create Bill
            </button>
          </div>
        )}

        {!isLoading && !error && bills.length > 0 && (
          <div className="space-y-3">
            {bills.map((bill) => (
              <article
                key={bill.id}
                className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-slate-900 sm:text-base">
                      {bill.invoice_number}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-600">
                      {bill.customer_name || "Walk-in Customer"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(
                        bill.created_at,
                      ).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <p className="text-lg font-bold text-slate-900 sm:shrink-0 sm:text-right">
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

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => onViewBill(bill.id)}
                    disabled={deletingBillId !== null}
                    className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 active:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    View Bill →
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditBill(bill.id)}
                    disabled={deletingBillId !== null}
                    className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteBill(bill)}
                    disabled={deletingBillId !== null}
                    className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingBillId === bill.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
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