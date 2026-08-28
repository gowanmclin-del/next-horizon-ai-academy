"use server";

// ---------------------------------------------------------------------------
// TRANSACTIONAL EMAIL TRIGGERS (Phase 5.1 — reliability correction)
// ---------------------------------------------------------------------------
// Phase 5 marked an email as "sent" (via a single claim_*_email() RPC)
// before Resend had actually confirmed delivery — a Resend failure meant
// the database believed the email had gone out, and it would never be
// retried. Phase 5.1 fixes this with a three-step claim/complete/release
// flow, backed by supabase/phase5.1.sql:
//
//   1. claim_*_email(...)    — atomically claims the right to attempt a
//      send (sets *_email_claimed_at). Returns should_send: false if
//      already sent, or if someone else's claim is still active/unexpired.
//   2. Attempt the actual send via sendEmail() (lib/email/resend.ts).
//   3a. On success: complete_*_email(...) — sets *_email_sent_at, which
//       permanently stops any future send for this event.
//   3b. On failure or any exception: release_*_email(...) — clears the
//       claim so a later call (next login, next page view, next retry) can
//       claim and try again. If step 3b itself never runs (e.g. the
//       process is killed mid-request), the claim self-expires after 5
//       minutes inside the SQL functions — a stale claim can delay a retry
//       but can never permanently block delivery.
//
// As in Phase 5, every function here is deliberately forgiving: nothing
// thrown here is allowed to propagate back to the caller, because the
// student action that triggered the email (signup, enrollment, lesson
// completion, certificate issuance) has already succeeded and must never
// be affected by an email provider having a bad day.
//
// No service-role key and no Resend API key are ever available to the
// browser — this file only runs server-side ("use server"), and
// RESEND_API_KEY is read exclusively inside lib/email/resend.ts, which is
// only ever imported from here.
// ---------------------------------------------------------------------------

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";

// Small shared helper: both templates now build course-specific links
// (Phase 11 — previously hardcoded to /courses/ai-101/... regardless of
// which course the email was actually about, a real bug once multiple
// courses exist). Accepts either the cookie-scoped server client or the
// service-role admin client, since this is called from both contexts.
async function getCourseSlug(client: { from: (table: string) => any }, courseId: string): Promise<string> {
  const { data } = await client.from("courses").select("slug").eq("id", courseId).single();
  return data?.slug ?? "ai-101";
}
import {
  welcomeEmail,
  enrollmentConfirmationEmail,
  courseCompletionEmail,
  certificateIssuedEmail,
} from "@/lib/email/templates";

export async function triggerWelcomeEmail(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  let claimed = false;

  try {
    const { data, error } = await supabase.rpc("claim_welcome_email");
    if (error) {
      console.error("[claim_welcome_email failed]", error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.should_send) return;
    claimed = true;

    const { subject, html } = welcomeEmail(row.first_name);
    const result = await sendEmail({ to: row.email, subject, html });

    if (result.sent) {
      const { error: completeError } = await supabase.rpc("complete_welcome_email");
      if (completeError) console.error("[complete_welcome_email failed]", completeError.message);
    } else {
      console.error("[welcome email not sent]", result.reason);
      const { error: releaseError } = await supabase.rpc("release_welcome_email");
      if (releaseError) console.error("[release_welcome_email failed]", releaseError.message);
    }
  } catch (err) {
    console.error("[triggerWelcomeEmail exception]", err);
    if (claimed) {
      try {
        await supabase.rpc("release_welcome_email");
      } catch (releaseErr) {
        console.error("[release_welcome_email exception]", releaseErr);
      }
    }
  }
}

export async function triggerEnrollmentEmail(courseId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  let claimed = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data, error } = await supabase.rpc("claim_enrollment_email", { p_course_id: courseId });
    if (error) {
      console.error("[claim_enrollment_email failed]", error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.should_send) return;
    claimed = true;

    const { subject, html } = enrollmentConfirmationEmail(row.first_name, row.course_title, await getCourseSlug(supabase, courseId));
    const result = await sendEmail({ to: user.email, subject, html });

    if (result.sent) {
      const { error: completeError } = await supabase.rpc("complete_enrollment_email", { p_course_id: courseId });
      if (completeError) console.error("[complete_enrollment_email failed]", completeError.message);
    } else {
      console.error("[enrollment email not sent]", result.reason);
      const { error: releaseError } = await supabase.rpc("release_enrollment_email", { p_course_id: courseId });
      if (releaseError) console.error("[release_enrollment_email failed]", releaseError.message);
    }
  } catch (err) {
    console.error("[triggerEnrollmentEmail exception]", err);
    if (claimed) {
      try {
        await supabase.rpc("release_enrollment_email", { p_course_id: courseId });
      } catch (releaseErr) {
        console.error("[release_enrollment_email exception]", releaseErr);
      }
    }
  }
}

