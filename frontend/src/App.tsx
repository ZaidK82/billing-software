import { useEffect, useState } from "react";

import { getHealth } from "./lib/api";

type ApiHealth = {
  status: string;
  service: string;
  version: string;
};

function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkApi() {
      try {
        const data = await getHealth();
        setHealth(data);
      } catch {
        setError("Unable to connect to the backend API.");
      }
    }

    checkApi();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-600">
              Billing Software
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Project Foundation
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              React frontend is connected to the FastAPI backend.
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm font-medium text-slate-800">
              Backend Status
            </p>

            {health && (
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  Status:{" "}
                  <span className="font-medium text-green-600">
                    {health.status}
                  </span>
                </p>

                <p>Service: {health.service}</p>
                <p>Version: {health.version}</p>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            {!health && !error && (
              <p className="mt-3 text-sm text-slate-500">
                Connecting to backend...
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;