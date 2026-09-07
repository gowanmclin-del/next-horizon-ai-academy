import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Adoption & Implementation for Organizations | Next Horizon AI Academy",
  description:
    "AI readiness, workforce enablement, workflow design, implementation support, and adoption programs for organizations moving AI into real work.",
};

const lifecycle = [
  ["1", "Assess", "Establish the current state: workforce readiness, approved tools, governance, use cases, knowledge access, and adoption barriers."],
  ["2", "Enable", "Build shared AI literacy, prompting skill, responsible-use habits, and role-specific confidence across the team."],
  ["3", "Implement", "Prioritize high-value use cases, map workflows, define success measures, and support platform or agent deployment around real business processes."],
  ["4", "Adopt & Optimize", "Drive usage through change enablement, office hours, workflow refinement, measurement, and a roadmap for the next wave of AI value."],
];

const capabilities = [
  ["AI readiness & strategy", "Assess workforce capability, adoption maturity, business priorities, governance needs, and the operating conditions required for responsible AI use."],
  ["Workforce enablement", "Deliver practical AI foundations, prompting, verification, responsible-use, leadership, and role-based learning tied to business outcomes."],
  ["Use-case & workflow design", "Identify where AI can improve knowledge work, employee productivity, search, content, decision support, service, and repeatable workflows."],
  ["Implementation support", "Translate selected use cases into deployment plans, workflow requirements, stakeholder responsibilities, launch criteria, and measurable pilot outcomes."],
  ["Agents & AI-enabled workflows", "Help teams define agent or workflow objectives, inputs, permissions, human review points, success criteria, and adoption plans."],
  ["Adoption & optimization", "Support launch communications, champions, office hours, feedback loops, workflow refinement, and outcome measurement after initial deployment."],
];

const tracks = [
  ["Workforce Adoption Partner", "Train and enable employees to use approved AI tools effectively, responsibly, and consistently in real work."],
  ["Implementation & Solutions Partner", "Support use-case discovery, workflow design, pilots, deployment planning, adoption, and ongoing optimization."],
  ["Curriculum Licensing Partner", "License structured Next Horizon curriculum for teams, workforce programs, schools, associations, or professional learning."],
  ["Community & Strategic Partner", "Collaborate on sponsored cohorts, workforce programs, community AI access, technology education, or broader AI-skilling initiatives."],
];

