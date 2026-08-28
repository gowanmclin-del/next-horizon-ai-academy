"use client";

import { useEffect, useState } from "react";
import type { Course } from "@/lib/types";
import { getCompletedLessonSlugs } from "@/lib/data/progress";

export default function CourseSidebar({
  course,
  activeLessonSlug,
}: {
  course: Course;
  activeLessonSlug: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);

  useEffect(() => {
    getCompletedLessonSlugs(course).then(setCompletedSlugs);
  }, [course, activeLessonSlug]);

  const content = (
    <nav aria-label="Course modules" className="flex flex-col gap-6">
      {course.modules.map((mod) => (
        <div key={mod.id}>
          <p className="px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
            {mod.title}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {mod.lessons.map((l) => {
              const isActive = l.slug === activeLessonSlug;
              const isComplete = completedSlugs.includes(l.slug);
              return (
                <li key={l.id}>
                  <a
                    href={`/courses/${course.slug}/learn/${l.slug}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      isActive
                        ? "bg-horizon-blue/10 font-bold text-horizon-blue"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        isComplete
                          ? "border-horizon-blue bg-horizon-blue text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    {l.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <a
        href={`/courses/${course.slug}/assessment`}
        className="rounded-md border border-horizon-navy px-3 py-2.5 text-center text-sm font-semibold text-horizon-navy hover:bg-horizon-navy hover:text-white"
      >
        Final Assessment
      </a>
    </nav>
  );

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-horizon-navy"
        >
          {isOpen ? "Hide Course Menu" : "Course Menu"}
        </button>
        {isOpen && <div className="mt-3">{content}</div>}
      </div>
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-6 lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
          <p className="mb-4 px-1 text-sm font-extrabold text-horizon-navy">{course.title}</p>
          {content}
        </div>
      </aside>
    </>
  );
}
