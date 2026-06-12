// Settings panel — general (brand identity) + reading (content visibility).
import { useEffect, useState } from "react";
import axios from "axios";
import { API, authHeaders, formatApiErrorDetail } from "../api";

export default function SettingsPanel({ token, readOnly }) {
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
    </div>
  );
}
