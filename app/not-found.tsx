export default function NotFound() {
  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-horizon-blue">404</p>
        <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">We couldn&rsquo;t find that page</h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you&rsquo;re looking for may have moved, or the link may be out of date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/"
            className="rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
          >
            Academy Home
          </a>
          <a
            href="/courses"
            className="rounded-md border border-horizon-blue px-6 py-3 text-sm font-semibold text-horizon-blue hover:bg-horizon-blue hover:text-white"
          >
            Browse Courses
          </a>
        </div>
      </div>
    </div>
  );
}
