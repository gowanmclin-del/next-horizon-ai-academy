"use client";

import { useState } from "react";
import { updateCourse } from "@/lib/actions/admin";
import StatusMessage from "@/components/StatusMessage";

export default function EditCourseForm({
  courseId,
  courseSlug,
  initialTitle,
  initialDescription,
  initialPriceCents,
  initialStatus,
}: {
  courseId: string;
  courseSlug: string;
  initialTitle: string;
  initialDescription: string | null;
  initialPriceCents: number | null;
  initialStatus: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [priceDollars, setPriceDollars] = useState(initialPriceCents != null ? (initialPriceCents / 100).toFixed(2) : "");
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const priceCents = priceDollars.trim() ? Math.round(parseFloat(priceDollars) * 100) : null;
    if (priceDollars.trim() && (isNaN(priceCents!) || priceCents! < 0)) {
      setSaving(false);
      setMessage({ tone: "error", text: "Enter a valid price." });
      return;
    }

    const result = await updateCourse({ courseId, courseSlug, title, description, priceCents, status });
    setSaving(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error ?? "Something went wrong." });
      return;
    }
    setMessage({ tone: "success", text: "Course updated." });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-horizon-navy">Edit Course Metadata</h2>

      <div>
        <label htmlFor="title" className="text-sm font-semibold text-slate-700">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="description" className="text-sm font-semibold text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="text-sm font-semibold text-slate-700">
            Price (USD, blank = free)
          </label>
          <input
            id="price"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            placeholder="49.00"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-semibold text-slate-700">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
