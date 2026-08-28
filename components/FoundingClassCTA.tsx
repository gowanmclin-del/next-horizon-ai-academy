export default function FoundingClassCTA() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl bg-horizon-navy px-8 py-16 text-center sm:px-16">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-horizon-gold/30 to-transparent blur-xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Be Part of the Beginning
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-200">
              Enrollment for the first class of Next Horizon AI Academy is
              coming soon. Founding Learners will become part of the
              academy&rsquo;s history while gaining practical AI skills
              designed for the future.
            </p>
            <div className="mt-8">
              <a
                href="/launch-updates"
                className="inline-block rounded-md bg-horizon-gold px-7 py-3.5 text-sm font-semibold text-horizon-navy shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Get Launch Updates
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
