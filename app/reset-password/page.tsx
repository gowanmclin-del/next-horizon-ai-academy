"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ResetPasswordPage() {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(configured);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    let active = true;

    async function establishRecoverySession() {
      const code = new URL(window.location.href).searchParams.get("code");

      if (code) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!active) return;

        if (exchangeError) {
          setError(exchangeError.message);
          setHasRecoverySession(false);
        } else {
          setHasRecoverySession(Boolean(data.session));
          window.history.replaceState({}, "", "/reset-password");
        }
        setCheckingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    void establishRecoverySession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSubmitted(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  return (
    <>
      <PageHero
        eyebrow="Reset Password"
        title="Choose a New Password"
        description="This completes the password reset you started from your email."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            {!configured && (
              <DevBanner>
                this deployment has no Supabase connection configured, so
                passwords can&rsquo;t be updated here.
              </DevBanner>
            )}

            {configured && checkingSession && (
              <p className="text-sm text-slate-500">Checking your reset link…</p>
            )}

            {configured && !checkingSession && !hasRecoverySession && (
              <div role="alert" className="space-y-3 text-sm leading-relaxed text-red-600">
                <p>
                  {error
                    ? `We couldn’t verify this reset link: ${error}`
                    : "This reset link is missing or has expired."}
                </p>
                <p>
                  Request a new link from the{" "}
                  <a href="/forgot-password" className="font-semibold underline">
                    forgot password
                  </a>{" "}
                  page, then open the newest email on the same device and browser.
                </p>
              </div>
            )}

            {configured && hasRecoverySession && !submitted && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div>
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  disabled={submitting}
                  className="mt-2 rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Reset Password"}
                </button>
              </form>
            )}

            {submitted && (
              <p role="status" className="text-sm font-semibold text-horizon-navy">
                Password updated — taking you to your dashboard…
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
