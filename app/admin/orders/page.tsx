import { getOrders } from "@/lib/data/admin";
import { formatPrice } from "@/lib/pricing";
import RefundOrderButton from "@/components/admin/RefundOrderButton";

const STATUS_TONE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-horizon-gold/20 text-horizon-navy",
  failed: "bg-red-100 text-red-700",
  canceled: "bg-slate-100 text-slate-500",
  refunded: "bg-slate-100 text-slate-500",
};

const ENROLLMENT_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  enrolled: "bg-emerald-100 text-emerald-700",
  completed: "bg-horizon-blue/10 text-horizon-blue",
  revoked: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const query = await searchParams;
  const orders = await getOrders();
  const filter = query.status;
  const filtered = filter ? orders.filter((o) => o.status === filter) : orders;

  const filters = [
    { label: "All", value: undefined },
    { label: "Paid", value: "paid" },
    { label: "Pending", value: "pending" },
    { label: "Failed", value: "failed" },
    { label: "Canceled", value: "canceled" },
    { label: "Refunded", value: "refunded" },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Orders</h1>
      <p className="mt-2 text-sm text-slate-600">
        Payment status and course-access status are tracked separately — a refunded order does not automatically
        mean access was revoked. See the two status columns below.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <a
            key={f.label}
            href={f.value ? `/admin/orders?status=${f.value}` : "/admin/orders"}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              filter === f.value || (!filter && !f.value)
                ? "bg-horizon-blue text-white"
                : "bg-white text-slate-600 hover:bg-horizon-cloud"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No orders match this filter.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Enrollment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-700">{o.studentEmail}</td>
                  <td className="px-4 py-3 text-slate-700">{o.courseTitle}</td>
                  <td className="px-4 py-3 font-semibold text-horizon-navy">{formatPrice(o.amountCents, o.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[o.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.enrollmentStatus ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ENROLLMENT_TONE[o.enrollmentStatus] ?? "bg-slate-100 text-slate-500"}`}>
                        {o.enrollmentStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {o.status === "paid" && (
                      <RefundOrderButton
                        orderId={o.id}
                        studentEmail={o.studentEmail}
                        courseTitle={o.courseTitle}
                        amountCents={o.amountCents}
                        currency={o.currency}
                        stripeReference={o.stripePaymentIntentId}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
