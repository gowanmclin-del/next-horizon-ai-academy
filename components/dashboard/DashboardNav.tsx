"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Courses", href: "/dashboard/courses" },
  { label: "Certificates", href: "/dashboard/certificates" },
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Academy Home", href: "/" },
];

export default function DashboardNav() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="font-heading text-sm font-bold text-horizon-navy">
          {user ? `Hi, ${profile?.firstName || "there"}` : "Dashboard"}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-horizon-navy"
          aria-expanded={isOpen}
          aria-controls="dashboard-mobile-nav"
        >
          Menu
        </button>
      </div>
      {isOpen && (
        <nav
          id="dashboard-mobile-nav"
          aria-label="Dashboard"
          className="flex flex-col gap-1 border-b border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-horizon-cloud"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Log Out
          </button>
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-20 flex h-[calc(100vh-5rem)] flex-col justify-between px-4 py-6">
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Signed in as
            </p>
            <p className="mb-6 px-3 text-sm font-bold text-horizon-navy">
              {user
                ? `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
                  user.email
                : "—"}
            </p>
            <nav aria-label="Dashboard" className="flex flex-col gap-1">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-horizon-cloud hover:text-horizon-blue"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
