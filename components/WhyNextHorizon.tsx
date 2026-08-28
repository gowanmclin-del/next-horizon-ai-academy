const FEATURES = [
  {
    title: "Clear, beginner-friendly instruction",
    description:
      "No jargon, no assumptions. Every lesson starts from where you actually are.",
  },
  {
    title: "Hands-on projects and practical exercises",
    description:
      "Learn by doing, with exercises built around real tasks, not theory alone.",
  },
  {
    title: "Skills designed for the real world",
    description:
      "Built for careers, businesses, and everyday life as AI keeps evolving.",
  },
];

export default function WhyNextHorizon() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-horizon-navy sm:text-4xl">
            AI Education Built for Real Life
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Next Horizon AI Academy makes artificial intelligence
            understandable, practical, and accessible. Learners develop
            skills they can apply in their careers, businesses, and everyday
            lives while building the confidence to continue learning as AI
            evolves.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="text-center sm:text-left">
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gradient-to-r from-horizon-blue to-horizon-gold sm:mx-0" />
              <h3 className="text-lg font-bold text-horizon-navy">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
