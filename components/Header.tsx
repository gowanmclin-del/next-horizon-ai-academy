"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Courses", href: "/courses" },
  { label: "Certifications", href: "/certifications" },
  { label: "For Organizations", href: "/organizations" },
  { label: "AI Horizon Network", href: "/network" },
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled
          ? "border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
          : "border-transparent bg-white"
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between sm:h-20">
        <a href="/" className="flex items-center gap-2" aria-label="Next Horizon AI Academy home">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-horizon-navy">
            <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-tr from-horizon-blue to-horizon-gold" />
          </span>
          <span className="font-heading text-base font-bold leading-tight text-horizon-navy sm:text-lg">
            Next Horizon
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-horizon-blue">
              AI Academy
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-horizon-blue"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={user ? "/dashboard" : "/login"}
            className="text-sm font-semibold text-slate-600 transition-colors hover:text-horizon-blue"
          >
            {user ? "Dashboard" : "Log In"}
          </a>
          <a
            href="/start-learning"
            className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-horizon-navy hover:shadow-md"
          >
            Start Learning
          </a>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md text-horizon-navy lg:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {isOpen ? (
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7H20M4 12H20M4 17H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      <div
        id="mobile-menu"
        className={`grid overflow-hidden border-t border-slate-200 bg-white transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-md px-2 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:text-horizon-blue"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-slate-200 pt-4">
              <a
                href={user ? "/dashboard" : "/login"}
                className="text-center text-base font-semibold text-slate-700"
                onClick={() => setIsOpen(false)}
              >
                {user ? "Dashboard" : "Log In"}
              </a>
              <a
                href="/start-learning"
                className="rounded-md bg-horizon-blue px-5 py-3 text-center text-base font-semibold text-white"
                onClick={() => setIsOpen(false)}
              >
                Start Learning
              </a>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
