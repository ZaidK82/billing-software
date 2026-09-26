import { FormEvent, useEffect, useState } from "react";

import {
  createBusiness,
  getCurrentUser,
  getHealth,
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
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] = useState<"login" | "register">(
    "register",
  );

  const [message, setMessage] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

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

          const business = await createBusiness(
            session.access_token,
          );

          setCurrentUser({
            ...user,
            business_id: business.business_id,
            business_name: business.business_name,
            role: business.role,
            business_created: business.created,
          });
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
          return;
        }

        try {
          const user = await getCurrentUser(
            session.access_token,
          );

          const business = await createBusiness(
            session.access_token,
          );

          setCurrentUser({
            ...user,
            business_id: business.business_id,
            business_name: business.business_name,
            role: business.role,
            business_created: business.created,
          });
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "register") {
        const data = await register(email, password);

        if (data.session) {
          const user = await getCurrentUser(
            data.session.access_token,
          );

          const business = await createBusiness(
            data.session.access_token,
          );

          setCurrentUser({
            ...user,
            business_id: business.business_id,
            business_name: business.business_name,
            role: business.role,
            business_created: business.created,
          });

          setMessage("Registration successful.");
        } else {
          setMessage(
            "Registration successful. Check your email to confirm your account, then log in.",
          );
        }
      } else {
        const data = await login(email, password);

        if (!data.session) {
          throw new Error(
            "Login succeeded but no session was returned.",
          );
        }

        const user = await getCurrentUser(
          data.session.access_token,
        );

        const business = await createBusiness(
          data.session.access_token,
        );

        setCurrentUser({
          ...user,
          business_id: business.business_id,
          business_name: business.business_name,
          role: business.role,
          business_created: business.created,
        });

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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-600">
              Billing Software
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {currentUser
                ? "Authentication complete"
                : mode === "register"
                  ? "Create your account"
                  : "Welcome back"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {currentUser
                ? "Your Supabase session is being verified by the FastAPI backend."
                : "Create an account to start using the billing system."}
            </p>
          </div>

          {currentUser ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Authenticated
                </p>

                <div className="mt-3 space-y-1 text-xs text-green-700">
                <p className="break-all">
                  User ID: {currentUser.user_id}
                </p>

                <p>
                  Business: {currentUser.business_name}
                </p>

                <p>
                  Role: {currentUser.role}
                </p>

                <p className="break-all">
                  Business ID: {currentUser.business_id}
                </p>
              </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Logging out..." : "Log out"}
              </button>
            </div>
          ) : (
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
          )}

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