export async function triggerCourseCompletionEmailIfNeeded(courseId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  let claimed = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data, error } = await supabase.rpc("claim_completion_email", { p_course_id: courseId });
    if (error) {
      console.error("[claim_completion_email failed]", error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.should_send) return;
    claimed = true;

    const { subject, html } = courseCompletionEmail(row.first_name, row.course_title, await getCourseSlug(supabase, courseId));
    const result = await sendEmail({ to: user.email, subject, html });

    if (result.sent) {
      const { error: completeError } = await supabase.rpc("complete_completion_email", { p_course_id: courseId });
      if (completeError) console.error("[complete_completion_email failed]", completeError.message);
    } else {
      console.error("[completion email not sent]", result.reason);
      const { error: releaseError } = await supabase.rpc("release_completion_email", { p_course_id: courseId });
      if (releaseError) console.error("[release_completion_email failed]", releaseError.message);
    }
  } catch (err) {
    console.error("[triggerCourseCompletionEmailIfNeeded exception]", err);
    if (claimed) {
      try {
        await supabase.rpc("release_completion_email", { p_course_id: courseId });
      } catch (releaseErr) {
        console.error("[release_completion_email exception]", releaseErr);
      }
    }
  }
}

export async function triggerCertificateEmailIfNeeded(courseId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  let claimed = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data, error } = await supabase.rpc("claim_certificate_email", { p_course_id: courseId });
    if (error) {
      console.error("[claim_certificate_email failed]", error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.should_send) return;
    claimed = true;

    const { subject, html } = certificateIssuedEmail(
      row.first_name,
      row.certificate_name,
      row.certificate_number,
      row.verification_code
    );
    const result = await sendEmail({ to: user.email, subject, html });

    if (result.sent) {
      const { error: completeError } = await supabase.rpc("complete_certificate_email", { p_course_id: courseId });
      if (completeError) console.error("[complete_certificate_email failed]", completeError.message);
    } else {
      console.error("[certificate email not sent]", result.reason);
      const { error: releaseError } = await supabase.rpc("release_certificate_email", { p_course_id: courseId });
      if (releaseError) console.error("[release_certificate_email failed]", releaseError.message);
    }
  } catch (err) {
    console.error("[triggerCertificateEmailIfNeeded exception]", err);
    if (claimed) {
      try {
        await supabase.rpc("release_certificate_email", { p_course_id: courseId });
      } catch (releaseErr) {
        console.error("[release_certificate_email exception]", releaseErr);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 6 ADDITION — enrollment email for the webhook (no session) context
// ---------------------------------------------------------------------------
// triggerEnrollmentEmail() above requires a signed-in cookie session (it
// reads supabase.auth.getUser()), which doesn't exist inside a Stripe
// webhook request. This variant is called from
// app/api/webhooks/stripe/route.ts after a payment is confirmed, using the
// explicit-user-id claim/complete/release functions from
// supabase/phase6.sql (claim_enrollment_email_for_user, etc.) — those are
// granted to `service_role` only, so this function only works when given
// the admin client, never the ordinary anon/authenticated one.
//
// Per the Phase 5.1 lesson about not trusting an editable column as a
// delivery address, this uses Supabase Auth's own admin lookup
// (auth.admin.getUserById) for the destination email, not profiles.email.
//
// This reuses the exact same enrollmentConfirmationEmail template used for
// free-course enrollment — Phase 6 intentionally does not add a separate
// "receipt" email. Stripe Checkout itself can be configured (in the Stripe
// Dashboard) to send its own payment receipt; this email's job is only the
// academy's enrollment confirmation, unchanged in content from Phase 5.
export async function sendEnrollmentEmailForOrder(userId: string, courseId: string): Promise<void> {
  if (!isServiceRoleConfigured()) return;
  const admin = createAdminClient();
  let claimed = false;

  try {
    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
    const email = userResult?.user?.email;
    if (userError || !email) {
      console.error("[sendEnrollmentEmailForOrder] couldn't resolve user email", userError?.message);
      return;
    }

    const { data, error } = await admin.rpc("claim_enrollment_email_for_user", {
      p_user_id: userId,
      p_course_id: courseId,
    });
    if (error) {
      console.error("[claim_enrollment_email_for_user failed]", error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.should_send) return;
    claimed = true;

    const { subject, html } = enrollmentConfirmationEmail(row.first_name, row.course_title, await getCourseSlug(admin, courseId));
    const result = await sendEmail({ to: email, subject, html });

    if (result.sent) {
      const { error: completeError } = await admin.rpc("complete_enrollment_email_for_user", {
        p_user_id: userId,
        p_course_id: courseId,
      });
      if (completeError) console.error("[complete_enrollment_email_for_user failed]", completeError.message);
    } else {
      console.error("[order enrollment email not sent]", result.reason);
      const { error: releaseError } = await admin.rpc("release_enrollment_email_for_user", {
        p_user_id: userId,
        p_course_id: courseId,
      });
      if (releaseError) console.error("[release_enrollment_email_for_user failed]", releaseError.message);
    }
  } catch (err) {
    console.error("[sendEnrollmentEmailForOrder exception]", err);
    if (claimed) {
      try {
        await admin.rpc("release_enrollment_email_for_user", { p_user_id: userId, p_course_id: courseId });
      } catch (releaseErr) {
        console.error("[release_enrollment_email_for_user exception]", releaseErr);
      }
    }
  }
}
