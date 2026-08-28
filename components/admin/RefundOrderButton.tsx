"use client";

import { useEffect, useRef, useState } from "react";
import { refundOrder } from "@/lib/actions/admin";
import { formatPrice } from "@/lib/pricing";
import StatusMessage from "@/components/StatusMessage";

export default function RefundOrderButton({
  orderId,
  studentEmail,
  courseTitle,
  amountCents,
  currency,
  stripeReference,
}: {
  orderId: string;
  studentEmail: string;
  courseTitle: string;
  amountCents: number;
  currency: string;
  stripeReference: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [revoke, setRevoke] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Read inside the keydown handler via a ref, not a dependency, so the
  // effect below only truly re-runs on open/close (correct mount/unmount
  // focus semantics) while still always seeing the current value —
  // adding `submitting` directly to the effect's dependency array would
  // make its cleanup re-fire on every submitting change, prematurely
  // returning focus to the trigger button the moment a refund starts.
  const submittingRef = useRef(submitting);
  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  // Phase 17 accessibility fix: this was a plain overlay <div> with no
  // dialog semantics, no Escape-to-close, no focus trap, and no focus
  // management on open/close — a keyboard user could tab straight past it
  // into the page behind it, and had no keyboard way to dismiss it. This
  // effect adds all four: moves focus into the dialog when it opens,
  // returns focus to the trigger button when it closes, closes on
  // Escape, and traps Tab/Shift+Tab cycling within the dialog's own
  // focusable elements while it's open.
  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Matches the Cancel button's own disabled={submitting} guard —
        // Escape shouldn't be able to dismiss the dialog mid-request
        // either. The refund request itself isn't cancelable once
        // started; closing the dialog visually while it's still in
        // flight would just be confusing, not actually stop anything.
        if (submittingRef.current) return;
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  async function handleConfirm() {
    setSubmitting(true);
    setMessage(null);
    const result = await refundOrder(orderId, revoke, note);
    setSubmitting(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error ?? "Something went wrong." });
      return;
    }
    setMessage({
      tone: "success",
      text: `Refund complete.${result.enrollmentRevoked ? " Enrollment revoked." : " Enrollment left active."}`,
    });
    setDone(true);
  }

  if (done) {
    return <StatusMessage tone="success">Refunded</StatusMessage>;
  }

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Refund
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-dialog-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="refund-dialog-title" className="text-lg font-bold text-horizon-navy">
          Confirm Refund
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Student</dt>
            <dd className="font-semibold text-slate-800">{studentEmail}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Course</dt>
            <dd className="font-semibold text-slate-800">{courseTitle}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Amount</dt>
            <dd className="font-semibold text-slate-800">{formatPrice(amountCents, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Current status</dt>
            <dd className="font-semibold text-slate-800">Paid</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Stripe reference</dt>
            <dd className="font-mono text-xs text-slate-500">{stripeReference ?? "—"}</dd>
          </div>
        </dl>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-slate-700">Course access</legend>
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input type="radio" name="revoke" checked={!revoke} onChange={() => setRevoke(false)} className="mt-1" />
            <span>
              <span className="block font-semibold text-slate-800">Refund only</span>
              <span className="block text-xs text-slate-500">Student keeps access to the course.</span>
            </span>
          </label>
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input type="radio" name="revoke" checked={revoke} onChange={() => setRevoke(true)} className="mt-1" />
            <span>
              <span className="block font-semibold text-slate-800">Refund + revoke course access</span>
              <span className="block text-xs text-slate-500">Enrollment status becomes &quot;Revoked&quot;.</span>
            </span>
          </label>
        </fieldset>

        <div className="mt-4">
          <label htmlFor="refund-note" className="text-sm font-semibold text-slate-700">
            Internal note (optional)
          </label>
          <textarea
            id="refund-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>

        {message && (
          <div className="mt-4">
            <StatusMessage tone={message.tone}>{message.text}</StatusMessage>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? "Processing…" : "Confirm Refund"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
