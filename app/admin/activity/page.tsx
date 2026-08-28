import { getAuditLog } from "@/lib/data/admin";

const ACTION_LABEL: Record<string, string> = {
  admin_promoted: "Admin promoted",
  admin_demoted: "Administrator demoted",
  enrollment_granted: "Complimentary enrollment granted",
  enrollment_revoked: "Enrollment revoked",
  refund_initiated: "Refund initiated",
  refund_completed: "Refund completed",
  enrollment_revoked_refund: "Enrollment revoked (refund)",
  course_updated: "Course updated",
  course_created: "Course created",
  module_created: "Module created",
  module_updated: "Module updated",
  module_deleted: "Module deleted",
  lesson_created: "Lesson created",
  lesson_updated: "Lesson updated",
  lesson_deleted: "Lesson deleted",
  modules_reordered: "Modules reordered",
  lessons_reordered: "Lessons reordered",
};

function describeEntry(action: string, metadata: Record<string, unknown>): string {
  const label = ACTION_LABEL[action] ?? action;
  const title = typeof metadata.title === "string" ? metadata.title : null;
  if (title && (action === "course_created" || action === "module_created" || action === "lesson_created")) {
    const noun = action === "course_created" ? "course" : action === "module_created" ? "module" : "lesson";
    return `Created ${noun}: ${title}`;
  }
  return label;
}

export default async function AdminActivityPage() {
  const entries = await getAuditLog(100);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Recent Activity</h1>
      <p className="mt-2 text-sm text-slate-600">
        Every sensitive administrative action is recorded here permanently — this log cannot be edited or deleted
        through the app, by anyone, including admins.
      </p>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No administrative activity yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-horizon-navy">{describeEntry(e.action, e.metadata)}</p>
                <p className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                By {e.adminName} ({e.adminEmail}) · {e.targetType}
                {e.targetId ? ` ${e.targetId.slice(0, 8)}` : ""}
              </p>
              {Object.keys(e.metadata).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
