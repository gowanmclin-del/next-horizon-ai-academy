"use client";

import { useState } from "react";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { submitFoundingClassInterest } from "@/lib/actions/marketing";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function FoundingClassPage() {
  const configured = isSupabaseConfigured();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    reason: "",
    experience: "Brand new to AI",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await submitFoundingClassInterest({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      professionalRole: form.role,
      learningReason: form.reason,
      aiExperienceLevel: form.experience,
      website: "", // honeypot — always empty for real users
    });
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
        eyebrow="Founding Class"
        title="Be Part of the Beginning"
        description="The first learners at Next Horizon AI Academy will help establish a learning community built around practical, accessible, and responsible AI education."
      />
      <section className="bg-horizon-cloud py-20 sm:py-28">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold text-horizon-navy">
              What Founding Learners can expect
            </h2>
            <ul className="mt-6 space-y-4 text-lg text-slate-600">
              <li>• Early access to academy enrollment announcements</li>
              <li>• A beginner-friendly AI learning experience</li>
              <li>• A path through the AI-101 foundational curriculum</li>
              <li>• Connection to the developing AI Horizon Network</li>
              <li>• Updates on certification requirements and launch milestones</li>
            </ul>

            <div className="mt-8 rounded-2xl bg-horizon-navy p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-[.2em] text-horizon-gold">
                Enrollment Status
              </p>
              <h2 className="mt-3 text-2xl font-extrabold">Launching Soon</h2>
              <p className="mt-4 leading-relaxed text-slate-200">
                Enrollment infrastructure, learner accounts, and payment
                systems will be connected before registration opens. You can
                already create a free preview account to explore AI-101.
              </p>
              <a
                href="/signup"
                className="mt-7 inline-block rounded-md bg-horizon-gold px-6 py-3 text-sm font-semibold text-horizon-navy"
              >
                Create Preview Account
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <h2 className="text-xl font-extrabold text-horizon-navy">
              Register your interest
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Tell us a bit about yourself so we can shape the Founding Class
              experience.
            </p>

            {!configured && (
              <DevBanner>
                this environment has no Supabase connection, so submissions
                can&rsquo;t be saved here.
              </DevBanner>
            )}

            {submitted ? (
              <p role="status" className="rounded-md border border-horizon-blue/30 bg-horizon-cloud px-4 py-4 text-sm font-semibold text-horizon-navy">
                Thanks, {form.firstName || "there"} — you&rsquo;re on the
                Founding Class interest list.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Honeypot: real users never see or fill this in. */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="text-sm font-semibold text-slate-700">
                      First name
                    </label>
                    <input
                      id="firstName"
                      required
                      value={form.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="text-sm font-semibold text-slate-700">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      required
                      value={form.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
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
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="text-sm font-semibold text-slate-700">
                    Professional role
                  </label>
                  <input
                    id="role"
                    placeholder="e.g. Marketing manager"
                    value={form.role}
                    onChange={(e) => update("role", e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="reason" className="text-sm font-semibold text-slate-700">
                    Primary reason for learning AI
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    value={form.reason}
                    onChange={(e) => update("reason", e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="experience" className="text-sm font-semibold text-slate-700">
                    Experience level with AI
                  </label>
                  <select
                    id="experience"
                    value={form.experience}
                    onChange={(e) => update("experience", e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                  >
                    <option>Brand new to AI</option>
                    <option>Beginner</option>
                    <option>Comfortable with basic AI tools</option>
                    <option>Intermediate</option>
                  </select>
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
                  {submitting ? "Submitting…" : "Register Interest"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
