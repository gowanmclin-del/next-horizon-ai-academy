"use client";

import { useState } from "react";
import { revokeEnrollment } from "@/lib/actions/admin";

export default function RevokeEnrollmentButton({ enrollmentId }: { enrollmentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) return <span className="text-xs font-semibold text-slate-400">Revoked</span>;

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-red-600 hover:underline"
      >
        Revoke
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={submitting}
        onClick={async () => {
          setSubmitting(true);
          const result = await revokeEnrollment(enrollmentId, "");
          setSubmitting(false);
          if (!result.ok) {
            setError(result.error ?? "Failed");
            return;
          }
          setDone(true);
        }}
        className="text-xs font-semibold text-red-600"
      >
        {submitting ? "…" : "Confirm"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-400">
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
