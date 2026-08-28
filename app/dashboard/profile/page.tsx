"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { updateProfile, updatePreferences } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/client";
import StatusMessage from "@/components/StatusMessage";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  // Personal information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("Brand new to AI");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Communication preferences
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [learningReminders, setLearningReminders] = useState(false);
  const [academyUpdates, setAcademyUpdates] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Account security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setRole(profile.professionalRole ?? "");
      setExperience(profile.aiExperienceLevel ?? "Brand new to AI");
      setCourseUpdates(profile.preferences.emailCourseUpdates);
      setLearningReminders(profile.preferences.emailLearningReminders);
      setAcademyUpdates(profile.preferences.emailAcademyUpdates);
    }
  }, [profile]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMessage(null);
    const result = await updateProfile(user.id, {
      firstName,
      lastName,
      professionalRole: role,
      aiExperienceLevel: experience,
    });
    setSavingProfile(false);
    if (!result.ok) {
      setProfileMessage({ tone: "error", text: result.error ?? "Something went wrong." });
      return;
    }
    setProfileMessage({ tone: "success", text: "Profile updated." });
    await refreshProfile();
  }

  async function handlePreferencesSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingPrefs(true);
    setPrefsMessage(null);
    const result = await updatePreferences(user.id, {
      emailCourseUpdates: courseUpdates,
      emailLearningReminders: learningReminders,
      emailAcademyUpdates: academyUpdates,
    });
    setSavingPrefs(false);
    if (!result.ok) {
      setPrefsMessage({ tone: "error", text: result.error ?? "Something went wrong." });
      return;
    }
    setPrefsMessage({ tone: "success", text: "Communication preferences saved." });
    await refreshProfile();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ tone: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ tone: "error", text: "Passwords don't match." });
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      setPasswordMessage({ tone: "error", text: error.message });
      return;
    }
    setPasswordMessage({ tone: "success", text: "Password updated." });
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">
        Profile &amp; Settings
      </h1>

      {/* Personal Information */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-bold text-horizon-navy">Personal Information</h2>
        <form onSubmit={handleProfileSubmit} className="mt-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="text-sm font-semibold text-slate-700">
                First name
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-semibold text-slate-700">
                Last name
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-semibold text-slate-700">
              Account email
            </label>
            <input
              id="email"
              value={user?.email ?? ""}
              disabled
              className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Managed by account login — email changes aren&rsquo;t supported yet.
            </p>
          </div>

          {profile?.createdAt && (
            <p className="text-xs text-slate-400">
              Academy member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          )}

          <div>
            <label htmlFor="role" className="text-sm font-semibold text-slate-700">
              Professional role
            </label>
            <input
              id="role"
              placeholder="e.g. Small business owner"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="experience" className="text-sm font-semibold text-slate-700">
              AI experience level
            </label>
            <select
              id="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
            >
              <option>Brand new to AI</option>
              <option>Beginner</option>
              <option>Comfortable with basic AI tools</option>
              <option>Intermediate</option>
            </select>
          </div>

          {profileMessage && <StatusMessage tone={profileMessage.tone}>{profileMessage.text}</StatusMessage>}

          <button
            type="submit"
            disabled={savingProfile}
            className="self-start rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingProfile ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Communication Preferences */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-bold text-horizon-navy">Communication Preferences</h2>
        <p className="mt-1 text-sm text-slate-500">
          These control optional emails only. Account emails — password
          resets, enrollment confirmations, course completion, and
          certificate issuance — always send regardless of these settings.
        </p>

        <form onSubmit={handlePreferencesSubmit} className="mt-5 flex flex-col gap-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={courseUpdates}
              onChange={(e) => setCourseUpdates(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">Course &amp; learning updates</span>
              <span className="block text-xs text-slate-500">
                New lessons, course changes, and things relevant to AI-101.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={learningReminders}
              onChange={(e) => setLearningReminders(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">Learning reminders</span>
              <span className="block text-xs text-slate-500">
                Occasional nudges if you haven&rsquo;t logged in for a while.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={academyUpdates}
              onChange={(e) => setAcademyUpdates(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">Next Horizon Academy news</span>
              <span className="block text-xs text-slate-500">
                New courses, academy announcements, and general updates.
              </span>
            </span>
          </label>

          {prefsMessage && <StatusMessage tone={prefsMessage.tone}>{prefsMessage.text}</StatusMessage>}

          <button
            type="submit"
            disabled={savingPrefs}
            className="self-start rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingPrefs ? "Saving…" : "Save Preferences"}
          </button>
        </form>
      </section>

      {/* Account Security */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-bold text-horizon-navy">Account Security</h2>
        <p className="mt-1 text-sm text-slate-500">Change your password.</p>

        <form onSubmit={handlePasswordSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="newPassword" className="text-sm font-semibold text-slate-700">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="text-sm font-semibold text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-horizon-blue focus:outline-none"
            />
          </div>

          {passwordMessage && <StatusMessage tone={passwordMessage.tone}>{passwordMessage.text}</StatusMessage>}

          <button
            type="submit"
            disabled={changingPassword}
            className="self-start rounded-md bg-horizon-blue px-6 py-3 text-sm font-semibold text-white hover:bg-horizon-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changingPassword ? "Updating…" : "Update Password"}
          </button>
        </form>
      </section>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6">
        <p className="text-sm text-slate-500">
          Notification-delivery scheduling and further account settings will
          expand here in a future phase.
        </p>
      </div>
    </div>
  );
}
