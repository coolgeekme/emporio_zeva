// Settings panel — profile (self-service) + general (brand) + reading (content visibility).
import { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, Plus } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail } from "../api";
import ProfileSection from "./ProfileSection";

// Who receives the "New inquiry / waitlist / newsletter" notification emails.
// Admin-only — mirrors the backend's require_admin gate on these endpoints.
function NotificationRecipients({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/notification-recipients`, {
        headers: authHeaders(token),
      });
      setItems(data);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load recipients."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  const addRecipient = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setError("");
    try {
      await axios.post(
        `${API}/admin/notification-recipients`,
        { name: newName.trim(), email: newEmail.trim() },
        { headers: authHeaders(token) }
      );
      setNewName("");
      setNewEmail("");
      await load();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't add recipient."));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.name || "");
    setEditEmail(r.email);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id) => {
    setBusyId(id);
    setError("");
    try {
      const { data } = await axios.patch(
        `${API}/admin/notification-recipients/${id}`,
        { name: editName.trim(), email: editEmail.trim() },
        { headers: authHeaders(token) }
      );
      setItems((arr) => arr.map((x) => (x.id === id ? data : x)));
      setEditingId(null);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save recipient."));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (r) => {
    setBusyId(r.id);
    setError("");
    try {
      const { data } = await axios.patch(
        `${API}/admin/notification-recipients/${r.id}`,
        { active: !r.active },
        { headers: authHeaders(token) }
      );
      setItems((arr) => arr.map((x) => (x.id === r.id ? data : x)));
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't update recipient."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.email} from notification recipients?`)) return;
    setBusyId(r.id);
    setError("");
    try {
      await axios.delete(`${API}/admin/notification-recipients/${r.id}`, {
        headers: authHeaders(token),
      });
      setItems((arr) => arr.filter((x) => x.id !== r.id));
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't remove recipient."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className="bg-white border border-[#DFD7CA] p-6 space-y-4"
      data-testid="settings-notification-recipients-section"
    >
      <p className="overline text-[#C05A3A]">Notification recipients</p>
      <p className="text-xs text-[#5C4E4A]">
        Who gets emailed when a visitor submits the inquiry, waitlist, or newsletter forms.
        Inactive recipients are kept on the list but skipped.
      </p>

      {error && <p className="text-sm text-[#C05A3A]">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#5C4E4A]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#5C4E4A]" data-testid="notification-recipients-empty">
          No recipients configured yet — form notifications have nowhere to go.
        </p>
      ) : (
        <ul className="divide-y divide-[#F0E6CF]" data-testid="notification-recipients-list">
          {items.map((r) => (
            <li key={r.id} className="py-3 flex items-center gap-3 flex-wrap">
              {editingId === r.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="!w-32 !py-1.5 !text-sm"
                    data-testid={`recipient-edit-name-${r.id}`}
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="!flex-1 !min-w-[180px] !py-1.5 !text-sm"
                    data-testid={`recipient-edit-email-${r.id}`}
                  />
                  <button
                    onClick={() => saveEdit(r.id)}
                    disabled={busyId === r.id}
                    className="btn-primary !text-xs !py-1.5 !px-3"
                    data-testid={`recipient-save-${r.id}`}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="btn-outline !text-xs !py-1.5 !px-3"
                    data-testid={`recipient-cancel-${r.id}`}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={() => toggleActive(r)}
                      disabled={busyId === r.id}
                      className="accent-[#C05A3A] h-4 w-4"
                      data-testid={`recipient-active-${r.id}`}
                      title="Active"
                    />
                  </label>
                  <div className="flex-1 min-w-[180px]">
                    <p className={`text-sm ${r.active ? "text-[#2A1F1D]" : "text-[#5C4E4A] line-through"}`}>
                      {r.name ? `${r.name} — ${r.email}` : r.email}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(r)}
                    className="text-xs text-[#5C4E4A] hover:text-[#2A1F1D]"
                    data-testid={`recipient-edit-${r.id}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(r)}
                    disabled={busyId === r.id}
                    className="text-[#C05A3A] hover:text-[#2A1F1D] disabled:opacity-50"
                    data-testid={`recipient-delete-${r.id}`}
                    aria-label={`Remove ${r.email}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addRecipient} className="flex items-end gap-3 flex-wrap pt-2">
        <div className="field !mb-0">
          <label htmlFor="nr-name">Name</label>
          <input
            id="nr-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Eva"
            data-testid="recipient-new-name-input"
          />
        </div>
        <div className="field !mb-0 flex-1 min-w-[200px]">
          <label htmlFor="nr-email">Email</label>
          <input
            id="nr-email"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@notasalami.com"
            data-testid="recipient-new-email-input"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="btn-primary inline-flex items-center gap-2 text-sm"
          data-testid="recipient-add-button"
        >
          <Plus size={14} /> {adding ? "Adding…" : "Add recipient"}
        </button>
      </form>
    </section>
  );
}

export default function SettingsPanel({ token, readOnly, currentUser, onUserUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/settings`, {
        headers: authHeaders(token),
      });
      setData(data);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load settings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  const updateGeneral = (k, v) =>
    setData((d) => ({ ...d, general: { ...d.general, [k]: v } }));
  const updateReading = (k, v) =>
    setData((d) => ({ ...d, reading: { ...d.reading, [k]: v } }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await axios.patch(
        `${API}/admin/settings`,
        { general: data.general, reading: data.reading },
        { headers: authHeaders(token) }
      );
      setSavedAt(new Date());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-[#5C4E4A] py-12">Loading…</p>;
  if (!data) return <p className="text-sm text-[#C05A3A]">{error}</p>;

  return (
    <div className="space-y-8 max-w-3xl" data-testid="admin-settings-panel">
      <header>
        <h2 className="font-serif text-2xl text-[#2A1F1D]">Settings</h2>
        <p className="text-xs text-[#5C4E4A] mt-1">
          Changes apply across the site immediately after save.
        </p>
        {readOnly && (
          <p className="text-xs text-[#C05A3A] mt-2">
            You're signed in as a non-admin role. Settings are read-only.
          </p>
        )}
      </header>

      {error && <p className="text-sm text-[#C05A3A]">{error}</p>}

      {currentUser && (
        <ProfileSection
          token={token}
          currentUser={currentUser}
          onUpdated={onUserUpdated}
        />
      )}

      <section className="bg-white border border-[#DFD7CA] p-6 space-y-4" data-testid="settings-general-section">
        <p className="overline text-[#C05A3A]">General</p>
        <p className="text-xs text-[#5C4E4A]">
          Brand identity & contact info — surfaces in Nav, Footer, and contact form.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="field">
            <label htmlFor="s-brand">Brand name</label>
            <input
              id="s-brand"
              disabled={readOnly}
              value={data.general.brand_name}
              onChange={(e) => updateGeneral("brand_name", e.target.value)}
              data-testid="settings-brand-name-input"
            />
          </div>
          <div className="field">
            <label htmlFor="s-tag">Tagline</label>
            <input
              id="s-tag"
              disabled={readOnly}
              value={data.general.tagline}
              onChange={(e) => updateGeneral("tagline", e.target.value)}
              data-testid="settings-tagline-input"
            />
          </div>
          <div className="field">
            <label htmlFor="s-email">Contact email</label>
            <input
              id="s-email"
              type="email"
              disabled={readOnly}
              value={data.general.contact_email}
              onChange={(e) => updateGeneral("contact_email", e.target.value)}
              data-testid="settings-contact-email-input"
            />
          </div>
          <div className="field">
            <label htmlFor="s-ig">Instagram handle</label>
            <input
              id="s-ig"
              disabled={readOnly}
              value={data.general.instagram_handle}
              onChange={(e) => updateGeneral("instagram_handle", e.target.value)}
              data-testid="settings-instagram-input"
            />
          </div>
          <div className="field md:col-span-2">
            <label htmlFor="s-addr">Address</label>
            <input
              id="s-addr"
              disabled={readOnly}
              value={data.general.address}
              onChange={(e) => updateGeneral("address", e.target.value)}
              data-testid="settings-address-input"
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-[#DFD7CA] p-6 space-y-4" data-testid="settings-reading-section">
        <p className="overline text-[#C05A3A]">Reading</p>
        <p className="text-xs text-[#5C4E4A]">
          Control what visitors see on the public site.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="field">
            <label htmlFor="s-jpp">Journal articles per page</label>
            <input
              id="s-jpp"
              type="number"
              min={1}
              max={50}
              disabled={readOnly}
              value={data.reading.journal_per_page}
              onChange={(e) => updateReading("journal_per_page", Number(e.target.value) || 10)}
              data-testid="settings-journal-per-page-input"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <label className="text-sm text-[#2A1F1D] flex items-center gap-2">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={data.reading.show_future_products}
              onChange={(e) => updateReading("show_future_products", e.target.checked)}
              className="accent-[#C05A3A] h-4 w-4"
              data-testid="settings-show-future-products-checkbox"
            />
            Show "Coming next" future products on the Collection page
          </label>
          <label className="text-sm text-[#2A1F1D] flex items-center gap-2">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={data.reading.journal_enabled}
              onChange={(e) => updateReading("journal_enabled", e.target.checked)}
              className="accent-[#C05A3A] h-4 w-4"
              data-testid="settings-journal-enabled-checkbox"
            />
            Enable the public Journal section
          </label>
        </div>
      </section>

      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          {savedAt && (
            <span className="text-xs text-[#2D5C32]" data-testid="settings-saved-indicator">
              Saved.
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary text-sm"
            data-testid="settings-save-button"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      )}

      {!readOnly && <NotificationRecipients token={token} />}
    </div>
  );
}
