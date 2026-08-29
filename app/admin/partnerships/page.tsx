import { createClient } from "@/lib/supabase/server";

type Inquiry = {
  id: string; first_name: string; last_name: string; work_email: string; organization: string;
  job_title: string | null; partnership_interest: string; learner_count: string | null;
  timeline: string | null; goals: string; status: string; created_at: string;
};

export const dynamic = "force-dynamic";

export default async function AdminPartnershipsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("corporate_partnership_inquiries").select("*").order("created_at", { ascending: false }).limit(100);
  const inquiries = (data ?? []) as Inquiry[];
  return <div><h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Partnership Inquiries</h1><p className="mt-2 text-sm text-slate-600">Corporate training, sponsored cohort, readiness, and technology-partnership leads.</p>
    {error ? <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">The Phase 22 database migration must be installed before inquiries can be displayed.</p> : inquiries.length===0 ? <p className="mt-6 text-sm text-slate-500">No partnership inquiries yet.</p> : <div className="mt-6 space-y-4">{inquiries.map(i=><article key={i.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-horizon-navy">{i.organization}</h2><p className="text-sm text-slate-600">{i.first_name} {i.last_name}{i.job_title ? ` • ${i.job_title}` : ""} • <a className="text-horizon-blue" href={`mailto:${i.work_email}`}>{i.work_email}</a></p></div><span className="rounded-full bg-horizon-cloud px-3 py-1 text-xs font-bold text-horizon-blue">{i.status}</span></div><p className="mt-4 text-sm font-semibold text-horizon-navy">{i.partnership_interest}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{i.goals}</p><p className="mt-3 text-xs text-slate-400">{i.learner_count ?? "Learner count not supplied"} • {i.timeline ?? "Timeline not supplied"} • {new Date(i.created_at).toLocaleString()}</p></article>)}</div>}
  </div>;
}
