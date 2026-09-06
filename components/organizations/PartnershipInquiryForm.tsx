"use client";
import { FormEvent, useState } from "react";
import { submitPartnershipInquiry } from "@/lib/actions/corporate";

const interests = ["AI readiness & strategy", "Workforce AI training", "Leadership enablement", "Use-case discovery", "Workflow / agent design", "Implementation support", "AI adoption & change enablement", "Curriculum licensing", "Community sponsorship", "Workforce development", "Custom AI program", "Strategic technology partnership"];

export default function PartnershipInquiryForm() {
  const [status, setStatus] = useState<{ok?: boolean; error?: string}>({});
  const [pending, setPending] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPending(true); setStatus({});
    const fd = new FormData(e.currentTarget);
    const result = await submitPartnershipInquiry({
      organizationName: String(fd.get("organizationName") || ""), contactName: String(fd.get("contactName") || ""), email: String(fd.get("email") || ""),
      jobTitle: String(fd.get("jobTitle") || ""), industry: String(fd.get("industry") || ""), organizationSize: String(fd.get("organizationSize") || ""),
      interests: fd.getAll("interests").map(String), participantCount: String(fd.get("participantCount") || ""), timeline: String(fd.get("timeline") || ""),
      goals: String(fd.get("goals") || ""), website: String(fd.get("website") || ""),
    });
    setStatus(result); setPending(false); if (result.ok) e.currentTarget.reset();
  }
  if (status.ok) return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8"><h2 className="text-2xl font-bold text-horizon-navy">Inquiry received.</h2><p className="mt-3 text-slate-700">Thank you. Next Horizon AI Academy will review your goals and follow up about the best partnership path.</p></div>;
  return <form onSubmit={onSubmit} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
    <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Organization<input required name="organizationName" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label>
      <label className="text-sm font-semibold">Contact name<input required name="contactName" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label>
      <label className="text-sm font-semibold">Business email<input required type="email" name="email" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label>
      <label className="text-sm font-semibold">Job title<input name="jobTitle" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label>
      <label className="text-sm font-semibold">Industry<input name="industry" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label>
      <label className="text-sm font-semibold">Organization size<select name="organizationSize" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal"><option value="">Select</option><option>1–25</option><option>26–100</option><option>101–500</option><option>501–2,000</option><option>2,001+</option></select></label>
    </div>
    <fieldset><legend className="text-sm font-semibold">Partnership interests</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{interests.map(i=><label key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" name="interests" value={i}/>{i}</label>)}</div></fieldset>
    <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Estimated participants<input name="participantCount" placeholder="e.g. 25, 250, 1,000+" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label><label className="text-sm font-semibold">Desired timeline<input name="timeline" placeholder="e.g. Next 60 days" className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label></div>
    <label className="text-sm font-semibold">What business outcome, workflow, or AI initiative are you trying to improve?<textarea name="goals" rows={5} className="mt-2 w-full rounded-md border border-slate-300 p-3 font-normal" /></label>
    {status.error && <p className="text-sm font-semibold text-red-700">{status.error}</p>}
    <button disabled={pending} className="rounded-md bg-horizon-blue px-6 py-3.5 font-semibold text-white hover:bg-horizon-navy disabled:opacity-60">{pending ? "Submitting…" : "Request Partnership Consultation"}</button>
  </form>;
}
