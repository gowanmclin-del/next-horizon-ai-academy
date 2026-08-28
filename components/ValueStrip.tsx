const VALUES = [
  {
    title: "Practical Learning",
    description: "Real-world skills learners can immediately apply.",
  },
  {
    title: "Responsible AI",
    description: "Learn to use artificial intelligence thoughtfully and ethically.",
  },
  {
    title: "Career & Business Growth",
    description: "Use AI to improve productivity, careers, and business operations.",
  },
  {
    title: "Global Community",
    description: "Learn and grow alongside members of the AI Horizon Network.",
  },
];

export default function ValueStrip() {
  return (
    <section className="bg-white py-16 sm:py-20" aria-label="Why learners choose Next Horizon">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value, i) => (
            <div
              key={value.title}
              className="animate-fade-slide-up rounded-xl border border-slate-200 bg-horizon-cloud p-6 transition-shadow hover:shadow-md"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="mb-4 h-1.5 w-10 rounded-full bg-gradient-to-r from-horizon-blue to-horizon-gold" />
              <h3 className="text-lg font-bold text-horizon-navy">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
