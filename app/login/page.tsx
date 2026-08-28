"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function LoginPageContent() {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!configured) {
      setError("This deployment isn't connected to Supabase yet, so login can't work here.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (signInError) {
      // Generic message — don't reveal whether the email exists or the
      // password was wrong, to avoid account-enumeration signals.
      setError("Incorrect email or password.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <PageHero
        eyebrow="Student Login"
        title="Welcome Back"
        description="Log in to continue your AI-101 progress and track your path toward the CAFP credential."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            {!configured && (
              <DevBanner>
                this deployment has no Supabase connection configured, so
                login is disabled here. See the README for setup steps.
              </DevBanner>
            )}

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

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <a href="/forgot-password" className="text-xs font-semibold text-horizon-blue">
                    Forgot password?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !configured}
                className="mt-2 rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Logging in…" : "Log In"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              New to the academy?{" "}
              <a href="/signup" className="font-semibold text-horizon-blue">
                Create an account
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-horizon-cloud" aria-busy="true" />}>
      <LoginPageContent />
    </Suspense>
  );
}
