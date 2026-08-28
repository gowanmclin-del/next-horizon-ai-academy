import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getValidatedSiteUrlForCheckout } from "@/lib/email/site-url";

// ---------------------------------------------------------------------------
// ADMIN DATA-ACCESS LAYER
// ---------------------------------------------------------------------------
// Every function here is called from Server Components under app/admin/,
// using the cookie-scoped server Supabase client (never the service-role
// client) — the caller's own session, and the "admin read all" RLS
// policies added in supabase/phase7.sql, are what make these queries
// return more than just the caller's own data. If the signed-in user isn't
// actually an admin, RLS would simply return nothing (or a permission
// error on the underlying tables) — but the real gate is requireAdmin()
// below, called first from app/admin/layout.tsx, which redirects non-admins
// away before any admin page renders at all.
//
// Where a relationship crosses through auth.users (e.g. enrollments.user_id
// -> profiles.id both reference auth.users.id, but there's no direct FK
// from enrollments to profiles), this deliberately avoids relying on
// PostgREST's automatic relationship embedding — which needs a real FK to
// work and hasn't been verified live in this environment — and instead
// fetches related rows separately and merges them in JS. More verbose, but
// predictable without a live database to test against.
// ---------------------------------------------------------------------------

export interface AdminContext {
  userId: string;
  firstName: string | null;
  email: string;
}

/**
 * Call this first, at the top of any admin Server Component. Redirects
 * away (never renders anything admin-related) if Supabase isn't
 * configured, the visitor isn't signed in, or the signed-in user isn't an
 * admin. This is the real authorization boundary — see middleware.ts for
 * why the role check specifically lives here rather than in middleware.
 */
export async function requireAdmin(): Promise<AdminContext> {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return { userId: user.id, firstName: profile.first_name, email: user.email ?? "" };
}

