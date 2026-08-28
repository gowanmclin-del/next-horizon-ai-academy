import PageHero from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Resources | Next Horizon AI Academy',
  description: 'Practical AI learning resources, guides, and references from Next Horizon AI Academy.',
};

const RES=["Beginner AI guides","Prompting tips and examples","AI terminology and explainers","Responsible AI resources","Business and productivity use cases","Academy news and course updates"];
export default function ResourcesPage(){return <><PageHero eyebrow="Resources" title="Useful AI Learning Beyond the Classroom" description="The resource center will give learners practical reference material they can return to as they build confidence using AI."/><section className="bg-white py-20 sm:py-28"><div className="container-page"><h2 className="text-3xl font-extrabold text-horizon-navy">Resource library roadmap</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{RES.map(r=><div key={r} className="rounded-xl border border-slate-200 bg-horizon-cloud p-6 font-semibold text-slate-700">{r}</div>)}</div><p className="mt-8 text-slate-500">Resources will be published as academy content is finalized.</p></div></section></>}
