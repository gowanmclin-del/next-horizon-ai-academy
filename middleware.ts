import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
const LEARN_ROUTE_PATTERN = /^\/courses\/[^/]+\/learn(\/.*)?$/;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const pathname = request.nextUrl.pathname;
  const isProtected =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) || LEARN_ROUTE_PATTERN.test(pathname);

  // If Supabase isn't configured at all, we can't check a session either
  // way. Don't redirect people into a login flow that can't work — let the
  // dashboard pages themselves show a "backend not configured" notice
  // (see components/dashboard/RequireAuth.tsx) instead of a redirect loop.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh the session if needed — this also lets Server Components read
  // an up-to-date session via lib/supabase/server.ts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // NOTE on /admin: middleware only confirms a session exists here — it
  // does not check profiles.role, because that would mean an extra
  // database round-trip on every single request to every protected route,
  // including /dashboard and /courses/*/learn, which don't need it. The
  // actual admin-role check (the real authorization boundary — see Phase 7
  // brief section 1, "verify authorization server-side," "do not rely
  // solely on hiding navigation links") happens in app/admin/layout.tsx, a
  // Server Component that runs before any admin page's content is ever
  // sent to the browser, and redirects non-admins away before rendering
  // anything. That is still fully server-side enforcement; it's just
  // scoped to only run for requests that actually reach /admin.

  return response;
}

export const config = {
  matcher: [
    /*
     * Match dashboard, admin, and AI-101 learning routes, while skipping
     * static assets and image optimization files. Enrollment itself is
     * still enforced in app/courses/ai-101/learn/[lessonSlug]/page.tsx,
     * and the admin role check in app/admin/layout.tsx (see the comment
     * above).
     */
    "/dashboard/:path*",
    "/admin/:path*",
    "/courses/:slug/learn/:path*",
  ],
};
