import { getAdminStats } from "@/lib/data/admin";
import { formatPrice } from "@/lib/pricing";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Total Students", value: stats.totalStudents },
    { label: "Total Enrollments", value: stats.totalEnrollments },
    { label: "Active Enrollments", value: stats.activeEnrollments },
    { label: "Completed Enrollments", value: stats.completedEnrollments },
    { label: "Complimentary Enrollments", value: stats.complimentaryEnrollments },
    { label: "Published Courses", value: stats.publishedCourses },
    { label: "Draft Courses", value: stats.draftCourses },
    { label: "Total Paid Orders", value: stats.totalPaidOrders },
    { label: "Refunded Orders", value: stats.refundedOrders },
    { label: "Certificates Issued", value: stats.certificatesIssued },
    { label: "Academy Revenue", value: formatPrice(stats.totalRevenueCents, stats.currency) },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">
        Academy Overview
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Live data from the database — nothing on this page is estimated. Revenue is computed from actual paid order
        records, never from enrollment counts, and excludes refunded orders.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-horizon-navy">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-horizon-navy">Recent Orders</h2>
        {stats.recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{o.studentEmail}</td>
                    <td className="px-4 py-3 text-slate-700">{o.courseTitle}</td>
                    <td className="px-4 py-3 font-semibold text-horizon-navy">
                      {formatPrice(o.amountCents, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          o.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : o.status === "pending"
                              ? "bg-horizon-gold/20 text-horizon-navy"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-horizon-navy">Recent Admin Activity</h2>
          <a href="/admin/activity" className="text-sm font-semibold text-horizon-blue">
            View all →
          </a>
        </div>
        {stats.recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No administrative activity yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {stats.recentActivity.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
                <span className="text-slate-700">
                  <span className="font-semibold text-horizon-navy">{a.action.replace(/_/g, " ")}</span> by {a.adminName}
                </span>
                <span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
