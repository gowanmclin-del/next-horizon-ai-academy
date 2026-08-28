export default function HorizonNetwork() {
  return (
    <section className="relative overflow-hidden bg-horizon-navy py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-horizon-blue/25 via-transparent to-horizon-gold/15"
        aria-hidden="true"
      />
      <div className="container-page relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-horizon-gold">
            Learn. Connect. Grow.
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
            Learning Doesn&rsquo;t End at Graduation
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-200">
            AI Horizon Network is the community connected to Next Horizon AI
            Academy, bringing together learners, professionals,
            entrepreneurs, creators, and innovators to continue learning,
            networking, collaborating, and growing.
          </p>
          <div className="mt-8">
            <a
              href="/network"
              className="inline-block rounded-md bg-white px-7 py-3.5 text-sm font-semibold text-horizon-navy shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Explore the Network
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
