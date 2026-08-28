import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "./config";

// Only ever uses the public anon key — never the service-role key. Safe to
// import from client components.
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. Callers should check isSupabaseConfigured() before calling createClient()."
    );
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
