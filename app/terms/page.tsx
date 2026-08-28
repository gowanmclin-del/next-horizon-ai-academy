import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Terms of Use | Next Horizon AI Academy",
  description: "The terms governing use of Next Horizon AI Academy's website and courses.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "Accounts",
    body: [
      "You must create an account to enroll in a course. You're responsible for maintaining the confidentiality of your password and for all activity under your account.",
      "You must provide accurate information when creating your account and keep it up to date.",
    ],
  },
  {
    heading: "Course enrollment and access",
    body: [
      "Paid courses require successful payment through our payment processor, Stripe, before enrollment is granted. Free courses may be enrolled in directly.",
      "Course access is for your individual, personal use. Sharing your account or reselling access to a course is not permitted.",
      "The academy may, at its discretion, revoke access to a course — for example, in cases of a processed refund, a violation of these terms, or a support resolution. Revoking access does not automatically affect any separate payment record.",
    ],
  },
  {
    heading: "Payments and refunds",
    body: [
      "Prices are shown in U.S. dollars unless stated otherwise. Payment is processed by Stripe; we do not store your full payment card details.",
      "Refund requests are handled on a case-by-case basis by academy staff. A refund does not automatically revoke your course access — access and payment status are tracked independently, and any access change resulting from a refund will be communicated to you.",
      "Complimentary, scholarship, or administratively granted enrollments are provided at the academy's discretion and are not associated with a payment.",
    ],
  },
  {
    heading: "Certification",
    body: [
      "The Certified AI Foundations Professional (CAFP) credential, and any other certification the academy offers, is an academy-issued credential reflecting completion of the associated course's requirements. It is not a government license, industry-wide accreditation, or university degree.",
      "A certificate is issued only after the required lessons are completed and the course's final assessment is passed, as verified by our systems. Certificates include a unique verification code that allows anyone you share it with to independently confirm it was genuinely issued.",
      "The academy reserves the right to revoke a certificate found to have been obtained through fraud or a violation of these terms.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Do not attempt to circumvent course access controls, share paid course content outside your own account, or interfere with the academy's systems.",
      "Do not use the academy's platform for any unlawful purpose.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "Course content — including lessons, assessments, and academy branding — is owned by Next Horizon AI Academy or its licensors and is provided for your personal learning use. It may not be copied, redistributed, or used to create a competing product without permission.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms as the academy evolves. Material changes will be reflected on this page with an updated revision date.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "The academy's courses and certifications are provided for educational purposes. To the fullest extent permitted by law, the academy is not liable for indirect, incidental, or consequential damages arising from your use of the platform.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Use"
        description="The terms governing your use of Next Horizon AI Academy's website, courses, and certifications."
      />
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-3xl rounded-2xl border border-horizon-gold/40 bg-horizon-gold/10 p-6 text-sm leading-relaxed text-horizon-navy">
            <p className="font-bold uppercase tracking-wide text-horizon-gold">Draft — Pending Legal Review</p>
            <p className="mt-2">
              This page accurately describes how enrollment, payments, refunds, and certification currently work on
              this platform, but has not been reviewed by a lawyer and should not be treated as final, legally
              binding terms. It should be reviewed by qualified legal counsel before public launch.
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
