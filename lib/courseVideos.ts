export const AI101_ORIENTATION_VIDEO_ID = "e5X88a-2MBQ";

/**
 * Founder-led anchor videos for AI-101. The surrounding lessons remain
 * text-based so students can move through the full curriculum at their pace.
 */
const AI101_VIDEO_BY_LESSON_SLUG: Record<string, string> = {
  "what-is-artificial-intelligence": "bMahMAcmF-E",
  "what-is-a-prompt": "2yFJ9uPNifs",
  "ai-for-everyday-work": "HHh1vc-1HvA",
  "building-repeatable-ai-workflows": "-MwOKI4ro6g",
  "ai-accuracy-and-hallucinations": "XUQKovY9tWw",
  "module-5-review": "s1u3kLkRAw0",
};

export function getAI101VideoId(lessonSlug: string): string | null {
  return AI101_VIDEO_BY_LESSON_SLUG[lessonSlug] ?? null;
}
