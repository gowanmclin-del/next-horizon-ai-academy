"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type PollStatus = "checking" | "paid" | "pending" | "failed" | "not_found";

// Polling interval and max attempts: gives the webhook up to ~20 seconds
// to finish processing before telling the student something looks stuck.
// Well within a typical Stripe webhook delivery time, but not indefinite.
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10;

function PurchaseSuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<PollStatus>("checking");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured() || !sessionId) {
      setStatus("not_found");
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function poll() {
      // RLS ("orders: read own") means this can only ever return an order
      // that belongs to the signed-in student — reading it here is safe
      // even though the session id came from a URL the student controls.
      // This NEVER writes anything; it only reads the server-authoritative
      // status that the webhook (and only the webhook) can set.
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();

      if (cancelled) return;

      if (!data) {
        setStatus("not_found");
        return;
      }
      if (data.status === "paid") {
        setStatus("paid");
        return;
      }
      if (data.status === "failed" || data.status === "canceled") {
        setStatus("failed");
        return;
      }

      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          setStatus("pending");
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
        return next;
      });
    }

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {status === "checking" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-horizon-blue">Confirming Payment</p>
            <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">Checking with Stripe…</h1>
            <p className="mt-3 text-sm text-slate-600">This usually takes just a moment.</p>
          </>
        )}

        {status === "paid" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Payment Confirmed</p>
            <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">You&rsquo;re Enrolled</h1>
            <p className="mt-3 text-sm text-slate-600">
              Your enrollment has been confirmed by our server — not just by
              this page. Head to your dashboard to start learning.
            </p>
            <a
              href="/dashboard"
              className="mt-6 inline-block rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
            >
              Go to Dashboard
            </a>
          </>
        )}

        {status === "pending" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-horizon-gold">Still Processing</p>
            <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">Almost there</h1>
            <p className="mt-3 text-sm text-slate-600">
              Stripe is still confirming your payment. This page does not
              grant access on its own — refresh in a minute, or check your
              dashboard shortly. If this persists, contact support with
              your confirmation email.
            </p>
            <a href="/dashboard" className="mt-6 inline-block rounded-md border border-horizon-blue px-6 py-3 text-sm font-semibold text-horizon-blue hover:bg-horizon-blue hover:text-white">
              Check Dashboard
            </a>
          </>
        )}

        {status === "failed" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Payment Not Completed</p>
            <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-600">Your payment wasn&rsquo;t completed. You haven&rsquo;t been charged.</p>
            <a href="/courses/ai-101" className="mt-6 inline-block rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy">
              Back to Course
            </a>
          </>
        )}

        {status === "not_found" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">No Session Found</p>
            <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">We couldn&rsquo;t find that checkout</h1>
            <p className="mt-3 text-sm text-slate-600">
              If you completed a payment, check your dashboard — otherwise, return to the course page to try again.
            </p>
            <a href="/dashboard" className="mt-6 inline-block rounded-md border border-horizon-blue px-6 py-3 text-sm font-semibold text-horizon-blue hover:bg-horizon-blue hover:text-white">
              Go to Dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-horizon-cloud" aria-busy="true" />}>
      <PurchaseSuccessPageContent />
    </Suspense>
  );
}
