"use client";

import { useState } from "react";
import { searchStudents, grantComplimentaryEnrollment, type StudentSearchResult } from "@/lib/actions/admin";
import StatusMessage from "@/components/StatusMessage";

export default function GrantEnrollmentForm({
  courses,
}: {
  courses: Array<{ id: string; title: string }>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [enrollmentType, setEnrollmentType] = useState<"complimentary" | "scholarship" | "administrative">(
    "complimentary"
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const found = await searchStudents(query);
    setSearching(false);
    setResults(found);
  }

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !courseId) return;
    setSubmitting(true);
    setMessage(null);
    const result = await grantComplimentaryEnrollment({
      studentId: selectedStudent.id,
      courseId,
      enrollmentType,
      note,
    });
    setSubmitting(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error ?? "Something went wrong." });
      return;
    }
    setMessage({ tone: "success", text: `Enrolled ${selectedStudent.name} in the selected course.` });
    setSelectedStudent(null);
    setQuery("");
    setResults([]);
    setNote("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-horizon-navy">Grant Complimentary Enrollment</h2>
      <p className="mt-1 text-sm text-slate-500">
        Enroll an existing student without Stripe Checkout — scholarships, promotions, corporate partnerships, or support resolutions.
      </p>

      {!selectedStudent ? (
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student by name or email"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-md bg-horizon-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-horizon-blue/30 bg-horizon-blue/5 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-horizon-navy">{selectedStudent.name}</p>
            <p className="text-xs text-slate-500">{selectedStudent.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStudent(null)}
            className="ml-auto text-xs font-semibold text-horizon-blue"
          >
            Change
          </button>
        </div>
      )}

      {!selectedStudent && results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(r);
                  setResults([]);
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-horizon-cloud"
              >
                <span className="font-semibold text-slate-800">{r.name}</span>{" "}
                <span className="text-slate-500">{r.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedStudent && (
        <form onSubmit={handleGrant} className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="course" className="text-sm font-semibold text-slate-700">
              Course
            </label>
            <select
              id="course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="enrollmentType" className="text-sm font-semibold text-slate-700">
              Enrollment type
            </label>
            <select
              id="enrollmentType"
              value={enrollmentType}
              onChange={(e) => setEnrollmentType(e.target.value as typeof enrollmentType)}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
            >
              <option value="complimentary">Complimentary</option>
              <option value="scholarship">Scholarship</option>
              <option value="administrative">Administrative</option>
            </select>
          </div>

          <div>
            <label htmlFor="note" className="text-sm font-semibold text-slate-700">
              Internal note (optional)
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Corporate partnership with Acme Co."
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
            />
          </div>

          {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}

          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
          >
            {submitting ? "Enrolling…" : "Confirm Enrollment"}
          </button>
        </form>
      )}
    </div>
  );
}
