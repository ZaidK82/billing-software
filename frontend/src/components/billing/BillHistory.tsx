import type { BillListItem } from "../../lib/api";

type BillHistoryProps = {
  bills: BillListItem[];
  isLoading: boolean;
  error: string | null;
  onViewBill: (billId: string) => void;
  onCreateBill: () => void;
  onBack: () => void;
};

function BillHistory({
  bills,
  isLoading,
  error,
  onViewBill,
  onCreateBill,
  onBack,
}: BillHistoryProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-blue-600"
          >
            ← Dashboard
          </button>

          <button
            type="button"
            onClick={onCreateBill}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            New Bill
          </button>
        </div>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">
            Bills
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View your saved invoices.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Loading bills...
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && bills.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-medium text-slate-900">
              No bills yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create your first bill to see it here.
            </p>

            <button
              type="button"
              onClick={onCreateBill}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
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
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
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

                  <p className="shrink-0 text-base font-bold text-slate-900">
                    ₹{Number(bill.total).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => onViewBill(bill.id)}
                    className="text-sm font-semibold text-blue-600"
                  >
                    View Bill →
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
