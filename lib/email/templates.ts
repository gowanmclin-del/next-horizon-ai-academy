// Shared HTML wrapper + specific templates for academy transactional
// emails. Tone: professional, encouraging, educational — students are
// learners, never "customers," per brand guidance.
//
// Every value that could contain student-supplied text (first name, in
// particular) is passed through escapeHtml() before being interpolated
// into HTML, so a name like `<script>` can't break the email markup.
//
// CTA links are built from NEXT_PUBLIC_SITE_URL (see lib/email/site-url.ts)
// and are simply omitted — not hardcoded to localhost or guessed — when
// that variable isn't set.

import { buildSiteUrl } from "./site-url";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ctaButton(label: string, href: string | null): string {
  if (!href) return "";
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563EB;">
          <a href="${href}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>`;
}

function wrapper(bodyHtml: string): string {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #0F172A;">
    <div style="padding: 24px 0; border-bottom: 3px solid #2563EB;">
      <span style="font-weight: 800; font-size: 18px; color: #0F172A;">Next Horizon AI Academy</span>
    </div>
    <div style="padding: 24px 0;">
      ${bodyHtml}
    </div>
    <div style="padding: 24px 0; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
      Next Horizon AI Academy — Learn AI. Shape the Future.
    </div>
  </div>`;
}

export function welcomeEmail(firstName: string | null): { subject: string; html: string } {
  const name = escapeHtml(firstName || "there");
  const dashboardUrl = buildSiteUrl("/dashboard");
  return {
    subject: "Welcome to Next Horizon AI Academy",
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>Welcome to Next Horizon AI Academy. Your account is ready, and AI-101: Foundations of Artificial Intelligence is waiting for you whenever you're ready to start.</p>
      ${ctaButton("Explore Your Dashboard", dashboardUrl)}
      <p>We're glad you're here.</p>
    `),
  };
}

export function enrollmentConfirmationEmail(
  firstName: string | null,
  courseTitle: string,
  courseSlug: string
): { subject: string; html: string } {
  const name = escapeHtml(firstName || "there");
  const title = escapeHtml(courseTitle);
  const learnUrl = buildSiteUrl(`/courses/${courseSlug}/learn`);
  return {
    subject: `You're enrolled in ${courseTitle}`,
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>You're enrolled in <strong>${title}</strong>. You can pick up right where you left off any time.</p>
      ${ctaButton("Start Learning", learnUrl)}
    `),
  };
}

export function courseCompletionEmail(
  firstName: string | null,
  courseTitle: string,
  courseSlug: string
): { subject: string; html: string } {
  const name = escapeHtml(firstName || "there");
  const title = escapeHtml(courseTitle);
  const assessmentUrl = buildSiteUrl(`/courses/${courseSlug}/assessment`);
  return {
    subject: `You completed ${courseTitle}`,
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>Congratulations on completing every lesson in <strong>${title}</strong>. Nice work seeing it through.</p>
      <p>The final assessment is the last step toward your certificate.</p>
      ${ctaButton("Take Your Assessment", assessmentUrl)}
    `),
  };
}

export function certificateIssuedEmail(
  firstName: string | null,
  certificateName: string,
  certificateNumber: string,
  verificationCode: string
): { subject: string; html: string } {
  const name = escapeHtml(firstName || "there");
  const certName = escapeHtml(certificateName);
  const certNumber = escapeHtml(certificateNumber);
  const verifyUrl = buildSiteUrl(`/verify/${encodeURIComponent(verificationCode)}`);
  return {
    subject: `Your ${certificateName} credential is ready`,
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>Your <strong>${certName}</strong> credential has been issued.</p>
      <p>Certificate number: <strong>${certNumber}</strong><br/>
      Verification code: <strong>${escapeHtml(verificationCode)}</strong></p>
      <p>Anyone can confirm this credential using the link below.</p>
      ${ctaButton("Verify Certificate", verifyUrl)}
    `),
  };
}
