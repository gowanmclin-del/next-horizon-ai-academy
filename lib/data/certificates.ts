"use client";

// Certificate issuance is entirely server-controlled — see
// issue_certificate_if_eligible() in supabase/schema.sql. It re-checks
// enrollment, lesson completion, and a passed assessment attempt inside
// Postgres before writing a certificates row, and is idempotent (calling it
// twice returns the same certificate rather than issuing a second one).
// There is no INSERT policy on the certificates table for students, so this
// RPC is the only way a certificate row can ever be created.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface IssuedCertificate {
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  alreadyIssued: boolean;
}

export async function issueCertificateIfEligible(
  courseId: string
): Promise<{ ok: true; certificate: IssuedCertificate } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  const supabase = createClient();

  const { data, error } = await supabase.rpc("issue_certificate_if_eligible", {
    p_course_id: courseId,
  });

  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    certificate: {
      certificateNumber: row.certificate_number,
      verificationCode: row.verification_code,
      issuedAt: row.issued_at,
      alreadyIssued: row.already_issued,
    },
  };
}

export async function getMyCertificate(courseId: string): Promise<{
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("certificates")
    .select("certificate_number, verification_code, issued_at")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!data) return null;
  return {
    certificateNumber: data.certificate_number,
    verificationCode: data.verification_code,
    issuedAt: data.issued_at,
  };
}

export interface VerificationResult {
  studentName: string;
  certificateName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  status: "valid" | "revoked";
}

/** Public lookup — safe to call from an unauthenticated visitor. Only
 * returns the fields verify_certificate() explicitly selects (see
 * supabase/schema.sql); never exposes email, user id, or assessment score. */
export async function verifyCertificate(code: string): Promise<VerificationResult | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();

  const { data, error } = await supabase.rpc("verify_certificate", {
    p_verification_code: code,
  });

  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    studentName: row.student_name,
    certificateName: row.certificate_name,
    courseTitle: row.course_title,
    certificateNumber: row.certificate_number,
    issuedAt: row.issued_at,
    status: row.status,
  };
}
