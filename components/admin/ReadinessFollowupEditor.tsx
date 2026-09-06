"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateReadinessFollowup } from "@/lib/actions/admin";

export default function ReadinessFollowupEditor({ assessmentId, followUpStatus, adminNotes, linkedInquiryId }: { assessmentId: string; followUpStatus: string; adminNotes: string | null; linkedInquiryId: string | null }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateReadinessFollowup({
        assessmentId,
        followUpStatus: String(fd.get("followUpStatus") ?? "new"),
        adminNotes: String(fd.get("adminNotes") ?? ""),
        linkedInquiryId: String(fd.get("linkedInquiryId") ?? ""),
      });
      setMessage(result.ok ? "Assessment follow-up updated." : result.error ?? "Could not update assessment.");
    });
  }
  return <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-lg font-bold text-horizon-navy">Follow-up</h2>
    <label className="mt-4 block text-sm font-semibold text-slate-700">Status
      <select name="followUpStatus" defaultValue={followUpStatus} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">
        <option value="new">New</option><option value="reviewed">Reviewed</option><option value="contacted">Contacted</option><option value="converted">Converted</option><option value="closed">Closed</option>
      </select>
    </label>
    <label className="mt-4 block text-sm font-semibold text-slate-700">Linked partnership inquiry ID
      <input name="linkedInquiryId" defaultValue={linkedInquiryId ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" placeholder="Optional UUID after they submit an inquiry" />
    </label>
    <label className="mt-4 block text-sm font-semibold text-slate-700">Internal notes
      <textarea name="adminNotes" rows={5} defaultValue={adminNotes ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" />
    </label>
    <div className="mt-4 flex items-center gap-3"><button disabled={pending} className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{pending ? "Saving…" : "Save follow-up"}</button>{message && <p className="text-sm text-slate-600">{message}</p>}</div>
  </form>;
}
