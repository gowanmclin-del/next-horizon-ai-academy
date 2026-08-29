export default function PartnershipCTA({ title = "Build an AI-ready workforce with us" }: { title?: string }) {
  return (
    <section className="bg-horizon-navy py-16 text-white">
      <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-horizon-gold">Partnership discovery</p><h2 className="mt-2 max-w-2xl text-3xl font-bold">{title}</h2></div>
        <a href="/corporate-partnerships/inquiry" className="rounded-lg bg-horizon-gold px-6 py-3 font-bold text-horizon-navy transition hover:bg-white">Start a Conversation</a>
      </div>
    </section>
  );
}
