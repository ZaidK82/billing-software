```tsx
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

  function handleNavigation(
    action: () => void,
  ) {
    action();
    closeMenu();
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() =>
              handleNavigation(onDashboard)
            }
            className="text-base font-bold text-slate-900"
          >
            Billing Software
          </button>

          <button
            type="button"
            onClick={() =>
              setIsOpen((current) => !current)
            }
            aria-label={
              isOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isOpen}
            className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
          >
            {isOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="sticky top-14 z-40 border-b border-slate-200 bg-white shadow-sm">
          <nav className="mx-auto max-w-2xl px-4 py-3">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() =>
                  handleNavigation(onDashboard)
                }
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation(onCreateBill)
                }
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Create Bill
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation(onBills)
                }
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Bills
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation(onCustomers)
                }
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Customers
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation(onBusinessProfile)
                }
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Business Profile
              </button>

              <div className="my-2 border-t border-slate-100" />

              <button
                type="button"
                onClick={() =>
                  handleNavigation(onLogout)
                }
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

export default AppNavbar;
```
