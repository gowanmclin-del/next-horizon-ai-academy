"use client";

import { useState } from "react";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { submitLaunchSubscriber } from "@/lib/actions/marketing";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LaunchUpdatesPage() {
  const configured = isSupabaseConfigured();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await submitLaunchSubscriber({ firstName, email, website: "" });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <>
      <PageHero
        eyebrow="Launch Updates"
        title="Follow the Academy as We Prepare to Open"
        description="Get academy news, practical AI tips, course announcements, and launch updates."
      />
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-horizon-cloud p-7 sm:p-9">
            {!configured && (
              <DevBanner>
                this environment has no Supabase connection, so signups
                can&rsquo;t be saved here. No live email is sent regardless
                — see <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env.example</code>{" "}
                for the Resend variables needed for that.
              </DevBanner>
            )}

            {submitted ? (
              <p role="status" className="rounded-md border border-horizon-blue/30 bg-white px-4 py-4 text-sm font-semibold text-horizon-navy">
                Thanks{firstName ? `, ${firstName}` : ""} — you&rsquo;re on
                the list.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Honeypot: real users never see or fill this in. */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />
                <div>
                  <label htmlFor="firstName" className="text-sm font-semibold text-slate-700">
                    First name
                  </label>
                  <input
                    id="firstName"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  />
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
                {error && (
                  <p role="alert" className="text-sm font-semibold text-red-600">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting || !configured}
                  className="rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Joining…" : "Join the List"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
