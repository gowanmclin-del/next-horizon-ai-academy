import { getAdminCourses } from "@/lib/data/admin";
import { formatPrice } from "@/lib/pricing";

export default async function AdminCoursesPage() {
  const courses = await getAdminCourses();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Courses</h1>
        <a
          href="/admin/courses/new"
          className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-horizon-navy"
        >
          + Create Course
        </a>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Create a course here, then build its modules and lessons in the Course Builder. Only courses marked
        &ldquo;Published&rdquo; are visible on the public site at{" "}
        <a href="/courses" className="font-semibold text-horizon-blue hover:underline">
          /courses
        </a>
        .
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {courses.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-horizon-navy">
                  <a href={`/admin/courses/${c.id}`} className="hover:text-horizon-blue hover:underline">
                    {c.title}
                  </a>
                </h2>
                <p className="text-xs font-mono text-slate-400">{c.slug}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  c.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {c.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Price</p>
                <p className="mt-1 text-sm font-bold text-horizon-navy">
                  {c.isPaid && c.priceCents != null ? formatPrice(c.priceCents, c.currency) : "Free"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Enrollments</p>
                <p className="mt-1 text-sm font-bold text-horizon-navy">{c.enrollmentCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</p>
                <p className="mt-1 text-sm font-bold text-horizon-navy">{c.completedCount}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4">
              <a href={`/admin/courses/${c.id}`} className="text-sm font-semibold text-horizon-blue hover:underline">
                Edit / Course Builder →
              </a>
              {c.status === "published" && (
                <a
                  href={`/courses/${c.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-slate-500 hover:underline"
                >
                  View Public Page ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
