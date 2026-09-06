import { getCorporateLeads, getCorporatePipelineStats } from "@/lib/data/admin";

const STATUS_TONE: Record<string,string> = { new:"bg-blue-100 text-blue-700", contacted:"bg-cyan-100 text-cyan-700", qualified:"bg-violet-100 text-violet-700", proposal:"bg-amber-100 text-amber-800", pilot:"bg-orange-100 text-orange-700", partner:"bg-emerald-100 text-emerald-700", closed:"bg-slate-100 text-slate-500" };
const PRIORITY_TONE: Record<string,string> = { urgent:"text-red-700", high:"text-orange-700", normal:"text-slate-600", low:"text-slate-400" };

export default async function CorporateAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; priority?: string }> }) {
  const filters = await searchParams;
  const [leads, stats] = await Promise.all([getCorporateLeads(filters), getCorporatePipelineStats()]);
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-horizon-blue">Corporate partnerships</p><h1 className="mt-1 font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Partnership Pipeline</h1><p className="mt-2 text-sm text-slate-600">Manage inbound organizations from first inquiry through pilot and active partnership.</p></div>
      <a href="/admin/corporate/readiness" className="rounded-md border border-horizon-blue px-4 py-2 text-sm font-bold text-horizon-blue">Readiness Assessments →</a>
    </div>
    <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Total leads</p><p className="mt-1 text-2xl font-extrabold text-horizon-navy">{stats.totalLeads}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">New</p><p className="mt-1 text-2xl font-extrabold text-horizon-navy">{stats.statusCounts.new}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Qualified</p><p className="mt-1 text-2xl font-extrabold text-horizon-navy">{stats.statusCounts.qualified}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Proposals</p><p className="mt-1 text-2xl font-extrabold text-horizon-navy">{stats.statusCounts.proposal}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Pilots</p><p className="mt-1 text-2xl font-extrabold text-horizon-navy">{stats.statusCounts.pilot}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Follow-ups due</p><p className="mt-1 text-2xl font-extrabold text-horizon-navy">{stats.dueFollowUps}</p></div>
    </div>
    <form method="GET" className="mt-6 flex flex-wrap gap-2">
      <input name="q" defaultValue={filters.q ?? ""} placeholder="Organization, contact, email, industry" className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2.5 text-sm" />
      <select name="status" defaultValue={filters.status ?? ""} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Any status</option>{["new","contacted","qualified","proposal","pilot","partner","closed"].map(s=><option key={s} value={s}>{s}</option>)}</select>
      <select name="priority" defaultValue={filters.priority ?? ""} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Any priority</option>{["urgent","high","normal","low"].map(s=><option key={s} value={s}>{s}</option>)}</select>
      <button className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-bold text-white">Filter</button>
      {(filters.q || filters.status || filters.priority) && <a href="/admin/corporate" className="self-center text-sm font-semibold text-slate-500">Clear</a>}
    </form>
    {leads.length === 0 ? <p className="mt-6 text-sm text-slate-500">No corporate inquiries found.</p> : <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-xs font-bold uppercase tracking-wide text-slate-400"><th className="px-4 py-3">Organization</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Interest</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Follow-up</th><th className="px-4 py-3">Received</th></tr></thead><tbody>{leads.map(l=><tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-horizon-cloud"><td className="px-4 py-3"><a href={`/admin/corporate/${l.id}`} className="font-bold text-horizon-blue hover:underline">{l.organizationName}</a><div className="text-xs text-slate-500">{l.industry || "Industry not supplied"}</div></td><td className="px-4 py-3"><div className="text-slate-800">{l.contactName}</div><div className="text-xs text-slate-500">{l.email}</div></td><td className="px-4 py-3 text-slate-600">{l.interests.slice(0,2).join(", ")}{l.interests.length>2?` +${l.interests.length-2}`:""}</td><td className={`px-4 py-3 font-bold capitalize ${PRIORITY_TONE[l.priority]}`}>{l.priority}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_TONE[l.status]}`}>{l.status}</span></td><td className="px-4 py-3 text-slate-600">{l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleString() : "—"}</td><td className="px-4 py-3 text-slate-500">{new Date(l.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
  </div>;
}