// ============================================================================
// Dashboard summary
// ============================================================================
export interface AdminStats {
  totalStudents: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  paidEnrollments: number;
  complimentaryEnrollments: number;
  completedCourses: number;
  certificatesIssued: number;
  totalPaidOrders: number;
  refundedOrders: number;
  totalRevenueCents: number;
  currency: string;
  publishedCourses: number;
  draftCourses: number;
  recentOrders: Array<{
    id: string;
    studentEmail: string;
    courseTitle: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  recentActivity: AuditLogEntry[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const [
    { count: totalStudents },
    { data: enrollments },
    { count: certificatesCount },
    { data: paidOrders },
    { count: refundedOrdersCount },
    { count: publishedCoursesCount },
    { count: draftCoursesCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("enrollments").select("status, enrollment_type"),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
    // Revenue and "total paid orders" are always computed from actual
    // order records — never from enrollment counts — and only orders
    // currently in 'paid' status count as revenue. A refunded order's
    // status is 'refunded' by the time this query runs (see
    // admin_mark_order_refunded in supabase/phase8.sql), so refunded
    // amounts are automatically excluded here, not subtracted after the
    // fact.
    supabase.from("orders").select("amount_cents, currency").eq("status", "paid"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "refunded"),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);

  const totalEnrollments = enrollments?.length ?? 0;
  const activeEnrollments = enrollments?.filter((e) => e.status === "active" || e.status === "enrolled").length ?? 0;
  const completedEnrollments = enrollments?.filter((e) => e.status === "completed").length ?? 0;
  const paidEnrollments = enrollments?.filter((e) => e.enrollment_type === "paid").length ?? 0;
  const complimentaryEnrollments =
    enrollments?.filter((e) => e.enrollment_type !== "paid").length ?? 0;
  const completedCourses = completedEnrollments;
  const totalRevenueCents = paidOrders?.reduce((sum, o) => sum + o.amount_cents, 0) ?? 0;
  const currency = paidOrders?.[0]?.currency ?? "usd";

  const { data: recentOrderRows } = await supabase
    .from("orders")
    .select("id, user_id, course_id, amount_cents, currency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const recentOrders = await hydrateOrders(recentOrderRows ?? []);
  const recentActivity = await getAuditLog(8);

  return {
    totalStudents: totalStudents ?? 0,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    paidEnrollments,
    complimentaryEnrollments,
    completedCourses,
    certificatesIssued: certificatesCount ?? 0,
    totalPaidOrders: paidOrders?.length ?? 0,
    refundedOrders: refundedOrdersCount ?? 0,
    totalRevenueCents,
    currency,
    publishedCourses: publishedCoursesCount ?? 0,
    draftCourses: draftCoursesCount ?? 0,
    recentOrders,
    recentActivity,
  };
}

async function hydrateOrders(
  rows: Array<{
    id: string;
    user_id: string;
    course_id: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
  }>
) {
  const supabase = await createClient();
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const courseIds = [...new Set(rows.map((r) => r.course_id))];

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, email").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    courseIds.length
      ? supabase.from("courses").select("id, title").in("id", courseIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const profileMap = new Map(((profiles ?? []) as { id: string; email: string }[]).map((p) => [p.id, p.email]));
  const courseMap = new Map(((courses ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));

  return rows.map((r) => ({
    id: r.id,
    studentEmail: profileMap.get(r.user_id) ?? "Unknown",
    courseTitle: courseMap.get(r.course_id) ?? "Unknown course",
    amountCents: r.amount_cents,
    currency: r.currency,
    status: r.status,
    createdAt: r.created_at,
  }));
}

// ============================================================================
// Students
// ============================================================================
export interface StudentRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  createdAt: string;
  courseCount: number;
}

export interface StudentFilters {
  search?: string;
  courseId?: string;
  enrollmentStatus?: string;
}

export async function getStudents(filters: StudentFilters = {}): Promise<StudentRow[]> {
  const supabase = await createClient();

  // If filtering by course and/or enrollment status, resolve the matching
  // student ids from `enrollments` first — those are enrollment
  // attributes, not profile attributes, so they can't be filtered directly
  // on the `profiles` query below.
  let restrictToUserIds: string[] | null = null;
  if (filters.courseId || filters.enrollmentStatus) {
    let enrollmentQuery = supabase.from("enrollments").select("user_id");
    if (filters.courseId) enrollmentQuery = enrollmentQuery.eq("course_id", filters.courseId);
    if (filters.enrollmentStatus) enrollmentQuery = enrollmentQuery.eq("status", filters.enrollmentStatus);
    const { data: matching } = await enrollmentQuery;
    restrictToUserIds = [
      ...new Set(((matching ?? []) as { user_id: string }[]).map((e) => e.user_id)),
    ];
    if (restrictToUserIds.length === 0) return [];
  }

  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, created_at")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (restrictToUserIds) query = query.in("id", restrictToUserIds);

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`);
  }

  const { data: profiles } = await query;
  if (!profiles || profiles.length === 0) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id")
    .in(
      "user_id",
      profiles.map((p) => p.id)
    );

  const countByUser = new Map<string, number>();
  for (const e of enrollments ?? []) {
    countByUser.set(e.user_id, (countByUser.get(e.user_id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    createdAt: p.created_at,
    courseCount: countByUser.get(p.id) ?? 0,
  }));
}

export interface StudentDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  professionalRole: string | null;
  aiExperienceLevel: string | null;
  createdAt: string;
  enrollments: Array<{
    id: string;
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    status: string;
    enrollmentType: string;
    enrolledAt: string;
    completedAt: string | null;
    completedLessons: number;
    totalLessons: number;
    certificateIssued: boolean;
    certificateIssuedAt: string | null;
  }>;
  assessments: Array<{
    id: string;
    courseTitle: string;
    assessmentTitle: string;
    score: number;
    passed: boolean;
    attemptedAt: string;
  }>;
  orders: Array<{
    id: string;
    courseTitle: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

export async function getStudentDetail(studentId: string): Promise<StudentDetail | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, professional_role, ai_experience_level, created_at")
    .eq("id", studentId)
    .single();

  if (!profile) return null;

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("id, course_id, status, enrollment_type, enrolled_at, completed_at")
    .eq("user_id", studentId);

  const { data: orderRows } = await supabase
    .from("orders")
    .select("id, course_id, amount_cents, currency, status, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false });

  const courseIds = [
    ...new Set([...(enrollmentRows ?? []).map((e) => e.course_id), ...(orderRows ?? []).map((o) => o.course_id)]),
  ];

  const { data: courses } = courseIds.length
    ? await supabase.from("courses").select("id, title, slug").in("id", courseIds)
    : { data: [] as { id: string; title: string; slug: string }[] };
  const courseMap = new Map(((courses ?? []) as { id: string; title: string; slug: string }[]).map((c) => [c.id, c]));

  const { data: lessonCounts } = courseIds.length
    ? await supabase.from("lessons").select("id, module_id, is_published, modules(course_id)")
    : { data: [] as any[] };

  const totalLessonsByCourse = new Map<string, number>();
  for (const l of (lessonCounts as any[]) ?? []) {
    const courseId = l.modules?.course_id;
    if (courseId && l.is_published) {
      totalLessonsByCourse.set(courseId, (totalLessonsByCourse.get(courseId) ?? 0) + 1);
    }
  }

  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, lessons(module_id, modules(course_id))")
    .eq("user_id", studentId)
    .eq("completed", true);

  const completedByCourse = new Map<string, number>();
  for (const p of (progressRows as any[]) ?? []) {
    const courseId = p.lessons?.modules?.course_id;
    if (courseId) {
      completedByCourse.set(courseId, (completedByCourse.get(courseId) ?? 0) + 1);
    }
  }

  const { data: certRows } = await supabase
    .from("certificates")
    .select("course_id, issued_at")
    .eq("user_id", studentId);
  const certByCourse = new Map(((certRows ?? []) as { course_id: string; issued_at: string }[]).map((c) => [c.course_id, c.issued_at]));

  // Assessment attempts: assessment_attempts has no direct course_id, only
  // assessment_id — resolve through assessments (which does have
  // course_id) to attribute each attempt to a course and label it with
  // that course's title, matching what the Phase 12 brief asks the admin
  // view to show ("Attempts, scores, passing status, and relevant
  // timestamps").
  const { data: attemptRows } = await supabase
    .from("assessment_attempts")
    .select("id, assessment_id, score, passed, attempted_at")
    .eq("user_id", studentId)
    .order("attempted_at", { ascending: false });

  const assessmentIds = [...new Set((attemptRows ?? []).map((a) => a.assessment_id))];
  const { data: assessmentRows } = assessmentIds.length
    ? await supabase.from("assessments").select("id, title, course_id").in("id", assessmentIds)
    : { data: [] as { id: string; title: string; course_id: string }[] };
  const assessmentMap = new Map(
    ((assessmentRows ?? []) as { id: string; title: string; course_id: string }[]).map((a) => [a.id, a])
  );

  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    professionalRole: profile.professional_role,
    aiExperienceLevel: profile.ai_experience_level,
    createdAt: profile.created_at,
    enrollments: (enrollmentRows ?? []).map((e) => ({
      id: e.id,
      courseId: e.course_id,
      courseTitle: courseMap.get(e.course_id)?.title ?? "Unknown course",
      courseSlug: courseMap.get(e.course_id)?.slug ?? "",
      status: e.status,
      enrollmentType: e.enrollment_type,
      enrolledAt: e.enrolled_at,
      completedAt: e.completed_at,
      completedLessons: completedByCourse.get(e.course_id) ?? 0,
      totalLessons: totalLessonsByCourse.get(e.course_id) ?? 0,
      certificateIssued: certByCourse.has(e.course_id),
      certificateIssuedAt: certByCourse.get(e.course_id) ?? null,
    })),
    assessments: (attemptRows ?? []).map((a) => {
      const meta = assessmentMap.get(a.assessment_id);
      return {
        id: a.id,
        courseTitle: meta ? courseMap.get(meta.course_id)?.title ?? "Unknown course" : "Unknown course",
        assessmentTitle: meta?.title ?? "Assessment",
        score: a.score,
        passed: a.passed,
        attemptedAt: a.attempted_at,
      };
    }),
    orders: (orderRows ?? []).map((o) => ({
      id: o.id,
      courseTitle: courseMap.get(o.course_id)?.title ?? "Unknown course",
      amountCents: o.amount_cents,
      currency: o.currency,
      status: o.status,
      createdAt: o.created_at,
    })),
  };
}

// ============================================================================
// Enrollments (admin list)
// ============================================================================
export interface EnrollmentRow {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  status: string;
  enrollmentType: string;
  enrolledAt: string;
  orderId: string | null;
}

export interface EnrollmentFilters {
  courseId?: string;
  status?: string;
}

export async function getEnrollments(filters: EnrollmentFilters = {}): Promise<EnrollmentRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("enrollments")
    .select("id, user_id, course_id, status, enrollment_type, enrolled_at, order_id")
    .order("enrolled_at", { ascending: false });

  if (filters.courseId) query = query.eq("course_id", filters.courseId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data: rows } = await query;

  if (!rows || rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const courseIds = [...new Set(rows.map((r) => r.course_id))];

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    supabase.from("profiles").select("id, email, first_name, last_name").in("id", userIds),
    supabase.from("courses").select("id, title").in("id", courseIds),
  ]);

  const profileMap = new Map(((profiles ?? []) as { id: string; email: string; first_name: string | null; last_name: string | null }[]).map((p) => [p.id, p]));
  const courseMap = new Map(((courses ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));

  return rows.map((r) => {
    const p = profileMap.get(r.user_id);
    return {
      id: r.id,
      studentId: r.user_id,
      studentEmail: p?.email ?? "Unknown",
      studentName: `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "—",
      courseId: r.course_id,
      courseTitle: courseMap.get(r.course_id) ?? "Unknown course",
      status: r.status,
      enrollmentType: r.enrollment_type,
      enrolledAt: r.enrolled_at,
      orderId: r.order_id,
    };
  });
}

// ============================================================================
// Orders (admin list)
// ============================================================================
export interface OrderRow {
  id: string;
  studentEmail: string;
  courseTitle: string;
  amountCents: number;
  currency: string;
  status: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  paidAt: string | null;
  enrollmentStatus: string | null;
}

export async function getOrders(): Promise<OrderRow[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("orders")
    .select(
      "id, user_id, course_id, amount_cents, currency, status, stripe_checkout_session_id, stripe_payment_intent_id, created_at, paid_at"
    )
    .order("created_at", { ascending: false });

  if (!rows || rows.length === 0) return [];

  const hydrated = await hydrateOrders(rows as any);
  const byId = new Map(hydrated.map((h) => [h.id, h]));

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("order_id, status")
    .in(
      "order_id",
      rows.map((r) => r.id)
    );
  const enrollmentStatusByOrder = new Map(
    ((enrollmentRows ?? []) as { order_id: string; status: string }[]).map((e) => [e.order_id, e.status])
  );

  return rows.map((r) => ({
    id: r.id,
    studentEmail: byId.get(r.id)?.studentEmail ?? "Unknown",
    courseTitle: byId.get(r.id)?.courseTitle ?? "Unknown course",
    amountCents: r.amount_cents,
    currency: r.currency,
    status: r.status,
    stripeCheckoutSessionId: r.stripe_checkout_session_id,
    stripePaymentIntentId: r.stripe_payment_intent_id,
    createdAt: r.created_at,
    paidAt: r.paid_at,
    enrollmentStatus: enrollmentStatusByOrder.get(r.id) ?? null,
  }));
}

// ============================================================================
// Courses (admin list)
// ============================================================================
export interface AdminCourseRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  priceCents: number | null;
  currency: string;
  isPaid: boolean;
  enrollmentCount: number;
  completedCount: number;
}

export async function getAdminCourses(): Promise<AdminCourseRow[]> {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, status, price_cents, currency, is_paid")
    .order("created_at", { ascending: true });

  if (!courses || courses.length === 0) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, status")
    .in(
      "course_id",
      courses.map((c) => c.id)
    );

  const enrollCount = new Map<string, number>();
  const completeCount = new Map<string, number>();
  for (const e of enrollments ?? []) {
    enrollCount.set(e.course_id, (enrollCount.get(e.course_id) ?? 0) + 1);
    if (e.status === "completed") {
      completeCount.set(e.course_id, (completeCount.get(e.course_id) ?? 0) + 1);
    }
  }

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    status: c.status,
    priceCents: c.price_cents,
    currency: c.currency,
    isPaid: c.is_paid,
    enrollmentCount: enrollCount.get(c.id) ?? 0,
    completedCount: completeCount.get(c.id) ?? 0,
  }));
}

