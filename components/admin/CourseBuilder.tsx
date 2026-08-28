"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  deleteLesson,
  reorderLessons,
} from "@/lib/actions/admin";
import type { CourseBuilderData, BuilderModule, BuilderLesson } from "@/lib/data/admin";
import StatusMessage from "@/components/StatusMessage";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CourseBuilder({ data }: { data: CourseBuilderData }) {
  const { course, modules } = data;
  const router = useRouter();
  const [addingModule, setAddingModule] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-horizon-navy">Course Content</h2>
        <button
          type="button"
          onClick={() => setAddingModule((v) => !v)}
          className="rounded-md bg-horizon-blue px-4 py-2 text-sm font-semibold text-white hover:bg-horizon-navy"
        >
          {addingModule ? "Cancel" : "Add Module"}
        </button>
      </div>

      {addingModule && (
        <ModuleForm
          mode="create"
          courseId={course.id}
          courseSlug={course.slug}
          nextPosition={modules.length + 1}
          onDone={() => {
            setAddingModule(false);
            router.refresh();
          }}
        />
      )}

      {modules.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No modules yet. Add the first one above.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {modules.map((m, i) => (
            <ModuleCard
              key={m.id}
              module={m}
              courseId={course.id}
              courseSlug={course.slug}
              isFirst={i === 0}
              isLast={i === modules.length - 1}
              allModuleIds={modules.map((mm) => mm.id)}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleForm({
  mode,
  courseId,
  courseSlug,
  moduleId,
  initial,
  nextPosition,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  courseId: string;
  courseSlug: string;
  moduleId?: string;
  initial?: BuilderModule;
  nextPosition?: number;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [position, setPosition] = useState(initial?.position ?? nextPosition ?? 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const input = { title, slug, description, position: Number(position) };
    const result =
      mode === "create"
        ? await createModule(courseId, courseSlug, input)
        : await updateModule(moduleId!, courseId, courseSlug, input);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 rounded-xl border border-horizon-blue/30 bg-horizon-blue/5 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">Title</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-horizon-blue focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>
      <div className="max-w-[120px]">
        <label className="text-xs font-semibold text-slate-600">Position</label>
        <input
          type="number"
          min={1}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-horizon-blue px-4 py-2 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create Module" : "Save Module"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ModuleCard({
  module: m,
  courseId,
  courseSlug,
  isFirst,
  isLast,
  allModuleIds,
  onChanged,
}: {
  module: BuilderModule;
  courseId: string;
  courseSlug: string;
  isFirst: boolean;
  isLast: boolean;
  allModuleIds: string[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const progressTotal = m.lessons.reduce((sum, l) => sum + l.progressCount, 0);

  async function handleMove(direction: "up" | "down") {
    const idx = allModuleIds.indexOf(m.id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= allModuleIds.length) return;
    const reordered = [...allModuleIds];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
    setBusy(true);
    await reorderModules(courseId, courseSlug, reordered);
    setBusy(false);
    onChanged();
  }

  async function handleDelete() {
    setBusy(true);
    setDeleteError(null);
    const result = await deleteModule(m.id, courseId, courseSlug);
    setBusy(false);
    if (!result.ok) {
      setDeleteError(result.error ?? "Failed to delete.");
      return;
    }
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-slate-400">
            #{m.position} · {m.slug}
          </p>
          <h3 className="text-base font-bold text-horizon-navy">{m.title}</h3>
          {m.description && <p className="mt-1 text-sm text-slate-600">{m.description}</p>}
          <p className="mt-1 text-xs text-slate-400">
            {m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" disabled={isFirst || busy} onClick={() => handleMove("up")} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-30">
            ▲
          </button>
          <button type="button" disabled={isLast || busy} onClick={() => handleMove("down")} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-30">
            ▼
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} className="ml-2 text-xs font-semibold text-horizon-blue">
            {editing ? "Cancel" : "Edit"}
          </button>
          <button type="button" onClick={() => setAddingLesson((v) => !v)} className="ml-2 text-xs font-semibold text-horizon-blue">
            {addingLesson ? "Cancel" : "Add Lesson"}
          </button>
          <button type="button" onClick={() => setConfirmDelete((v) => !v)} className="ml-2 text-xs font-semibold text-red-600">
            Delete
          </button>
        </div>
      </div>

      {editing && (
        <ModuleForm
          mode="edit"
          courseId={courseId}
          courseSlug={courseSlug}
          moduleId={m.id}
          initial={m}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {confirmDelete && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-4">
          {progressTotal > 0 ? (
            <p className="text-sm font-semibold text-red-700">
              This module can&rsquo;t be deleted: {progressTotal} student progress record(s) exist across its
              lessons. Unpublish the lessons instead of deleting the module.
            </p>
          ) : deleteStep === 0 ? (
            <>
              <p className="text-sm text-red-700">
                Deleting this module will also permanently delete every lesson inside it ({m.lessons.length}{" "}
                lesson{m.lessons.length === 1 ? "" : "s"}). This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setDeleteStep(1)}
                className="mt-2 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                I understand, continue
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-red-700">Delete &ldquo;{m.title}&rdquo; and all its lessons permanently?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? "Deleting…" : "Yes, delete permanently"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteStep(0);
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
          {deleteError && (
            <div className="mt-2">
              <StatusMessage tone="error">{deleteError}</StatusMessage>
            </div>
          )}
        </div>
      )}

      {addingLesson && (
        <LessonForm
          moduleId={m.id}
          courseId={courseId}
          courseSlug={courseSlug}
          nextPosition={m.lessons.length + 1}
          onDone={() => {
            setAddingLesson(false);
            onChanged();
          }}
        />
      )}

      {m.lessons.length > 0 && (
        <div className="mt-4 flex flex-col divide-y divide-slate-100 border-t border-slate-100">
          {m.lessons.map((l, i) => (
            <LessonRow
              key={l.id}
              lesson={l}
              moduleId={m.id}
              courseId={courseId}
              courseSlug={courseSlug}
              isFirst={i === 0}
              isLast={i === m.lessons.length - 1}
              allLessonIds={m.lessons.map((ll) => ll.id)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonForm({
  moduleId,
  courseId,
  courseSlug,
  nextPosition,
  onDone,
}: {
  moduleId: string;
  courseId: string;
  courseSlug: string;
  nextPosition: number;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState(5);
  const [position, setPosition] = useState(nextPosition);
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createLesson(moduleId, courseId, courseSlug, {
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
      setError(result.error ?? "Something went wrong.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 rounded-xl border border-horizon-gold/40 bg-horizon-gold/5 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">Title</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-horizon-blue focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Duration (min)</label>
          <input
            type="number"
            min={1}
            max={300}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Position</label>
          <input
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-horizon-blue focus:outline-none"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
        </div>
      </div>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-horizon-blue px-4 py-2 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Create Lesson"}
      </button>
    </form>
  );
}

function LessonRow({
  lesson: l,
  moduleId,
  courseId,
  courseSlug,
  isFirst,
  isLast,
  allLessonIds,
  onChanged,
}: {
  lesson: BuilderLesson;
  moduleId: string;
  courseId: string;
  courseSlug: string;
  isFirst: boolean;
  isLast: boolean;
  allLessonIds: string[];
  onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMove(direction: "up" | "down") {
    const idx = allLessonIds.indexOf(l.id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= allLessonIds.length) return;
    const reordered = [...allLessonIds];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
    setBusy(true);
    await reorderLessons(moduleId, courseId, courseSlug, reordered);
    setBusy(false);
    onChanged();
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const result = await deleteLesson(l.id, courseId, courseSlug);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to delete.");
      return;
    }
    onChanged();
  }

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{l.title}</p>
          <p className="text-xs text-slate-400">
            #{l.position} · {l.slug} · {l.durationMinutes} min ·{" "}
            <span className={l.isPublished ? "font-semibold text-emerald-600" : "font-semibold text-slate-500"}>
              {l.isPublished ? "Published" : "Draft"}
            </span>
            {l.progressCount > 0 && <span className="ml-1 text-horizon-gold">· {l.progressCount} student(s) progressed</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" disabled={isFirst || busy} onClick={() => handleMove("up")} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-30">
            ▲
          </button>
          <button type="button" disabled={isLast || busy} onClick={() => handleMove("down")} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-30">
            ▼
          </button>
          <a href={`/admin/courses/${courseId}/lessons/${l.id}`} className="ml-2 text-xs font-semibold text-horizon-blue">
            Edit
          </a>
          <button type="button" onClick={() => setConfirmDelete((v) => !v)} className="ml-2 text-xs font-semibold text-red-600">
            Delete
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
          {l.progressCount > 0 ? (
            <p className="text-xs font-semibold text-red-700">
              This lesson can&rsquo;t be deleted: {l.progressCount} student(s) have recorded progress on it. Unpublish
              it instead.
            </p>
          ) : (
            <>
              <p className="text-xs text-red-700">Permanently delete &ldquo;{l.title}&rdquo;? This cannot be undone.</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? "Deleting…" : "Yes, delete"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Cancel
                </button>
              </div>
            </>
          )}
          {error && (
            <div className="mt-2">
              <StatusMessage tone="error">{error}</StatusMessage>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
