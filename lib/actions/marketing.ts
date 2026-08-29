"use server";

// Server Actions so these public form submissions are validated and
// inserted server-side rather than trusting the browser. Both tables allow
// anonymous INSERT via RLS (see supabase/schema.sql) — that's intentional,
// since these are public interest/signup forms, not authenticated actions.
// Running them as Server Actions still lets us reject obvious spam
// (honeypot) and malformed input before touching the database, and keeps
// the client component simple.

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface FoundingClassInput {
  firstName: string;
  lastName: string;
  email: string;
  professionalRole: string;
  learningReason: string;
  aiExperienceLevel: string;
  // Honeypot — real users never fill this in (it's visually hidden).
  website: string;
}

export async function submitFoundingClassInterest(
  input: FoundingClassInput
): Promise<{ ok: boolean; error?: string }> {
  if (input.website) {
    // Silently "succeed" for bots without writing anything.
    return { ok: true };
  }
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return { ok: false, error: "First and last name are required." };
  }
  if (!isValidEmail(input.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "This form isn't connected to a database yet in this environment." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("founding_class_interests").insert({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      professional_role: input.professionalRole.trim() || null,
      learning_reason: input.learningReason.trim() || null,
      ai_experience_level: input.aiExperienceLevel,
    });
    if (error) return { ok: false, error: "Something went wrong submitting your interest. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong submitting your interest. Please try again." };
  }
}

export interface LaunchSubscriberInput {
  firstName: string;
  email: string;
  website: string; // honeypot
}

export async function submitLaunchSubscriber(
  input: LaunchSubscriberInput
): Promise<{ ok: boolean; error?: string }> {
  if (input.website) {
    return { ok: true };
  }
  if (!input.firstName.trim()) {
    return { ok: false, error: "First name is required." };
  }
  if (!isValidEmail(input.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "This form isn't connected to a database yet in this environment." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("launch_subscribers").insert({
      first_name: input.firstName.trim(),
      email: input.email.trim().toLowerCase(),
    });

    if (error) {
      // Postgres unique_violation on the email column — treat as a
      // friendly "you're already on the list" rather than an error.
      if (error.code === "23505") {
        return { ok: true };
      }
      return { ok: false, error: "Something went wrong signing you up. Please try again." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong signing you up. Please try again." };
  }
}

export interface CorporatePartnershipInput {
  firstName: string;
  lastName: string;
  workEmail: string;
  organization: string;
  jobTitle: string;
  organizationSize: string;
  partnershipInterest: string;
  learnerCount: string;
  timeline: string;
  goals: string;
  website: string;
}

export async function submitCorporatePartnershipInquiry(
  input: CorporatePartnershipInput
): Promise<{ ok: boolean; error?: string }> {
  if (input.website) return { ok: true };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.organization.trim()) {
    return { ok: false, error: "Name and organization are required." };
  }
  if (!isValidEmail(input.workEmail)) {
    return { ok: false, error: "Enter a valid work email address." };
  }
  if (!input.partnershipInterest || !input.goals.trim()) {
    return { ok: false, error: "Select an area of interest and tell us about your goals." };
  }
  if (input.goals.trim().length > 2000) {
    return { ok: false, error: "Please keep your goals under 2,000 characters." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "This form isn't connected to a database yet in this environment." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("corporate_partnership_inquiries").insert({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      work_email: input.workEmail.trim().toLowerCase(),
      organization: input.organization.trim(),
      job_title: input.jobTitle.trim() || null,
      organization_size: input.organizationSize || null,
      partnership_interest: input.partnershipInterest,
      learner_count: input.learnerCount || null,
      timeline: input.timeline || null,
      goals: input.goals.trim(),
    });
    if (error) return { ok: false, error: "We couldn't submit your inquiry. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn't submit your inquiry. Please try again." };
  }
}
