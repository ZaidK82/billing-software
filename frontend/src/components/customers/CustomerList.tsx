
import type { Customer } from "../../lib/api";

type CustomerListProps = {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onRefresh: () => void;
  onBack: () => void;
};

function CustomerList({
  customers,
  isLoading,
  error,
  onAddCustomer,
  onEditCustomer,
  onRefresh,
  onBack,
}: CustomerListProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">

        {/* Navigation and primary action */}
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
            onClick={onAddCustomer}
            className="btn btn-primary w-full sm:w-auto"
          >
            + Add Customer
          </button>
        </div>

        {/* Page heading */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Customer management
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Customers
              </h1>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {customers.length} {customers.length === 1 ? "customer" : "customers"}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Manage your saved customer details and contact information.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="btn btn-secondary w-full sm:w-auto"
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </section>

        {/* Loading state */}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
          >
            <p className="text-sm font-medium text-slate-700">
              Loading customers...
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Please wait while your customer records are retrieved.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            <p className="font-semibold">
              Unable to load customers
            </p>
            <p className="mt-1 leading-5">
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
        {!isLoading && !error && customers.length === 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-700">
              C
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              No customers yet
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Add your first customer to save their contact details and reuse them when creating invoices.
            </p>

            <button
              type="button"
              onClick={onAddCustomer}
              className="btn btn-primary mt-5"
            >
              + Add First Customer
            </button>
          </section>
        )}

        {/* Customer list */}
        {!isLoading && !error && customers.length > 0 && (
          <section className="space-y-3">
            {customers.map((customer) => (
              <article
                key={customer.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                      {customer.name.trim().charAt(0).toUpperCase() || "C"}
                    </div>

                    <div className="min-w-0">
                      <h2 className="break-words text-base font-bold tracking-tight text-slate-900">
                        {customer.name}
                      </h2>

                      {customer.phone && (
                        <p className="mt-1 break-words text-sm text-slate-600">
                          {customer.phone}
                        </p>
                      )}

                      {customer.email && (
                        <p className="mt-1 break-all text-sm text-slate-500">
                          {customer.email}
                        </p>
                      )}

                      {customer.address && (
                        <p className="mt-2 whitespace-pre-line break-words text-sm leading-5 text-slate-500">
                          {customer.address}
                        </p>
                      )}

                      {!customer.phone && !customer.email && !customer.address && (
                        <p className="mt-1 text-xs text-slate-400">
                          No additional contact details
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full justify-end border-t border-slate-100 pt-3 sm:w-auto sm:shrink-0 sm:border-0 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => onEditCustomer(customer)}
                      className="btn btn-secondary w-full sm:w-auto"
                    >
                      Edit Customer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default CustomerList;
