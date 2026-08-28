// Central place to check whether real Supabase credentials are configured.
// Every part of the app that needs Supabase should check this first rather
// than letting an unconfigured client throw deep inside a component — see
// PHASE4-NOTES.md "Environment fallback" for how each surface degrades.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
