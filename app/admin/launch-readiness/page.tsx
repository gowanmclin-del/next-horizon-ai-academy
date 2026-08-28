import Link from "next/link";
import { getLaunchReadiness, type ReadinessStatus } from "@/lib/data/admin";

const STATUS_META: Record<ReadinessStatus, { label: string; tone: string }> = {
  ready: { label: "Ready", tone: "bg-emerald-100 text-emerald-700" },
  needs_attention: { label: "Needs Attention", tone: "bg-horizon-gold/20 text-horizon-navy" },
  unable_to_verify: { label: "Unable to Verify", tone: "bg-slate-100 text-slate-500" },
};

export default async function LaunchReadinessPage() {
  const checks = await getLaunchReadiness();
  const readyCount = checks.filter((c) => c.status === "ready").length;
  const attentionCount = checks.filter((c) => c.status === "needs_attention").length;
  const goStatus = attentionCount === 0 ? "Configuration looks ready for acceptance testing" : "NO-GO: configuration still needs attention";

  return (
    <div className="max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Launch Readiness</h1>
      <p className="mt-2 text-sm text-slate-600">
        {readyCount} of {checks.length} checks ready. This page only reports whether required configuration{" "}
        <em>appears to exist</em> — it never displays secret values, and a &quot;Ready&quot; status here does not replace
        actually walking through the Live Verification Checklist in the README with real test transactions.
      </p>

      <div className={`mt-6 rounded-xl border p-4 text-sm font-semibold ${attentionCount === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        {goStatus}. Readiness checks only confirm configuration signals; a Stripe test payment and full student journey are still required before launch.
      </div>

      <div className="mt-4">
        <Link href="/admin/acceptance-test" className="inline-flex rounded-lg bg-horizon-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Open launch acceptance test
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {checks.map((c) => {
          const meta = STATUS_META[c.status];
          return (
            <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-horizon-navy">{c.label}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{c.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
