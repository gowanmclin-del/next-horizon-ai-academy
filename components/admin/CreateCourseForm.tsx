"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/lib/actions/admin";
import StatusMessage from "@/components/StatusMessage";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [status, setStatus] = useState("draft");
  const [certificationName, setCertificationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const priceCents = priceDollars.trim() ? Math.round(parseFloat(priceDollars) * 100) : null;
    if (priceDollars.trim() && (isNaN(priceCents!) || priceCents! < 0)) {
      setSubmitting(false);
      setError("Enter a valid price.");
      return;
    }

    const result = await createCourse({
      title,
      slug,
      shortDescription,
      description,
      priceCents,
      status,
      certificationName,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.push(`/admin/courses/${result.courseId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-700">Course title</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-mono focus:border-horizon-blue focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">Public URL: /courses/{slug || "…"}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Short description</label>
        <input
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="One sentence for the course catalog card"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Full description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Certification name (optional)</label>
        <input
          value={certificationName}
          onChange={(e) => setCertificationName(e.target.value)}
          placeholder="e.g. Certified AI Foundations Professional (CAFP)"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">Price (USD, blank = free)</label>
          <input
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            placeholder="49.00"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          >
            <option value="draft">Draft (not publicly visible)</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Course & Open Builder"}
      </button>
    </form>
  );
}
