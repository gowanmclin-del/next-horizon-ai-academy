export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-horizon-navy">
      {/* Horizon / sunrise signature visual */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-horizon-glow opacity-90"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-horizon-gold/40 via-horizon-gold/10 to-transparent blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[58%] h-64 w-64 -translate-x-1/2 rounded-full bg-horizon-gold/50 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative py-24 sm:py-32 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <p className="animate-fade-slide-up text-sm font-semibold uppercase tracking-[0.2em] text-horizon-gold">
            Founded in San Francisco. Built for the World.
          </p>
          <h1 className="mt-5 animate-fade-slide-up text-4xl font-extrabold leading-tight text-white [animation-delay:80ms] sm:text-5xl lg:text-6xl">
            Learn AI. Shape the Future.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-slide-up text-lg leading-relaxed text-slate-200 [animation-delay:160ms] sm:text-xl">
            Practical AI education designed to help beginners, professionals,
            entrepreneurs, and business owners confidently understand and
            apply artificial intelligence.
          </p>
          <div className="mt-9 flex animate-fade-slide-up flex-col items-center justify-center gap-4 [animation-delay:240ms] sm:flex-row">
            <a
              href="/start-learning"
              className="w-full rounded-md bg-horizon-gold px-7 py-3.5 text-center text-base font-semibold text-horizon-navy shadow-lg shadow-horizon-gold/20 transition-transform hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
            >
              Start Learning
            </a>
            <a
              href="/courses"
              className="w-full rounded-md border border-white/30 bg-white/5 px-7 py-3.5 text-center text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/15 sm:w-auto"
            >
              Explore Courses
            </a>
          </div>
        </div>
      </div>

      <div className="horizon-divider" aria-hidden="true" />
    </section>
  );
}
