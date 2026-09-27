import { useState } from "react";

type AppNavbarProps = {
  onDashboard: () => void;
  onCreateBill: () => void;
  onBills: () => void;
  onCustomers: () => void;
  onBusinessProfile: () => void;
  onLogout: () => void;
};

function AppNavbar({
  onDashboard,
  onCreateBill,
  onBills,
  onCustomers,
  onBusinessProfile,
  onLogout,
}: AppNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  function handleNavigation(action: () => void) {
    action();
    closeMenu();
  }

  const desktopButtonClass =
    "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <button
          type="button"
          onClick={() => handleNavigation(onDashboard)}
          className="min-h-10 rounded-lg px-1 text-base font-bold text-slate-900 transition hover:bg-slate-100 active:bg-slate-200 sm:text-lg"
        >
          Billing Software
        </button>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          <button
            type="button"
            onClick={() => handleNavigation(onDashboard)}
            className={desktopButtonClass}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onCreateBill)}
            className={desktopButtonClass}
          >
            Create Bill
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onBills)}
            className={desktopButtonClass}
          >
            Bills
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onCustomers)}
            className={desktopButtonClass}
          >
            Customers
          </button>

          <button
            type="button"
            onClick={() =>
              handleNavigation(onBusinessProfile)
            }
            className={desktopButtonClass}
          >
            Business Profile
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onLogout)}
            className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 active:bg-red-100"
          >
            Logout
          </button>
        </nav>

        {/* Mobile/tablet menu button */}
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-label={
            isOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={isOpen}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 lg:hidden"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile/tablet navigation */}
      {isOpen && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <nav className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNavigation(onDashboard)}
                className="flex min-h-11 w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onCreateBill)}
                className="flex min-h-11 w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
              >
                Create Bill
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onBills)}
                className="flex min-h-11 w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
              >
                Bills
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onCustomers)}
                className="flex min-h-11 w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
              >
                Customers
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation(onBusinessProfile)
                }
                className="flex min-h-11 w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
              >
                Business Profile
              </button>

              <div className="my-2 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => handleNavigation(onLogout)}
                className="flex min-h-11 w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 active:bg-red-100"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default AppNavbar;