export default function OrganizationsPage() {
  return (
    <>
      <section className="bg-horizon-navy py-20 text-white sm:py-28">
        <div className="container-page max-w-5xl">
          <p className="font-bold uppercase tracking-[.18em] text-horizon-gold">Next Horizon AI Academy for Organizations</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-6xl">Move from AI interest to practical adoption.</h1>
          <p className="mt-6 max-w-4xl text-lg leading-relaxed text-slate-200">
            Next Horizon helps organizations assess readiness, enable their workforce, identify high-value AI use cases, support implementation, and build the habits that turn AI investments into useful day-to-day work.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href="/organizations/readiness-assessment" className="rounded-md bg-horizon-gold px-6 py-3.5 font-bold text-horizon-navy">Assess Your AI Readiness</a>
            <a href="/organizations/partnership-inquiry" className="rounded-md border border-white/40 px-6 py-3.5 font-bold text-white">Discuss an Adoption or Implementation Need</a>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-page">
          <div className="max-w-4xl">
            <p className="font-bold uppercase tracking-wider text-horizon-blue">Our approach</p>
            <h2 className="mt-3 text-3xl font-extrabold text-horizon-navy sm:text-4xl">Training is one part of successful AI adoption.</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Organizations need more than a course library. They need a clear use case, the right people and systems, practical implementation support, change enablement, and a way to measure whether AI is actually improving the work.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {lifecycle.map(([number, title, copy]) => (
              <article key={title} className="rounded-2xl border border-slate-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-horizon-blue font-extrabold text-white">{number}</div>
                <h3 className="mt-5 text-xl font-bold text-horizon-navy">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-horizon-cloud py-20">
        <div className="container-page">
          <div className="max-w-3xl">
            <p className="font-bold uppercase tracking-wider text-horizon-blue">Adoption + implementation capabilities</p>
            <h2 className="mt-3 text-3xl font-extrabold text-horizon-navy sm:text-4xl">Built around the full AI journey</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(([title, copy]) => (
              <article key={title} className="rounded-2xl bg-white p-7 shadow-sm">
                <h3 className="text-xl font-bold text-horizon-navy">{title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
          <a href="/organizations/implementation-services" className="mt-8 inline-block font-bold text-horizon-blue">Explore AI adoption & implementation services →</a>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-page">
          <div className="max-w-3xl">
            <p className="font-bold uppercase tracking-wider text-horizon-blue">Corporate Partnership Program</p>
            <h2 className="mt-3 text-3xl font-extrabold text-horizon-navy sm:text-4xl">Four ways to work together</h2>
            <p className="mt-4 text-slate-600">Partnerships can begin with workforce enablement, a focused pilot, an implementation need, curriculum, or a broader strategic initiative.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {tracks.map(([title, copy]) => (
              <article key={title} className="rounded-2xl border border-slate-200 p-7">
                <h3 className="text-xl font-bold text-horizon-navy">{title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-horizon-cloud py-20">
        <div className="container-page grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl bg-white p-7 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-horizon-gold">Launch Offer</p>
            <h2 className="mt-2 text-2xl font-bold">Founding Corporate Partner Program</h2>
            <p className="mt-3 text-slate-600">A limited first cohort for organizations ready to build practical AI capability and measurable adoption.</p>
            <a href="/organizations/founding-partners" className="mt-5 inline-block font-bold text-horizon-blue">Explore Founding Partnership →</a>
          </article>
          <article className="rounded-2xl bg-white p-7 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-horizon-blue">Start With a Pilot</p>
            <h2 className="mt-2 text-2xl font-bold">AI Foundations + Adoption Pilot</h2>
            <p className="mt-3 text-slate-600">Establish a baseline, train a team, identify priority workflows, and leave with an implementation roadmap.</p>
            <a href="/organizations/ai-foundations-pilot" className="mt-5 inline-block font-bold text-horizon-blue">View the Pilot →</a>
          </article>
          <article className="rounded-2xl bg-white p-7 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-horizon-blue">Share Internally</p>
            <h2 className="mt-2 text-2xl font-bold">Capability Statement</h2>
            <p className="mt-3 text-slate-600">A concise overview of Next Horizon’s workforce enablement, implementation, and partnership capabilities.</p>
            <a href="/organizations/capability-statement" className="mt-5 inline-block font-bold text-horizon-blue">View Capability Statement →</a>
          </article>
        </div>
      </section>

      <section className="bg-horizon-navy py-20 text-white">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_.75fr] lg:items-center">
          <div>
            <p className="font-bold uppercase tracking-wider text-horizon-gold">Platform-aware. Outcome-focused.</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">We help connect people, technology, and the work that matters.</h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-200">
              Next Horizon is building a vendor-flexible practice designed to help organizations adopt enterprise AI platforms, knowledge systems, copilots, agents, and workflow tools in ways employees can understand, trust, and use.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-7">
            <h3 className="text-xl font-bold">A typical engagement can include</h3>
            <ul className="mt-5 space-y-3 text-slate-200">
              <li>✓ Readiness and stakeholder discovery</li>
              <li>✓ Priority use-case selection</li>
              <li>✓ Workforce and champion enablement</li>
              <li>✓ Workflow / agent implementation planning</li>
              <li>✓ Pilot launch and adoption support</li>
              <li>✓ Outcome review and expansion roadmap</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-page max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold text-horizon-navy">Have an AI initiative that needs adoption, implementation, or training support?</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">Tell us what your organization is trying to accomplish. We can begin with a readiness assessment, focused pilot, or scoped partnership conversation.</p>
          <a href="/organizations/partnership-inquiry" className="mt-8 inline-block rounded-md bg-horizon-blue px-7 py-3.5 font-bold text-white">Start a Corporate Conversation</a>
        </div>
      </section>
    </>
  );
}
