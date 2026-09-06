import { notFound } from "next/navigation";
import CorporateLeadEditor from "@/components/admin/CorporateLeadEditor";
import { getCorporateLead } from "@/lib/data/admin";

export default async function CorporateLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const lead = await getCorporateLead(id); if (!lead) notFound();
  return <div className="max-w-5xl"><a href="/admin/corporate" className="text-sm font-bold text-horizon-blue">← Partnership Pipeline</a>
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-horizon-blue">Corporate lead</p><h1 className="mt-1 font-heading text-3xl font-extrabold text-horizon-navy">{lead.organizationName}</h1><p className="mt-1 text-sm text-slate-500">Received {new Date(lead.createdAt).toLocaleString()}</p>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{[["Contact",lead.contactName],["Email",lead.email],["Title",lead.jobTitle||"—"],["Industry",lead.industry||"—"],["Organization size",lead.organizationSize||"—"],["Participants",lead.participantCount||"—"],["Timeline",lead.timeline||"—"]].map(([k,v])=><div key={k}><dt className="font-bold text-slate-500">{k}</dt><dd className="mt-1 text-slate-800">{v}</dd></div>)}</dl>
      <div className="mt-6"><p className="text-sm font-bold text-slate-500">Partnership interests</p><div className="mt-2 flex flex-wrap gap-2">{lead.interests.map(i=><span key={i} className="rounded-full bg-horizon-blue/10 px-3 py-1 text-xs font-bold text-horizon-blue">{i}</span>)}</div></div>
      <div className="mt-6"><p className="text-sm font-bold text-slate-500">Goals / needs</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{lead.goals || "No additional goals supplied."}</p></div>
    </div>
    <div className="mt-6"><CorporateLeadEditor inquiryId={lead.id} status={lead.status} priority={lead.priority} adminNotes={lead.adminNotes} nextFollowUpAt={lead.nextFollowUpAt} /></div>
  </div>;
}
