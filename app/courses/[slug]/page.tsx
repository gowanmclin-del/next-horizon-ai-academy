import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import DynamicCoursePageClient from "@/components/DynamicCoursePageClient";

// Runs a lightweight, separate query from the page component below —
// Next.js calls generateMetadata() and the page component independently,
// so this isn't free, but it's a single indexed lookup by slug and keeps
// this function simple rather than threading data through in a way that
// couples metadata generation to the page's own render logic.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isSupabaseConfigured()) return {};

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("title, short_description, description")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!course) return {};

  const description = course.short_description || course.description || undefined;
  return {
    title: `${course.title} | Next Horizon AI Academy`,
    description,
    openGraph: { title: course.title, description, type: "website" },
  };
}

// This existence/published check runs server-side specifically so a bad
// or unpublished slug produces a real 404 (via next/navigation's
// notFound(), which only behaves correctly when called from a Server
// Component during render) rather than a client-side-only "not found"
// message. The actual rendering below still uses the existing client-side
// data layer (lib/data/courses.ts), consistent with how the hardcoded
// AI-101 marketing page already works — this file only adds the missing
// server-side gate that a fully dynamic, slug-driven route needs and
// AI-101's hardcoded page never did.
export default async function DynamicCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSupabaseConfigured()) {
    notFound();
    return;
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!course) {
    notFound();
    return;
  }

  return <DynamicCoursePageClient slug={slug} />;
}
