"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import EnrollmentCTA from "@/components/EnrollmentCTA";
import { getPublishedCourseBySlug } from "@/lib/data/courses";
import { formatPrice } from "@/lib/pricing";
import type { Course } from "@/lib/types";

export default function DynamicCoursePageClient({ slug }: { slug: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedCourseBySlug(slug)
      .then(setCourse)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="py-24 text-center text-slate-500">Loading course…</div>;
  }

  if (!course) {
    // The server-side page.tsx already gates on existence before ever
    // rendering this component, so this only appears in the unlikely
    // window where a course was unpublished between that check and this
    // client-side fetch — a graceful message beats a broken layout.
    return (
      <div className="py-24 text-center text-slate-500">
        This course is no longer available.{" "}
        <a href="/courses" className="font-semibold text-horizon-blue hover:underline">
          Browse courses →
        </a>
      </div>
    );
  }

  const { isPaid, priceCents, salePriceCents, currency } = course.pricing;
  const activePrice = salePriceCents ?? priceCents;
  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <>
      <PageHero eyebrow={course.title} title={course.title} description={course.description} />
      <section className="bg-horizon-cloud py-20 sm:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <h2 className="text-3xl font-extrabold text-horizon-navy">Course Content</h2>
            {course.modules.length === 0 ? (
              <p className="mt-6 text-slate-600">Course content is being finalized.</p>
            ) : (
              <ol className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {course.modules.map((m, i) => (
                  <li key={m.id} className="flex gap-4 px-4 py-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-horizon-navy text-xs font-bold text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-700">{m.title}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-horizon-blue">Course Overview</p>
            <ul className="mt-5 space-y-3 text-slate-600">
              <li>• {course.modules.length} module{course.modules.length === 1 ? "" : "s"}</li>
              <li>
                • {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
              </li>
              {course.certificationName && <li>• {course.certificationName} on completion</li>}
            </ul>

            {isPaid && activePrice != null ? (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="text-3xl font-extrabold text-horizon-navy">
                  {formatPrice(activePrice, currency)}
                  {salePriceCents && priceCents && (
                    <span className="ml-2 text-base font-semibold text-slate-400 line-through">
                      {formatPrice(priceCents, currency)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-500">One-time payment. No subscription.</p>
              </div>
            ) : null}

            {course.certificationName && (
              <div className="mt-8 rounded-xl bg-horizon-gold/15 p-5">
                <p className="font-bold text-horizon-navy">Completion Recognition</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Certificate included: {course.certificationName} is awarded to learners who complete the required
                  course standards.
                </p>
              </div>
            )}

            <div className="mt-7">
              <EnrollmentCTA course={course} className="block w-full text-center" />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
