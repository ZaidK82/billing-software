import {
  useEffect,
  useState,
} from "react";

import type { FormEvent } from "react";

import Dashboard from "./components/dashboard/Dashboard";
import BillEditor from "./components/billing/BillEditor";
import BillPreview from "./components/billing/BillPreview";
import BillHistory from "./components/billing/BillHistory";
import CustomerList from "./components/customers/CustomerList";
import CustomerForm from "./components/customers/CustomerForm";
import AppNavbar from "./components/navigation/AppNavbar";
import BusinessProfilePage from "./components/business/BusinessProfile";

import {
  createBusiness,
  createCustomer,
  getBill,
  getBills,
  getBusinessProfile,
  getCurrentUser,
  getCustomers,
  getHealth,
  updateBusinessProfile,
  updateCustomer,
  type BillListItem,
  type BusinessProfile,
  type Customer,
  type SavedBill,
} from "./lib/api";

import {
  getSession,
  login,
  logout,
  register,
} from "./lib/auth";

import { supabase } from "./lib/supabase";

type ApiHealth = {
  status: string;
  service: string;
  version: string;
  database_configured: boolean;
};

type CurrentUser = {
  user_id: string;
  business_id: string;
  business_name: string;
  role: string;
  business_created: boolean;
};

function App() {
  const [health, setHealth] =
    useState<ApiHealth | null>(null);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [business, setBusiness] =
    useState<BusinessProfile | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] =
    useState<"login" | "register">("register");

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [authInitializing, setAuthInitializing] =
    useState(true);

  const [screen, setScreen] = useState<
    | "dashboard"
    | "profile"
    | "bill"
    | "history"
    | "customers"
    | "customer-form"
    | "preview"
  >("dashboard");

  const [savedBill, setSavedBill] =
    useState<SavedBill | null>(null);

  const [bills, setBills] =
    useState<BillListItem[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [isCustomersLoading, setIsCustomersLoading] =
    useState(false);

  const [customersError, setCustomersError] =
    useState<string | null>(null);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [isCustomerSaving, setIsCustomerSaving] =
    useState(false);

  const [customerSaveError, setCustomerSaveError] =
    useState<string | null>(null);

  const [isBillsLoading, setIsBillsLoading] =
    useState(false);

  const [billsError, setBillsError] =
    useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const healthData = await getHealth();
        setHealth(healthData);

        const session = await getSession();

        if (!session?.access_token) {
          setCurrentUser(null);
          setBusiness(null);
          return;
        }

        const user = await getCurrentUser(
          session.access_token,
        );

        const businessData =
          await createBusiness(
            session.access_token,
          );

        setCurrentUser({
          ...user,
          business_id:
            businessData.business_id,
          business_name:
            businessData.business_name,
          role: businessData.role,
          business_created:
            businessData.created,
        });

        const profile =
          await getBusinessProfile(
            session.access_token,
          );

        setBusiness(profile);
        setScreen("dashboard");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to initialize application.",
        );
      } finally {
        setAuthInitializing(false);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.access_token) {
          setCurrentUser(null);
          setBusiness(null);
          setScreen("dashboard");
          setAuthInitializing(false);
          return;
        }

        try {
          const user = await getCurrentUser(
            session.access_token,
          );

          const businessData =
            await createBusiness(
              session.access_token,
            );

          setCurrentUser({
            ...user,
            business_id:
              businessData.business_id,
            business_name:
              businessData.business_name,
            role: businessData.role,
            business_created:
              businessData.created,
          });

          const profile =
            await getBusinessProfile(
              session.access_token,
            );

          setBusiness(profile);
          setScreen("dashboard");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to verify authenticated user.",
          );
        } finally {
          setAuthInitializing(false);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "register") {
        const data = await register(
          email,
          password,
        );

        if (data.session) {
          const user = await getCurrentUser(
            data.session.access_token,
          );

          const businessData =
            await createBusiness(
              data.session.access_token,
            );

          setCurrentUser({
            ...user,
            business_id:
              businessData.business_id,
            business_name:
              businessData.business_name,
            role: businessData.role,
            business_created:
              businessData.created,
          });

          const profile =
            await getBusinessProfile(
              data.session.access_token,
            );

          setBusiness(profile);
          setScreen("dashboard");

          setMessage(
            "Registration successful.",
          );
        } else {
          setMessage(
            "Registration successful. Check your email to confirm your account, then log in.",
          );
        }
      } else {
        const data = await login(
          email,
          password,
        );

        if (!data.session) {
          throw new Error(
            "Login succeeded but no session was returned.",
          );
        }

        const user = await getCurrentUser(
          data.session.access_token,
        );

        const businessData =
          await createBusiness(
            data.session.access_token,
          );

        setCurrentUser({
          ...user,
          business_id:
            businessData.business_id,
          business_name:
            businessData.business_name,
          role: businessData.role,
          business_created:
            businessData.created,
        });

        const profile =
          await getBusinessProfile(
            data.session.access_token,
          );

        setBusiness(profile);
        setScreen("dashboard");

        setMessage("Login successful.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await logout();

      setCurrentUser(null);
      setBusiness(null);
      setSavedBill(null);
      setEditingCustomer(null);
      setScreen("dashboard");

      setMessage("Logged out successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log out.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadBills() {
    setIsBillsLoading(true);
    setBillsError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const savedBills = await getBills(
        session.access_token,
      );

      setBills(savedBills);
    } catch (error) {
      setBillsError(
        error instanceof Error
          ? error.message
          : "Unable to load bills.",
      );
    } finally {
      setIsBillsLoading(false);
    }
  }

  async function loadCustomers() {
    setIsCustomersLoading(true);
    setCustomersError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const savedCustomers =
        await getCustomers(
          session.access_token,
        );

      setCustomers(savedCustomers);
    } catch (error) {
      setCustomersError(
        error instanceof Error
          ? error.message
          : "Unable to load customers.",
      );
    } finally {
      setIsCustomersLoading(false);
    }
  }

  async function handleCreateCustomer(
    customer: {
      name: string;
      phone: string;
      email: string;
      address: string;
    },
  ) {
    setIsCustomerSaving(true);
    setCustomerSaveError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      await createCustomer(
        session.access_token,
        {
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          address: customer.address || null,
        },
      );

      await loadCustomers();

      setScreen("customers");
    } catch (error) {
      setCustomerSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save customer.",
      );
    } finally {
      setIsCustomerSaving(false);
    }
  }

  async function handleUpdateCustomer(
    customer: {
      name: string;
      phone: string;
      email: string;
      address: string;
    },
  ) {
    if (!editingCustomer) {
      return;
    }

    setIsCustomerSaving(true);
    setCustomerSaveError(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      await updateCustomer(
        session.access_token,
        editingCustomer.id,
        {
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          address: customer.address || null,
        },
      );

      setEditingCustomer(null);

      await loadCustomers();

      setScreen("customers");
    } catch (error) {
      setCustomerSaveError(
        error instanceof Error
          ? error.message
          : "Unable to update customer.",
      );
    } finally {
      setIsCustomerSaving(false);
    }
  }

  if (authInitializing) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="flex min-h-[90vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              Loading Billing Software...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (currentUser && business) {
    const navigation = (
      <AppNavbar
        onDashboard={() => {
          setScreen("dashboard");
        }}
        onCreateBill={() => {
          setScreen("bill");
        }}
        onBills={() => {
          setScreen("history");
          void loadBills();
        }}
        onCustomers={() => {
          setScreen("customers");
          void loadCustomers();
        }}
        onBusinessProfile={() => {
          setScreen("profile");
        }}
        onLogout={handleLogout}
      />
    );
    if (screen === "dashboard") {
      return (
        <>
          {navigation}

          <Dashboard
            onCreateBill={() => {
              setScreen("bill");
            }}
            onBills={() => {
              setScreen("history");
              void loadBills();
            }}
            onCustomers={() => {
              setScreen("customers");
              void loadCustomers();
            }}
            onBusinessProfile={() => {
              setScreen("profile");
            }}
            onLogout={handleLogout}
          />
        </>
      );
    }

    if (screen === "history") {
      return (
        <>
          {navigation}

          <BillHistory
          bills={bills}
          isLoading={isBillsLoading}
          error={billsError}
          onViewBill={async (billId) => {
            try {
              const session = await getSession();

              if (!session?.access_token) {
                throw new Error(
                  "Your session has expired. Please log in again.",
                );
              }

              const bill = await getBill(
                session.access_token,
                billId,
              );

              setSavedBill(bill);
              setBillsError(null);
              setScreen("preview");
            } catch (error) {
              setBillsError(
                error instanceof Error
                  ? error.message
                  : "Unable to load the bill.",
              );
            }
          }}
          onCreateBill={() => {
            setScreen("bill");
          }}
          onBack={() => {
            setScreen("dashboard");
          }}
        />
        </>
      );
    }

    if (screen === "customer-form") {
      return (
      <>
      {navigation}
        <CustomerForm
          customer={
            editingCustomer
              ? {
                  name: editingCustomer.name,
                  phone:
                    editingCustomer.phone ?? "",
                  email:
                    editingCustomer.email ?? "",
                  address:
                    editingCustomer.address ?? "",
                }
              : undefined
          }
          isSaving={isCustomerSaving}
          error={customerSaveError}
          onSubmit={
            editingCustomer
              ? handleUpdateCustomer
              : handleCreateCustomer
          }
          onCancel={() => {
            setCustomerSaveError(null);
            setEditingCustomer(null);
            setScreen("customers");
          }}
        />
      </>
      );
    }

    if (screen === "customers") {
      return (
      <>
      {navigation}
        <CustomerList
          customers={customers}
          isLoading={isCustomersLoading}
          error={customersError}
          onAddCustomer={() => {
            setCustomerSaveError(null);
            setEditingCustomer(null);
            setScreen("customer-form");
          }}
          onEditCustomer={(customer) => {
            setCustomerSaveError(null);
            setEditingCustomer(customer);
            setScreen("customer-form");
          }}
          onBack={() => {
            setScreen("dashboard");
          }}
        />
      </>
      );
    }

    if (
      screen === "preview" &&
      savedBill
    ) {
      return (
      <>
      {navigation}
        <BillPreview
          bill={savedBill}
          businessName={business.name}
          businessPhone={business.phone}
          businessEmail={business.email}
          businessAddress={business.address}
          businessCity={business.city}
          businessState={business.state}
          businessPincode={business.pincode}
          onCreateNew={() => {
            setSavedBill(null);
            setScreen("bill");
          }}
          onBack={() => {
            setSavedBill(null);
            setScreen("dashboard");
          }}
          onBackToBills={() => {
            setScreen("history");
            void loadBills();
          }}
        />
      </>
      );
    }

    if (screen === "bill") {
      return (
      <>
      {navigation}
        <BillEditor
          business={business}
          onCancel={() => {
            setScreen("dashboard");
          }}
          onSaved={(bill) => {
            setSavedBill(bill);
            setMessage(null);
            setScreen("preview");
          }}
        />
      </>
      );
    }

    return (
      <>
        {navigation}

        <BusinessProfilePage
          business={business}
          currentUserRole={currentUser.role}
          saving={false}
          loading={loading}
          message={message}
          error={error}
          onBusinessChange={setBusiness}
          onSubmit={async (event) => {
            event.preventDefault();

            setError(null);
            setMessage(null);

            try {
              const session = await getSession();

              if (!session?.access_token) {
                throw new Error(
                  "Your session has expired. Please log in again.",
                );
              }

              const updated =
                await updateBusinessProfile(
                  session.access_token,
                  {
                    name: business.name,
                    phone: business.phone,
                    email: business.email,
                    address: business.address,
                    city: business.city,
                    state: business.state,
                    pincode: business.pincode,
                    gstin: business.gstin,
                    udyam_number: business.udyam_number,
                    logo_path: business.logo_path,
                    signature_path: business.signature_path,
                    terms_and_conditions:
                      business.terms_and_conditions,
                    invoice_columns: business.invoice_columns,
                  },
                );

              setBusiness(updated);

              setCurrentUser((previous) =>
                previous
                  ? {
                      ...previous,
                      business_name: updated.name,
                    }
                  : previous,
              );

              setMessage(
                "Business profile saved successfully.",
              );
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to save business profile.",
              );
            }
          }}
          onBack={() => {
            setScreen("dashboard");
          }}
          onBills={() => {
            setScreen("history");
            void loadBills();
          }}
          onCreateBill={() => {
            setScreen("bill");
          }}
          onCustomers={() => {
            setScreen("customers");
            void loadCustomers();
          }}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 sm:mb-8">
            <p className="text-sm font-medium text-blue-600">
              Billing Software
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {mode === "register"
                ? "Create your account"
                : "Welcome back"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {mode === "register"
                ? "Create an account to start using the billing system."
                : "Log in to continue to your business."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "register"
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "register"
                  ? "Create account"
                  : "Log in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(
                  mode === "register"
                    ? "login"
                    : "register",
                );

                setError(null);
                setMessage(null);
              }}
              className="w-full py-2 text-sm font-medium text-blue-600"
            >
              {mode === "register"
                ? "Already have an account? Log in"
                : "Need an account? Register"}
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {health && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                API: {health.status} · Database:{" "}
                {health.database_configured
                  ? "connected"
                  : "not configured"}
              </p>
            </div>
          )}
        </section>
      </div>
      </main>
    );
  }
export default App;