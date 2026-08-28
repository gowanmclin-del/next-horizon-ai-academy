"use client";

import { useEffect, useState } from "react";
import type { MyEnrolledCourse } from "@/lib/data/progress";
import { getCompletedLessonSlugs, computePercentComplete, findContinueLessonSlug } from "@/lib/data/progress";
import { hasPassedAssessment } from "@/lib/data/assessment";
import { getMyCertificate } from "@/lib/data/certificates";
import { triggerEnrollmentEmail, triggerCourseCompletionEmailIfNeeded } from "@/lib/actions/email";

type CertStatus = "not_started" | "in_progress" | "eligible" | "issued";

const STATUS_LABEL: Record<CertStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  eligible: "Eligible for certificate",
  issued: "Certificate issued",
};

export default function EnrolledCourseSummaryCard({ item }: { item: MyEnrolledCourse }) {
  const { course } = item;
  const [percent, setPercent] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [continueSlug, setContinueSlug] = useState<string | null>(null);
  const [certStatus, setCertStatus] = useState<CertStatus>("not_started");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        // Phase 17 perf fix: these two calls are fully independent (neither
        // uses the other's result) but were previously awaited one after
        // the other. Running them concurrently doesn't change any logic
        // below — pct/completedSlugs and existingCert are used exactly as
        // before, just fetched in parallel instead of in sequence.
        const [completedSlugs, existingCert] = await Promise.all([
          getCompletedLessonSlugs(course),
          getMyCertificate(course.id),
        ]);
        const pct = computePercentComplete(course, completedSlugs);
        setPercent(pct);
        setCompletedCount(completedSlugs.length);
        setContinueSlug(findContinueLessonSlug(course, completedSlugs));

        // Passive retries, exactly as the single-course dashboard did before
        // this component existed — safe to call on every visit, since both
        // are no-ops once the email is actually confirmed sent (see
        // lib/actions/email.ts).
        triggerEnrollmentEmail(course.id).catch(() => {});
        if (pct === 100) {
          triggerCourseCompletionEmailIfNeeded(course.id).catch(() => {});
        }

        if (existingCert) {
          setCertStatus("issued");
        } else if (pct === 100 && course.assessment.id) {
          const passed = await hasPassedAssessment(course.assessment.id);
          setCertStatus(passed ? "eligible" : "in_progress");
        } else {
          setCertStatus(pct > 0 ? "in_progress" : "not_started");
        }
      } catch {
        // Phase 18 fix: getCompletedLessonSlugs()/getMyCertificate() have
        // no internal try/catch (a pre-existing characteristic, not
        // introduced by Phase 17's parallelization), so a genuine failure
        // (e.g. a network error) would previously leave this card stuck
        // on "Loading progress…" forever with no feedback. Now it shows a
        // clear, non-alarming error state instead.
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [course]);

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-horizon-blue">{item.enrollmentStatus === "completed" ? "Completed" : "Enrolled"}</p>
      <h2 className="mt-2 text-xl font-extrabold text-horizon-navy">{course.title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{course.description}</p>

      {loading ? (
        <p className="mt-5 text-xs text-slate-400">Loading progress…</p>
      ) : loadError ? (
        <p className="mt-5 text-xs font-semibold text-red-600">
          Couldn&rsquo;t load progress for this course right now. Try refreshing the page.
        </p>
      ) : (
        <>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-horizon-blue transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {percent}% complete · {completedCount} / {totalLessons} lessons · {STATUS_LABEL[certStatus]}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={continueSlug ? `/courses/${course.slug}/learn/${continueSlug}` : `/courses/${course.slug}/assessment`}
              className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-horizon-navy"
            >
              {continueSlug ? "Continue Learning" : "Take Final Assessment"}
            </a>
            {certStatus === "eligible" || certStatus === "issued" ? (
              <a
                href="/dashboard/certificates"
                className="rounded-md border border-horizon-blue px-5 py-2.5 text-sm font-semibold text-horizon-blue hover:bg-horizon-blue hover:text-white"
              >
                View Certificate
              </a>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
