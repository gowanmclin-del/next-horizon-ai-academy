"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/server";

// Every action here re-checks admin status itself (via the profiles.role
// read, same as requireAdmin() in lib/data/admin.ts) BEFORE doing anything
// — never trust that a request reaching this file came from an admin page,
// since Server Actions are directly callable endpoints. The actual writes
// then go through admin_grant_enrollment()/admin_revoke_enrollment()
// (supabase/phase7.sql), which check is_admin(auth.uid()) again themselves
// at the database layer — two independent checks, not one.

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") throw new Error("Not authorized");

  return supabase;
}

export interface StudentSearchResult {
  id: string;
  email: string;
  name: string;
}

export async function searchStudents(query: string): Promise<StudentSearchResult[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await assertAdmin();

  const term = `%${query.trim()}%`;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("role", "student")
    .or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`)
    .limit(10);

  return (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email,
  }));
}

export interface GrantEnrollmentInput {
  studentId: string;
  courseId: string;
  enrollmentType: "complimentary" | "scholarship" | "administrative";
  note: string;
}

export async function grantComplimentaryEnrollment(
  input: GrantEnrollmentInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };

  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_grant_enrollment", {
      p_student_id: input.studentId,
      p_course_id: input.courseId,
      p_enrollment_type: input.enrollmentType,
      p_note: input.note || null,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/enrollments");
    revalidatePath("/admin");
    revalidatePath(`/admin/students/${input.studentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function revokeEnrollment(
  enrollmentId: string,
  note: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };

  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_revoke_enrollment", {
      p_enrollment_id: enrollmentId,
      p_note: note || null,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/enrollments");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ============================================================================
// PHASE 8 ADDITIONS
// ============================================================================

export interface UserSearchResult {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Searches ALL profiles (not just students) — used by /admin/admins to
 * find an existing account to promote. */
export async function searchAllUsers(query: string): Promise<UserSearchResult[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await assertAdmin();

  const term = `%${query.trim()}%`;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role")
    .or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`)
    .limit(10);

  return (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email,
    role: p.role,
  }));
}

/**
 * Promotes an existing student account to admin. This is NOT a plain
 * profile update — it calls admin_promote_user() (supabase/phase8.sql),
 * which independently re-verifies the caller is already an admin, checks
 * the target exists and isn't already an admin, performs the update, and
 * records the promotion in admin_audit_log — all inside one atomic
 * database transaction.
 */
export async function promoteToAdmin(targetUserId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };

  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_promote_user", { p_target_user_id: targetUserId });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/admins");
    revalidatePath("/admin/activity");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ----------------------------------------------------------------------------
// Stripe refund
// ----------------------------------------------------------------------------
// Order of operations matters here and mirrors the Phase 8 brief exactly:
//   1. Re-verify (fresh read) the order is actually refundable.
//   2. Log "refund_initiated" BEFORE calling Stripe, so an attempt is on
//      record even if the Stripe call itself fails or the process crashes
//      mid-request.
//   3. Call Stripe. If Stripe errors, stop — nothing in the academy
//      database changes.
//   4. Only after Stripe confirms success, call admin_mark_order_refunded()
//      — the only function that can ever set an order's status to
//      'refunded' — which itself re-checks status = 'paid' atomically
//      (protecting against a double-refund even if this action somehow
//      ran twice) and optionally revokes the linked enrollment.
// The order row is never deleted at any point — it remains the permanent
// financial record, exactly as before, just with status = 'refunded'.
export interface RefundOrderResult {
  ok: boolean;
  error?: string;
  enrollmentRevoked?: boolean;
}

export async function refundOrder(
  orderId: string,
  revokeEnrollment: boolean,
  note: string
): Promise<RefundOrderResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  if (!isStripeConfigured()) return { ok: false, error: "Stripe is not configured in this environment." };

  const supabase = await assertAdmin();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, stripe_payment_intent_id, amount_cents, currency")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return { ok: false, error: "Order not found." };
  if (order.status !== "paid") {
    return { ok: false, error: `This order can't be refunded — its current status is "${order.status}".` };
  }
  if (!order.stripe_payment_intent_id) {
    return { ok: false, error: "This order has no Stripe payment reference on file." };
  }

  // Record intent before touching Stripe — see comment above.
  await supabase.rpc("admin_log_action", {
    p_action: "refund_initiated",
    p_target_type: "order",
    p_target_id: orderId,
    p_metadata: { amount_cents: order.amount_cents, currency: order.currency },
  });

  let stripeRefundId: string;
  try {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });
    stripeRefundId = refund.id;
  } catch (err) {
    console.error("[refundOrder] Stripe refund failed", err);
    return {
      ok: false,
      error: "Stripe couldn't process the refund. No academy records were changed. Check the Stripe Dashboard for details.",
    };
  }

  const { data, error: markError } = await supabase.rpc("admin_mark_order_refunded", {
    p_order_id: orderId,
    p_revoke_enrollment: revokeEnrollment,
    p_stripe_refund_id: stripeRefundId,
    p_note: note || null,
  });

  if (markError) {
    // The money has already been refunded in Stripe at this point — this
    // is a genuinely bad state (paid in Stripe's eyes: no; refunded: yes;
    // but our database still says 'paid'). Surface this loudly rather
    // than pretending it succeeded.
    console.error(
      `[refundOrder] CRITICAL: Stripe refund ${stripeRefundId} succeeded but admin_mark_order_refunded failed for order ${orderId}`,
      markError.message
    );
    return {
      ok: false,
      error:
        "The refund succeeded in Stripe, but the academy record couldn't be updated. Please check the Stripe Dashboard and this order manually.",
    };
  }

  const result = Array.isArray(data) ? data[0] : data;

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/students");

  return { ok: true, enrollmentRevoked: Boolean(result?.enrollment_revoked) };
}

