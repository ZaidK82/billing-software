import type { Customer } from "../../lib/api";

type CustomerListProps = {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onBack: () => void;
};

function CustomerList({
  customers,
  isLoading,
  error,
  onAddCustomer,
  onEditCustomer,
  onBack,
}: CustomerListProps) {
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
            onClick={onAddCustomer}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + Add Customer
          </button>
        </div>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">
            Customers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your saved customers.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Loading customers...
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && customers.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-medium text-slate-900">
              No customers yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add your first customer to get started.
            </p>

            <button
              type="button"
              onClick={onAddCustomer}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Add Customer
            </button>
          </div>
        )}

        {!isLoading && !error && customers.length > 0 && (
          <div className="space-y-3">
            {customers.map((customer) => (
              <article
                key={customer.id}
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">
                      {customer.name}
                    </h2>

                    {customer.phone && (
                      <p className="mt-1 text-sm text-slate-600">
                        {customer.phone}
                      </p>
                    )}

                    {customer.email && (
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {customer.email}
                      </p>
                    )}

                    {customer.address && (
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
                        {customer.address}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditCustomer(customer)}
                    className="shrink-0 text-sm font-semibold text-blue-600"
                  >
                    Edit
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

export default CustomerList;