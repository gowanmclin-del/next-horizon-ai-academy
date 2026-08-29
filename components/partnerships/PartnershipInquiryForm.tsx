"use client";

import { FormEvent, useState } from "react";
import { submitCorporatePartnershipInquiry } from "@/lib/actions/marketing";

const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-horizon-blue focus:ring-2 focus:ring-horizon-blue/20";

export default function PartnershipInquiryForm() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    const form = new FormData(event.currentTarget);
    const response = await submitCorporatePartnershipInquiry({
      firstName: String(form.get("firstName") ?? ""), lastName: String(form.get("lastName") ?? ""),
      workEmail: String(form.get("workEmail") ?? ""), organization: String(form.get("organization") ?? ""),
      jobTitle: String(form.get("jobTitle") ?? ""), organizationSize: String(form.get("organizationSize") ?? ""),
      partnershipInterest: String(form.get("partnershipInterest") ?? ""), learnerCount: String(form.get("learnerCount") ?? ""),
      timeline: String(form.get("timeline") ?? ""), goals: String(form.get("goals") ?? ""),
      website: String(form.get("website") ?? ""),
    });
    setSubmitting(false);
    if (response.ok) {
      setResult({ ok: true, message: "Thank you. Your partnership inquiry has been received. Our team will follow up with next steps." });
      event.currentTarget.reset();
    } else setResult({ ok: false, message: response.error ?? "Please try again." });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-horizon-navy">First name<input name="firstName" required className={fieldClass} /></label>
        <label className="text-sm font-semibold text-horizon-navy">Last name<input name="lastName" required className={fieldClass} /></label>
        <label className="text-sm font-semibold text-horizon-navy">Work email<input name="workEmail" type="email" required className={fieldClass} /></label>
        <label className="text-sm font-semibold text-horizon-navy">Organization<input name="organization" required className={fieldClass} /></label>
        <label className="text-sm font-semibold text-horizon-navy">Job title<input name="jobTitle" className={fieldClass} /></label>
        <label className="text-sm font-semibold text-horizon-navy">Organization size<select name="organizationSize" className={fieldClass}><option value="">Select</option><option>1–49</option><option>50–249</option><option>250–999</option><option>1,000+</option></select></label>
        <label className="text-sm font-semibold text-horizon-navy">Partnership interest<select name="partnershipInterest" required className={fieldClass}><option value="">Select</option><option>AI Workforce Training Pilot</option><option>Sponsored Learning Cohort</option><option>AI Readiness Assessment</option><option>Certification Career Pathway</option><option>Curriculum or Technology Partnership</option><option>Community Impact Partnership</option></select></label>
        <label className="text-sm font-semibold text-horizon-navy">Potential learners<select name="learnerCount" className={fieldClass}><option value="">Select</option><option>Under 25</option><option>25–99</option><option>100–499</option><option>500+</option></select></label>
        <label className="text-sm font-semibold text-horizon-navy sm:col-span-2">Preferred timeline<select name="timeline" className={fieldClass}><option value="">Select</option><option>Within 30 days</option><option>1–3 months</option><option>3–6 months</option><option>Exploring options</option></select></label>
        <label className="text-sm font-semibold text-horizon-navy sm:col-span-2">What outcomes are you trying to achieve?<textarea name="goals" required maxLength={2000} rows={6} className={fieldClass} /></label>
        <label className="sr-only">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {result && <p role="status" className={`mt-5 rounded-lg p-4 text-sm font-semibold ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{result.message}</p>}
      <button disabled={submitting} className="mt-6 rounded-lg bg-horizon-blue px-6 py-3 font-bold text-white transition hover:bg-horizon-navy disabled:opacity-60">{submitting ? "Submitting…" : "Request a Partnership Conversation"}</button>
      <p className="mt-4 text-xs text-slate-500">Submitting this form does not create a contractual commitment. We use your information only to respond to your inquiry.</p>
    </form>
  );
}
