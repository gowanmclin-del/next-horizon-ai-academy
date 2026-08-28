import type { Metadata } from "next";
import CoursesCatalogClient from "@/components/marketing/CoursesCatalogClient";

export const metadata: Metadata = {
  title: "Courses | Next Horizon AI Academy",
  description:
    "Browse practical, beginner-friendly AI courses from Next Horizon AI Academy, designed for professionals, entrepreneurs, and lifelong learners.",
};

export default function CoursesPage() {
  return <CoursesCatalogClient />;
}
