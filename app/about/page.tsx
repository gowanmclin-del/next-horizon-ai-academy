import PageHero from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'About | Next Horizon AI Academy',
  description: "Learn about Next Horizon AI Academy's mission to make practical, responsible AI education accessible to beginners, professionals, and business owners.",
};


const VALUES = [
  ["Practical", "We focus on AI skills learners can apply to real work, business, creativity, and everyday problem-solving."],
  ["Accessible", "Our learning experience is designed to welcome beginners without talking down to them or assuming a technical background."],
  ["Responsible", "We teach learners to use AI thoughtfully, ethically, and with an understanding of its limits."],
  ["Forward-Looking", "The academy is built to help learners keep adapting as artificial intelligence continues to evolve."],
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Our Story" title="AI Education Built From a Learner's Perspective" description="Next Horizon AI Academy was created to make artificial intelligence understandable, practical, and useful for people who want to move confidently into the future." />
      <section className="bg-horizon-cloud py-20 sm:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-horizon-blue">Founded in San Francisco. Built for the World.</p>
            <h2 className="mt-3 text-3xl font-extrabold text-horizon-navy">A bridge between curiosity and confidence</h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-slate-600">
            <p>Next Horizon AI Academy was founded by Gowan Mclin after his own experience learning how AI could improve productivity, learning, creativity, and problem-solving.</p>
            <p>The academy is being built for beginners, professionals, entrepreneurs, small business owners, creators, and lifelong learners who want a clear path into artificial intelligence without unnecessary complexity.</p>
          </div>
        </div>
      </section>
      <section className="bg-white py-20 sm:py-28">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold text-horizon-navy">What guides the academy</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(([title, body]) => <article key={title} className="rounded-2xl border border-slate-200 p-6 shadow-sm"><h3 className="text-xl font-bold text-horizon-navy">{title}</h3><p className="mt-3 leading-relaxed text-slate-600">{body}</p></article>)}
          </div>
        </div>
      </section>
    </>
  );
}
