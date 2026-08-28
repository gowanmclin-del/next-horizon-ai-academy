"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { track } from "@/lib/analytics";

function SignupPageContent() {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("Brand new to AI");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

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
    if (!configured) {
      setError("This deployment isn't connected to Supabase yet, so accounts can't be created here.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          professional_role: role,
          ai_experience_level: experience,
        },
      },
    });
    setSubmitting(false);

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("already registered")) {
        setError("An account with this email already exists. Try logging in instead.");
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // If email confirmation is required, Supabase returns a user but no
    // active session yet — don't claim the person is logged in.
    if (data.user && !data.session) {
      setNeedsEmailConfirmation(true);
      return;
    }

    track("signup_completed");
    router.push(redirectTo);
  }

  return (
    <>
      <PageHero
        eyebrow="Create Account"
        title="Start Your AI Learning Journey"
        description="Create a Next Horizon AI Academy account to track your progress through AI-101 and work toward the CAFP credential."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            {!configured && (
              <DevBanner>
                this deployment has no Supabase connection configured, so
                account creation is disabled here. See the README for setup
                steps.
              </DevBanner>
            )}

            {needsEmailConfirmation ? (
              <p role="status" className="rounded-md border border-horizon-blue/30 bg-horizon-cloud px-4 py-4 text-sm leading-relaxed text-horizon-navy">
                Almost there — check <strong>{email}</strong> for a
                confirmation link to finish creating your account.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="text-sm font-semibold text-slate-700">
                      First name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="text-sm font-semibold text-slate-700">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                    />
                  </div>
                </div>

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
                  <label htmlFor="role" className="text-sm font-semibold text-slate-700">
                    Professional role
                  </label>
                  <input
                    id="role"
                    type="text"
                    placeholder="e.g. Small business owner"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="experience" className="text-sm font-semibold text-slate-700">
                    AI experience level
                  </label>
                  <select
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  >
                    <option>Brand new to AI</option>
                    <option>Beginner</option>
                    <option>Comfortable with basic AI tools</option>
                    <option>Intermediate</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Password
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
                    Confirm password
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
                  disabled={submitting || !configured}
                  className="mt-2 rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Creating account…" : "Create Account"}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <a href="/login" className="font-semibold text-horizon-blue">
                Log in
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-horizon-cloud" aria-busy="true" />}>
      <SignupPageContent />
    </Suspense>
  );
}
