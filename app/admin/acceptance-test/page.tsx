import Link from "next/link";

type Step = { step: string; action: string; expected: string };

const journey: Step[] = [
  { step: "1. Create account", action: "Sign up with a new test email.", expected: "Account created; redirected to the requested destination (or dashboard by default)." },
  { step: "2. Authenticate", action: "Log out, then log back in with that account.", expected: "Session restored; dashboard loads with no error." },
  { step: "3. Purchase (Stripe test mode)", action: "Open a paid course and start checkout using card 4242 4242 4242 4242.", expected: "Redirected to a Stripe-hosted checkout page showing the correct course name and price." },
  { step: "4. Webhook verified", action: "Complete the test payment.", expected: "Stripe's webhook logs show a 200 response for checkout.session.completed — not a client-side redirect alone." },
  { step: "5. Order recorded", action: "Check /admin/orders as an admin.", expected: "A new order appears with status \"Paid\", the correct amount, and a Stripe payment reference." },
  { step: "6. Enrollment created", action: "Check the same order's linked enrollment.", expected: "Exactly one enrollment row exists for this student and course, referencing the order." },
  { step: "7. Course appears on dashboard", action: "Return to the student's /dashboard.", expected: "The purchased course appears with 0% progress." },
  { step: "8. Open course", action: "Click into the course from the dashboard.", expected: "The first lesson loads; sidebar shows all modules/lessons in the correct order." },
  { step: "9. Complete lessons", action: "Mark each lesson complete.", expected: "Progress bar updates after each lesson; percentage is accurate." },
  { step: "10. Progress persists", action: "Refresh the page, then log out and back in.", expected: "Completed lessons remain marked complete; percentage is unchanged." },
  { step: "11. Complete assessment", action: "Once all lessons are complete, open the assessment and answer every question correctly.", expected: "Assessment was unavailable before all lessons were complete; becomes available once they are." },
  { step: "12. Course completion recorded", action: "Submit the assessment with a passing score.", expected: "Result shows \"Passed\"; score matches what was actually answered (computed server-side, not client-side)." },
  { step: "13. Certificate issued", action: "Go to /dashboard/certificates and claim the certificate.", expected: "A certificate appears with the correct student name, course, certificate number, and verification code." },
  { step: "14. Certificate verification succeeds", action: "Copy the verification code and open /verify.", expected: "The certificate shows as valid, with the correct student name and course — not just \"found\"." },
];

const failurePaths: Step[] = [
  { step: "Declined payment", action: "Use Stripe's test decline card instead of the success card.", expected: "No order becomes \"Paid\"; no enrollment is created." },
  { step: "Canceled checkout", action: "Start checkout, then close the Stripe tab without paying.", expected: "Returned to the course's cancel page; no charge; no enrollment." },
  { step: "Duplicate checkout attempt", action: "Start checkout twice for the same course without completing either, then complete one.", expected: "Exactly one enrollment results — no duplicate." },
  { step: "Expired authentication", action: "Let a session expire (or manually clear cookies) and try to load /dashboard.", expected: "Redirected to /login with the original destination preserved, not a broken page." },
  { step: "Logged-out protected route", action: "Visit /dashboard or a course's /learn route while signed out.", expected: "Redirected to /login." },
  { step: "Student without enrollment", action: "Visit a paid course's /learn or /assessment route while signed in but not enrolled.", expected: "Enrollment/purchase prompt shown, not lesson or assessment content." },
  { step: "Revoked enrollment", action: "As admin, revoke a test student's enrollment, then have that student try to access the course.", expected: "Lesson and assessment content are no longer accessible." },
  { step: "Cross-course access", action: "While enrolled only in course A, try to open course B's /learn route.", expected: "Course B remains inaccessible." },
  { step: "Cross-course assessment submission", action: "While enrolled only in course A, attempt to submit course B's assessment.", expected: "Rejected — \"Not enrolled in this course\"." },
  { step: "Unavailable course", action: "Visit /courses/a-slug-that-does-not-exist.", expected: "Branded 404 page, not a broken layout or server error." },
  { step: "Unauthorized access", action: "As a signed-in student, visit any /admin/* route.", expected: "Redirected away — no admin data or controls ever rendered." },
  { step: "Failed server operation", action: "Attempt an admin action while signed in as a student (e.g. call an admin Server Action directly).", expected: "Rejected with a clear \"Not authorized\" error, not a stack trace or raw database error." },
  { step: "Missing resource", action: "Visit a certificate verification code that was never issued.", expected: "\"No certificate found\" — not an error page, not a false positive." },
];

function ChecklistSection({ title, items }: { title: string; items: Step[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-xl font-bold text-horizon-navy">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map((item, index) => (
          <div key={item.step} className={`flex gap-4 p-4 ${index ? "border-t border-slate-100" : ""}`}>
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-slate-300" aria-hidden="true" />
            <div>
              <p className="font-semibold text-horizon-navy">{item.step}</p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-semibold text-slate-500">Do: </span>
                {item.action}
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                <span className="font-semibold">Expect: </span>
                {item.expected}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AcceptanceTestPage() {
  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Launch Acceptance Test</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Run this with a real student test account and a real Stripe test-mode payment before opening public
            enrollment. Each row lists what to do and exactly what a correct result looks like. These boxes are
            intentionally not persisted — use this page as a repeatable pre-launch runbook and record evidence
            (screenshots, order IDs) in your own deployment notes.
          </p>
        </div>
        <Link href="/admin/launch-readiness" className="rounded-lg border border-horizon-navy px-4 py-2 text-sm font-semibold text-horizon-navy hover:bg-slate-50">
          View readiness
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Go-live rule:</strong> do not switch Stripe to live mode or advertise paid enrollment until every
        row in &quot;Critical journey&quot; below has passed end to end with a real Stripe test payment, verified in the
        database — not just by what the browser shows after a redirect.
      </div>

      <ChecklistSection title="Critical journey" items={journey} />
      <ChecklistSection title="Failure paths and security" items={failurePaths} />

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-heading text-xl font-bold text-horizon-navy">Release sign-off</h2>
        <p className="mt-2 text-sm text-slate-600">Before launch, confirm all statements are true:</p>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          {[
            "All blocking Launch Readiness checks show Ready.",
            "The complete critical journey above has passed with a real Stripe test payment.",
            "Every failure path above produced the expected result, not a broken page or a silently-granted access.",
            "Production domain, Supabase, Stripe webhook, and sending domain are configured for the final deployment.",
            "docs/PHASE15-LAUNCH-CHECKLIST.md is fully checked off.",
          ].map((item) => (
            <div key={item} className="flex gap-3"><span className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-slate-300" /> <span>{item}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
