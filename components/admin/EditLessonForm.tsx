"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLesson } from "@/lib/actions/admin";
import StatusMessage from "@/components/StatusMessage";
import type { BuilderLesson } from "@/lib/data/admin";

export default function EditLessonForm({
  lesson,
  courseId,
  courseSlug,
}: {
  lesson: BuilderLesson;
  courseId: string;
  courseSlug: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [slug, setSlug] = useState(lesson.slug);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [content, setContent] = useState(lesson.content ?? "");
  const [duration, setDuration] = useState(lesson.durationMinutes);
  const [position, setPosition] = useState(lesson.position);
  const [published, setPublished] = useState(lesson.isPublished);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const result = await updateLesson(lesson.id, courseId, courseSlug, {
      title,
      slug,
      description,
      content,
      durationMinutes: Number(duration),
      position: Number(position),
      isPublished: published,
    });
    setSubmitting(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error ?? "Something went wrong." });
      return;
    }
    setMessage({ tone: "success", text: "Lesson updated." });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      {lesson.progressCount > 0 && (
        <div className="rounded-md border border-horizon-gold/40 bg-horizon-gold/10 px-4 py-3 text-sm text-horizon-navy">
          {lesson.progressCount} student(s) have progress recorded on this lesson. Editing content is fine; deleting
          it is blocked to protect that history.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-mono focus:border-horizon-blue focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">Paragraphs separated by a blank line, matching the learner view.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">Duration (min)</label>
          <input
            type="number"
            min={1}
            max={300}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Position</label>
          <input
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
        </div>
      </div>

      {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Lesson"}
      </button>
    </form>
  );
}
