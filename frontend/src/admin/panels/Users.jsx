// Users panel — list, create, edit role/name/password, delete. Admin role only.
import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, X, Edit2, ShieldCheck } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail, formatDate, ROLES } from "../api";

function UserDialog({ token, user, onClose, onSaved }) {
  const isNew = !user;
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "viewer",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (isNew && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!isNew && form.password && form.password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await axios.post(
          `${API}/admin/users`,
          {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            role: form.role,
            password: form.password,
          },
          { headers: authHeaders(token) }
        );
      } else {
        const payload = { name: form.name.trim(), role: form.role };
        if (form.password) payload.password = form.password;
        await axios.patch(`${API}/admin/users/${user.id}`, payload, {
          headers: authHeaders(token),
        });
      }
      onSaved();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save user."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <div
        className="bg-white border border-[#DFD7CA] w-full max-w-md shadow-xl"
        data-testid="user-dialog"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA]">
          <h3 className="font-serif text-xl text-[#2A1F1D]">
            {isNew ? "New user" : `Edit ${user.email}`}
          </h3>
          <button onClick={onClose} aria-label="Close" data-testid="user-dialog-close">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={submit} className="p-6 space-y-4" data-testid="user-form">
          <div className="field">
            <label htmlFor="u-name">Name</label>
            <input
              id="u-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              data-testid="user-name-input"
            />
          </div>
          <div className="field">
            <label htmlFor="u-email">Email</label>
            <input
              id="u-email"
              type="email"
              required={isNew}
              disabled={!isNew}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="user-email-input"
            />
            {!isNew && (
              <p className="text-xs text-[#5C4E4A] mt-1">
                Email is the login identifier and can't be changed.
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="u-role">Role</label>
            <select
              id="u-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              data-testid="user-role-select"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#5C4E4A] mt-1">
              admin = everything · editor = content & decks · viewer = read-only.
            </p>
          </div>
          <div className="field">
            <label htmlFor="u-pw">
              {isNew ? "Password" : "New password (leave blank to keep current)"}
            </label>
            <input
              id="u-pw"
              type="password"
              required={isNew}
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              data-testid="user-password-input"
            />
          </div>
          {error && (
            <p className="text-sm text-[#C05A3A]" data-testid="user-form-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-outline text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-sm"
              data-testid="user-save-button"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPanel({ token, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | user object

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/users`, { headers: authHeaders(token) });
      setUsers(data);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  const remove = async (u) => {
    if (u.id === currentUser?.id) return;
    if (!window.confirm(`Delete ${u.email}?`)) return;
    try {
      await axios.delete(`${API}/admin/users/${u.id}`, { headers: authHeaders(token) });
      await load();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't delete."));
    }
  };

  return (
    <div className="space-y-5" data-testid="admin-users-panel">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-[#2A1F1D]">Users</h2>
          <p className="text-xs text-[#5C4E4A] mt-1">
            Manage who can sign into <code>/admin</code> and what they can do.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="btn-primary inline-flex items-center gap-2 text-sm"
          data-testid="users-new-button"
        >
          <Plus size={14} /> New user
        </button>
      </header>

      {error && <p className="text-sm text-[#C05A3A]" data-testid="users-error">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center">No users yet.</p>
      ) : (
        <div className="overflow-x-auto border border-[#DFD7CA]" data-testid="users-table">
          <table className="w-full text-sm">
            <thead className="bg-[#F5EFE2]">
              <tr>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Name</th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Email</th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Role</th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Created</th>
                <th className="px-4 py-3 border-b border-[#DFD7CA]"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="odd:bg-[#FBF7EE] even:bg-white">
                  <td className="px-4 py-3 border-b border-[#DFD7CA] text-[#2A1F1D]">
                    <span className="font-medium">{u.name}</span>
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-[#C05A3A]">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA] text-[#5C4E4A]">{u.email}</td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA]">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-[#F5EFE2] text-[#2A1F1D]">
                      {u.role === "admin" && <ShieldCheck size={12} className="text-[#C05A3A]" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA] text-xs text-[#5C4E4A]">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA]">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditing(u)}
                        className="text-[#2A1F1D] hover:underline inline-flex items-center gap-1"
                        data-testid={`users-edit-${u.id}`}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => remove(u)}
                        disabled={u.id === currentUser?.id}
                        className="text-[#C05A3A] hover:underline inline-flex items-center gap-1 disabled:opacity-40 disabled:no-underline"
                        data-testid={`users-delete-${u.id}`}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <UserDialog
          token={token}
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
