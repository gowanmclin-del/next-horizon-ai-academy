"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: string, max = 2000) => value.trim().slice(0, max);

export interface PartnershipInquiryInput {
  organizationName: string;
  contactName: string;
  email: string;
  jobTitle: string;
  industry: string;
  organizationSize: string;
  interests: string[];
  participantCount: string;
  timeline: string;
  goals: string;
  website: string;
}

export async function submitPartnershipInquiry(input: PartnershipInquiryInput) {
  if (input.website) return { ok: true };
  if (!clean(input.organizationName) || !clean(input.contactName)) return { ok: false, error: "Organization and contact name are required." };
  if (!emailRe.test(input.email)) return { ok: false, error: "Enter a valid business email address." };
  if (!input.interests.length) return { ok: false, error: "Select at least one partnership interest." };
  if (!isSupabaseConfigured()) return { ok: false, error: "This form is not connected to the production database yet." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("corporate_partnership_inquiries").insert({
      organization_name: clean(input.organizationName, 200),
      contact_name: clean(input.contactName, 160),
      email: input.email.trim().toLowerCase(),
      job_title: clean(input.jobTitle, 160) || null,
      industry: clean(input.industry, 160) || null,
      organization_size: clean(input.organizationSize, 80) || null,
      interests: input.interests.slice(0, 12),
      participant_count: clean(input.participantCount, 80) || null,
      timeline: clean(input.timeline, 120) || null,
      goals: clean(input.goals, 3000) || null,
    });
    if (error) throw error;
    return { ok: true };
  } catch {
    return { ok: false, error: "We could not submit your inquiry. Please try again." };
  }
}

export interface ReadinessAssessmentInput {
  organizationName: string;
  contactName: string;
  email: string;
  organizationSize: string;
  currentUsage: string;
  formalTraining: string;
  aiPolicy: string;
  promptingConfidence: string;
  verificationPractice: string;
  workflowIntegration: string;
  leadershipReadiness: string;
  topPriority: string;
  website: string;
}

export async function submitReadinessAssessment(input: ReadinessAssessmentInput) {
  if (input.website) return { ok: true, score: 0, level: "Developing" };
  if (!clean(input.organizationName) || !clean(input.contactName)) return { ok: false, error: "Organization and contact name are required." };
  if (!emailRe.test(input.email)) return { ok: false, error: "Enter a valid business email address." };
  if (!isSupabaseConfigured()) return { ok: false, error: "This assessment is not connected to the production database yet." };

  const numeric = [input.currentUsage, input.formalTraining, input.aiPolicy, input.promptingConfidence, input.verificationPractice, input.workflowIntegration, input.leadershipReadiness].map(Number);
  if (numeric.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) return { ok: false, error: "Please answer every readiness question." };
  const score = Math.round((numeric.reduce((a, b) => a + b, 0) / 35) * 100);
  const level = score < 30 ? "Foundational" : score < 50 ? "Developing" : score < 70 ? "AI Ready" : score < 85 ? "AI Enabled" : "AI Forward";

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_readiness_assessments").insert({
      organization_name: clean(input.organizationName, 200),
      contact_name: clean(input.contactName, 160),
      email: input.email.trim().toLowerCase(),
      organization_size: clean(input.organizationSize, 80) || null,
      current_usage: numeric[0], formal_training: numeric[1], ai_policy: numeric[2], prompting_confidence: numeric[3],
      verification_practice: numeric[4], workflow_integration: numeric[5], leadership_readiness: numeric[6],
      top_priority: clean(input.topPriority, 1200) || null,
      score, level,
    });
    if (error) throw error;
    return { ok: true, score, level };
  } catch {
    return { ok: false, error: "We could not save your assessment. Please try again." };
  }
}
