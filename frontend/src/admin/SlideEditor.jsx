// SlideEditor — renders the SLIDE_MANIFEST for a deck and writes
// slide_overrides back to the deck. Handles Template vs Custom mode.
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Image as ImageIcon, RotateCcw, ChevronDown, ChevronUp, Eye, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail } from "./api";
import { SLIDE_MANIFEST, TEMPLATE_SLIDES } from "./deckManifest";
import HistoryDrawer, { HistoryButton } from "./HistoryDrawer";

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
    <div className="fixed inset-0 z-[110] bg-black/60 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white border border-[#DFD7CA] w-full max-w-4xl shadow-xl">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA]">
          <h3 className="font-serif text-lg text-[#2A1F1D]">Pick an image</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="p-6">
          {loading ? <p className="text-sm text-[#5C4E4A]">Loading…</p> :
           items.length === 0 ? <p className="text-sm text-[#5C4E4A]">No images yet. Upload some in the Media tab.</p> : (
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

function ListField({ field, value, onChange }) {
  // Treat undefined/null as "no override yet" -> the deck still renders
  // defaults. The admin can click "Customize" to materialise the defaults
  // into the override buffer for editing.
  const hasOverride = Array.isArray(value);
  const items = hasOverride ? value : field.defaults || [];
  const shape = field.itemFields || [];

  const updateItem = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };
  const addItem = () => {
    const empty = Object.fromEntries(shape.map((s) => [s.key, ""]));
    onChange([...items, empty]);
  };
  const deleteItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };
  const resetToDefaults = () => {
    if (!field.defaults) return;
    if (
      !window.confirm(
        "Reset this list to the published defaults? Your edits to this list will be lost."
      )
    )
      return;
    // Empty array means "explicit override of nothing" — we want to fully
    // un-override so the deck snaps back to defaults. Passing undefined.
    onChange(undefined);
  };

  return (
    <div className="field" data-testid={`slide-field-${field.key}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="!mb-0">{field.label}</label>
        <div className="flex items-center gap-3 text-[10px]">
          {hasOverride ? (
            <span className="text-[#C05A3A] uppercase tracking-wider">Custom · {items.length}</span>
          ) : (
            <span className="text-[#5C4E4A] uppercase tracking-wider">
              Defaults · {items.length}
            </span>
          )}
          {hasOverride && field.defaults && (
            <button
              type="button"
              onClick={resetToDefaults}
              className="text-[#5C4E4A] hover:text-[#C05A3A] inline-flex items-center gap-1"
              data-testid={`slide-list-reset-${field.key}`}
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      {!hasOverride && (
        <p className="text-[11px] text-[#5C4E4A] mb-2 italic">
          Currently showing the published defaults. Click any item below to customize, or use
          Add / Delete / arrows to restructure.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="border border-[#DFD7CA] bg-[#FBF7EE] p-3 space-y-2"
            data-testid={`slide-list-item-${field.key}-${idx}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="overline text-[#5C4E4A] !text-[9px]">
                No 0{idx + 1}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 text-[#5C4E4A] hover:text-[#2A1F1D] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                  data-testid={`slide-list-up-${field.key}-${idx}`}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, +1)}
                  disabled={idx === items.length - 1}
                  className="p-1 text-[#5C4E4A] hover:text-[#2A1F1D] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                  data-testid={`slide-list-down-${field.key}-${idx}`}
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(idx)}
                  className="p-1 text-[#C05A3A] hover:text-[#7A2A18]"
                  title="Delete"
                  data-testid={`slide-list-delete-${field.key}-${idx}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {shape.map((s) =>
              s.type === "textarea" ? (
                <div key={s.key} className="field !mb-0">
                  <label className="!text-[10px]">{s.label}</label>
                  <textarea
                    rows={2}
                    value={item?.[s.key] || ""}
                    onChange={(e) => updateItem(idx, { [s.key]: e.target.value })}
                    data-testid={`slide-list-input-${field.key}-${idx}-${s.key}`}
                  />
                </div>
              ) : (
                <div key={s.key} className="field !mb-0">
                  <label className="!text-[10px]">{s.label}</label>
                  <input
                    value={item?.[s.key] || ""}
                    onChange={(e) => updateItem(idx, { [s.key]: e.target.value })}
                    data-testid={`slide-list-input-${field.key}-${idx}-${s.key}`}
                  />
                </div>
              )
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="btn-outline text-xs mt-3 inline-flex items-center gap-1"
        data-testid={`slide-list-add-${field.key}`}
      >
        <Plus size={12} /> {field.addLabel || "Add item"}
      </button>
    </div>
  );
}

function FieldInput({ field, value, onChange, token }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (field.type === "list") {
    return <ListField field={field} value={value} onChange={onChange} />;
  }
  if (field.type === "image") {
    return (
      <div className="field">
        <label>{field.label}</label>
        <div className="flex gap-2 items-start">
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or /api/static/…"
            data-testid={`slide-field-${field.key}`}
          />
          <button type="button" onClick={() => setPickerOpen(true)} className="btn-outline text-xs whitespace-nowrap inline-flex items-center gap-1">
            <ImageIcon size={12} /> Browse
          </button>
        </div>
        {value && (
          <div className="mt-2 inline-block bg-[#F5EFE2] border border-[#DFD7CA] p-1">
            <img src={value} alt="" className="h-20 w-20 object-cover" />
          </div>
        )}
        <button type="button" onClick={() => onChange("")} className="text-xs text-[#5C4E4A] hover:text-[#C05A3A] mt-1 inline-flex items-center gap-1">
          <RotateCcw size={10} /> Clear (use deck default)
        </button>
        <MediaPicker open={pickerOpen} token={token} onPick={(u) => { onChange(u); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
      </div>
    );
  }
  if (field.type === "markdown" || field.type === "textarea") {
    return (
      <div className="field">
        <label>{field.label}</label>
        <textarea
          rows={field.type === "markdown" ? 4 : 2}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`slide-field-${field.key}`}
          placeholder={field.type === "markdown" ? "Markdown supported: **bold**, *italic*, - bullets, [links](url), paragraphs separated by blank lines." : ""}
        />
        {field.type === "markdown" && value && (
          <div className="mt-2 p-3 bg-[#FBF7EE] border border-[#DFD7CA] text-xs text-[#5C4E4A]">
            <p className="overline text-[#C05A3A] !text-[9px] mb-1">Live preview</p>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="field">
      <label>{field.label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={`slide-field-${field.key}`} />
    </div>
  );
}

function SlideSection({ slide, values, onChange, token, defaultOpen, locked }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasAnyOverride = slide.fields.some((f) => (values[f.key] ?? "") !== "");

  return (
    <section className="bg-white border border-[#DFD7CA]" data-testid={`slide-section-${slide.key}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-4 px-5 py-3 text-left ${locked ? "opacity-50" : ""}`}
        disabled={locked}
        data-testid={`slide-section-toggle-${slide.key}`}
      >
        <div>
          <p className="font-serif text-lg text-[#2A1F1D]">{slide.label}</p>
          <p className="text-[10px] text-[#5C4E4A] mt-0.5">
            {locked ? "Available only in Custom mode" : hasAnyOverride ? "Overrides set" : "Using defaults"}
          </p>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && !locked && (
        <div className="px-5 pb-5 space-y-3 border-t border-[#F0E6CF]">
          {slide.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={(v) => onChange(f.key, v)}
              token={token}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function SlideEditor({ deck, token, onClose, onSaved }) {
  const [mode, setMode] = useState(deck.template_mode || "template");
  const [overrides, setOverrides] = useState(() => deck.slide_overrides || {});
  const [introText, setIntroText] = useState(deck.intro_text || "");
  const [clientName, setClientName] = useState(deck.client_name || "");
  const [logoUrl, setLogoUrl] = useState(deck.logo_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const setField = (slideKey, fieldKey, value) =>
    setOverrides((o) => ({
      ...o,
      [slideKey]: {
        ...(o[slideKey] || {}),
        [fieldKey]: value,
      },
    }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await axios.patch(
        `${API}/admin/decks/${deck.id}`,
        {
          client_name: clientName.trim() || deck.client_name,
          intro_text: introText.trim() || deck.intro_text,
          logo_url: logoUrl.trim() || null,
          template_mode: mode,
          slide_overrides: overrides,
        },
        { headers: authHeaders(token) }
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save."));
      setSaving(false);
    }
  };

  // Open a public preview tab with the working buffer applied
  const openPreview = () => {
    const key = `deck-preview-${deck.slug}`;
    const buffer = {
      client_name: clientName,
      intro_text: introText,
      logo_url: logoUrl,
      template_mode: mode,
      slide_overrides: overrides,
      ts: Date.now(),
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(buffer));
      window.open(`/deck/${deck.slug}?preview=${encodeURIComponent(key)}`, "_blank", "noopener");
    } catch {
      setError("Couldn't open preview. Browser blocked storage or popup.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/50">
      <div className="relative bg-[#F5EFE2] w-full max-w-5xl my-4 mx-4 shadow-2xl border border-[#DFD7CA] flex flex-col" data-testid="slide-editor-dialog">
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#DFD7CA] bg-white">
          <div>
            <p className="overline text-[#C05A3A]">Edit Presentation</p>
            <h2 className="font-serif text-xl text-[#2A1F1D]">{deck.client_name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPreview}
              className="btn-outline text-sm inline-flex items-center gap-1"
              data-testid="slide-editor-preview-button"
            >
              <Eye size={14} /> Preview
            </button>
            <HistoryButton onClick={() => setHistoryOpen(true)} />
            <button onClick={onClose} aria-label="Close" data-testid="slide-editor-close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Mode toggle */}
          <section className="bg-white border border-[#DFD7CA] p-4">
            <p className="overline text-[#5C4E4A] !text-[10px] mb-3">Presentation mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("template")}
                className={`text-left border p-3 ${mode === "template" ? "border-[#C05A3A] bg-[#FBF7EE]" : "border-[#DFD7CA] hover:border-[#5C4E4A]"}`}
                data-testid="slide-editor-mode-template"
              >
                <p className="font-serif text-base text-[#2A1F1D]">Template</p>
                <p className="text-xs text-[#5C4E4A] mt-1">Cover + Offer only.</p>
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`text-left border p-3 ${mode === "custom" ? "border-[#C05A3A] bg-[#FBF7EE]" : "border-[#DFD7CA] hover:border-[#5C4E4A]"}`}
                data-testid="slide-editor-mode-custom"
              >
                <p className="font-serif text-base text-[#2A1F1D]">Custom</p>
                <p className="text-xs text-[#5C4E4A] mt-1">All 11 slides editable.</p>
              </button>
            </div>
          </section>

          {/* Top-level deck fields shared across modes */}
          <section className="bg-white border border-[#DFD7CA] p-5 space-y-4">
            <p className="overline text-[#C05A3A]">Deck basics</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="field">
                <label>Client name</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} data-testid="slide-editor-client-name" />
              </div>
              <div className="field">
                <label>Logo URL</label>
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" data-testid="slide-editor-logo-url" />
              </div>
            </div>
            <div className="field">
              <label>Cover · intro subtitle</label>
              <textarea
                rows={3}
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                className="font-serif italic"
                data-testid="slide-editor-intro-text"
              />
              <p className="text-[10px] text-[#5C4E4A] mt-1">
                This is the italic subtitle on the cover slide. Slide-1 overrides below can replace it entirely.
              </p>
            </div>
          </section>

          {/* Slide manifest */}
          {SLIDE_MANIFEST.map((slide) => {
            const isTemplateSlide = TEMPLATE_SLIDES.has(slide.key);
            const locked = mode === "template" && !isTemplateSlide;
            return (
              <SlideSection
                key={slide.key}
                slide={slide}
                values={overrides[slide.key] || {}}
                onChange={(fk, v) => setField(slide.key, fk, v)}
                token={token}
                defaultOpen={isTemplateSlide}
                locked={locked}
              />
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#DFD7CA] bg-white">
          {error && <p className="text-sm text-[#C05A3A]" data-testid="slide-editor-error">{error}</p>}
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn-outline text-sm">Cancel</button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary text-sm"
              data-testid="slide-editor-save-button"
            >
              {saving ? "Saving…" : "Save deck"}
            </button>
          </div>
        </footer>
        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          docType="deck"
          docId={deck.id}
          token={token}
          onReverted={() => {
            setHistoryOpen(false);
            onSaved();
            onClose();
          }}
          renderPreview={(snap) => (
            <>
              <p className="font-medium text-[#2A1F1D] mb-1">{snap?.client_name}</p>
              <p className="italic mb-1">{(snap?.intro_text || "").slice(0, 120)}</p>
              <p>Mode: {snap?.template_mode || "template"}</p>
              <p>Slide overrides: {Object.keys(snap?.slide_overrides || {}).length}</p>
            </>
          )}
        />
      </div>
    </div>
  );
}
