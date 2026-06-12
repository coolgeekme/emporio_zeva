// Site Content panel — field-level editing of hardcoded pages
// (Home, Collection, Ritual, Our Story, Journal index, Contact).
// Renders the manifest returned by /api/admin/site-content as tabbed groups.
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Image as ImageIcon, RotateCcw, X, Eye } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail } from "../api";
import HistoryDrawer, { HistoryButton } from "../HistoryDrawer";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

function MediaPicker({ open, onPick, onClose, token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios
      .get(`${API}/admin/media`, { headers: authHeaders(token) })
      .then(({ data }) => setItems(data.filter((m) => m.mime_type?.startsWith("image/"))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, token]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white border border-[#DFD7CA] w-full max-w-4xl shadow-xl">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA]">
          <h3 className="font-serif text-lg text-[#2A1F1D]">Pick an image</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="p-6">
          {loading ? <p className="text-sm text-[#5C4E4A]">Loading…</p> :
           items.length === 0 ? <p className="text-sm text-[#5C4E4A]">No images uploaded yet.</p> :
           (
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
               {items.map((m) => (
                 <button
                   key={m.id}
                   type="button"
                   onClick={() => onPick(`${BACKEND}${m.url}`)}
                   className="aspect-square bg-[#F5EFE2] hover:ring-2 hover:ring-[#C05A3A] overflow-hidden"
                 >
                   <img src={`${BACKEND}${m.url}`} alt={m.alt_text || m.original_filename} className="w-full h-full object-cover" />
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function FieldEditor({ field, value, onChange, token }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isDefault = !value || value === field.default;

  if (field.type === "textarea") {
    return (
      <div className="field">
        <label htmlFor={`sc-${field.key}`}>{field.label}</label>
        <textarea
          id={`sc-${field.key}`}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`content-field-${field.key}`}
        />
        <button
          type="button"
          onClick={() => onChange(field.default || "")}
          className="text-xs text-[#5C4E4A] hover:text-[#C05A3A] mt-1 inline-flex items-center gap-1"
          disabled={value === field.default}
        >
          <RotateCcw size={10} /> Reset to default
        </button>
      </div>
    );
  }
  if (field.type === "image") {
    return (
      <div className="field">
        <label htmlFor={`sc-${field.key}`}>{field.label}</label>
        <div className="flex gap-2 items-start">
          <input
            id={`sc-${field.key}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or /api/static/…"
            data-testid={`content-field-${field.key}`}
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="btn-outline text-xs whitespace-nowrap inline-flex items-center gap-1"
            data-testid={`content-field-${field.key}-browse`}
          >
            <ImageIcon size={12} /> Browse
          </button>
        </div>
        {value && (
          <div className="mt-2 inline-block bg-[#F5EFE2] border border-[#DFD7CA] p-1">
            <img src={value} alt="" className="h-24 w-24 object-cover" />
          </div>
        )}
        <button
          type="button"
          onClick={() => onChange(field.default || "")}
          className="text-xs text-[#5C4E4A] hover:text-[#C05A3A] mt-2 inline-flex items-center gap-1 block"
          disabled={value === field.default || (!value && !field.default)}
        >
          <RotateCcw size={10} /> Reset to default
        </button>
        <MediaPicker
          open={pickerOpen}
          token={token}
          onPick={(url) => {
            onChange(url);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      </div>
    );
  }
  // default: text
  return (
    <div className="field">
      <label htmlFor={`sc-${field.key}`}>{field.label}</label>
      <input
        id={`sc-${field.key}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={`content-field-${field.key}`}
      />
      {!isDefault && (
        <button
          type="button"
          onClick={() => onChange(field.default || "")}
          className="text-xs text-[#5C4E4A] hover:text-[#C05A3A] mt-1 inline-flex items-center gap-1"
        >
          <RotateCcw size={10} /> Reset to default
        </button>
      )}
    </div>
  );
}

export default function SiteContentPanel({ token }) {
  const [pages, setPages] = useState([]);
  const [active, setActive] = useState(null);
  const [values, setValues] = useState({}); // working buffer for active page
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Public route per page key (matches public pages routing)
  const PUBLIC_ROUTE = {
    home: "/",
    collection: "/collection",
    ritual: "/ritual",
    our_story: "/our-story",
    journal_index: "/journal",
    contact: "/contact",
  };

  const openPreview = () => {
    if (!activePage) return;
    const key = `site-content-${active}`;
    const buffer = { fields: values, ts: Date.now() };
    try {
      sessionStorage.setItem(key, JSON.stringify(buffer));
      const path = PUBLIC_ROUTE[active] || "/";
      window.open(`${path}?preview=${encodeURIComponent(key)}`, "_blank", "noopener");
    } catch {
      setError("Couldn't open preview.");
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/site-content`, { headers: authHeaders(token) });
      setPages(data.pages);
      if (data.pages.length) {
        const initial = active || data.pages[0].key;
        setActive(initial);
        const p = data.pages.find((x) => x.key === initial) || data.pages[0];
        setValues(buildInitialValues(p));
      }
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load site content."));
    } finally {
      setLoading(false);
    }
  };

  // For each field, working value = override OR default (so the form is fully populated)
  const buildInitialValues = (page) => {
    const out = {};
    page.sections.forEach((s) =>
      s.fields.forEach((f) => {
        out[f.key] = page.overrides?.[f.key] ?? f.default ?? "";
      })
    );
    return out;
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  const activePage = useMemo(() => pages.find((p) => p.key === active), [pages, active]);

  const switchPage = (key) => {
    setActive(key);
    const p = pages.find((x) => x.key === key);
    if (p) setValues(buildInitialValues(p));
  };

  const save = async () => {
    if (!activePage) return;
    setSaving(true);
    setError("");
    try {
      // Only send fields that differ from default — keeps the doc lean
      const payload = {};
      activePage.sections.forEach((s) =>
        s.fields.forEach((f) => {
          const v = values[f.key] ?? "";
          if (v !== (f.default || "")) payload[f.key] = v;
          else payload[f.key] = ""; // explicit clear -> default
        })
      );
      await axios.patch(`${API}/admin/site-content/${active}`, payload, {
        headers: authHeaders(token),
      });
      setSavedAt(new Date());
      setTimeout(() => setSavedAt(null), 3000);
      await load();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="admin-site-content-panel">
      <header>
        <h2 className="font-serif text-2xl text-[#2A1F1D]">Site Content</h2>
        <p className="text-xs text-[#5C4E4A] mt-1">
          Edit text and images on the marketing pages. Layout, animations, and the article/product lists themselves stay code-driven.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center">Loading…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-[#DFD7CA]" data-testid="content-page-tabs">
            <div className="flex flex-wrap gap-2">
              {pages.map((p) => (
                <button
                  key={p.key}
                  onClick={() => switchPage(p.key)}
                  className={`px-4 py-2 text-sm uppercase tracking-wide transition-colors ${
                    active === p.key
                      ? "text-[#2A1F1D] border-b-2 border-[#C05A3A] -mb-px font-semibold"
                      : "text-[#5C4E4A] hover:text-[#2A1F1D]"
                  }`}
                  data-testid={`content-tab-${p.key}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-2">
              <button
                type="button"
                onClick={openPreview}
                className="btn-outline text-xs inline-flex items-center gap-1"
                data-testid="content-preview-button"
              >
                <Eye size={12} /> Preview
              </button>
              {active && <HistoryButton onClick={() => setHistoryOpen(true)} />}
            </div>
          </div>

          {error && <p className="text-sm text-[#C05A3A]" data-testid="content-error">{error}</p>}

          {activePage && (
            <div className="space-y-6">
              {activePage.sections.map((section, i) => (
                <section
                  key={i}
                  className="bg-white border border-[#DFD7CA] p-6"
                  data-testid={`content-section-${active}-${i}`}
                >
                  <p className="overline text-[#C05A3A]">{section.label}</p>
                  <div className="mt-4 space-y-4">
                    {section.fields.map((f) => (
                      <FieldEditor
                        key={f.key}
                        field={f}
                        value={values[f.key] ?? ""}
                        onChange={(v) => setValues((vs) => ({ ...vs, [f.key]: v }))}
                        token={token}
                      />
                    ))}
                  </div>
                </section>
              ))}

              <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-[#F5EFE2]/95 backdrop-blur py-3 px-4 border-t border-[#DFD7CA] -mx-4">
                {savedAt && (
                  <span className="text-xs text-[#2D5C32]" data-testid="content-saved-indicator">
                    Saved. Refresh the public page to see the changes.
                  </span>
                )}
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn-primary text-sm"
                  data-testid="content-save-button"
                >
                  {saving ? "Saving…" : `Save ${activePage.label}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {active && (
        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          docType="site_content"
          docId={active}
          token={token}
          onReverted={() => {
            setHistoryOpen(false);
            load();
          }}
          renderPreview={(snap) => {
            const fields = snap?.fields || {};
            const entries = Object.entries(fields).slice(0, 6);
            return (
              <>
                {entries.length === 0 ? (
                  <em>(empty — all defaults)</em>
                ) : (
                  entries.map(([k, v]) => (
                    <p key={k} className="mb-1"><b>{k}</b>: {String(v).slice(0, 80)}{String(v).length > 80 ? "…" : ""}</p>
                  ))
                )}
              </>
            );
          }}
        />
      )}
    </div>
  );
}
