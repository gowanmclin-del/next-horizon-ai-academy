"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { Course } from "@/lib/types";
import { enrollInCourse } from "@/lib/data/progress";
import { triggerEnrollmentEmail } from "@/lib/actions/email";
import { createCheckoutSession } from "@/lib/actions/payments";
import { formatPrice } from "@/lib/pricing";
import { track } from "@/lib/analytics";
import StatusMessage from "@/components/StatusMessage";

export default function EnrollmentCTA({
  course,
  onEnrolled,
  className,
}: {
  course: Course;
  /** Called after a successful FREE enrollment (paid enrollment redirects
   * away to Stripe, so there's no "after" to call back into on this page). */
  onEnrolled?: () => void;
  className?: string;
}) {
  const { configured, user } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isPaid, priceCents, salePriceCents, currency, enrollmentOpen } = course.pricing;
  const activePriceCents = salePriceCents ?? priceCents;

  if (!configured) {
    return (
      <span className={`inline-block rounded-md bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-400 ${className ?? ""}`}>
        Enrollment unavailable — backend not configured
      </span>
    );
  }

  if (!enrollmentOpen) {
    return (
      <span className={`inline-block rounded-md bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-500 ${className ?? ""}`}>
        Enrollment is currently closed
      </span>
    );
  }

  if (!user) {
    return (
      <a
        href={`/signup?redirect=${encodeURIComponent(pathname)}`}
        className={`inline-block rounded-md bg-horizon-blue px-6 py-3 text-center text-sm font-semibold text-white hover:bg-horizon-navy ${className ?? ""}`}
      >
        {isPaid && activePriceCents ? `Create Account to Enroll — ${formatPrice(activePriceCents, currency)}` : "Create Account to Enroll"}
      </a>
    );
  }

  async function handleFreeEnroll() {
    setLoading(true);
    setError(null);
    const result = await enrollInCourse(course.id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't enroll. Please try again.");
      return;
    }
    triggerEnrollmentEmail(course.id).catch(() => {});
    track("enrollment_completed", { courseId: course.id, courseSlug: course.slug, type: "free" });
    onEnrolled?.();
  }

  async function handlePaidCheckout() {
    setLoading(true);
    setError(null);
    const result = await createCheckoutSession(course.id, course.slug);
    if (!result.ok || !result.url) {
      setLoading(false);
      setError(result.error ?? "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = result.url;
    track("enrollment_started", { courseId: course.id, courseSlug: course.slug, type: "paid" });
  }

  return (
    <div>
      <button
        type="button"
        onClick={isPaid ? handlePaidCheckout : handleFreeEnroll}
        disabled={loading}
        className={`rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      >
        {loading
          ? "Loading…"
          : isPaid && activePriceCents
            ? `Enroll — ${formatPrice(activePriceCents, currency)}`
            : "Enroll for Free"}
      </button>
      {error && (
        <div className="mt-3">
          <StatusMessage tone="error">{error}</StatusMessage>
        </div>
      )}
    </div>
  );
}
