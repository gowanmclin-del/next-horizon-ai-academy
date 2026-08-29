import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import PartnershipCTA from "@/components/partnerships/PartnershipCTA";

export const metadata: Metadata = { title: "Corporate AI Training Partnerships | Next Horizon AI Academy", description: "Practical AI workforce training pilots, sponsored cohorts, readiness assessments, and career pathways for employers and community partners." };

const offers = [
  ["AI Foundations Pilot", "Launch a focused introductory cohort that builds practical, responsible AI confidence.", "/corporate-partnerships/ai-foundations-pilot"],
  ["Workforce Readiness Assessment", "Identify adoption gaps, workflow opportunities, governance needs, and training priorities.", "/corporate-partnerships/workforce-readiness"],
  ["Sponsored Learning Cohorts", "Fund access, applied learning, and certificates for employees or community members.", "/corporate-partnerships/founding-partners"],
  ["Certification Career Pathways", "Connect foundational AI fluency to role-aligned credentials and portfolio projects.", "/career-pathways/salesforce-agentforce"],
];

export default function CorporatePartnershipsPage() {
  return <>
    <PageHero eyebrow="Corporate Partnerships" title="From AI Awareness to Workforce Readiness" description="Next Horizon AI Academy helps employers, technology companies, workforce organizations, and community partners turn AI interest into practical, responsible capability." />
    <section className="bg-white py-20 sm:py-28"><div className="container-page">
      <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.18em] text-horizon-blue">Partnership models</p><h2 className="mt-3 text-3xl font-bold text-horizon-navy sm:text-4xl">Programs designed around measurable outcomes</h2><p className="mt-5 text-lg leading-8 text-slate-600">We combine accessible instruction, applied projects, responsible AI practices, and employer-relevant learning pathways. Programs can be adapted for employees, entrepreneurs, educators, or sponsored community cohorts.</p></div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">{offers.map(([title, body, href]) => <article key={title} className="rounded-2xl border border-slate-200 p-7 shadow-sm"><h3 className="text-xl font-bold text-horizon-navy">{title}</h3><p className="mt-3 leading-7 text-slate-600">{body}</p><a href={href} className="mt-5 inline-block font-bold text-horizon-blue">Explore program →</a></article>)}</div>
    </div></section>
    <section className="bg-horizon-cloud py-20"><div className="container-page grid gap-8 lg:grid-cols-3"><div className="lg:col-span-1"><h2 className="text-3xl font-bold text-horizon-navy">Why Next Horizon</h2></div><div className="grid gap-6 sm:grid-cols-2 lg:col-span-2"><div><h3 className="font-bold text-horizon-navy">Accessible by design</h3><p className="mt-2 text-slate-600">Beginner-friendly learning that respects different roles, backgrounds, and levels of technical experience.</p></div><div><h3 className="font-bold text-horizon-navy">Applied, not abstract</h3><p className="mt-2 text-slate-600">Learners build workflows, policies, agent concepts, and implementation plans tied to real needs.</p></div><div><h3 className="font-bold text-horizon-navy">Independent and adaptable</h3><p className="mt-2 text-slate-600">Vendor-aware education that can support multiple tools without overstating endorsements.</p></div><div><h3 className="font-bold text-horizon-navy">Built for partnership</h3><p className="mt-2 text-slate-600">Clear pilot scopes, cohort options, readiness diagnostics, and outcome reporting.</p></div></div></div></section>
    <PartnershipCTA />
  </>;
}
