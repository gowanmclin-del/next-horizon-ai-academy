import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "./config";

// Server-side client backed by the request's cookies, used in Server
// Components, Server Actions, and Route Handlers. Still only uses the
// public anon key — RLS (see supabase/schema.sql) is what actually scopes
// access to the signed-in user, not this client's privilege level.
//
// This intentionally never touches SUPABASE_SERVICE_ROLE_KEY. If a future
// phase needs a service-role client (e.g. for an admin console), it should
// live in a separate server-only file that is never imported by anything
// reachable from client components, and should be used sparingly.
export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Callers should check isSupabaseConfigured() first."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no request/response
            // cycle to write to — safe to ignore since middleware.ts
            // handles session refresh on every request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}
