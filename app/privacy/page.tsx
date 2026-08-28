import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Privacy Policy | Next Horizon AI Academy",
  description: "How Next Horizon AI Academy collects, uses, and protects learner information.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "Information we collect",
    body: [
      "Account information: name, email address, and password (handled by our authentication provider, Supabase — we never see or store your password in plain text).",
      "Profile information you choose to provide: professional role and AI experience level.",
      "Learning data: course enrollments, lesson completion, assessment attempts and scores, and certificates issued.",
      "Payment information: when you purchase a paid course, payment is processed directly by Stripe. We do not receive or store your full card number — we retain only the resulting order record (amount, currency, status, and Stripe's own reference identifiers).",
      "Communications you send us, such as messages through a contact form or founding-class interest submission.",
    ],
  },
  {
    heading: "How we use this information",
    body: [
      "To create and maintain your account and provide access to courses you're enrolled in.",
      "To track and display your learning progress, and to determine certificate eligibility.",
      "To process payments and maintain accurate order and enrollment records.",
      "To send account-related and transactional email (welcome, enrollment confirmation, course completion, certificate issuance, password reset) — these are not optional marketing email and are sent regardless of your communication preferences.",
      "To send optional communications (course updates, learning reminders, academy news) only if you've opted in, from your account's Communication Preferences.",
      "To operate the academy administration system, so authorized academy staff can support students and manage courses.",
    ],
  },
  {
    heading: "Who we share information with",
    body: [
      "Supabase — our database, authentication, and hosting infrastructure provider. Your account and learning data is stored in a Supabase-hosted database.",
      "Stripe — our payment processor. Stripe handles your payment details directly; we never see your full card number.",
      "Resend — our transactional email provider, used to deliver the account and communication emails described above.",
      "We do not sell your personal information to third parties, and we do not share your learning records with other students. Academy staff with administrator access can view student records as needed to operate the academy — see \"Academy administration\" below.",
    ],
  },
  {
    heading: "Academy administration",
    body: [
      "A small number of authorized academy administrators can view student account, enrollment, progress, and order information in order to operate the academy — for example, to grant a complimentary enrollment, process a refund, or help resolve a support issue.",
      "Every sensitive administrative action (promoting an administrator, granting or revoking enrollment, issuing a refund) is permanently logged, including who performed it and when, and this log cannot be edited or deleted through the application.",
    ],
  },
  {
    heading: "Certificate verification",
    body: [
      "If you earn a certificate, its verification page is publicly accessible to anyone who has your certificate's unique verification code, and displays your name, the certification earned, the course, and the issue date. This is by design, so a certificate can be independently verified by anyone you share it with (such as an employer). It is not otherwise searchable or listed publicly.",
    ],
  },
  {
    heading: "Data retention",
    body: [
      "We retain your account and learning records for as long as your account is active, and as needed to maintain accurate financial and certification records. Certain administrative logs (such as the audit log described above) are retained permanently as a matter of academy record-keeping.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can update your profile information and communication preferences at any time from your dashboard.",
      "You can request a copy of your data or ask us to delete your account by contacting us — see the Contact page.",
    ],
  },
  {
    heading: "Cookies and similar technologies",
    body: [
      "We use essential cookies to keep you signed in and to protect against cross-site request forgery. We do not currently use advertising or cross-site tracking cookies. If the academy enables analytics in the future, this policy will be updated first.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="How Next Horizon AI Academy collects, uses, and protects your information."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-3xl rounded-2xl border border-horizon-gold/40 bg-horizon-gold/10 p-6 text-sm leading-relaxed text-horizon-navy">
            <p className="font-bold uppercase tracking-wide text-horizon-gold">Draft — Pending Legal Review</p>
            <p className="mt-2">
              This page accurately describes how the academy&rsquo;s systems currently handle data, but has not been
              reviewed by a lawyer and should not be treated as a final, legally binding privacy policy. It should
              be reviewed by qualified legal counsel — with attention to any specific regulatory obligations that
              apply to the academy&rsquo;s learners (such as GDPR, CCPA, or other regional privacy laws) — before
              public launch.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <p className="text-sm text-slate-500">Last updated: reflects the platform as of this build.</p>
            {SECTIONS.map((s) => (
              <div key={s.heading} className="mt-8">
                <h2 className="text-xl font-bold text-horizon-navy">{s.heading}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                  {s.body.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