// ============================================================================
// Certificates (admin list)
// ============================================================================
export interface AdminCertificateRow {
  id: string;
  studentEmail: string;
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
}

export async function getAdminCertificates(): Promise<AdminCertificateRow[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("certificates")
    .select("id, user_id, course_id, certificate_number, issued_at")
    .order("issued_at", { ascending: false });

  if (!rows || rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const courseIds = [...new Set(rows.map((r) => r.course_id))];

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    supabase.from("profiles").select("id, email, first_name, last_name").in("id", userIds),
    supabase.from("courses").select("id, title").in("id", courseIds),
  ]);

  const profileMap = new Map(((profiles ?? []) as { id: string; email: string; first_name: string | null; last_name: string | null }[]).map((p) => [p.id, p]));
  const courseMap = new Map(((courses ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));

  return rows.map((r) => {
    const p = profileMap.get(r.user_id);
    return {
      id: r.id,
      studentEmail: p?.email ?? "Unknown",
      studentName: `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "—",
      courseTitle: courseMap.get(r.course_id) ?? "Unknown course",
      certificateNumber: r.certificate_number,
      issuedAt: r.issued_at,
    };
  });
}

// ============================================================================
// PHASE 8 ADDITIONS — audit log + admin listing
// ============================================================================

export interface AuditLogEntry {
  id: string;
  adminEmail: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("admin_audit_log")
    .select("id, admin_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) return [];

  const adminIds = [...new Set(rows.map((r) => r.admin_id).filter(Boolean))] as string[];
  const { data: profiles } = adminIds.length
    ? await supabase.from("profiles").select("id, email, first_name, last_name").in("id", adminIds)
    : { data: [] as { id: string; email: string; first_name: string | null; last_name: string | null }[] };

  const profileMap = new Map(
    ((profiles ?? []) as { id: string; email: string; first_name: string | null; last_name: string | null }[]).map(
      (p) => [p.id, p]
    )
  );

  return rows.map((r) => {
    const p = r.admin_id ? profileMap.get(r.admin_id) : undefined;
    return {
      id: r.id,
      adminEmail: p?.email ?? "Unknown",
      adminName: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : "Unknown",
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      createdAt: r.created_at,
    };
  });
}

export interface AdminRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  createdAt: string;
}

export async function getAdmins(): Promise<AdminRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    createdAt: p.created_at,
  }));
}

export interface AdminCourseDetail extends AdminCourseRow {
  description: string | null;
  moduleCount: number;
  lessonCount: number;
  activeCount: number;
  completionRate: number | null;
  assessmentPassRate: number | null;
  certificatesIssued: number;
}

export async function getAdminCourseDetail(courseId: string): Promise<AdminCourseDetail | null> {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, description, status, price_cents, currency, is_paid")
    .eq("id", courseId)
    .single();

  if (!course) return null;

  const [{ data: modules }, { count: enrollCount }, { count: completeCount }, { count: activeCount }, { count: certCount }] =
    await Promise.all([
      supabase.from("modules").select("id, lessons(id)").eq("course_id", courseId),
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId),
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("status", "completed"),
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .in("status", ["active", "enrolled"]),
      supabase.from("certificates").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    ]);

  const moduleCount = modules?.length ?? 0;
  const lessonCount = (modules ?? []).reduce((sum: number, m: any) => sum + (m.lessons?.length ?? 0), 0);

  // Assessment pass rate: resolve this course's assessment, then look at
  // every attempt against it — the same course_id -> assessment_id
  // indirection used in getStudentDetail().
  const { data: assessmentRow } = await supabase
    .from("assessments")
    .select("id")
    .eq("course_id", courseId)
    .maybeSingle();

  let assessmentPassRate: number | null = null;
  if (assessmentRow) {
    const { data: attempts } = await supabase
      .from("assessment_attempts")
      .select("passed")
      .eq("assessment_id", assessmentRow.id);
    if (attempts && attempts.length > 0) {
      const passed = attempts.filter((a) => a.passed).length;
      assessmentPassRate = Math.round((passed / attempts.length) * 100);
    }
  }

  const totalEnrolled = enrollCount ?? 0;
  const completionRate = totalEnrolled > 0 ? Math.round(((completeCount ?? 0) / totalEnrolled) * 100) : null;

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    status: course.status,
    priceCents: course.price_cents,
    currency: course.currency,
    isPaid: course.is_paid,
    enrollmentCount: totalEnrolled,
    completedCount: completeCount ?? 0,
    activeCount: activeCount ?? 0,
    completionRate,
    assessmentPassRate,
    certificatesIssued: certCount ?? 0,
    moduleCount,
    lessonCount,
  };
}

// ============================================================================
// PHASE 9 ADDITIONS — Course Builder data
// ============================================================================

export interface BuilderLesson {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  durationMinutes: number;
  position: number;
  isPublished: boolean;
  /** Count of lesson_progress rows referencing this lesson — any value > 0
   * means at least one student has interacted with it, which is what
   * admin_delete_lesson() itself checks server-side before allowing a hard
   * delete (see supabase/phase9.sql). Surfaced here so the UI can warn
   * before the admin even attempts the action. */
  progressCount: number;
}

export interface BuilderModule {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  position: number;
  lessons: BuilderLesson[];
}

export interface CourseBuilderData {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    status: string;
    priceCents: number | null;
    currency: string;
    isPaid: boolean;
  };
  modules: BuilderModule[];
}

export async function getCourseBuilderData(courseId: string): Promise<CourseBuilderData | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, description, status, price_cents, currency, is_paid")
    .eq("id", courseId)
    .single();

  if (!course) return null;

  // modules -> lessons is a genuine direct foreign key (unlike the
  // auth.users-mediated relationships elsewhere in this file), so
  // PostgREST's relationship embedding is appropriate here — this mirrors
  // the same pattern already used learner-side in lib/data/courses.ts.
  const { data: moduleRows } = await supabase
    .from("modules")
    .select(
      "id, title, slug, description, position, lessons(id, title, slug, description, content, duration_minutes, position, is_published)"
    )
    .eq("course_id", courseId)
    .order("position");

  const allLessonIds = ((moduleRows ?? []) as any[]).flatMap((m) => (m.lessons ?? []).map((l: any) => l.id));

  const { data: progressRows } = allLessonIds.length
    ? await supabase.from("lesson_progress").select("lesson_id").in("lesson_id", allLessonIds)
    : { data: [] as { lesson_id: string }[] };

  const progressCountByLesson = new Map<string, number>();
  for (const p of progressRows ?? []) {
    progressCountByLesson.set(p.lesson_id, (progressCountByLesson.get(p.lesson_id) ?? 0) + 1);
  }

  const modules: BuilderModule[] = ((moduleRows ?? []) as any[])
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      description: m.description,
      position: m.position,
      lessons: (m.lessons ?? [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((l: any) => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          description: l.description,
          content: l.content,
          durationMinutes: l.duration_minutes,
          position: l.position,
          isPublished: l.is_published,
          progressCount: progressCountByLesson.get(l.id) ?? 0,
        })),
    }));

  return {
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      status: course.status,
      priceCents: course.price_cents,
      currency: course.currency,
      isPaid: course.is_paid,
    },
    modules,
  };
}

export async function getLessonForEdit(lessonId: string): Promise<(BuilderLesson & { moduleId: string; courseId: string }) | null> {
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, slug, description, content, duration_minutes, position, is_published, module_id")
    .eq("id", lessonId)
    .single();

  if (!lesson) return null;

  const { data: mod } = await supabase.from("modules").select("course_id").eq("id", lesson.module_id).single();
  const { count: progressCount } = await supabase
    .from("lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description,
    content: lesson.content,
    durationMinutes: lesson.duration_minutes,
    position: lesson.position,
    isPublished: lesson.is_published,
    progressCount: progressCount ?? 0,
    moduleId: lesson.module_id,
    courseId: mod?.course_id ?? "",
  };
}

// ============================================================================
// PHASE 12 ADDITION — Launch Readiness
// ============================================================================
// Every check here reports only a status label ("ready" / "needs_attention"
// / "unable_to_verify") plus a short human explanation — never a secret
// value. This file has no "use client" directive, so process.env reads
// here only ever run server-side; the values themselves are never sent to
// the browser, only the derived boolean-ish status.

export type ReadinessStatus = "ready" | "needs_attention" | "unable_to_verify";

export interface ReadinessCheck {
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export async function getLaunchReadiness(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];

  // --- Supabase ---
  const supabaseConfigured = isSupabaseConfigured();
  checks.push({
    label: "Supabase Configuration",
    status: supabaseConfigured ? "ready" : "needs_attention",
    detail: supabaseConfigured
      ? "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
      : "Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  });

  if (!supabaseConfigured) {
    checks.push({
      label: "Database Tables / Migrations",
      status: "unable_to_verify",
      detail: "Can't check without a Supabase connection.",
    });
    checks.push({ label: "Admin Access", status: "unable_to_verify", detail: "Can't check without a Supabase connection." });
    checks.push({
      label: "Published Course Availability",
      status: "unable_to_verify",
      detail: "Can't check without a Supabase connection.",
    });
    checks.push({
      label: "Certificate Configuration",
      status: "unable_to_verify",
      detail: "Can't check without a Supabase connection.",
    });
  } else {
    const supabase = await createClient();

    // A lightweight existence probe for a handful of tables that only
    // exist once every migration through phase9.sql has run. This can't
    // distinguish "table missing" from "table exists but RLS denies this
    // query" with certainty, so a failure is reported as needs_attention
    // with an honest caveat rather than a hard "broken" claim.
    let migrationsOk = true;
    try {
      const results = await Promise.all([
        supabase.from("courses").select("id", { head: true, count: "exact" }),
        supabase.from("enrollments").select("id", { head: true, count: "exact" }),
        supabase.from("orders").select("id", { head: true, count: "exact" }),
        supabase.from("admin_audit_log").select("id", { head: true, count: "exact" }),
      ]);
      migrationsOk = results.every((r) => !r.error);
    } catch {
      migrationsOk = false;
    }
    checks.push({
      label: "Database Tables / Migrations",
      status: migrationsOk ? "ready" : "needs_attention",
      detail: migrationsOk
        ? "Core tables (courses, enrollments, orders, admin_audit_log) are reachable."
        : "One or more expected tables couldn't be queried — confirm every supabase/*.sql file has been run, in order.",
    });

    const { count: adminCount } = await supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("role", "admin");
    checks.push({
      label: "Admin Access",
      status: (adminCount ?? 0) > 0 ? "ready" : "needs_attention",
      detail:
        (adminCount ?? 0) > 0
          ? `${adminCount} administrator account(s) configured.`
          : "No administrator account exists yet — see the README's manual bootstrap step.",
    });

    const { count: publishedCount } = await supabase
      .from("courses")
      .select("id", { head: true, count: "exact" })
      .eq("status", "published");
    checks.push({
      label: "Published Course Availability",
      status: (publishedCount ?? 0) > 0 ? "ready" : "needs_attention",
      detail:
        (publishedCount ?? 0) > 0
          ? `${publishedCount} published course(s) — visible on the public catalog.`
          : "No published courses yet — the public catalog will be empty.",
    });

    // Certificate configuration: every published course should have a
    // certification_name and a published assessment, otherwise a student
    // could complete the course with no way to become certificate-eligible.
    const { data: publishedCourses } = await supabase
      .from("courses")
      .select("id, certification_name")
      .eq("status", "published");
    let certOk = true;
    let certDetail = "Every published course has a certification name and a published assessment.";
    if (publishedCourses && publishedCourses.length > 0) {
      const missingCertName = publishedCourses.filter((c) => !c.certification_name);
      const { data: assessmentRows } = await supabase
        .from("assessments")
        .select("course_id")
        .eq("is_published", true)
        .in(
          "course_id",
          publishedCourses.map((c) => c.id)
        );
      const coursesWithAssessment = new Set((assessmentRows ?? []).map((a) => a.course_id));
      const missingAssessment = publishedCourses.filter((c) => !coursesWithAssessment.has(c.id));
      if (missingCertName.length > 0 || missingAssessment.length > 0) {
        certOk = false;
        certDetail = `${missingCertName.length} published course(s) missing a certification name; ${missingAssessment.length} missing a published assessment.`;
      }
    }
    checks.push({ label: "Certificate Configuration", status: certOk ? "ready" : "needs_attention", detail: certDetail });
  }

  // --- Server-only Supabase key used by the Stripe webhook ---
  const serviceRolePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  checks.push({
    label: "Supabase Webhook Service Role",
    status: serviceRolePresent ? "ready" : "needs_attention",
    detail: serviceRolePresent
      ? "SUPABASE_SERVICE_ROLE_KEY is set server-side."
      : "SUPABASE_SERVICE_ROLE_KEY is missing — Stripe webhook processing cannot safely grant paid enrollment.",
  });

  // --- Stripe ---
  const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeSecretPresent = Boolean(stripeSecret);
  // Computed once here since both the Checkout Configuration and
  // Production Application URL checks below need to agree with each
  // other — and with the real check that actually gates checkout in
  // lib/actions/payments.ts — on whether the site URL is usable.
  const checkoutUrlValidation = getValidatedSiteUrlForCheckout();
  const stripeMode = stripeSecret.startsWith("sk_live_")
    ? "live"
    : stripeSecret.startsWith("sk_test_")
      ? "test"
      : stripeSecretPresent
        ? "unknown"
        : "missing";
  checks.push({
    label: "Stripe Configuration",
    status: stripeSecretPresent ? "ready" : "needs_attention",
    detail: stripeSecretPresent
      ? `STRIPE_SECRET_KEY is set (${stripeMode} mode detected).`
      : "STRIPE_SECRET_KEY is not set — checkout cannot work.",
  });

  const webhookSecretPresent = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  checks.push({
    label: "Stripe Webhook Configuration",
    status: webhookSecretPresent ? "ready" : "needs_attention",
    detail: webhookSecretPresent
      ? "STRIPE_WEBHOOK_SECRET is set. This only confirms the variable exists — actually confirming the webhook endpoint itself is registered and reachable requires checking the Stripe Dashboard directly."
      : "STRIPE_WEBHOOK_SECRET is not set — payments could complete in Stripe but never grant enrollment.",
  });

  checks.push({
    label: "Checkout Configuration",
    status: stripeSecretPresent && checkoutUrlValidation.ok ? "ready" : "needs_attention",
    detail: !stripeSecretPresent
      ? "Checkout cannot be created without STRIPE_SECRET_KEY."
      : !checkoutUrlValidation.ok
        ? `Checkout is blocked: ${checkoutUrlValidation.error}`
        : "Checkout session creation is configured, including a valid absolute redirect URL. Full verification requires a real test-mode purchase — see the Live Verification Checklist.",
  });

  // --- Resend ---
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  checks.push({
    label: "Email / Resend Configuration",
    status: resendConfigured ? "ready" : "needs_attention",
    detail: resendConfigured
      ? "RESEND_API_KEY and EMAIL_FROM are set."
      : "Not configured — transactional emails will be skipped (logged, not sent). The platform still functions without this.",
  });

  // --- Site URL ---
  // Phase 16: reuses the same strict validator that actually gates
  // checkout (lib/email/site-url.ts) rather than a separate, looser check
  // — so this status can never disagree with whether checkout will
  // actually work. Also flags known placeholder/example domains that
  // would otherwise pass a naive "is it HTTPS" check (this codebase's own
  // fallback placeholder, "NextHorizonAIAcademy.com", and other common
  // placeholders like "example.com"/"yourdomain.com").
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const PLACEHOLDER_DOMAINS = ["nexthorizonaiacademy.com", "example.com", "yourdomain.com", "yoursite.com"];
  const looksLikePlaceholder = PLACEHOLDER_DOMAINS.some((d) => rawSiteUrl.toLowerCase().includes(d));
  const siteUrlReady = checkoutUrlValidation.ok && !looksLikePlaceholder;
  checks.push({
    label: "Production Application URL",
    status: siteUrlReady ? "ready" : "needs_attention",
    detail: !rawSiteUrl
      ? "NEXT_PUBLIC_SITE_URL is not set. Checkout will refuse to start, and email links will omit their call-to-action button, until this is set to your real domain."
      : !checkoutUrlValidation.ok
        ? checkoutUrlValidation.error
        : looksLikePlaceholder
          ? `NEXT_PUBLIC_SITE_URL (${rawSiteUrl}) looks like a placeholder/example domain, not a real production domain.`
          : `NEXT_PUBLIC_SITE_URL is set to ${rawSiteUrl}.`,
  });

  // --- Contact email ---
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
  const contactEmailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  checks.push({
    label: "Academy Contact Information",
    status: contactEmailLooksValid ? "ready" : "needs_attention",
    detail: contactEmailLooksValid
      ? `NEXT_PUBLIC_CONTACT_EMAIL is set — the Contact page shows a working mailto: link.`
      : "NEXT_PUBLIC_CONTACT_EMAIL is not set (or not a valid email address) — the Contact page shows a professional placeholder message instead of a real contact channel. Set this before public launch.",
  });

  return checks;
}
