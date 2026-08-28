"use client";

import { useState } from "react";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;

    setSubmitting(true);
    const supabase = createClient();
    // Supabase itself returns success regardless of whether the email is
    // registered, so this call — and the message we show below — never
    // reveals account existence either way.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <>
      <PageHero
        eyebrow="Reset Password"
        title="Forgot Your Password?"
        description="Enter your email and, if there's an account, we'll send reset instructions."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            {!configured && (
              <DevBanner>
                this deployment has no Supabase connection configured, so no
                reset email can be sent here.
              </DevBanner>
            )}

            {submitted ? (
              <p role="status" className="text-sm leading-relaxed text-slate-600">
                If an account exists for <strong>{email}</strong>, reset
                instructions are on their way. Check your inbox (and spam
                folder) in a few minutes.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div>
                  <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !configured}
                  className="mt-2 rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send Reset Instructions"}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-slate-500">
              <a href="/login" className="font-semibold text-horizon-blue">
                Back to login
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
