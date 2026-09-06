"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateCorporateLead } from "@/lib/actions/admin";

export default function CorporateLeadEditor({
  inquiryId,
  status,
  priority,
  adminNotes,
  nextFollowUpAt,
}: {
  inquiryId: string;
  status: string;
  priority: string;
  adminNotes: string | null;
  nextFollowUpAt: string | null;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCorporateLead({
        inquiryId,
        status: String(fd.get("status") ?? "new"),
        priority: String(fd.get("priority") ?? "normal"),
        adminNotes: String(fd.get("adminNotes") ?? ""),
        nextFollowUpAt: String(fd.get("nextFollowUpAt") ?? ""),
      });
      setMessage(result.ok ? "Lead updated." : result.error ?? "Could not update lead.");
    });
  }

  const localFollowUp = nextFollowUpAt ? new Date(nextFollowUpAt).toISOString().slice(0, 16) : "";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-horizon-navy">Pipeline management</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Status
          <select name="status" defaultValue={status} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">
            {[
              ["new","New"],["contacted","Contacted"],["qualified","Qualified"],["proposal","Proposal"],
              ["pilot","Pilot"],["partner","Partner"],["closed","Closed"]
            ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Priority
          <select name="priority" defaultValue={priority} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Next follow-up
          <input name="nextFollowUpAt" type="datetime-local" defaultValue={localFollowUp} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Internal notes
          <textarea name="adminNotes" rows={6} defaultValue={adminNotes ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" placeholder="Decision-maker, needs, objections, next action, proposal notes..." />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button disabled={pending} className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{pending ? "Saving…" : "Save lead"}</button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>
    </form>
  );
}
