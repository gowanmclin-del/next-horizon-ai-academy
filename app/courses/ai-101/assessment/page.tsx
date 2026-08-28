"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getCourseBySlug } from "@/lib/data/courses";
import { getEnrollment, hasCourseAccess } from "@/lib/data/progress";
import { getPublishedAssessment, submitAssessment, type AssessmentDefinition } from "@/lib/data/assessment";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Course } from "@/lib/types";
import DevBanner from "@/components/DevBanner";
import { track } from "@/lib/analytics";
import EnrollmentCTA from "@/components/EnrollmentCTA";

export default function AssessmentPage() {
  const configured = isSupabaseConfigured();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; passed: boolean; passingScore: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { course: c } = await getCourseBySlug("ai-101");
      setCourse(c);
      if (configured && user) {
        const enrollment = await getEnrollment(c.id);
        const access = hasCourseAccess(enrollment);
        setEnrolled(access);
        if (access) {
          const a = await getPublishedAssessment(c.id);
          setAssessment(a);
        }
      }
      setLoading(false);
    })();
  }, [configured, user]);

  const allAnswered = assessment ? Object.keys(answers).length === assessment.questions.length : false;

  function handleSelect(questionId: string, optionId: string) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function handleSubmit() {
    if (!assessment) return;
    setSubmitting(true);
    setError(null);
    const outcome = await submitAssessment(assessment.id, answers);
    setSubmitting(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setResult(outcome.result);
    if (outcome.result.passed) track("assessment_passed", { score: outcome.result.score });
  }

  function handleRetake() {
    setAnswers({});
    setResult(null);
    setError(null);
  }

  if (loading) return <div className="py-16 text-center text-slate-500">Loading assessment…</div>;

  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-0">
        <DevBanner>
          this environment has no Supabase connection, so the assessment
          can&rsquo;t be loaded or graded here. Once connected, questions
          come from the <code className="rounded bg-white px-1.5 py-0.5 text-xs">assessments</code>{" "}
          table and are scored entirely inside Postgres.
        </DevBanner>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-slate-600">Log in to take the final assessment.</p>
        <a href="/login?redirect=/courses/ai-101/assessment" className="mt-4 inline-block font-semibold text-horizon-blue">
          Log In
        </a>
      </div>
    );
  }

  // Enforced again server-side inside submit_assessment_attempt() (see
  // supabase/phase11.sql) — this client-side check is purely for a clean
  // UX, not the actual security boundary.
  if (!enrolled) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-slate-600">You need to be enrolled in {course?.title ?? "this course"} to take this assessment.</p>
        {course && (
          <div className="mt-4 flex justify-center">
            <EnrollmentCTA course={course} onEnrolled={() => setEnrolled(true)} />
          </div>
        )}
      </div>
    );
  }

  if (!assessment) {
    return <div className="py-16 text-center text-slate-500">No published assessment found for this course yet.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-0">
      <DevBanner>
        your score is calculated and recorded inside the database — this
        page never computes or trusts a score from the browser.
      </DevBanner>

      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">{assessment.title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        Passing score: {assessment.passingScore}% · {assessment.questions.length} questions
      </p>

      {result ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className={`text-lg font-extrabold ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
            {result.score}% — {result.passed ? "Passed" : "Not Passed"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {result.passed
              ? "Your certificate is now eligible to be claimed from the Certificates page in your dashboard."
              : `You need ${result.passingScore}% or higher to pass. Review the modules and try again.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
            >
              Retake Assessment
            </button>
            {result.passed && (
              <a
                href="/dashboard/certificates"
                className="rounded-md border border-horizon-blue px-6 py-3 text-sm font-semibold text-horizon-blue hover:bg-horizon-blue hover:text-white"
              >
                Go to Certificates
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {assessment.questions.map((q, qi) => (
            <fieldset key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <legend className="px-1 text-sm font-bold text-horizon-navy">
                {qi + 1}. {q.question}
              </legend>
              <div className="mt-3 flex flex-col gap-2">
                {q.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm ${
                      answers[q.id] === option.id
                        ? "border-horizon-blue bg-horizon-blue/5 font-semibold text-horizon-navy"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === option.id}
                      onChange={() => handleSelect(q.id, option.id)}
                      className="h-4 w-4"
                    />
                    {option.option_text}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {error && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="self-start rounded-md bg-horizon-blue px-7 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Submit Assessment"}
          </button>
        </div>
      )}
    </div>
  );
}
