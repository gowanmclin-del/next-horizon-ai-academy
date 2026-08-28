"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Something Went Wrong</p>
        <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">We hit an unexpected error</h1>
        <p className="mt-3 text-sm text-slate-600">
          This has been logged. Your account, progress, and any payment already made are unaffected — nothing about
          this error changes data that was already saved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="rounded-md border border-horizon-blue px-6 py-3 text-sm font-semibold text-horizon-blue hover:bg-horizon-blue hover:text-white"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
