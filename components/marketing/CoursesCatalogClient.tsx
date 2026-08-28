"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import { getPublishedCourses, type CourseCard } from "@/lib/data/courses";
import { formatPrice } from "@/lib/pricing";

export default function CoursesCatalogClient() {
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Courses"
        title="Build Practical AI Skills Step by Step"
        description="Our course roadmap begins with a strong foundation and is designed to expand into practical learning paths for work, business, creativity, and continued professional growth."
      />
      <section className="bg-horizon-cloud py-20 sm:py-28">
        <div className="container-page">
          {loading ? (
            <p className="text-center text-slate-500">Loading courses…</p>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
              <h3 className="text-xl font-bold text-horizon-navy">More learning paths are on the way</h3>
              <p className="mt-3 text-slate-600">
                Academy offerings are announced here as they&rsquo;re finalized. Check back soon, or explore{" "}
                <a href="/courses/ai-101" className="font-semibold text-horizon-blue hover:underline">
                  AI-101
                </a>{" "}
                in the meantime.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <a
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.15em] text-horizon-blue">
                    {c.isPaid ? "Academy Course" : "Free Course"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-horizon-navy">{c.title}</h2>
                  {c.shortDescription && <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{c.shortDescription}</p>}
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-horizon-navy">
                      {c.isPaid && (c.salePriceCents ?? c.priceCents) != null
                        ? formatPrice((c.salePriceCents ?? c.priceCents)!, c.currency)
                        : "Free"}
                    </span>
                    <span className="text-sm font-semibold text-horizon-blue">View Course →</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
