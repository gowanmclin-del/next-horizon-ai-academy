import PageHero from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Start Learning | Next Horizon AI Academy',
  description: 'Create your free Next Horizon AI Academy account and begin your AI learning journey.',
};


export default function StartLearningPage() {
  return (
    <>
      <PageHero
        eyebrow="Start Learning"
        title="Your AI Learning Journey Starts With the Foundation"
        description="Explore AI-101, learn about the CAFP credential, and join the Founding Class as Next Horizon AI Academy prepares to open enrollment."
      />
      <section className="bg-white py-14 sm:py-16">
        <div className="container-page">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-horizon-cloud p-8 text-center">
            <h2 className="text-2xl font-extrabold text-horizon-navy">
              Create your free account to begin
            </h2>
            <p className="text-slate-600">
              A free preview account tracks your AI-101 progress and
              certification status as you learn.
            </p>
            <a
              href="/signup"
              className="rounded-md bg-horizon-blue px-7 py-3.5 text-sm font-semibold text-white hover:bg-horizon-navy"
            >
              Create Your Account
            </a>
          </div>
        </div>
      </section>
      <section className="bg-horizon-cloud py-16 sm:py-20">
        <div className="container-page grid gap-6 md:grid-cols-3">
          <a href="/courses/ai-101" className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:border-horizon-blue">
            <h2 className="text-xl font-bold">Explore AI-101</h2>
            <p className="mt-3 text-slate-600">See the foundational curriculum.</p>
          </a>
          <a href="/certifications" className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:border-horizon-blue">
            <h2 className="text-xl font-bold">Understand CAFP</h2>
            <p className="mt-3 text-slate-600">Review the planned completion credential.</p>
          </a>
          <a href="/founding-class" className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:border-horizon-blue">
            <h2 className="text-xl font-bold">Join the Founding Class</h2>
            <p className="mt-3 text-slate-600">Follow launch and enrollment progress.</p>
          </a>
        </div>
      </section>
    </>
  );
}
