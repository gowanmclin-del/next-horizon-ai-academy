"use client";

import { useEffect, useState } from "react";
import { getMyEnrolledCourses, type MyEnrolledCourse } from "@/lib/data/progress";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import DevBanner from "@/components/DevBanner";
import EnrolledCourseSummaryCard from "@/components/dashboard/EnrolledCourseSummaryCard";

export default function MyCoursesPage() {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<MyEnrolledCourse[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getMyEnrolledCourses()
      .then(setCourses)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-slate-500">Loading…</div>;

  return (
    <div className="max-w-4xl">
      {!configured && (
        <DevBanner>
          this environment has no Supabase connection, so enrolled courses can&rsquo;t be loaded here.
        </DevBanner>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">My Courses</h1>
        <a href="/courses" className="text-sm font-semibold text-horizon-blue hover:underline">
          Browse all courses →
        </a>
      </div>

      {loadError ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
          Couldn&rsquo;t load your courses right now. Please refresh the page.
        </div>
      ) : courses.length === 0 && configured ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <p className="text-slate-600">You&rsquo;re not enrolled in any courses yet.</p>
          <a
            href="/courses"
            className="mt-4 inline-block rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
          >
            Browse Courses
          </a>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {courses.map((item) => (
            <EnrolledCourseSummaryCard key={item.course.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
