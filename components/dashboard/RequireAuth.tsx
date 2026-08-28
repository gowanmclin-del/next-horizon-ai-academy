"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Client-side backstop for dashboard route protection. middleware.ts is the
// primary guard (it runs before any page code and redirects unauthenticated
// requests to /login?redirect=<path>) — this component exists so a page
// still behaves correctly if session state changes client-side (e.g. the
// user's token expires mid-session) and to render the "backend not
// configured" state cleanly rather than a broken dashboard.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { configured, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (configured && !loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [configured, loading, user, router, pathname]);

  if (!configured) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-horizon-gold/40 bg-horizon-gold/10 p-7 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-horizon-gold">
            Backend Not Configured
          </p>
          <h1 className="mt-3 text-xl font-extrabold text-horizon-navy">
            The student dashboard needs a Supabase connection
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            This deployment doesn&rsquo;t have{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            set, so accounts, progress, and certificates can&rsquo;t be
            loaded. See the README for Supabase setup steps.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-page py-24 text-center text-slate-500">
        Loading your dashboard…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
