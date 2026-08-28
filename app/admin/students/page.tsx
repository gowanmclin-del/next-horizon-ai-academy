import { getStudents, getAdminCourses } from "@/lib/data/admin";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "enrolled", label: "Enrolled" },
  { value: "completed", label: "Completed" },
  { value: "revoked", label: "Revoked" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const [students, courses] = await Promise.all([
    getStudents({ search: filters.q, courseId: filters.course, enrollmentStatus: filters.status }),
    getAdminCourses(),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Students</h1>

      <form method="GET" className="mt-6 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search by name or email"
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
        <select
          name="course"
          defaultValue={filters.course ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
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
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-horizon-navy"
        >
          Filter
        </button>
        {(filters.q || filters.course || filters.status) && (
          <a href="/admin/students" className="self-center text-sm font-semibold text-slate-500 hover:underline">
            Clear
          </a>
        )}
      </form>

      {students.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No students found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Courses</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-horizon-cloud">
                    <td className="px-4 py-3">
                      <a href={`/admin/students/${s.id}`} className="font-semibold text-horizon-blue hover:underline">
                        {`${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || "—"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.email}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-700">{s.courseCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 flex flex-col gap-3 md:hidden">
            {students.map((s) => (
              <a
                key={s.id}
                href={`/admin/students/${s.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-semibold text-horizon-blue">
                  {`${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-600">{s.email}</p>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>Registered {new Date(s.createdAt).toLocaleDateString()}</span>
                  <span>{s.courseCount} course{s.courseCount === 1 ? "" : "s"}</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
