"use client";

// Data-access layer for the `profiles` table. Phase 4 had UI components
// (app/dashboard/profile/page.tsx) and lib/auth.tsx both querying
// `profiles` directly — this file is the single place that happens now.
// RLS (see supabase/schema.sql — "profiles: read own" / "profiles: update
// own") is what actually enforces that a student can only touch their own
// row; this layer just keeps the query shape in one place.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface Profile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  professionalRole: string | null;
  aiExperienceLevel: string | null;
  createdAt: string;
  welcomeEmailSentAt: string | null;
  preferences: {
    emailCourseUpdates: boolean;
    emailLearningReminders: boolean;
    emailAcademyUpdates: boolean;
  };
}

function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    professionalRole: row.professional_role,
    aiExperienceLevel: row.ai_experience_level,
    createdAt: row.created_at,
    welcomeEmailSentAt: row.welcome_email_sent_at ?? null,
    preferences: {
      // Fall back to the same privacy-conscious defaults as the Phase 5
      // migration (supabase/phase5.sql) in case this is read against a
      // database that hasn't run that migration yet.
      emailCourseUpdates: row.email_course_updates ?? true,
      emailLearningReminders: row.email_learning_reminders ?? false,
      emailAcademyUpdates: row.email_academy_updates ?? false,
    },
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) return null;
  return mapProfileRow(data);
}

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  professionalRole: string;
  aiExperienceLevel: string;
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      professional_role: input.professionalRole,
      ai_experience_level: input.aiExperienceLevel,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: "Couldn't save your changes. Please try again." };
  return { ok: true };
}

export interface PreferencesUpdateInput {
  emailCourseUpdates: boolean;
  emailLearningReminders: boolean;
  emailAcademyUpdates: boolean;
}

export async function updatePreferences(
  userId: string,
  input: PreferencesUpdateInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      email_course_updates: input.emailCourseUpdates,
      email_learning_reminders: input.emailLearningReminders,
      email_academy_updates: input.emailAcademyUpdates,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: "Couldn't save your preferences. Please try again." };
  return { ok: true };
}
