"use client";

import { useEffect, useState } from "react";
import { getMyEnrolledCourses, type MyEnrolledCourse } from "@/lib/data/progress";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import DevBanner from "@/components/DevBanner";
import CertificateCard from "@/components/dashboard/CertificateCard";

export default function CertificatesPage() {
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
    <div className="max-w-3xl">
      {!configured && (
        <DevBanner>
          this environment has no Supabase connection, so certificate status can&rsquo;t be calculated here.
        </DevBanner>
      )}

      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Certificates</h1>

      {loadError ? (
        <p className="mt-6 text-sm font-semibold text-red-600">
          Couldn&rsquo;t load your certificates right now. Please refresh the page.
        </p>
      ) : courses.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          You&rsquo;re not enrolled in any courses yet — certificates appear here once you&rsquo;re enrolled and
          making progress.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {courses.map((item) => (
            <CertificateCard key={item.course.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
