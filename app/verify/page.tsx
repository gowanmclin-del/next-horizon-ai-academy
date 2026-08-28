"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function VerifyPage() {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) router.push(`/verify/${encodeURIComponent(code.trim())}`);
  }

  return (
    <>
      <PageHero
        eyebrow="Verify a Certificate"
        title="CAFP Certificate Verification"
        description="Look up a Certified AI Foundations Professional certificate using its verification code."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            {!configured && (
              <DevBanner>
                this environment has no Supabase connection, so no real
                certificates exist to look up yet.
              </DevBanner>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div>
                <label htmlFor="code" className="text-sm font-semibold text-slate-700">
                  Verification code
                </label>
                <input
                  id="code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 9F3A1B2C4D5E6F70"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
              >
                Verify
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
