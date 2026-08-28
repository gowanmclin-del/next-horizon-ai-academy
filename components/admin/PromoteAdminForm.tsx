"use client";

import { useState } from "react";
import { searchAllUsers, promoteToAdmin, type UserSearchResult } from "@/lib/actions/admin";
import StatusMessage from "@/components/StatusMessage";

export default function PromoteAdminForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const found = await searchAllUsers(query);
    setSearching(false);
    setResults(found);
  }

  async function handleConfirmPromote() {
    if (!selected) return;
    setConfirming(true);
    setMessage(null);
    const result = await promoteToAdmin(selected.id);
    setConfirming(false);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error ?? "Something went wrong." });
      return;
    }
    setMessage({ tone: "success", text: `${selected.name} is now an admin.` });
    setSelected(null);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-horizon-navy">Promote an Existing Account</h2>
      <p className="mt-1 text-sm text-slate-500">
        Search for a student or staff account by name or email, then grant admin access. This is permanent unless
        reversed directly in the database — there is no one-click demotion in this phase.
      </p>

      {!selected ? (
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
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
        <div className="mt-4 rounded-md border border-horizon-gold/40 bg-horizon-gold/10 px-4 py-4">
          <p className="text-sm font-semibold text-horizon-navy">
            Promote {selected.name} ({selected.email}) to admin?
          </p>
          <p className="mt-1 text-xs text-slate-500">Current role: {selected.role}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirmPromote}
              disabled={confirming || selected.role === "admin"}
              className="rounded-md bg-horizon-blue px-5 py-2 text-sm font-semibold text-white hover:bg-horizon-navy disabled:opacity-50"
            >
              {confirming ? "Promoting…" : selected.role === "admin" ? "Already an admin" : "Confirm Promotion"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!selected && results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(r);
                  setResults([]);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-horizon-cloud"
              >
                <span>
                  <span className="font-semibold text-slate-800">{r.name}</span>{" "}
                  <span className="text-slate-500">{r.email}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{r.role}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <div className="mt-4">
          <StatusMessage tone={message.tone}>{message.text}</StatusMessage>
        </div>
      )}
    </div>
  );
}
