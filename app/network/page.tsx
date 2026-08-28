import PageHero from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'AI Horizon Network | Next Horizon AI Academy',
  description: 'Learn, connect, and grow with the AI Horizon Network — the community connected to Next Horizon AI Academy.',
};

const ITEMS=[["Continue Learning","Stay connected to new AI ideas, academy learning opportunities, and practical skill development."],["Connect","Meet learners, professionals, entrepreneurs, creators, and innovators with shared interests."],["Collaborate","Exchange ideas, share useful experiences, and explore opportunities to build together."],["Grow","Keep developing after course completion as AI tools, workflows, and opportunities evolve."]];
export default function NetworkPage(){return <><PageHero eyebrow="AI Horizon Network" title="Learn. Connect. Grow." description="The community connected to Next Horizon AI Academy is being designed to help learning continue beyond the classroom."/><section className="bg-horizon-cloud py-20 sm:py-28"><div className="container-page grid gap-6 md:grid-cols-2">{ITEMS.map(([t,b])=><article key={t} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="text-2xl font-bold text-horizon-navy">{t}</h2><p className="mt-3 leading-relaxed text-slate-600">{b}</p></article>)}</div></section></>}
