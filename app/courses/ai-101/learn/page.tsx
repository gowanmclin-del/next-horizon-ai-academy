"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCourseBySlug } from "@/lib/data/courses";
import { getCompletedLessonSlugs, findContinueLessonSlug } from "@/lib/data/progress";
import { getFlatLessons } from "@/lib/courseData";

export default function LearnEntryPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Loading your course…");

  useEffect(() => {
    (async () => {
      const { course } = await getCourseBySlug("ai-101");
      const completedSlugs = await getCompletedLessonSlugs(course);
      const target = findContinueLessonSlug(course, completedSlugs);

      if (target) {
        router.replace(`/courses/${course.slug}/learn/${target}`);
        return;
      }

      const flat = getFlatLessons(course);
      if (completedSlugs.length > 0 && completedSlugs.length >= flat.length) {
        // Every lesson complete — send them to the final assessment.
        router.replace(`/courses/${course.slug}/assessment`);
        return;
      }

      // No progress yet (or not signed in / not enrolled) — start at the
      // first lesson.
      if (flat[0]) {
        router.replace(`/courses/${course.slug}/learn/${flat[0].slug}`);
      } else {
        setMessage("This course has no lessons yet.");
      }
    })();
  }, [router]);

  return <div className="py-16 text-center text-slate-500">{message}</div>;
}
