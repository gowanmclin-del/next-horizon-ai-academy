"use client";

// ---------------------------------------------------------------------------
// AUTH CONTEXT (Phase 4, profile loading moved out in Phase 5)
// ---------------------------------------------------------------------------
// Backed by Supabase Auth. Session state comes from supabase.auth's own
// onAuthStateChange listener, which reads the session Supabase manages via
// cookies (refreshed by middleware.ts on every request to a protected
// route).
//
// Phase 5 change: profile reads now go through lib/data/profiles.ts instead
// of querying `profiles` directly here (that was the Phase 4 architecture
// inconsistency called out in the Phase 5 brief).
//
// This is also where the welcome email gets triggered — see the comment on
// maybeSendWelcomeEmail() below for why "on every session load" is safe.
//
// If Supabase isn't configured (no env vars — see lib/supabase/config.ts),
// `configured` is false and `user`/`profile` stay null. Components must
// check `configured` and show a "backend not configured" state rather than
// assuming signed-out === "please log in" in that case. See
// components/dashboard/RequireAuth.tsx for the reference implementation.
// ---------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { triggerWelcomeEmail } from "@/lib/actions/email";

export type { Profile };

interface AuthContextValue {
  configured: boolean;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Fires once per account, ever — safe to call on every login/session load.
// The actual "has this already been confirmed sent?" check happens
// server-side inside claim_welcome_email() (supabase/phase5.1.sql), which
// only flips profiles.welcome_email_sent_at after Resend confirms success
// (see lib/actions/email.ts for the full claim/send/complete-or-release
// flow). If a previous attempt failed, welcome_email_sent_at is still
// null, so calling this again is exactly the retry we want — not a
// duplicate. Calling it here (rather than only right after signup) also
// covers the email-confirmation case, where the first real session may
// not exist until the student clicks the confirmation link and logs in
// later.
function maybeSendWelcomeEmail(profile: Profile) {
  if (profile.welcomeEmailSentAt) return; // cheap skip — avoids the round trip most of the time
  triggerWelcomeEmail().catch(() => {
    // Fire-and-forget: a failed email trigger never affects the signed-in
    // student experience. See lib/actions/email.ts for logging.
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(configured);

  async function loadProfile(userId: string) {
    if (!configured) return;
    const p = await getProfile(userId);
    if (p) {
      setProfile(p);
      maybeSendWelcomeEmail(p);
    }
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadProfile(data.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  async function signOut() {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{ configured, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
