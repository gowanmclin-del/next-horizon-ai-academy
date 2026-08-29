const LINKS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Students", href: "/admin/students" },
  { label: "Enrollments", href: "/admin/enrollments" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Courses", href: "/admin/courses" },
  { label: "Certificates", href: "/admin/certificates" },
  { label: "Partnerships", href: "/admin/partnerships" },
  { label: "Admins", href: "/admin/admins" },
  { label: "Activity", href: "/admin/activity" },
  { label: "Launch Readiness", href: "/admin/launch-readiness" },
  { label: "Acceptance Test", href: "/admin/acceptance-test" },
];

export default function AdminNav() {
  return (
    <header className="border-b border-slate-200 bg-horizon-navy">
      <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-horizon-gold">
            Admin
          </span>
          <span className="font-heading text-sm font-bold text-white">Next Horizon AI Academy</span>
        </div>
        <a href="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-white">
          ← Back to Student Academy
        </a>
      </div>
      <nav aria-label="Admin" className="container-page flex flex-wrap gap-1 pb-3">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
