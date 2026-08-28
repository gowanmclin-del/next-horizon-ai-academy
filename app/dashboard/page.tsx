"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getMyEnrolledCourses, type MyEnrolledCourse } from "@/lib/data/progress";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import DevBanner from "@/components/DevBanner";
import EnrolledCourseSummaryCard from "@/components/dashboard/EnrolledCourseSummaryCard";

export default function DashboardPage() {
  const { profile } = useAuth();
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<MyEnrolledCourse[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await getMyEnrolledCourses();
        setCourses(result);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-slate-500">Loading your dashboard…</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Something went wrong loading your dashboard. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {!configured && (
        <DevBanner>
          this environment has no Supabase connection, so enrollment and progress can&rsquo;t be loaded here.
        </DevBanner>
      )}

      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">
        Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        This is your academy overview — your courses, learning progress, and certification status all in one place.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Courses Enrolled</p>
          <p className="mt-2 text-2xl font-extrabold text-horizon-navy">{courses.length}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
            <p className="text-slate-600">You&rsquo;re not enrolled in any courses yet.</p>
            <a
              href="/courses"
              className="mt-4 inline-block rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
            >
              Browse Courses
            </a>
          </div>
        ) : (
          courses.map((item) => <EnrolledCourseSummaryCard key={item.course.id} item={item} />)
        )}
      </div>
    </div>
  );
}
