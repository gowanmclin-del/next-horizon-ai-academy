export default function DevBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-horizon-gold/40 bg-horizon-gold/10 px-4 py-3 text-sm leading-relaxed text-horizon-navy"
    >
      <span className="mr-1 font-bold uppercase tracking-wide text-horizon-gold">
        Development preview —
      </span>
      {children}
    </div>
  );
}
