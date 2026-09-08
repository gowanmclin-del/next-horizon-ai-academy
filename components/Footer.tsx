const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Courses", href: "/courses" },
  { label: "Certifications", href: "/certifications" },
  { label: "AI Horizon Network", href: "/network" },
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61592307485113",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/next-horizon-ai-academy-814660425",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/nexthorizonaiacademy",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@next.horizon.ai.a",
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@nexthorizonaiacademy",
  },
];

export default function Footer() {
  return (
    <footer className="bg-horizon-navy text-slate-300">
      <div className="horizon-divider" aria-hidden="true" />
      <div className="container-page py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <span className="font-heading text-lg font-bold text-white">
              Next Horizon AI Academy
            </span>
            <p className="mt-2 text-sm text-slate-400">Learn AI. Shape the Future.</p>
            <p className="mt-6 text-sm text-slate-400">
              Founded in San Francisco. Built for the World.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Explore
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-horizon-gold"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Connect
            </h3>
            <ul className="mt-4 space-y-3">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-300 transition-colors hover:text-horizon-gold"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Next Horizon AI Academy. All rights reserved.
          </p>
          <ul className="flex gap-6">
            {LEGAL_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-xs text-slate-400 transition-colors hover:text-horizon-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
