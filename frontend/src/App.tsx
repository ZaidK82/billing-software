import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import BillEditor from "./components/billing/BillEditor";
import BillPreview from "./components/billing/BillPreview";

import {
  createBusiness,
  getBusinessProfile,
  getCurrentUser,
  getHealth,
  updateBusinessProfile,
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
  const [profileLoading, setProfileLoading] =
    useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [screen, setScreen] = useState<
    "profile" | "bill" | "preview"
  >("profile");

  const [savedBill, setSavedBill] =
    useState<SavedBill | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const healthData = await getHealth();
        setHealth(healthData);

        const session = await getSession();

        if (session?.access_token) {
          const user = await getCurrentUser(
            session.access_token,
          );

          const businessData = await createBusiness(
            session.access_token,
          );

          setCurrentUser({
            ...user,
            business_id: businessData.business_id,
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
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to initialize application.",
        );
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
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to verify authenticated user.",
          );
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
      setScreen("profile");

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

  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!business) {
      return;
    }

    setSavingProfile(true);
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
    } finally {
      setSavingProfile(false);
    }
  }

  if (currentUser && business) {
    if (
      screen === "preview" &&
      savedBill
    ) {
      return (
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
            setScreen("profile");
          }}
        />
      );
    }
    if (screen === "bill") {
      return (
        <BillEditor
          onCancel={() => setScreen("profile")}
          onSaved={(bill) => {
            setSavedBill(bill);
            setMessage(null);
            setScreen("preview");
          }}
        />
      );
    }
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-medium text-blue-600">
                Billing Software
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                Business Profile
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Enter the business details that will
                appear on your invoices.
              </p>
              <button
              type="button"
              onClick={() => setScreen("bill")}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Create Bill
              </button>
            </div>

            <form
              onSubmit={handleProfileSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="business-name"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Business Name *
                </label>

                <input
                  id="business-name"
                  type="text"
                  required
                  value={business.name}
                  onChange={(event) =>
                    setBusiness({
                      ...business,
                      name: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="My Business"
                />
              </div>

              <div>
                <label
                  htmlFor="business-phone"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Phone
                </label>

                <input
                  id="business-phone"
                  type="tel"
                  value={business.phone ?? ""}
                  onChange={(event) =>
                    setBusiness({
                      ...business,
                      phone: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="9876543210"
                />
              </div>

              <div>
                <label
                  htmlFor="business-email"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>

                <input
                  id="business-email"
                  type="email"
                  value={business.email ?? ""}
                  onChange={(event) =>
                    setBusiness({
                      ...business,
                      email: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="business@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="business-address"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Address
                </label>

                <textarea
                  id="business-address"
                  rows={3}
                  value={business.address ?? ""}
                  onChange={(event) =>
                    setBusiness({
                      ...business,
                      address: event.target.value,
                    })
                  }
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Shop / office address"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="business-city"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    City
                  </label>

                  <input
                    id="business-city"
                    type="text"
                    value={business.city ?? ""}
                    onChange={(event) =>
                      setBusiness({
                        ...business,
                        city: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Mumbai"
                  />
                </div>

                <div>
                  <label
                    htmlFor="business-state"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    State
                  </label>

                  <input
                    id="business-state"
                    type="text"
                    value={business.state ?? ""}
                    onChange={(event) =>
                      setBusiness({
                        ...business,
                        state: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Maharashtra"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="business-pincode"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Pincode
                </label>

                <input
                  id="business-pincode"
                  type="text"
                  inputMode="numeric"
                  value={business.pincode ?? ""}
                  onChange={(event) =>
                    setBusiness({
                      ...business,
                      pincode: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="400001"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingProfile
                  ? "Saving..."
                  : "Save Business Profile"}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="mb-4 text-xs text-slate-500">
                Signed in as {currentUser.role}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                {loading
                  ? "Logging out..."
                  : "Log out"}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6">
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
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