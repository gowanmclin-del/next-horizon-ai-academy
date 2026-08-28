import { getEnrollments, getAdminCourses } from "@/lib/data/admin";
import GrantEnrollmentForm from "@/components/admin/GrantEnrollmentForm";
import RevokeEnrollmentButton from "@/components/admin/RevokeEnrollmentButton";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "enrolled", label: "Enrolled" },
  { value: "completed", label: "Completed" },
  { value: "revoked", label: "Revoked" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const [enrollments, courses] = await Promise.all([
    getEnrollments({ courseId: filters.course, status: filters.status }),
    getAdminCourses(),
  ]);
  const publishedCourses = courses
    .filter((c) => c.status === "published")
    .map((c) => ({ id: c.id, title: c.title }));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Enrollments</h1>

      <div className="mt-6">
        <GrantEnrollmentForm courses={publishedCourses} />
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-horizon-navy">All Enrollments</h2>
          <form method="GET" className="flex flex-wrap gap-2">
            <select
              name="course"
              defaultValue={filters.course ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
            >
              <option value="">Any course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-horizon-blue px-4 py-2 text-sm font-semibold text-white hover:bg-horizon-navy"
            >
              Filter
            </button>
            {(filters.course || filters.status) && (
              <a href="/admin/enrollments" className="self-center text-sm font-semibold text-slate-500 hover:underline">
                Clear
              </a>
            )}
          </form>
        </div>
        {enrollments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No enrollments match this filter.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Enrolled</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <a href={`/admin/students/${e.studentId}`} className="font-semibold text-horizon-blue hover:underline">
                        {e.studentName}
                      </a>
                      <div className="text-xs text-slate-500">{e.studentEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.courseTitle}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-horizon-blue/10 px-2.5 py-1 text-xs font-bold text-horizon-blue">
                        {e.enrollmentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.status}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(e.enrolledAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {e.status !== "revoked" && <RevokeEnrollmentButton enrollmentId={e.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
