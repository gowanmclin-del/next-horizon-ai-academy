"use client";

// Data access layer for course content. Course/module/lesson rows are
// publicly readable when published (see supabase/schema.sql RLS policies),
// so the browser client is sufficient here — no cookies/server client
// needed. Falls back to the static lib/courseData.ts definition if
// Supabase isn't configured or the query fails, so course-preview pages
// never break.
//
// This intentionally does not spread raw supabase.from(...) calls through
// UI components — see Phase 4 brief section 9.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ai101Course as fallbackCourse } from "@/lib/courseData";
import type { Course, Module, Lesson } from "@/lib/types";

export type DataSource = "supabase" | "static-fallback";

export interface CourseWithSource {
  course: Course;
  source: DataSource;
}

export async function getCourseBySlug(slug: string): Promise<CourseWithSource> {
  if (!isSupabaseConfigured()) {
    return { course: fallbackCourse, source: "static-fallback" };
  }

  try {
    const supabase = createClient();
    const { data: courseRow, error: courseError } = await supabase
      .from("courses")
      .select(
        "id, slug, title, description, certification_name, is_paid, price_cents, sale_price_cents, currency, enrollment_open, stripe_product_id, stripe_price_id"
      )
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (courseError || !courseRow) {
      return { course: fallbackCourse, source: "static-fallback" };
    }

    // Phase 17 perf fix: modules+lessons and the assessment lookup only
    // depend on courseRow.id, not on each other — previously fetched
    // sequentially, now run concurrently. This function is called once
    // per enrolled course on the dashboard (see getMyEnrolledCourses in
    // lib/data/progress.ts), so this savings compounds per course shown.
    const [{ data: moduleRows }, { data: assessmentRow }] = await Promise.all([
      supabase
        .from("modules")
        .select(
          "id, title, position, lessons(id, slug, title, description, content, duration_minutes, position, is_published)"
        )
        .eq("course_id", courseRow.id)
        .order("position"),
      supabase
        .from("assessments")
        .select("id, title, passing_score")
        .eq("course_id", courseRow.id)
        .eq("is_published", true)
        .maybeSingle(),
    ]);

    const modules: Module[] = (moduleRows ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      order: m.position,
      lessons: (m.lessons ?? [])
        .filter((l: any) => l.is_published)
        .sort((a: any, b: any) => a.position - b.position)
        .map(
          (l: any): Lesson => ({
            id: l.id,
            slug: l.slug,
            title: l.title,
            description: l.description ?? "",
            content: l.content ?? "",
            order: l.position,
            durationMinutes: l.duration_minutes,
          })
        ),
    }));

    const course: Course = {
      id: courseRow.id,
      slug: courseRow.slug,
      title: courseRow.title,
      description: courseRow.description ?? "",
      certificationName: courseRow.certification_name ?? "",
      modules,
      // Full question/option content is fetched separately via
      // lib/data/assessment.ts and always server-evaluated — only the real
      // assessment id and passing score matter here (used by dashboard and
      // certificate-eligibility checks).
      assessment: assessmentRow
        ? { ...fallbackCourse.assessment, id: assessmentRow.id, passingScore: assessmentRow.passing_score, title: assessmentRow.title }
        : fallbackCourse.assessment,
      pricing: {
        isPaid: Boolean(courseRow.is_paid),
        priceCents: courseRow.price_cents ?? null,
        salePriceCents: courseRow.sale_price_cents ?? null,
        currency: courseRow.currency ?? "usd",
        enrollmentOpen: courseRow.enrollment_open ?? true,
        stripeProductId: courseRow.stripe_product_id ?? null,
        stripePriceId: courseRow.stripe_price_id ?? null,
      },
    };

    return { course, source: "supabase" };
  } catch {
    return { course: fallbackCourse, source: "static-fallback" };
  }
}

// ============================================================================
// PHASE 10 ADDITIONS — public multi-course catalog
// ============================================================================

export interface CourseCard {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  isPaid: boolean;
  priceCents: number | null;
  salePriceCents: number | null;
  currency: string;
}

/** Every published course, for the public /courses catalog. Unlike
 * getCourseBySlug(), this never falls back to the static AI-101 fixture —
 * if Supabase isn't configured, the catalog is simply empty (the ai-101
 * marketing page itself still works via its own static fallback). */
export async function getPublishedCourses(): Promise<CourseCard[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("courses")
      .select("id, slug, title, short_description, is_paid, price_cents, sale_price_cents, currency")
      .eq("status", "published")
      .order("created_at", { ascending: true });

    return (data ?? []).map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortDescription: c.short_description,
      isPaid: Boolean(c.is_paid),
      priceCents: c.price_cents,
      salePriceCents: c.sale_price_cents,
      currency: c.currency ?? "usd",
    }));
  } catch {
    return [];
  }
}

/**
 * Strict lookup for the dynamic /courses/[slug] route: returns null when
 * the course genuinely doesn't exist or isn't published, so the page can
 * correctly call notFound() — unlike getCourseBySlug() (used by the
 * hardcoded AI-101 pages), which intentionally falls back to the static
 * AI-101 fixture so those specific pages never break. That fallback would
 * be wrong here: a bad slug on the generic route must 404, not silently
 * render AI-101's content.
 */
export async function getPublishedCourseBySlug(slug: string): Promise<Course | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { course, source } = await getCourseBySlug(slug);
    if (source !== "supabase") return null;
    if (course.slug !== slug) return null; // guards against any future fallback drift
    return course;
  } catch {
    return null;
  }
}
