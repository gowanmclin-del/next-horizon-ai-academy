"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getCourseBySlug, type DataSource } from "@/lib/data/courses";
import { getEnrollment, hasCourseAccess } from "@/lib/data/progress";
import type { Course } from "@/lib/types";
import CourseSidebar from "@/components/learn/CourseSidebar";
import LessonView from "@/components/learn/LessonView";
import DevBanner from "@/components/DevBanner";
import EnrollmentCTA from "@/components/EnrollmentCTA";

export default function LessonPage({ params }: { params: Promise<{ lessonSlug: string }> }) {
  const { lessonSlug } = use(params);
  const { configured, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [source, setSource] = useState<DataSource>("static-fallback");
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      const { course: c, source: src } = await getCourseBySlug("ai-101");
      setCourse(c);
      setSource(src);
      if (src === "supabase" && user) {
        const enrollment = await getEnrollment(c.id);
        setEnrolled(hasCourseAccess(enrollment));
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading || authLoading) {
    return <div className="py-16 text-center text-slate-500">Loading lesson…</div>;
  }

  if (!course) {
    return <div className="py-16 text-center text-slate-500">Course not found.</div>;
  }

  // When Supabase is live, require sign-in and enrollment before showing
  // lesson content (middleware.ts already handles the sign-in redirect for
  // /dashboard, but these /courses/*/learn routes are reachable without it
  // today — see PHASE4-NOTES.md for why that gate lives here for now).
  if (configured && !user) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-slate-600">Log in to access this lesson.</p>
        <a href={`/login?redirect=/courses/${course.slug}/learn/${lessonSlug}`} className="mt-4 inline-block font-semibold text-horizon-blue">
          Log In
        </a>
      </div>
    );
  }

  if (configured && user && !enrolled) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-slate-600">
          {course.pricing.isPaid ? `Enrollment required for ${course.title}.` : `You need to enroll in ${course.title} first.`}
        </p>
        <div className="mt-4 flex justify-center">
          <EnrollmentCTA course={course} onEnrolled={() => setEnrolled(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-white lg:flex-row">
      {source !== "supabase" && (
        <div className="container-page pt-4 lg:hidden">
          <DevBanner>viewing static demo content — Supabase isn&rsquo;t connected.</DevBanner>
        </div>
      )}
      <CourseSidebar course={course} activeLessonSlug={lessonSlug} />
      <div className="flex-1">
        <LessonView course={course} lessonSlug={lessonSlug} />
      </div>
    </div>
  );
}
