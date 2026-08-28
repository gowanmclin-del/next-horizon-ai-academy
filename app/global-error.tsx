"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";

// Next.js only renders this if an error occurs in the root layout itself
// (rare — most errors are caught by app/error.tsx instead). It must
// render its own <html>/<body>, since the root layout that would normally
// provide them is exactly what failed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest, extra: { boundary: "global" } });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ maxWidth: 420, margin: "80px auto", textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", textTransform: "uppercase" }}>
            Something Went Wrong
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginTop: 12 }}>
            Next Horizon AI Academy is temporarily unavailable
          </h1>
          <p style={{ fontSize: 14, color: "#475569", marginTop: 12 }}>
            This has been logged. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              borderRadius: 6,
              backgroundColor: "#2563EB",
              color: "#fff",
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
