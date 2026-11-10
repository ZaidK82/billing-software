
import type {
  BillListItem,
  BusinessProfile,
  Customer,
  Product,
} from "../../lib/api";

type DashboardProps = {
  business: BusinessProfile | null;
  bills: BillListItem[];
  customers: Customer[];
  products: Product[];

  isBillsLoading: boolean;
  isCustomersLoading: boolean;
  isProductsLoading: boolean;

  billsError: string | null;
  customersError: string | null;
  productsError: string | null;

  onCreateBill: () => void;
  onBills: () => void;
  onCustomers: () => void;
  onProducts: () => void;
  onReports: () => void;
  onBusinessProfile: () => void;

  onRetryBills: () => void;
  onRetryCustomers: () => void;
  onRetryProducts: () => void;

  onLogout: () => void;
};

function Dashboard({
  business,
  bills,
  customers,
  products,
  isBillsLoading,
  isCustomersLoading,
  isProductsLoading,
  billsError,
  customersError,
  productsError,
  onCreateBill,
  onBills,
  onCustomers,
  onProducts,
  onReports,
  onBusinessProfile,
  onRetryBills,
  onRetryCustomers,
  onRetryProducts,
  onLogout,
}: DashboardProps) {
  const recentBills = [...bills]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const formatCurrency = (value: number) =>
    Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const statCards = [
    {
      title: "Bills & invoices",
      count: bills.length,
      loading: isBillsLoading,
      error: billsError,
      description: "Saved billing records",
      icon: "B",
      accent: "blue",
      onClick: onBills,
      onRetry: onRetryBills,
    },
    {
      title: "Customers",
      count: customers.length,
      loading: isCustomersLoading,
      error: customersError,
      description: "Customer records",
      icon: "C",
      accent: "neutral",
      onClick: onCustomers,
      onRetry: onRetryCustomers,
    },
    {
      title: "Products",
      count: products.length,
      loading: isProductsLoading,
      error: productsError,
      description: "Products in catalogue",
      icon: "P",
      accent: "navy",
      onClick: onProducts,
      onRetry: onRetryProducts,
    },
  ];

  const quickActions = [
    {
      title: "Customers",
      description: "Manage customer records",
      onClick: onCustomers,
      icon: "C",
    },
    {
      title: "Products",
      description: "Manage your catalogue",
      onClick: onProducts,
      icon: "P",
    },
    {
      title: "Reports",
      description: "Review business reports",
      onClick: onReports,
      icon: "R",
    },
    {
      title: "Business profile",
      description: "Update business details",
      onClick: onBusinessProfile,
      icon: "B",
    },
  ];

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">

        {/* Welcome */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Business overview
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              {business?.name || "Your business"} · Here's an overview of your workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onBusinessProfile}
            className="btn btn-secondary w-fit"
          >
            <span aria-hidden="true">⚙</span>
            Business profile
          </button>
        </header>

        {/* Main action */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-slate-900 shadow-sm">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"
          />

          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-200">
                  Billing workspace
                </p>
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Ready to create an invoice?
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                Create a bill, add customer and product details, and manage your billing records.
              </p>
            </div>

            <button
              type="button"
              onClick={onCreateBill}
              className="btn btn-primary btn-lg shrink-0"
            >
              Create new bill
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        {/* Business snapshot */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Business snapshot
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your current records at a glance.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statCards.map((card) => (
              <article
                key={card.title}
                className="ui-card min-w-0 p-5 sm:p-6"
              >
                <button
                  type="button"
                  onClick={card.onClick}
                  aria-busy={card.loading}
                  className="group w-full rounded-lg text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-600">
                      {card.title}
                    </span>

                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        card.accent === "blue"
                          ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {card.icon}
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                    {card.loading
                      ? "..."
                      : card.error
                        ? "—"
                        : card.count.toLocaleString("en-IN")}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {card.loading
                        ? "Loading records..."
                        : card.error
                          ? "Unable to load records"
                          : card.description}
                    </span>

                    <span
                      aria-hidden="true"
                      className="text-sm font-semibold text-blue-600 transition group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </button>

                {card.error && !card.loading && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs leading-5 text-red-600">
                      {card.error}
                    </p>

                    <button
                      type="button"
                      onClick={card.onRetry}
                      className="btn btn-secondary btn-sm mt-2"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Recent bills */}
        <section className="ui-card">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Recent invoices
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your latest saved billing records.
              </p>
            </div>

            <button
              type="button"
              onClick={onBills}
              className="btn btn-ghost btn-sm w-fit"
            >
              View all bills →
            </button>
          </div>

          {isBillsLoading ? (
            <div
              role="status"
              className="px-6 py-12 text-center"
            >
              <p className="text-sm font-medium text-slate-700">
                Loading recent invoices...
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Please wait while your billing records are retrieved.
              </p>
            </div>
          ) : billsError ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-red-600">
                Unable to load recent invoices
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {billsError}
              </p>

              <button
                type="button"
                onClick={onRetryBills}
                className="btn btn-secondary btn-sm mt-4"
              >
                Retry loading
              </button>
            </div>
          ) : recentBills.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
                B
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No invoices yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your saved invoices will appear here.
              </p>

              <button
                type="button"
                onClick={onCreateBill}
                className="btn btn-primary mt-4"
              >
                Create your first bill
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBills.map((bill, index) => (
                <div
                  key={bill.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {bill.invoice_number}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {bill.customer_name || "Customer not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pl-12 sm:justify-end sm:pl-0">
                    <span className="text-xs text-slate-500">
                      {formatDate(bill.created_at)}
                    </span>

                    <span className="whitespace-nowrap rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold tabular-nums text-slate-900">
                      {formatCurrency(Number(bill.total))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Quick access
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Jump directly to the tools you need.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                type="button"
                onClick={action.onClick}
                className="ui-card ui-card-interactive group flex min-h-[88px] items-center justify-between gap-3 p-4 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 transition group-hover:bg-blue-100 group-hover:text-blue-700">
                    {action.icon}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {action.title}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {action.description}
                    </span>
                  </span>
                </span>

                <span
                  className="shrink-0 text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="flex justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-ghost btn-sm"
          >
            Log out
          </button>
        </footer>
      </div>
    </main>
  );
}

export default Dashboard;
