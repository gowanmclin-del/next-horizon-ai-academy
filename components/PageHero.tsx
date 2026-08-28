type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-horizon-navy py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-horizon-blue/25 via-transparent to-horizon-gold/15" aria-hidden="true" />
      <div className="container-page relative">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-horizon-gold">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-200">{description}</p>
        </div>
      </div>
    </section>
  );
}
