"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import EnrollmentCTA from "@/components/EnrollmentCTA";
import { getCourseBySlug } from "@/lib/data/courses";
import { formatPrice } from "@/lib/pricing";
import type { Course } from "@/lib/types";

const MODULES = [
  "Understanding Artificial Intelligence",
  "The Art of Prompting",
  "Everyday AI",
  "AI for Business",
  "Responsible & Ethical AI",
  "30-Day AI Success Plan",
];

const INCLUDED = [
  "5 modules and 30 lessons, self-paced",
  "A server-graded final assessment",
  "The Certified AI Foundations Professional (CAFP) credential upon completion",
  "Lifetime access to course updates",
];

export default function AI101PageClient() {
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    getCourseBySlug("ai-101").then(({ course: c }) => setCourse(c));
  }, []);

  const { isPaid, priceCents, salePriceCents, currency } = course?.pricing ?? {
    isPaid: false,
    priceCents: null,
    salePriceCents: null,
    currency: "usd",
  };
  const activePrice = salePriceCents ?? priceCents;

  return (
    <>
      <PageHero
        eyebrow="AI-101"
        title="Foundations of Artificial Intelligence"
        description="A beginner-friendly course designed to help learners understand AI, communicate effectively with AI tools, apply AI to real situations, and build a practical plan for continued growth."
      />
      <section className="bg-horizon-cloud py-20 sm:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <h2 className="text-3xl font-extrabold text-horizon-navy">What you&rsquo;ll learn</h2>
            <ol className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              {MODULES.map((m, i) => (
                <li key={m} className="flex gap-4 px-4 py-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-horizon-navy text-xs font-bold text-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold text-slate-700">{m}</span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-horizon-blue">Designed For</p>
            <ul className="mt-5 space-y-3 text-slate-600">
              <li>• Beginners exploring AI</li>
              <li>• Working professionals</li>
              <li>• Entrepreneurs and business owners</li>
              <li>• Creators and lifelong learners</li>
            </ul>

            {course && isPaid && activePrice != null ? (
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

            <div className="mt-6">
              <p className="text-sm font-bold text-horizon-navy">What&rsquo;s included</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {INCLUDED.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8 rounded-xl bg-horizon-gold/15 p-5">
              <p className="font-bold text-horizon-navy">Completion Recognition</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Certificate included: the academy awards its Certified AI
                Foundations Professional (CAFP) credential to learners who
                complete the required course standards.
              </p>
            </div>

            {course && (
              <div className="mt-7">
                <EnrollmentCTA course={course} className="block w-full text-center" />
              </div>
            )}

            <a
              href="/courses/ai-101/learn"
              className="mt-3 block rounded-md border border-horizon-blue px-6 py-3 text-center text-sm font-semibold text-horizon-blue hover:bg-horizon-blue hover:text-white"
            >
              Preview the Lessons
            </a>
            <a
              href="/founding-class"
              className="mt-3 block rounded-md border border-slate-200 px-6 py-3 text-center text-sm font-semibold text-slate-500 hover:border-horizon-blue hover:text-horizon-blue"
            >
              Join the Founding Class
            </a>
          </aside>
        </div>
      </section>
    </>
  );
}