export interface UpdateCourseInput {
  courseId: string;
  courseSlug: string;
  title: string;
  description: string;
  priceCents: number | null;
  status: string;
}

export async function updateCourse(input: UpdateCourseInput): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };

  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_update_course", {
      p_course_id: input.courseId,
      p_title: input.title,
      p_description: input.description || null,
      p_price_cents: input.priceCents,
      p_status: input.status,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${input.courseId}`);
    // Revalidate the correct public page for THIS course — previously
    // hardcoded to /courses/ai-101 regardless of which course was edited,
    // a real bug now that multiple courses can exist (see PHASE11-NOTES.md).
    revalidatePath(`/courses/${input.courseSlug}`);
    revalidatePath("/courses");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ============================================================================
// PHASE 9 ADDITIONS — admin demotion + course authoring
// ============================================================================

export async function demoteAdmin(targetUserId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_demote_user", { p_target_user_id: targetUserId });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/admins");
    revalidatePath("/admin/activity");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export interface ModuleInput {
  title: string;
  slug: string;
  description: string;
  position: number;
}

export async function createModule(
  courseId: string,
  courseSlug: string,
  input: ModuleInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_create_module", {
      p_course_id: courseId,
      p_title: input.title,
      p_slug: input.slug,
      p_description: input.description || null,
      p_position: input.position,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateModule(
  moduleId: string,
  courseId: string,
  courseSlug: string,
  input: ModuleInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_update_module", {
      p_module_id: moduleId,
      p_title: input.title,
      p_slug: input.slug,
      p_description: input.description || null,
      p_position: input.position,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteModule(
  moduleId: string,
  courseId: string,
  courseSlug: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_delete_module", { p_module_id: moduleId });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function reorderModules(
  courseId: string,
  courseSlug: string,
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_reorder_modules", {
      p_course_id: courseId,
      p_ordered_ids: orderedIds,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export interface LessonInput {
  title: string;
  slug: string;
  description: string;
  content: string;
  durationMinutes: number;
  position: number;
  isPublished: boolean;
}

export async function createLesson(
  moduleId: string,
  courseId: string,
  courseSlug: string,
  input: LessonInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_create_lesson", {
      p_module_id: moduleId,
      p_title: input.title,
      p_slug: input.slug,
      p_description: input.description || null,
      p_content: input.content || null,
      p_duration_minutes: input.durationMinutes,
      p_position: input.position,
      p_is_published: input.isPublished,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  courseSlug: string,
  input: LessonInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_update_lesson", {
      p_lesson_id: lessonId,
      p_title: input.title,
      p_slug: input.slug,
      p_description: input.description || null,
      p_content: input.content || null,
      p_duration_minutes: input.durationMinutes,
      p_position: input.position,
      p_is_published: input.isPublished,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteLesson(
  lessonId: string,
  courseId: string,
  courseSlug: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_delete_lesson", { p_lesson_id: lessonId });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function reorderLessons(
  moduleId: string,
  courseId: string,
  courseSlug: string,
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_reorder_lessons", {
      p_module_id: moduleId,
      p_ordered_ids: orderedIds,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ============================================================================
// PHASE 10 ADDITION — course creation
// ============================================================================

export interface CreateCourseInput {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  priceCents: number | null;
  status: string;
  certificationName: string;
}

export async function createCourse(
  input: CreateCourseInput
): Promise<{ ok: boolean; error?: string; courseId?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };

  try {
    const supabase = await assertAdmin();
    const { data, error } = await supabase.rpc("admin_create_course", {
      p_title: input.title,
      p_slug: input.slug,
      p_short_description: input.shortDescription || null,
      p_description: input.description || null,
      p_price_cents: input.priceCents,
      p_status: input.status,
      p_certification_name: input.certificationName || null,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { ok: true, courseId: data as string };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ============================================================================
// Corporate partnerships — Phase 23
// ============================================================================
export async function updateCorporateLead(input: {
  inquiryId: string;
  status: string;
  priority: string;
  adminNotes: string;
  nextFollowUpAt: string;
}): Promise<{ ok: boolean; error?: string }> {
  const allowedStatuses = new Set(["new","contacted","qualified","proposal","pilot","partner","closed"]);
  const allowedPriorities = new Set(["low","normal","high","urgent"]);
  if (!allowedStatuses.has(input.status) || !allowedPriorities.has(input.priority)) {
    return { ok: false, error: "Invalid lead status or priority." };
  }
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_update_corporate_lead", {
      p_inquiry_id: input.inquiryId,
      p_status: input.status,
      p_priority: input.priority,
      p_admin_notes: input.adminNotes.trim() || null,
      p_next_follow_up_at: input.nextFollowUpAt ? new Date(input.nextFollowUpAt).toISOString() : null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/corporate");
    revalidatePath(`/admin/corporate/${input.inquiryId}`);
    revalidatePath("/admin/activity");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update corporate lead." };
  }
}

export async function updateReadinessFollowup(input: {
  assessmentId: string;
  followUpStatus: string;
  adminNotes: string;
  linkedInquiryId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const allowed = new Set(["new","reviewed","contacted","converted","closed"]);
  if (!allowed.has(input.followUpStatus)) return { ok: false, error: "Invalid follow-up status." };
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc("admin_update_readiness_followup", {
      p_assessment_id: input.assessmentId,
      p_follow_up_status: input.followUpStatus,
      p_admin_notes: input.adminNotes.trim() || null,
      p_linked_inquiry_id: input.linkedInquiryId || null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/corporate/readiness");
    revalidatePath(`/admin/corporate/readiness/${input.assessmentId}`);
    revalidatePath("/admin/activity");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update readiness follow-up." };
  }
}
