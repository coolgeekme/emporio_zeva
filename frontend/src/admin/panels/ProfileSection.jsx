// Self-service profile editor — used inside Settings and as the standalone
// "must change password" gate after first sign-in.
import { useState } from "react";
import axios from "axios";
import { UserCircle2, KeyRound } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail } from "../api";

export default function ProfileSection({ token, currentUser, onUpdated, forceChange }) {
  // "forceChange" mode renders only the password block, used by AdminGate
  // before letting the user into the dashboard on first sign-in.
  const [profile, setProfile] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [profileFlash, setProfileFlash] = useState("");
  const [pwFlash, setPwFlash] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileErr("");
    setProfileFlash("");
    const update = {};
    if (profile.name.trim() && profile.name.trim() !== currentUser.name) {
      update.name = profile.name.trim();
    }
    const newEmail = profile.email.trim().toLowerCase();
    if (newEmail && newEmail !== currentUser.email) {
      update.email = newEmail;
      const cp = window.prompt(
        "Changing your sign-in email requires your current password. Enter it to confirm:"
      );
      if (cp === null) return;
      if (!cp) {
        setProfileErr("Current password is required to change your email.");
        return;
      }
      update.current_password = cp;
    }
    if (Object.keys(update).length === 0) {
      setProfileFlash("Nothing to update.");
      setTimeout(() => setProfileFlash(""), 2500);
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await axios.patch(`${API}/admin/me`, update, {
        headers: authHeaders(token),
      });
      onUpdated?.(data);
      setProfileFlash("Profile updated.");
      setTimeout(() => setProfileFlash(""), 3000);
    } catch (err) {
      setProfileErr(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwErr("");
    setPwFlash("");
    if (!pw.current && !forceChange) {
      setPwErr("Current password is required.");
      return;
    }
    if (forceChange && !pw.current) {
      setPwErr("Enter your temporary password.");
      return;
    }
    if (pw.next.length < 8) {
      setPwErr("New password must be at least 8 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwErr("New password and confirmation don't match.");
      return;
    }
    if (pw.next === pw.current) {
      setPwErr("New password must differ from the current one.");
      return;
    }
    setSavingPw(true);
    try {
      const { data } = await axios.patch(
        `${API}/admin/me`,
        { current_password: pw.current, new_password: pw.next },
        { headers: authHeaders(token) }
      );
      setPw({ current: "", next: "", confirm: "" });
      onUpdated?.(data);
      setPwFlash("Password updated.");
      setTimeout(() => setPwFlash(""), 3000);
    } catch (err) {
      setPwErr(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't change password."));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-8">
      {!forceChange && (
        <section
          className="bg-white border border-[#DFD7CA] p-6 space-y-4"
          data-testid="profile-identity-section"
        >
          <div className="flex items-center gap-2">
            <UserCircle2 size={16} className="text-[#C05A3A]" />
            <p className="overline text-[#C05A3A]">Your profile</p>
          </div>
          <p className="text-xs text-[#5C4E4A]">
            Update how your name appears in revisions and what address you use to sign in.
          </p>
          <form onSubmit={saveProfile} className="grid md:grid-cols-2 gap-4">
            <div className="field">
              <label htmlFor="p-name">Name</label>
              <input
                id="p-name"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                data-testid="profile-name-input"
              />
            </div>
            <div className="field">
              <label htmlFor="p-email">Sign-in email</label>
              <input
                id="p-email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                data-testid="profile-email-input"
              />
              <p className="text-xs text-[#5C4E4A] mt-1">
                Changing your email requires your current password.
              </p>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              {profileFlash && (
                <span className="text-xs text-[#2D5C32]" data-testid="profile-saved-indicator">
                  {profileFlash}
                </span>
              )}
              {profileErr && (
                <span className="text-xs text-[#C05A3A]" data-testid="profile-error">
                  {profileErr}
                </span>
              )}
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary text-sm"
                data-testid="profile-save-button"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section
        className="bg-white border border-[#DFD7CA] p-6 space-y-4"
        data-testid="profile-password-section"
      >
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-[#C05A3A]" />
          <p className="overline text-[#C05A3A]">
            {forceChange ? "Set a new password" : "Change password"}
          </p>
        </div>
        <p className="text-xs text-[#5C4E4A]">
          {forceChange
            ? "Before you can access the dashboard, please choose a password only you know."
            : "Confirm your current password, then set a new one. Min 8 characters."}
        </p>
        <form onSubmit={savePassword} className="grid md:grid-cols-2 gap-4">
          <div className="field md:col-span-2">
            <label htmlFor="p-pw-current">
              {forceChange ? "Temporary password (from invite email)" : "Current password"}
            </label>
            <input
              id="p-pw-current"
              type="password"
              required
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              autoComplete="current-password"
              data-testid="profile-current-password-input"
            />
          </div>
          <div className="field">
            <label htmlFor="p-pw-new">New password</label>
            <input
              id="p-pw-new"
              type="password"
              required
              minLength={8}
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              autoComplete="new-password"
              data-testid="profile-new-password-input"
            />
          </div>
          <div className="field">
            <label htmlFor="p-pw-confirm">Confirm new password</label>
            <input
              id="p-pw-confirm"
              type="password"
              required
              minLength={8}
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
              data-testid="profile-confirm-password-input"
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            {pwFlash && (
              <span className="text-xs text-[#2D5C32]" data-testid="profile-password-saved">
                {pwFlash}
              </span>
            )}
            {pwErr && (
              <span className="text-xs text-[#C05A3A]" data-testid="profile-password-error">
                {pwErr}
              </span>
            )}
            <button
              type="submit"
              disabled={savingPw}
              className="btn-primary text-sm"
              data-testid="profile-password-save-button"
            >
              {savingPw ? "Saving…" : forceChange ? "Set password & continue" : "Change password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
