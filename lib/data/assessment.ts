"use client";

// The assessment is graded entirely inside Postgres — see
// submit_assessment_attempt() in supabase/schema.sql. This file only wraps
// that RPC call; it never computes a score itself. The correct answers
// live in a table (assessment_answer_keys) with no client SELECT policy at
// all, so there's nothing for the browser to read or forge.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AssessmentQuestionRow {
  id: string;
  question: string;
  position: number;
  options: { id: string; option_text: string; position: number }[];
}

export interface AssessmentDefinition {
  id: string;
  title: string;
  passingScore: number;
  questions: AssessmentQuestionRow[];
}

export async function getPublishedAssessment(courseId: string): Promise<AssessmentDefinition | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();

  const { data: assessment, error } = await supabase
    .from("assessments")
    .select("id, title, passing_score")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !assessment) return null;

  const { data: questions } = await supabase
    .from("assessment_questions")
    .select("id, question, position, assessment_options(id, option_text, position)")
    .eq("assessment_id", assessment.id)
    .order("position");

  return {
    id: assessment.id,
    title: assessment.title,
    passingScore: assessment.passing_score,
    questions: (questions ?? []).map((q: any) => ({
      id: q.id,
      question: q.question,
      position: q.position,
      options: (q.assessment_options ?? []).sort((a: any, b: any) => a.position - b.position),
    })),
  };
}

export interface SubmitResult {
  score: number;
  passed: boolean;
  passingScore: number;
}

export async function hasPassedAssessment(assessmentId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("assessment_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("assessment_id", assessmentId)
    .eq("passed", true)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

/** answers: { [questionId]: selectedOptionId } */
export async function submitAssessment(
  assessmentId: string,
  answers: Record<string, string>
): Promise<{ ok: true; result: SubmitResult } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Backend not configured." };
  const supabase = createClient();

  const { data, error } = await supabase.rpc("submit_assessment_attempt", {
    p_assessment_id: assessmentId,
    p_answers: answers,
  });

  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    result: { score: row.score, passed: row.passed, passingScore: row.passing_score },
  };
}
