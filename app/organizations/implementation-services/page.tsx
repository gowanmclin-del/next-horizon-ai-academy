import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Adoption & Implementation Services | Next Horizon AI Academy",
  description: "Use-case discovery, workflow design, workforce enablement, implementation planning, pilot adoption, and optimization support for enterprise AI initiatives.",
};

const stages = [
  ["Discovery & readiness", "Clarify business goals, current AI use, approved technology, stakeholders, knowledge sources, workflows, risks, and adoption barriers."],
  ["Use-case prioritization", "Evaluate candidate opportunities by business value, feasibility, data/knowledge requirements, human oversight, user experience, and measurable outcomes."],
  ["Solution & workflow design", "Define the target workflow, users, inputs, systems, permissions, review points, agent or automation responsibilities, and success criteria."],
  ["Enablement & launch", "Prepare users, managers, champions, communications, training, office hours, and launch support around the selected solution."],
  ["Adoption & optimization", "Measure usage and outcomes, collect user feedback, refine workflows, identify friction, and prioritize the next use cases."],
];

export default function Page() {
  return <>
    <section className="bg-horizon-navy py-20 text-white sm:py-24">
      <div className="container-page max-w-5xl">
        <p className="font-bold uppercase tracking-[.18em] text-horizon-gold">AI Adoption & Implementation Services</p>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-6xl">Turn enterprise AI into a working business process.</h1>
        <p className="mt-6 max-w-4xl text-lg leading-relaxed text-slate-200">Next Horizon helps organizations move from AI ideas and tool access to prioritized use cases, prepared teams, implementation plans, pilots, and measurable adoption.</p>
      </div>
    </section>

    <section className="bg-white py-20">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_.8fr]">
        <div>
          <p className="font-bold uppercase tracking-wider text-horizon-blue">Implementation lifecycle</p>
          <h2 className="mt-3 text-3xl font-extrabold text-horizon-navy">From strategy to sustained use</h2>
          <div className="mt-8 space-y-5">
            {stages.map(([title, copy], index) => <article key={title} className="rounded-2xl border border-slate-200 p-6">
              <div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-horizon-blue font-bold text-white">{index + 1}</span><div><h3 className="text-lg font-bold text-horizon-navy">{title}</h3><p className="mt-2 leading-relaxed text-slate-600">{copy}</p></div></div>
            </article>)}
          </div>
        </div>
        <aside className="h-fit rounded-2xl bg-horizon-cloud p-8 lg:sticky lg:top-24">
          <p className="font-bold uppercase tracking-wider text-horizon-blue">Common engagement areas</p>
          <ul className="mt-5 space-y-3 text-slate-700">
            <li>Enterprise knowledge access and AI search</li>
            <li>Employee copilots and productivity workflows</li>
            <li>AI agents and multi-step task workflows</li>
            <li>Knowledge-worker onboarding and support</li>
            <li>Role-specific AI use-case development</li>
            <li>Responsible-use and human-review practices</li>
            <li>Champion programs and adoption enablement</li>
            <li>Pilot measurement and expansion roadmaps</li>
          </ul>
          <a href="/organizations/partnership-inquiry" className="mt-7 block rounded-md bg-horizon-blue px-5 py-3 text-center font-bold text-white">Discuss an Implementation Need</a>
        </aside>
      </div>
    </section>

    <section className="bg-horizon-cloud py-20">
      <div className="container-page max-w-5xl">
        <p className="font-bold uppercase tracking-wider text-horizon-blue">Example workflow</p>
        <h2 className="mt-3 text-3xl font-extrabold text-horizon-navy">Enterprise knowledge → employee answer → action</h2>
        <p className="mt-4 max-w-4xl text-slate-600">A professional-services organization wants employees to spend less time searching across disconnected systems and more time completing client work.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {["Connect approved knowledge sources", "Respect existing access permissions", "Retrieve trusted company context", "Support an employee task or agent workflow", "Measure adoption, quality, and time-to-value"].map((x,i)=><div key={x} className="rounded-xl bg-white p-5 shadow-sm"><p className="text-xs font-bold text-horizon-blue">STEP {i+1}</p><p className="mt-2 font-semibold text-horizon-navy">{x}</p></div>)}
        </div>
        <p className="mt-7 text-sm leading-relaxed text-slate-600">Next Horizon’s role can include readiness discovery, use-case selection, workflow definition, workforce enablement, pilot planning, change support, and adoption measurement. Technical deployment scope is defined per project and platform.</p>
      </div>
    </section>

    <section className="bg-white py-20">
      <div className="container-page max-w-4xl text-center"><h2 className="text-3xl font-extrabold text-horizon-navy">Start with the problem, not the tool.</h2><p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">We begin with the work your organization needs to improve, then determine the training, workflow, platform, implementation, and adoption support required.</p><div className="mt-8 flex flex-wrap justify-center gap-4"><a href="/organizations/readiness-assessment" className="rounded-md bg-horizon-gold px-6 py-3.5 font-bold text-horizon-navy">Take the Readiness Assessment</a><a href="/organizations/partnership-inquiry" className="rounded-md bg-horizon-blue px-6 py-3.5 font-bold text-white">Request a Consultation</a></div></div>
    </section>
  </>;
}
