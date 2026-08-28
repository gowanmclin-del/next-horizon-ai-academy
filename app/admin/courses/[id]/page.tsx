import { notFound } from "next/navigation";
import { getAdminCourseDetail, getCourseBuilderData } from "@/lib/data/admin";
import { formatPrice } from "@/lib/pricing";
import EditCourseForm from "@/components/admin/EditCourseForm";
import CourseBuilder from "@/components/admin/CourseBuilder";

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getAdminCourseDetail(id);
  if (!course) {
    notFound();
    return;
  }
  const builderData = await getCourseBuilderData(id);

  return (
    <div className="max-w-3xl">
      <a href="/admin/courses" className="text-sm font-semibold text-horizon-blue">
        ← All Courses
      </a>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="font-heading text-2xl font-extrabold text-horizon-navy">{course.title}</h1>
        <p className="mt-1 text-xs font-mono text-slate-400">{course.slug}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Price</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">
              {course.isPaid && course.priceCents != null ? formatPrice(course.priceCents, course.currency) : "Free"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Modules</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">{course.moduleCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lessons</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">{course.lessonCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Enrollments</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">{course.enrollmentCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">{course.activeCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">
              {course.completedCount}
              {course.completionRate != null && <span className="ml-1 text-xs font-normal text-slate-400">({course.completionRate}%)</span>}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assessment Pass Rate</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">
              {course.assessmentPassRate != null ? `${course.assessmentPassRate}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Certificates Issued</p>
            <p className="mt-1 text-sm font-bold text-horizon-navy">{course.certificatesIssued}</p>
          </div>
        </div>

        <a
          href={`/admin/students?course=${course.id}`}
          className="mt-5 inline-block text-sm font-semibold text-horizon-blue hover:underline"
        >
          View students in this course →
        </a>
      </div>

      <div className="mt-6">
        <EditCourseForm
          courseId={course.id}
          courseSlug={course.slug}
          initialTitle={course.title}
          initialDescription={course.description}
          initialPriceCents={course.priceCents}
          initialStatus={course.status}
        />
      </div>

      <div className="mt-8">{builderData && <CourseBuilder data={builderData} />}</div>
    </div>
  );
}
