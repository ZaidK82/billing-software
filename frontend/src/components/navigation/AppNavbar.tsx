
import { useState } from "react";
import { useLocation } from "react-router-dom";

type AppNavbarProps = {
  onDashboard: () => void;
  onProducts: () => void;
  onCreateBill: () => void;
  onBills: () => void;
  onCustomers: () => void;
  onReports: () => void;
  onBusinessProfile: () => void;
  onLogout: () => void;
};

function AppNavbar({
  onDashboard,
  onProducts,
  onCreateBill,
  onBills,
  onCustomers,
  onReports,
  onBusinessProfile,
  onLogout,
}: AppNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  function isActive(path: string): boolean {
    if (path === "/dashboard") {
      return currentPath === "/dashboard" || currentPath === "/";
    }

    if (path === "/bills/new") {
      return currentPath === "/bills/new";
    }

    if (path === "/bills") {
      return (
        currentPath === "/bills" ||
        (
          currentPath !== "/bills/new" &&
          /^\/bills\/[^/]+(?:\/edit)?$/.test(currentPath)
        )
      );
    }

    if (path === "/reports") {
      return currentPath.startsWith("/reports");
    }

    if (path === "/products" || path === "/customers") {
      return (
        currentPath === path ||
        currentPath.startsWith(`${path}/`)
      );
    }

    return currentPath === path;
  }

  function desktopButtonClass(path: string): string {
    return [
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive(path)
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");
  }

  function mobileButtonClass(path: string): string {
    return [
      "flex min-h-11 w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors",
      isActive(path)
        ? "bg-blue-50 text-blue-700"
        : "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
    ].join(" ");
  }

  function closeMenu() {
    setIsOpen(false);
  }

  function handleNavigation(action: () => void) {
    action();
    closeMenu();
  }

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
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => handleNavigation(onDashboard)}
            aria-current={isActive("/dashboard") ? "page" : undefined}
            className={desktopButtonClass("/dashboard")}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onCreateBill)}
            aria-current={isActive("/bills/new") ? "page" : undefined}
            className={desktopButtonClass("/bills/new")}
          >
            Create Bill
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onBills)}
            aria-current={isActive("/bills") ? "page" : undefined}
            className={desktopButtonClass("/bills")}
          >
            Bills
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onCustomers)}
            aria-current={isActive("/customers") ? "page" : undefined}
            className={desktopButtonClass("/customers")}
          >
            Customers
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onReports)}
            aria-current={isActive("/reports") ? "page" : undefined}
            className={desktopButtonClass("/reports")}
          >
            Reports
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onProducts)}
            aria-current={isActive("/products") ? "page" : undefined}
            className={desktopButtonClass("/products")}
          >
            Products
          </button>

          <button
            type="button"
            onClick={() => handleNavigation(onBusinessProfile)}
            aria-current={isActive("/business") ? "page" : undefined}
            className={desktopButtonClass("/business")}
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
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 lg:hidden"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile/tablet navigation */}
      {isOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-100 bg-white lg:hidden"
        >
          <nav
            className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6"
            aria-label="Mobile navigation"
          >
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNavigation(onDashboard)}
                aria-current={isActive("/dashboard") ? "page" : undefined}
                className={mobileButtonClass("/dashboard")}
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onCreateBill)}
                aria-current={isActive("/bills/new") ? "page" : undefined}
                className={mobileButtonClass("/bills/new")}
              >
                Create Bill
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onBills)}
                aria-current={isActive("/bills") ? "page" : undefined}
                className={mobileButtonClass("/bills")}
              >
                Bills
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onCustomers)}
                aria-current={isActive("/customers") ? "page" : undefined}
                className={mobileButtonClass("/customers")}
              >
                Customers
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onReports)}
                aria-current={isActive("/reports") ? "page" : undefined}
                className={mobileButtonClass("/reports")}
              >
                Reports
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onProducts)}
                aria-current={isActive("/products") ? "page" : undefined}
                className={mobileButtonClass("/products")}
              >
                Products
              </button>

              <button
                type="button"
                onClick={() => handleNavigation(onBusinessProfile)}
                aria-current={isActive("/business") ? "page" : undefined}
                className={mobileButtonClass("/business")}
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
