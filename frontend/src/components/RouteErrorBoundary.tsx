import { Component } from "react";
import type { ReactNode } from "react";

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
          <section
            role="alert"
            className="mx-auto max-w-xl rounded-2xl border border-[var(--danger-border)] bg-white p-6 text-center shadow-sm sm:p-8"
          >
            <h1 className="text-xl font-bold text-slate-900">
              This page could not be loaded
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Reload the page to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary mt-5"
            >
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
