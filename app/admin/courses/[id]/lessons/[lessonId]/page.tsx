import { notFound } from "next/navigation";
import { getLessonForEdit, getAdminCourseDetail } from "@/lib/data/admin";
import EditLessonForm from "@/components/admin/EditLessonForm";

export default async function AdminLessonEditPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const lesson = await getLessonForEdit(lessonId);
  if (!lesson) {
    notFound();
    return;
  }
  const course = await getAdminCourseDetail(id);

  return (
    <div className="max-w-2xl">
      <a href={`/admin/courses/${id}`} className="text-sm font-semibold text-horizon-blue">
        ← Back to {course?.title ?? "Course"}
      </a>

      <h1 className="mt-4 font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">
        Edit Lesson
      </h1>

      <div className="mt-6">
        <EditLessonForm lesson={lesson} courseId={id} courseSlug={course?.slug ?? ""} />
      </div>
    </div>
  );
}
