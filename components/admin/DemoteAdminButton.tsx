"use client";

import { useState } from "react";
import { demoteAdmin } from "@/lib/actions/admin";
import StatusMessage from "@/components/StatusMessage";

export default function DemoteAdminButton({
  adminId,
  adminName,
  isLastAdmin,
}: {
  adminId: string;
  adminName: string;
  isLastAdmin: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs font-semibold text-slate-400">Demoted</span>;

  if (isLastAdmin) {
    return (
      <span className="text-xs text-slate-400" title="The database will not allow demoting the last remaining administrator">
        Last admin — cannot demote
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-red-600 hover:underline"
      >
        Demote
      </button>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3">
      <p className="text-xs text-red-700">
        Demoting {adminName} removes their access to the academy administration area.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            setMessage(null);
            const result = await demoteAdmin(adminId);
            setSubmitting(false);
            if (!result.ok) {
              setMessage({ tone: "error", text: result.error ?? "Failed" });
              return;
            }
            setDone(true);
          }}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? "Demoting…" : "Confirm Demotion"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
        >
          Cancel
        </button>
      </div>
      {message && (
        <div className="mt-2">
          <StatusMessage tone={message.tone}>{message.text}</StatusMessage>
        </div>
      )}
    </div>
  );
}
