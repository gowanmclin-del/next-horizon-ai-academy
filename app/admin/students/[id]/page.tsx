import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/data/admin";
import { formatPrice } from "@/lib/pricing";

const ENROLLMENT_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  enrolled: "bg-emerald-100 text-emerald-700",
  completed: "bg-horizon-blue/10 text-horizon-blue",
  revoked: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  refunded: "bg-slate-100 text-slate-500",
};

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudentDetail(id);
  if (!student) {
    notFound();
    return;
  }

  return (
    <div className="max-w-4xl">
      <a href="/admin/students" className="text-sm font-semibold text-horizon-blue">
        ← All Students
      </a>

      {/* Student */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Student</p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold text-horizon-navy">
          {`${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "—"}
        </h1>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-500">Email</dt>
            <dd className="text-slate-800">{student.email}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Registered</dt>
            <dd className="text-slate-800">{new Date(student.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Professional role</dt>
            <dd className="text-slate-800">{student.professionalRole || "—"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">AI experience level</dt>
            <dd className="text-slate-800">{student.aiExperienceLevel || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Enrollments */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-horizon-navy">Enrollments</h2>
        {student.enrollments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Not enrolled in any courses.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {student.enrollments.map((e) => (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-horizon-navy">{e.courseTitle}</p>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-horizon-blue/10 px-2.5 py-1 text-xs font-bold text-horizon-blue">
                      {e.enrollmentType}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ENROLLMENT_TONE[e.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {e.status}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Enrolled {new Date(e.enrolledAt).toLocaleDateString()}
                  {e.completedAt && ` · Completed ${new Date(e.completedAt).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-horizon-navy">Progress</h2>
        {student.enrollments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No progress to show.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {student.enrollments.map((e) => {
              const pct = e.totalLessons > 0 ? Math.round((e.completedLessons / e.totalLessons) * 100) : 0;
              return (
                <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{e.courseTitle}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {e.completedLessons} / {e.totalLessons} lessons · {pct}%
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-horizon-blue" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assessments */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-horizon-navy">Assessments</h2>
        {student.assessments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No assessment attempts.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Attempted</th>
                </tr>
              </thead>
              <tbody>
                {student.assessments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{a.courseTitle}</td>
                    <td className="px-4 py-3 text-slate-700">{a.assessmentTitle}</td>
                    <td className="px-4 py-3 font-semibold text-horizon-navy">{a.score}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          a.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {a.passed ? "Passed" : "Not Passed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(a.attemptedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificates */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-horizon-navy">Certificates</h2>
        {student.enrollments.filter((e) => e.certificateIssued).length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No certificates issued yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {student.enrollments
              .filter((e) => e.certificateIssued)
              .map((e) => (
                <div key={e.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="font-semibold text-horizon-navy">{e.courseTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Issued {e.certificateIssuedAt ? new Date(e.certificateIssuedAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-horizon-navy">Orders</h2>
        {student.orders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No orders.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {student.orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{o.courseTitle}</td>
                    <td className="px-4 py-3 font-semibold text-horizon-navy">{formatPrice(o.amountCents, o.currency)}</td>
                    <td className="px-4 py-3 text-slate-700">{o.status}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
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
