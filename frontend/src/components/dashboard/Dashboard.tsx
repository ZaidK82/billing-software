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
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Billing Software
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage your business and invoices.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={onCreateBill}
            className="w-full rounded-2xl bg-blue-600 px-5 py-5 text-left text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] sm:p-6 lg:col-span-2"
          >
            <p className="text-lg font-bold sm:text-xl">
              + Create Bill
            </p>

            <p className="mt-1 text-sm text-blue-100 sm:text-base">
              Create a new customer invoice.
            </p>
          </button>

          <button
            type="button"
            onClick={onBills}
            className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] sm:p-6"
          >
            <p className="text-base font-bold text-slate-900 sm:text-lg">
              Bills
            </p>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              View saved invoices
            </p>
          </button>

          <button
            type="button"
            onClick={onCustomers}
            className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] sm:p-6"
          >
            <p className="text-base font-bold text-slate-900 sm:text-lg">
              Customers
            </p>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage customers
            </p>
          </button>

          <button
            type="button"
            onClick={onBusinessProfile}
            className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] sm:p-6 lg:col-span-2"
          >
            <p className="text-base font-bold text-slate-900 sm:text-lg">
              Business Profile
            </p>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage your business details
            </p>
          </button>
        </section>

        <div className="mt-8 pb-4 text-center sm:mt-10">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 active:bg-red-100"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;