"use client";

import { useEffect, useState } from "react";
import type { Course } from "@/lib/types";
import { getAdjacentLessons, getLessonBySlug } from "@/lib/courseData";
import {
  getCompletedLessonSlugs,
  markLessonCompleteRemote,
  computePercentComplete,
} from "@/lib/data/progress";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { triggerCourseCompletionEmailIfNeeded } from "@/lib/actions/email";
import DevBanner from "@/components/DevBanner";
import CourseVideo from "@/components/learn/CourseVideo";
import { AI101_ORIENTATION_VIDEO_ID, getAI101VideoId } from "@/lib/courseVideos";

export default function LessonView({ course, lessonSlug }: { course: Course; lessonSlug: string }) {
  const configured = isSupabaseConfigured();
  const lesson = getLessonBySlug(course, lessonSlug);
  const { previous, next } = getAdjacentLessons(course, lessonSlug);
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompletedLessonSlugs(course).then(setCompletedSlugs);
  }, [course, lessonSlug]);

  if (!lesson) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Lesson not found.</p>
        <a href={`/courses/${course.slug}/learn`} className="mt-4 inline-block font-semibold text-horizon-blue">
          Back to course
        </a>
      </div>
    );
  }

  const complete = completedSlugs.includes(lessonSlug);
  const percent = computePercentComplete(course, completedSlugs);
  const videoId = course.slug === "ai-101" ? getAI101VideoId(lessonSlug) : null;
  const showOrientation = course.slug === "ai-101" && lessonSlug === "what-is-artificial-intelligence";

  async function handleMarkComplete() {
    if (!configured) return;
    setMarking(true);
    setError(null);
    const result = await markLessonCompleteRemote(lesson!.id);
    setMarking(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't save your progress. Please try again.");
      return;
    }
    setCompletedSlugs((prev) => (prev.includes(lessonSlug) ? prev : [...prev, lessonSlug]));
    // Fire-and-forget: the RPC itself authoritatively checks whether every
    // lesson is now complete and whether this email was already sent —
    // safe to call after every single lesson completion, not just the
    // last one. See lib/actions/email.ts.
    triggerCourseCompletionEmailIfNeeded(course.id).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      {!configured && (
        <DevBanner>
          you&rsquo;re viewing static demo content — Supabase isn&rsquo;t
          connected, so progress can&rsquo;t be saved in this environment.
        </DevBanner>
      )}

      <div className="mb-6 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{course.title}</span>
        <span>{percent}% complete</span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-horizon-blue transition-all" style={{ width: `${percent}%` }} />
      </div>

      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">{lesson.title}</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500">{lesson.durationMinutes} min lesson</p>

      {showOrientation && (
        <div className="mt-8 rounded-2xl border border-horizon-gold/30 bg-horizon-gold/10 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-horizon-gold">Start here</p>
          <h2 className="mt-1 font-heading text-xl font-bold text-horizon-navy">Course Orientation</h2>
          <CourseVideo videoId={AI101_ORIENTATION_VIDEO_ID} title="AI-101 Course Orientation" />
        </div>
      )}

      {videoId && <CourseVideo videoId={videoId} title={`${lesson.title} — Next Horizon AI Academy`} />}

      <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-slate-700">
        {lesson.content.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleMarkComplete}
          disabled={complete || marking || !configured}
          className={`rounded-md px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed ${
            complete
              ? "bg-emerald-100 text-emerald-700"
              : "bg-horizon-blue text-white hover:bg-horizon-navy disabled:opacity-50"
          }`}
        >
          {complete ? "Lesson Complete ✓" : marking ? "Saving…" : "Mark Complete"}
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 hover:border-horizon-blue hover:text-horizon-blue"
        >
          Return to Dashboard
        </a>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
        {previous ? (
          <a href={`/courses/${course.slug}/learn/${previous.slug}`} className="text-sm font-semibold text-horizon-blue">
            ← {previous.title}
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={`/courses/${course.slug}/learn/${next.slug}`} className="text-sm font-semibold text-horizon-blue">
            {next.title} →
          </a>
        ) : (
          <a href={`/courses/${course.slug}/assessment`} className="text-sm font-semibold text-horizon-blue">
            Final Assessment →
          </a>
        )}
      </div>
    </div>
  );
}
