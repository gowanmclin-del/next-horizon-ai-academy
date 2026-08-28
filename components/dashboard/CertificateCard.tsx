"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { MyEnrolledCourse } from "@/lib/data/progress";
import { getCompletedLessonSlugs, computePercentComplete } from "@/lib/data/progress";
import { hasPassedAssessment } from "@/lib/data/assessment";
import { getMyCertificate, issueCertificateIfEligible } from "@/lib/data/certificates";
import { triggerCertificateEmailIfNeeded } from "@/lib/actions/email";
import { track } from "@/lib/analytics";

type Status = "locked" | "in_progress" | "eligible" | "issued";

const META: Record<Status, { label: string; tone: string }> = {
  locked: { label: "Locked", tone: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress", tone: "bg-horizon-blue/10 text-horizon-blue" },
  eligible: { label: "Eligible", tone: "bg-horizon-gold/20 text-horizon-navy" },
  issued: { label: "Issued", tone: "bg-emerald-100 text-emerald-700" },
};

export default function CertificateCard({ item }: { item: MyEnrolledCourse }) {
  const { course } = item;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("locked");
  const [percent, setPercent] = useState(0);
  const [cert, setCert] = useState<{ certificateNumber: string; verificationCode: string; issuedAt: string } | null>(
    null
  );
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const existing = await getMyCertificate(course.id);
      if (existing) {
        setCert(existing);
        setStatus("issued");
        // Passive retry — see lib/actions/email.ts; safe to call on every visit.
        triggerCertificateEmailIfNeeded(course.id).catch(() => {});
      } else {
        const completedSlugs = await getCompletedLessonSlugs(course);
        const pct = computePercentComplete(course, completedSlugs);
        setPercent(pct);
        if (pct === 100 && course.assessment.id) {
          const passed = await hasPassedAssessment(course.assessment.id);
          setStatus(passed ? "eligible" : "in_progress");
        } else {
          setStatus(pct > 0 ? "in_progress" : "locked");
        }
      }
    } catch {
      // Phase 18 fix: this sequential fetch chain had no error handling
      // at all — a genuine failure (network error, etc.) previously left
      // this card stuck on "Loading…" forever with no feedback.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  async function handleIssue() {
    setIssuing(true);
    setIssueError(null);
    const result = await issueCertificateIfEligible(course.id);
    setIssuing(false);
    if (!result.ok) {
      setIssueError(result.error);
      return;
    }
    setCert(result.certificate);
    setStatus("issued");
    track("certificate_issued", { courseId: course.id, courseSlug: course.slug });
    triggerCertificateEmailIfNeeded(course.id).catch(() => {});
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-red-600">
        Couldn&rsquo;t load certificate status for {course.title} right now. Try refreshing the page.
      </div>
    );
  }

  const meta = META[status];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{course.title}</p>
          <h2 className="text-xl font-extrabold text-horizon-navy">{course.certificationName}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Awarded for completing {course.title} and passing the final assessment. This is an academy-issued
        credential, not a government license, university degree, or third-party accreditation.
      </p>

      {status !== "issued" && (
        <>
          <div className="mt-5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-horizon-blue transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{percent}% of course complete</p>
        </>
      )}

      {status === "eligible" && (
        <>
          <button
            type="button"
            onClick={handleIssue}
            disabled={issuing}
            className="mt-6 rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {issuing ? "Issuing…" : "Claim Your Certificate"}
          </button>
          {issueError && (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-600">
              {issueError}
            </p>
          )}
        </>
      )}

      {status === "issued" && cert && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-bold text-horizon-navy">Certificate issued</p>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">Student</dt>
              <dd>{`${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Certification</dt>
              <dd>{course.certificationName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Certificate number</dt>
              <dd className="font-mono">{cert.certificateNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Issued</dt>
              <dd>{new Date(cert.issuedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Anyone can confirm this credential at{" "}
            <a href="/verify" className="underline">
              /verify
            </a>{" "}
            using the verification code below.
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">{cert.verificationCode}</p>
        </div>
      )}

      {(status === "locked" || status === "in_progress") && (
        <a
          href={`/courses/${course.slug}/learn`}
          className="mt-6 inline-block rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
        >
          Continue Course
        </a>
      )}
    </div>
  );
}
