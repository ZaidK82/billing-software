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
            onClick={onAddCustomer}
            className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 sm:w-auto"
          >
            + Add Customer
          </button>
        </div>

        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Customers
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage your saved customers.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm sm:p-8">
            Loading customers...
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:p-5">
            {error}
          </div>
        )}

        {!isLoading && !error && customers.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="font-medium text-slate-900">
              No customers yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add your first customer to get started.
            </p>

            <button
              type="button"
              onClick={onAddCustomer}
              className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 sm:w-auto"
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
                className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold text-slate-900 sm:text-base">
                      {customer.name}
                    </h2>

                    {customer.phone && (
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {customer.phone}
                      </p>
                    )}

                    {customer.email && (
                      <p className="mt-1 break-words text-sm text-slate-500">
                        {customer.email}
                      </p>
                    )}

                    {customer.address && (
                      <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-500">
                        {customer.address}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditCustomer(customer)}
                    className="min-h-10 self-start rounded-lg px-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 active:bg-blue-100 sm:shrink-0"
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