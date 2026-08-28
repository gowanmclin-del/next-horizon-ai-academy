export default function Newsletter() {
  return (
    <section className="bg-horizon-cloud py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-extrabold text-horizon-navy sm:text-3xl">Stay Ahead of the Next Horizon</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">Get ready for academy news, practical AI tips, course announcements, and launch updates.</p>
          <a href="/launch-updates" className="mt-8 inline-block rounded-md bg-horizon-blue px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-horizon-navy">Get Launch Updates</a>
          <p className="mt-4 text-xs text-slate-500">Email signup will activate when the academy&rsquo;s subscriber system is connected.</p>
        </div>
      </div>
    </section>
  );
}
