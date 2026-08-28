const TOPICS = [
  "Understanding Artificial Intelligence",
  "The Art of Prompting",
  "Everyday AI",
  "AI for Business",
  "Responsible & Ethical AI",
  "30-Day AI Success Plan",
];

export default function FeaturedCourse() {
  return (
    <section className="bg-horizon-cloud py-20 sm:py-28" aria-labelledby="featured-course-heading">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <ol className="divide-y divide-slate-100">
                {TOPICS.map((topic, i) => (
                  <li key={topic} className="flex items-center gap-4 px-4 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-horizon-navy text-xs font-bold text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 sm:text-base">
                      {topic}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-horizon-blue">
              Featured Course
            </p>
            <h2 id="featured-course-heading" className="mt-3 text-3xl font-extrabold text-horizon-navy sm:text-4xl">
              AI-101: Foundations of Artificial Intelligence
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              A beginner-friendly introduction to artificial intelligence
              designed to help learners understand AI, communicate
              effectively with AI tools, apply AI to everyday tasks and
              business, and use AI responsibly.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-horizon-gold/15 px-4 py-2 text-sm font-bold text-horizon-navy">
              <span className="h-2 w-2 rounded-full bg-horizon-gold" />
              Certified AI Foundations Professional (CAFP)
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="/courses/ai-101"
                className="rounded-md bg-horizon-blue px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-horizon-navy"
              >
                Explore AI-101
              </a>
              <a
                href="/founding-class"
                className="rounded-md border border-horizon-blue px-6 py-3 text-center text-sm font-semibold text-horizon-blue transition-colors hover:bg-horizon-blue hover:text-white"
              >
                Join the Founding Class
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
