import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Contact | Next Horizon AI Academy",
  description: "Get in touch with Next Horizon AI Academy for learner support, partnerships, or general questions.",
};

// Server Component — NEXT_PUBLIC_CONTACT_EMAIL is read at render time on
// the server, same as any other environment-driven value in this app.
// Prefixed NEXT_PUBLIC_ because it's genuinely public information (an
// email address meant to be displayed), not a secret.
function getContactEmail(): string | null {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (!email) return null;
  // Basic shape check so a malformed value (e.g. a stray placeholder
  // string) doesn't render as a broken mailto: link — falls back to the
  // "not configured" state instead, same as leaving it unset.
  const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return looksValid ? email : null;
}

export default function ContactPage() {
  const contactEmail = getContactEmail();

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Connect With Next Horizon AI Academy"
        description="Whether you're a future learner, educator, organization, or potential partner, we want to make it easy to connect with the academy."
      />
      <section className="bg-horizon-cloud py-20 sm:py-28">
        <div className="container-page grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-7">
            <h2 className="text-xl font-bold text-horizon-navy">Learners</h2>
            <p className="mt-3 text-slate-600">Use the Founding Class page for early enrollment and launch information.</p>
            <a href="/founding-class" className="mt-5 inline-block font-semibold text-horizon-blue">
              Founding Class →
            </a>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-7">
            <h2 className="text-xl font-bold text-horizon-navy">Organizations</h2>
            <p className="mt-3 text-slate-600">
              Explore workforce pilots, sponsored cohorts, readiness assessments, and technology collaborations.
            </p>
            <a href="/corporate-partnerships" className="mt-5 inline-block font-semibold text-horizon-blue">
              Corporate Partnerships →
            </a>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-7">
            <h2 className="text-xl font-bold text-horizon-navy">General Questions</h2>
            {contactEmail ? (
              <>
                <p className="mt-3 text-slate-600">Send us a message and we&rsquo;ll get back to you.</p>
                <a href={`mailto:${contactEmail}`} className="mt-5 inline-block font-semibold text-horizon-blue">
                  {contactEmail}
                </a>
              </>
            ) : (
              <p className="mt-3 text-slate-600">
                A direct academy contact channel is being finalized. Please check back soon.
              </p>
            )}
          </article>
        </div>
      </section>
    </>
  );
}
