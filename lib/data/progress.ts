"use client";

// Client-side data access for enrollment + lesson progress. These are
// called from client components (dashboard pages, the lesson view) and rely
// entirely on RLS (see supabase/schema.sql) to scope reads/writes to the
// signed-in user — there is no service-role key involved, and a student can
// only ever touch their own enrollments/lesson_progress rows.
//
// If Supabase isn't configured, every function here returns a `null`/empty
// result rather than throwing, so callers can render a "backend not
// configured" state (see components/dashboard/RequireAuth.tsx) instead of
// silently pretending progress is being saved.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Course } from "@/lib/types";
import { getFlatLessons } from "@/lib/courseData";
import { getCourseBySlug } from "@/lib/data/courses";

export interface Enrollment {
  id: string;
  // Widened in Phase 9 (supabase/phase9.sql) to also allow 'revoked' and
  // 'refunded' at the database level — this type was missed at the time
  // and is corrected here in Phase 11, since hasCourseAccess() below
  // needs to compare against 'revoked' specifically.
  status: "enrolled" | "active" | "completed" | "cancelled" | "revoked" | "refunded";
  enrolledAt: string;
  completedAt: string | null;
}

export async function getEnrollment(courseId: string): Promise<Enrollment | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, status, enrolled_at, completed_at")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    status: data.status,
    enrolledAt: data.enrolled_at,
    completedAt: data.completed_at,
  };
}

/** Enrolls the current user in a course. Safe to call if already enrolled
 * (the unique (user_id, course_id) constraint means a duplicate insert just
 * fails, which we treat as success). */
export async function enrollInCourse(courseId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("enrollments").insert({
    user_id: user.id,
    course_id: courseId,
  });

  // Postgres unique_violation — already enrolled, which is fine.
  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getCompletedLessonSlugs(course: Course): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const lessonIds = getFlatLessons(course).map((l) => l.id);
  if (lessonIds.length === 0) return [];

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, lessons(slug)")
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("lesson_id", lessonIds);

  if (error || !data) return [];
  return data.map((row: any) => row.lessons?.slug).filter(Boolean);
}

export async function markLessonCompleteRemote(lessonId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Derives progress percentage from actual completed lessons — never
 * manually editable, per Phase 4 section 11. */
export function computePercentComplete(course: Course, completedSlugs: string[]): number {
  const flat = getFlatLessons(course);
  if (flat.length === 0) return 0;
  const completed = flat.filter((l) => completedSlugs.includes(l.slug)).length;
  return Math.round((completed / flat.length) * 100);
}

/** Finds where "Continue Learning" should send the student: the first
 * incomplete lesson, or null (meaning: go to the final assessment) once
 * every lesson is complete. */
export function findContinueLessonSlug(course: Course, completedSlugs: string[]): string | null {
  const flat = getFlatLessons(course);
  const next = flat.find((l) => !completedSlugs.includes(l.slug));
  return next ? next.slug : null;
}

/** A "revoked" enrollment row still exists (for audit/history reasons —
 * see PHASE7/8-NOTES.md) but must NOT grant lesson/assessment access.
 * Every access-gating check should use this instead of a bare truthiness
 * check on the enrollment object. */
export function hasCourseAccess(enrollment: Enrollment | null): boolean {
  return Boolean(enrollment) && enrollment!.status !== "revoked";
}

export interface MyEnrolledCourse {
  course: Course;
  enrollmentStatus: string;
}

/**
 * Every course the signed-in student has real access to (i.e. every
 * non-revoked enrollment), with full course data (modules/lessons/
 * assessment) already loaded via the existing generic getCourseBySlug() —
 * reused rather than duplicated. Used by the dashboard pages so a
 * student's enrolled courses are no longer hardcoded to AI-101 (see
 * PHASE11-NOTES.md).
 */
export async function getMyEnrolledCourses(): Promise<MyEnrolledCourse[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, status")
    .eq("user_id", user.id)
    .neq("status", "revoked");

  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = [...new Set(enrollments.map((e) => e.course_id))];
  const { data: courseRows } = await supabase.from("courses").select("id, slug").in("id", courseIds);
  if (!courseRows || courseRows.length === 0) return [];

  // Phase 17 perf fix: each getCourseBySlug() call does several of its own
  // sequential Supabase round trips internally — running them one course
  // at a time in a for-await loop meant N enrolled courses took roughly
  // N times as long as a single course. Fetching all of them concurrently
  // is a pure parallelization change (identical per-course logic, same
  // filtering), safe since each iteration is fully independent.
  const fetched = await Promise.all(
    (courseRows as { id: string; slug: string }[]).map(async (row) => {
      const enrollment = enrollments.find((e) => e.course_id === row.id);
      const { course, source } = await getCourseBySlug(row.slug);
      // Skip anything that fell back to static content — a stale/renamed
      // slug shouldn't silently show unrelated fallback course data on
      // the dashboard.
      if (source === "supabase" && course.slug === row.slug) {
        return { course, enrollmentStatus: enrollment?.status ?? "active" };
      }
      return null;
    })
  );
  const results: MyEnrolledCourse[] = fetched.filter((r): r is MyEnrolledCourse => r !== null);
  return results;
}
