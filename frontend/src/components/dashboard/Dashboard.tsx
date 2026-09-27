type DashboardProps = {
  onCreateBill: () => void;
  onBills: () => void;
  onCustomers: () => void;
  onBusinessProfile: () => void;
  onLogout: () => void;
};

function Dashboard({
  onCreateBill,
  onBills,
  onCustomers,
  onBusinessProfile,
  onLogout,
}: DashboardProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Billing Software
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your business and invoices.
          </p>
        </header>

        <section className="space-y-4">
          <button
            type="button"
            onClick={onCreateBill}
            className="w-full rounded-2xl bg-blue-600 px-5 py-5 text-left text-white shadow-sm transition active:scale-[0.99]"
          >
            <p className="text-lg font-bold">+ Create Bill</p>
            <p className="mt-1 text-sm text-blue-100">
              Create a new customer invoice.
            </p>
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onBills}
              className="rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-[0.99]"
            >
              <p className="text-base font-bold text-slate-900">
                Bills
              </p>

              <p className="mt-1 text-sm text-slate-500">
                View saved invoices
              </p>
            </button>

            <button
              type="button"
              onClick={onCustomers}
              className="rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-[0.99]"
            >
              <p className="text-base font-bold text-slate-900">
                Customers
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Manage customers
              </p>
            </button>
          </div>

          <button
            type="button"
            onClick={onBusinessProfile}
            className="w-full rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-[0.99]"
          >
            <p className="text-base font-bold text-slate-900">
              Business Profile
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Manage your business details
            </p>
          </button>
        </section>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onLogout}
            className="text-sm font-medium text-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;