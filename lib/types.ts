// Shared types for the academy's course data architecture.
// This structure is designed so additional courses can be added later
// without rewriting the learning system (sidebar nav, lesson routing,
// progress tracking, and assessments all read from this shape).
//
// When a real database is connected (see /docs/database-schema.md),
// these interfaces map closely onto the `courses`, `modules`, and
// `lessons` tables — this file becomes the client-side type layer on
// top of that data instead of the source of truth.

export interface Lesson {
  /** Stable identifier, unique within the whole course (e.g. "m1-l1"). */
  id: string;
  /** URL-safe slug used in /courses/[courseSlug]/learn/[lessonSlug]. */
  slug: string;
  title: string;
  /** One-line description shown in sidebar nav / course cards. */
  description: string;
  /** Lesson body. Paragraphs are separated by a blank line. */
  content: string;
  /** Order within the parent module, starting at 1. */
  order: number;
  durationMinutes: number;
  /** True for a module's wrap-up "Module Review" lesson. */
  isReview?: boolean;
}

export interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  /** Index into `options`. */
  correctIndex: number;
}

export interface CourseAssessment {
  id: string;
  title: string;
  passingScore: number; // percentage, e.g. 80
  questions: AssessmentQuestion[];
}

export interface CoursePricing {
  isPaid: boolean;
  /** Canonical price in whole cents (e.g. 4900 = $49.00). Null for free courses. */
  priceCents: number | null;
  /** Optional discounted price, also in cents. Null when no sale is active. */
  salePriceCents: number | null;
  currency: string;
  enrollmentOpen: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  certificationName: string;
  modules: Module[];
  assessment: CourseAssessment;
  pricing: CoursePricing;
}
