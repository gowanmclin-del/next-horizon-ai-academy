// Resend-ready transactional email architecture. Nothing in the student
// workflow depends on this succeeding — every call site awaits sendEmail()
// and only logs the outcome, so a missing RESEND_API_KEY (the default in
// this environment) never breaks signup, enrollment, or certification.
//
// Required env vars (see .env.example): RESEND_API_KEY, EMAIL_FROM.

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailConfigured()) {
    console.log(`[email skipped — not configured] would have sent "${input.subject}" to ${input.to}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    // Dynamic import so the 'resend' package is only ever touched when a
    // key is actually present — the rest of the app has no hard dependency
    // on it being installed.
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error("[email send failed]", error);
      return { sent: false, reason: "send_error" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email send failed]", err);
    return { sent: false, reason: "exception" };
  }
}
