import CreateCourseForm from "@/components/admin/CreateCourseForm";

export default function AdminNewCoursePage() {
  return (
    <div className="max-w-2xl">
      <a href="/admin/courses" className="text-sm font-semibold text-horizon-blue">
        ← All Courses
      </a>

      <h1 className="mt-4 font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">
        Create Course
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        After creating the course, you&rsquo;ll go straight to the Course Builder to add modules and lessons.
      </p>

      <div className="mt-6">
        <CreateCourseForm />
      </div>
    </div>
  );
}
