export default function PurchaseCanceledPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Checkout Canceled</p>
        <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">No charge was made</h1>
        <p className="mt-3 text-sm text-slate-600">
          You can pick up where you left off whenever you&rsquo;re ready.
        </p>
        <a
          href="/courses/ai-101"
          className="mt-6 inline-block rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy"
        >
          Back to Course
        </a>
      </div>
    </div>
  );
}
