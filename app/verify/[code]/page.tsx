"use client";

import { use, useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import DevBanner from "@/components/DevBanner";
import { verifyCertificate, type VerificationResult } from "@/lib/data/certificates";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function VerifyResultPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const code = decodeURIComponent(resolvedParams.code);

  useEffect(() => {
    if (!configured) return;
    verifyCertificate(code).then((r) => {
      setResult(r);
      setLoading(false);
    });
  }, [configured, code]);

  return (
    <>
      <PageHero
        eyebrow="Verification Result"
        title="Certificate Lookup"
        description="Public verification for Next Horizon AI Academy credentials."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            {!configured && (
              <DevBanner>
                this environment has no Supabase connection, so certificate
                lookups can&rsquo;t run here.
              </DevBanner>
            )}

            <p className="text-sm text-slate-600">
              Code searched: <span className="font-mono font-semibold text-horizon-navy">{code}</span>
            </p>

            {configured && loading && <p className="mt-4 text-sm text-slate-500">Checking…</p>}

            {configured && !loading && result && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-bold text-emerald-700">
                  {result.status === "valid" ? "Valid credential" : "Credential revoked"}
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm text-slate-700">
                  <div>
                    <dt className="font-semibold text-slate-500">Student</dt>
                    <dd>{result.studentName}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Certification</dt>
                    <dd>{result.certificateName}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Course</dt>
                    <dd>{result.courseTitle}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Certificate number</dt>
                    <dd className="font-mono">{result.certificateNumber}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Issued</dt>
                    <dd>{new Date(result.issuedAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
            )}

            {configured && !loading && !result && (
              <p className="mt-4 text-sm text-slate-600">
                No certificate was found for this verification code.
              </p>
            )}

            <a href="/verify" className="mt-6 inline-block text-sm font-semibold text-horizon-blue">
              ← Try another code
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
