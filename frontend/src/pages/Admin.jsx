import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  LogOut,
  Download,
  RefreshCw,
  Lock,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "ez_admin_token";

const TABS = [
  { key: "decks", label: "Decks", path: "/admin/decks" },
  { key: "journal", label: "Journal", path: "/admin/journal" },
  { key: "waitlist", label: "Waitlist", path: "/admin/waitlist" },
  { key: "inquiries", label: "Inquiries", path: "/admin/inquiries" },
  { key: "newsletter", label: "Newsletter", path: "/admin/newsletter" },
];

// CSV helpers
function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const { data } = await axios.post(`${API}/admin/login`, { password });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.token);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Login failed. Try again.");
      setStatus("err");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5EFE2] px-6">
      <div className="w-full max-w-md bg-[#FBF7EE] border border-[#DFD7CA] p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Lock size={18} className="text-[#C05A3A]" />
          <p className="overline text-[#C05A3A]" data-testid="admin-login-overline">
            Emporio Zeva · Admin
          </p>
        </div>
        <h1 className="font-serif text-4xl text-[#2A1F1D] leading-tight">
          Welcome back.
        </h1>
        <p className="text-sm text-[#5C4E4A] mt-3 leading-relaxed">
          Enter the admin password to view waitlist signups, inquiries, and newsletter subscribers.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5" data-testid="admin-login-form">
          <div className="field">
            <label htmlFor="admin-pw">Password</label>
            <input
              id="admin-pw"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              data-testid="admin-password-input"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary w-full"
            data-testid="admin-login-button"
          >
            {status === "loading" ? "Signing in…" : "Sign in"}
          </button>

          {error && (
            <p className="text-sm text-[#C05A3A]" data-testid="admin-login-error">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Table({ columns, rows, emptyLabel, testid, selectable = false, selected, onToggle, onToggleAll }) {
  if (!rows.length) {
    return (
      <p className="text-[#5C4E4A] py-12 text-center" data-testid={`${testid}-empty`}>
        {emptyLabel}
      </p>
    );
  }
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected?.has(r.id));
  const someSelected =
    selectable && !allSelected && rows.some((r) => selected?.has(r.id));
  return (
    <div className="overflow-x-auto border border-[#DFD7CA]" data-testid={`${testid}-table`}>
      <table className="w-full text-sm">
        <thead className="bg-[#F5EFE2]">
          <tr>
            {selectable && (
              <th className="text-left px-4 py-3 border-b border-[#DFD7CA] w-10">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={() => onToggleAll?.(!allSelected)}
                  data-testid={`${testid}-select-all`}
                  className="accent-[#C05A3A] h-4 w-4"
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA] whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isSelected = selectable && selected?.has(r.id);
            return (
              <tr
                key={r.id || i}
                className={`${
                  isSelected ? "bg-[#F0E6CF]" : "odd:bg-[#FBF7EE] even:bg-white"
                } hover:bg-[#F5EFE2]/60 transition-colors`}
              >
                {selectable && (
                  <td className="px-4 py-3 align-top border-b border-[#DFD7CA]">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${i + 1}`}
                      checked={!!isSelected}
                      onChange={() => onToggle?.(r.id)}
                      data-testid={`${testid}-row-checkbox-${r.id}`}
                      className="accent-[#C05A3A] h-4 w-4"
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className="px-4 py-3 align-top text-[#2A1F1D] border-b border-[#DFD7CA] max-w-md"
                  >
                    {c.render ? c.render(r) : r[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

// ============================================================================
// Decks panel — create / list / share / delete custom presentations
// ============================================================================
function NewDeckDialog({ open, onClose, onCreated, token }) {
  const [step, setStep] = useState("input"); // input | preview | saving
  const [clientName, setClientName] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("input");
      setClientName("");
      setPreview(null);
      setError("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPreview = async () => {
    if (!clientName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/admin/decks/preview`,
        { client_name: clientName.trim() },
        { headers }
      );
      setPreview(data);
      setStep("preview");
    } catch (err) {
      setError("Couldn't prepare the preview. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const regenerateIntro = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/admin/decks/regenerate-intro`,
        { client_name: clientName.trim() },
        { headers }
      );
      setPreview((p) => ({ ...p, intro_text: data.intro_text }));
    } catch {
      setError("Couldn't generate a new intro. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/admin/decks`,
        {
          client_name: clientName.trim(),
          intro_text: preview?.intro_text,
          logo_url: preview?.logo_url,
        },
        { headers }
      );
      onCreated(data);
      onClose();
    } catch {
      setError("Couldn't save the deck. Try again.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      data-testid="new-deck-dialog"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-[#2A1F1D]/60 backdrop-blur-sm animate-fadeIn"
        aria-label="Close"
        data-testid="new-deck-backdrop"
      />
      <div className="relative bg-[#F5EFE2] w-full max-w-2xl shadow-2xl border border-[#DFD7CA] animate-riseIn max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#5C4E4A] hover:text-[#2A1F1D]"
          aria-label="Close"
          data-testid="new-deck-close"
        >
          <X size={18} />
        </button>

        <div className="p-8 md:p-12">
          <p className="overline text-[#C05A3A]">New Presentation</p>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 leading-tight text-[#2A1F1D]">
            Who is this for?
          </h2>

          {step === "input" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPreview();
              }}
              className="mt-8 space-y-5"
              data-testid="new-deck-form"
            >
              <p className="text-sm text-[#5C4E4A] leading-relaxed">
                Just enter the client's name. We'll fetch their logo and write a
                warm intro line in the Not A Salami voice. Everything is editable
                before you save.
              </p>
              <div className="field">
                <label htmlFor="nd-client">Client name</label>
                <input
                  id="nd-client"
                  type="text"
                  required
                  autoFocus
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Microsoft, Sequoia Capital, The French Laundry"
                  data-testid="new-deck-client-input"
                />
              </div>
              {error && (
                <p className="text-sm text-[#C05A3A]" data-testid="new-deck-error">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !clientName.trim()}
                className="btn-primary inline-flex items-center gap-2"
                data-testid="new-deck-preview-button"
              >
                <Sparkles size={14} />
                {busy ? "Preparing…" : "Prepare presentation"}
              </button>
            </form>
          )}

          {step === "preview" && preview && (
            <div className="mt-8 space-y-6" data-testid="new-deck-preview">
              <div className="flex items-start gap-4 bg-[#FBF7EE] border border-[#DFD7CA] p-5">
                {preview.logo_url && (
                  <img
                    src={preview.logo_url}
                    alt={`${preview.client_name} logo`}
                    className="h-14 w-14 object-contain bg-white p-1.5 border border-[#DFD7CA]"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    data-testid="new-deck-preview-logo"
                  />
                )}
                <div className="flex-1">
                  <p className="overline text-[#5C4E4A] !text-[9px]">For</p>
                  <p
                    className="font-serif text-2xl text-[#2A1F1D] mt-0.5"
                    data-testid="new-deck-preview-name"
                  >
                    {preview.client_name}
                  </p>
                  {preview.domain ? (
                    <p className="text-xs text-[#5C4E4A] mt-1">{preview.domain}</p>
                  ) : (
                    <p className="text-xs text-[#5C4E4A] mt-1 italic">
                      No logo found — cover slide will use the name in serif type.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="overline text-[#5C4E4A] mb-2">Intro · cover slide (editable)</p>
                <textarea
                  value={preview.intro_text}
                  onChange={(e) =>
                    setPreview((p) => ({ ...p, intro_text: e.target.value }))
                  }
                  rows={4}
                  className="font-serif text-lg italic text-[#2A1F1D] leading-snug bg-[#FBF7EE] border border-[#DFD7CA] p-5 w-full focus:outline-none focus:border-[#C05A3A] transition-colors"
                  data-testid="new-deck-preview-intro"
                  placeholder="Write the opening sentence for the cover slide…"
                />
                <button
                  type="button"
                  onClick={regenerateIntro}
                  disabled={busy}
                  className="text-xs uppercase tracking-wider text-[#C05A3A] hover:text-[#2A1F1D] mt-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                  data-testid="new-deck-regenerate-button"
                >
                  <RefreshCw size={12} />
                  {busy ? "Writing…" : "Try a different intro (AI)"}
                </button>
              </div>

              {error && (
                <p className="text-sm text-[#C05A3A]" data-testid="new-deck-save-error">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="btn-primary"
                  data-testid="new-deck-save-button"
                >
                  {busy ? "Saving…" : "Save & get link →"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="text-sm text-[#5C4E4A] hover:text-[#2A1F1D]"
                  data-testid="new-deck-back-button"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Journal panel — Eva can edit article copy in-place
// ============================================================================
function JournalEditor({ article, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: article.title,
    excerpt: article.excerpt,
    image: article.image,
    date: article.date,
    read: article.read,
    body: (article.body || []).join("\n\n"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = form.body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      await axios.patch(
        `${API}/admin/journal/${article.slug}`,
        {
          title: form.title,
          excerpt: form.excerpt,
          image: form.image,
          date: form.date,
          read: form.read,
          body,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
      onClose();
    } catch {
      setError("Couldn't save. Try again or check your token.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      data-testid="journal-editor-dialog"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-[#2A1F1D]/60 backdrop-blur-sm animate-fadeIn"
        aria-label="Close"
      />
      <div className="relative bg-[#F5EFE2] w-full max-w-3xl shadow-2xl border border-[#DFD7CA] animate-riseIn max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#5C4E4A] hover:text-[#2A1F1D]"
          aria-label="Close"
          data-testid="journal-editor-close"
        >
          <X size={18} />
        </button>
        <div className="p-8 md:p-10">
          <p className="overline text-[#C05A3A]">Edit Article</p>
          <h2 className="font-serif text-2xl mt-2 text-[#2A1F1D] leading-tight">
            {article.slug}
          </h2>
          <p className="text-xs text-[#5C4E4A] mt-1">
            Saved changes appear on the public site immediately.
          </p>

          <div className="mt-8 space-y-5">
            <div className="field">
              <label htmlFor="je-title">Title</label>
              <input
                id="je-title"
                type="text"
                value={form.title}
                onChange={update("title")}
                data-testid="journal-editor-title"
              />
            </div>
            <div className="field">
              <label htmlFor="je-excerpt">Excerpt (subhead under the title)</label>
              <textarea
                id="je-excerpt"
                rows={3}
                value={form.excerpt}
                onChange={update("excerpt")}
                data-testid="journal-editor-excerpt"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="field">
                <label htmlFor="je-date">Date</label>
                <input
                  id="je-date"
                  type="text"
                  value={form.date}
                  onChange={update("date")}
                  data-testid="journal-editor-date"
                />
              </div>
              <div className="field">
                <label htmlFor="je-read">Read time</label>
                <input
                  id="je-read"
                  type="text"
                  value={form.read}
                  onChange={update("read")}
                  placeholder="6 min read"
                  data-testid="journal-editor-read"
                />
              </div>
              <div className="field md:col-span-1">
                <label htmlFor="je-image">Hero image URL</label>
                <input
                  id="je-image"
                  type="url"
                  value={form.image}
                  onChange={update("image")}
                  data-testid="journal-editor-image"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="je-body">
                Body — separate paragraphs with a blank line
              </label>
              <textarea
                id="je-body"
                rows={16}
                value={form.body}
                onChange={update("body")}
                className="font-serif text-base leading-relaxed"
                data-testid="journal-editor-body"
              />
              <p className="text-xs text-[#5C4E4A] mt-2">
                {form.body.split(/\n\s*\n/).filter(Boolean).length} paragraphs ·{" "}
                {form.body.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            {error && (
              <p className="text-sm text-[#C05A3A]" data-testid="journal-editor-error">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary"
                data-testid="journal-editor-save"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={onClose}
                className="text-sm text-[#5C4E4A] hover:text-[#2A1F1D]"
                data-testid="journal-editor-cancel"
              >
                Cancel
              </button>
              <a
                href={`/journal/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs uppercase tracking-wider text-[#C05A3A] hover:text-[#2A1F1D] inline-flex items-center gap-1.5"
                data-testid="journal-editor-preview"
              >
                <ExternalLink size={12} /> Preview live
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JournalPanel({ articles, token, onChange }) {
  const [editing, setEditing] = useState(null);

  return (
    <div data-testid="journal-panel">
      <p className="text-sm text-[#5C4E4A] mb-6">
        Edit any article's title, excerpt, dates, hero image, or body. Changes
        appear live on the public site immediately. (Adding new articles still
        requires a code change — ask the team.)
      </p>

      {articles.length === 0 ? (
        <div className="border border-dashed border-[#DFD7CA] bg-[#FBF7EE] py-16 text-center">
          <p className="text-[#5C4E4A]">No articles yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="journal-grid">
          {articles.map((a) => (
            <div
              key={a.slug}
              className="bg-[#FBF7EE] border border-[#DFD7CA] p-6 flex flex-col gap-3"
              data-testid={`journal-card-${a.slug}`}
            >
              <div className="flex items-start gap-4">
                <img
                  src={a.image}
                  alt=""
                  className="h-20 w-20 object-cover border border-[#DFD7CA] flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="overline text-[#5C4E4A] !text-[9px]">
                    No 0{a.order} · {a.date} · {a.read}
                  </p>
                  <h3 className="font-serif text-xl text-[#2A1F1D] mt-1 leading-tight">
                    {a.title}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-[#5C4E4A] line-clamp-3 leading-relaxed">
                {a.excerpt}
              </p>
              <p className="text-xs text-[#5C4E4A]">
                {(a.body || []).length} paragraphs ·{" "}
                {(a.body || []).join(" ").split(/\s+/).filter(Boolean).length} words
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-[#DFD7CA] mt-1">
                <button
                  onClick={() => setEditing(a)}
                  className="btn-outline inline-flex items-center gap-2 text-xs px-3 py-2"
                  data-testid={`journal-edit-${a.slug}`}
                >
                  Edit article
                </button>
                <a
                  href={`/journal/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-[#C05A3A] hover:text-[#2A1F1D] inline-flex items-center gap-1.5"
                  data-testid={`journal-view-${a.slug}`}
                >
                  <ExternalLink size={12} /> View live
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <JournalEditor
          article={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={() => onChange()}
        />
      )}
    </div>
  );
}


function EditDeckDialog({ deck, token, onClose, onSaved }) {
  const [introText, setIntroText] = useState(deck.intro_text || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await axios.patch(
        `${API}/admin/decks/${deck.id}`,
        { intro_text: introText.trim() || deck.intro_text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
      onClose();
    } catch {
      setError("Couldn't save. Try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      data-testid="edit-deck-dialog"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-[#2A1F1D]/60 backdrop-blur-sm animate-fadeIn"
        aria-label="Close"
      />
      <div className="relative bg-[#F5EFE2] w-full max-w-2xl shadow-2xl border border-[#DFD7CA] animate-riseIn max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#5C4E4A] hover:text-[#2A1F1D]"
          aria-label="Close"
          data-testid="edit-deck-close"
        >
          <X size={18} />
        </button>
        <div className="p-8 md:p-10">
          <p className="overline text-[#C05A3A]">Edit Presentation</p>
          <h2 className="font-serif text-2xl md:text-3xl mt-2 leading-tight text-[#2A1F1D]">
            {deck.client_name}
          </h2>
          <p className="text-xs text-[#5C4E4A] mt-1">
            Edit the intro line that appears on the cover slide. Changes go live immediately.
          </p>

          <div className="mt-8">
            <p className="overline text-[#5C4E4A] mb-2">Intro · cover slide</p>
            <textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={5}
              className="font-serif text-lg italic text-[#2A1F1D] leading-snug bg-[#FBF7EE] border border-[#DFD7CA] p-5 w-full focus:outline-none focus:border-[#C05A3A] transition-colors"
              data-testid="edit-deck-intro"
              placeholder="Write the opening sentence for the cover slide…"
            />
            <p className="text-xs text-[#5C4E4A] mt-2">
              {introText.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {error && (
            <p className="text-sm text-[#C05A3A] mt-4" data-testid="edit-deck-error">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-6">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary"
              data-testid="edit-deck-save"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={onClose}
              className="text-sm text-[#5C4E4A] hover:text-[#2A1F1D]"
              data-testid="edit-deck-cancel"
            >
              Cancel
            </button>
            <a
              href={`/deck/${deck.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs uppercase tracking-wider text-[#C05A3A] hover:text-[#2A1F1D] inline-flex items-center gap-1.5"
              data-testid="edit-deck-preview"
            >
              <ExternalLink size={12} /> Preview live
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


function DecksPanel({ decks, token, onChange, error }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  const deckUrl = (slug) => `${window.location.origin}/deck/${slug}`;

  const copyLink = async (slug) => {
    try {
      await navigator.clipboard.writeText(deckUrl(slug));
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    } catch {
      /* clipboard blocked — silently no-op */
    }
  };

  const remove = async (deck) => {
    if (!window.confirm(`Delete the deck for ${deck.client_name}? This cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API}/admin/decks/${deck.id}`, { headers });
      onChange();
    } catch {
      /* surfaced via parent error state on next fetch */
    }
  };

  return (
    <div data-testid="decks-panel">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <p className="text-sm text-[#5C4E4A]" data-testid="decks-count">
          {decks.length} {decks.length === 1 ? "presentation" : "presentations"}
        </p>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary inline-flex items-center gap-2 text-sm"
          data-testid="new-deck-button"
        >
          <Plus size={14} /> New presentation
        </button>
      </div>

      {error && (
        <p className="text-sm text-[#C05A3A] mb-4" data-testid="decks-error">
          {error}
        </p>
      )}

      {decks.length === 0 ? (
        <div
          className="border border-dashed border-[#DFD7CA] bg-[#FBF7EE] py-16 px-6 text-center"
          data-testid="decks-empty"
        >
          <p className="overline text-[#5C4E4A]">No presentations yet</p>
          <p className="font-serif text-2xl text-[#2A1F1D] mt-3 max-w-md mx-auto leading-snug">
            Create a custom corporate deck in seconds.
          </p>
          <p className="text-sm text-[#5C4E4A] mt-3 max-w-md mx-auto">
            Enter a client name — we'll find their logo and write a warm intro
            line in Eva's voice. You'll get a private, shareable link.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary mt-7 inline-flex items-center gap-2"
            data-testid="decks-empty-cta"
          >
            <Plus size={14} /> Create your first presentation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="decks-grid">
          {decks.map((d) => (
            <div
              key={d.id}
              className="bg-[#FBF7EE] border border-[#DFD7CA] p-6 flex flex-col gap-4"
              data-testid={`deck-card-${d.slug}`}
            >
              <div className="flex items-start gap-4">
                {d.logo_url ? (
                  <img
                    src={d.logo_url}
                    alt={`${d.client_name} logo`}
                    className="h-12 w-12 object-contain bg-white p-1.5 border border-[#DFD7CA] flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-12 w-12 bg-[#DFD7CA] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="overline text-[#5C4E4A] !text-[9px]">For</p>
                  <h3 className="font-serif text-xl text-[#2A1F1D] mt-0.5 truncate">
                    {d.client_name}
                  </h3>
                  <p className="text-xs text-[#5C4E4A] mt-1">
                    Created {formatDate(d.created_at)}
                  </p>
                </div>
              </div>

              <p className="text-sm italic text-[#5C4E4A] leading-relaxed line-clamp-3">
                "{d.intro_text}"
              </p>

              <div className="flex items-center justify-between text-xs text-[#5C4E4A] border-t border-[#DFD7CA] pt-4">
                <span>
                  {d.view_count} {d.view_count === 1 ? "view" : "views"}
                  {d.last_viewed_at && ` · last ${formatDate(d.last_viewed_at)}`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setEditing(d)}
                  className="btn-outline inline-flex items-center gap-2 text-xs px-3 py-2"
                  data-testid={`deck-edit-${d.slug}`}
                >
                  Edit intro
                </button>
                <button
                  onClick={() => copyLink(d.slug)}
                  className="btn-outline inline-flex items-center gap-2 text-xs px-3 py-2"
                  data-testid={`deck-copy-${d.slug}`}
                >
                  <Copy size={12} />
                  {copiedSlug === d.slug ? "Copied!" : "Copy link"}
                </button>
                <a
                  href={deckUrl(d.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline inline-flex items-center gap-2 text-xs px-3 py-2"
                  data-testid={`deck-open-${d.slug}`}
                >
                  <ExternalLink size={12} /> Open
                </a>
                <button
                  onClick={() => remove(d)}
                  className="ml-auto inline-flex items-center gap-2 text-xs text-[#C05A3A] hover:text-[#2A1F1D] px-2 py-2"
                  aria-label={`Delete deck for ${d.client_name}`}
                  data-testid={`deck-delete-${d.slug}`}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewDeckDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => onChange()}
        token={token}
      />

      {editing && (
        <EditDeckDialog
          deck={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={() => onChange()}
        />
      )}
    </div>
  );
}

function AdminDashboard({ token, onLogout }) {
  const [active, setActive] = useState("decks");
  const [data, setData] = useState({ decks: [], journal: [], waitlist: [], inquiries: [], newsletter: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // selection state — keyed by tab so switching tabs doesn't lose checkmarks
  const [selection, setSelection] = useState({ waitlist: new Set(), inquiries: new Set() });
  const [deleting, setDeleting] = useState(false);

  const fetchTab = useCallback(
    async (key) => {
      setLoading(true);
      setError("");
      const tab = TABS.find((t) => t.key === key);
      try {
        const { data: rows } = await axios.get(`${API}${tab.path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData((d) => ({ ...d, [key]: rows }));
        // clear selection on refresh
        if (key === "waitlist" || key === "inquiries") {
          setSelection((s) => ({ ...s, [key]: new Set() }));
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          onLogout();
          return;
        }
        setError("Could not load this list. Try refresh.");
      } finally {
        setLoading(false);
      }
    },
    [token, onLogout]
  );

  useEffect(() => {
    fetchTab(active);
  }, [active, fetchTab]);

  const current = data[active] || [];
  const selectableTab = active === "waitlist" || active === "inquiries";
  const currentSelection = selectableTab ? selection[active] : null;
  const selectedCount = currentSelection?.size ?? 0;

  const toggleRow = (id) => {
    setSelection((s) => {
      const next = new Set(s[active]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, [active]: next };
    });
  };

  const toggleAll = (select) => {
    setSelection((s) => ({
      ...s,
      [active]: select ? new Set(current.map((r) => r.id)) : new Set(),
    }));
  };

  const deleteSelected = async () => {
    if (!selectedCount) return;
    const label = active === "waitlist" ? "waitlist signup" : "inquiry";
    if (
      !window.confirm(
        `Delete ${selectedCount} ${label}${selectedCount === 1 ? "" : "s"}? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await axios.post(
        `${API}/admin/${active}/delete`,
        { ids: Array.from(currentSelection) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchTab(active);
    } catch {
      setError("Couldn't delete the selected rows. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const columns = {
    waitlist: [
      { key: "created_at", label: "Date", render: (r) => formatDate(r.created_at) },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "product_slug", label: "Product" },
      { key: "note", label: "Note", render: (r) => r.note || "—" },
    ],
    inquiries: [
      { key: "created_at", label: "Date", render: (r) => formatDate(r.created_at) },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone", render: (r) => r.phone || "—" },
      { key: "subject", label: "Subject" },
      { key: "product_slug", label: "Product", render: (r) => r.product_slug || "—" },
      { key: "message", label: "Message" },
    ],
    newsletter: [
      { key: "created_at", label: "Subscribed", render: (r) => formatDate(r.created_at) },
      { key: "email", label: "Email" },
    ],
  };

  const exportCsv = () => {
    const rows = current.map((r) => {
      const out = {};
      columns[active].forEach((c) => {
        out[c.key] = r[c.key] ?? "";
      });
      return out;
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`emporio-zeva-${active}-${stamp}.csv`, toCsv(rows));
  };

  return (
    <div className="min-h-screen bg-[#F5EFE2]" data-testid="admin-dashboard">
      {/* Header */}
      <header className="border-b border-[#DFD7CA] bg-[#FBF7EE]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex items-center justify-between gap-6">
          <div>
            <p className="overline text-[#C05A3A]">Emporio Zeva · Admin</p>
            <h1 className="font-serif text-2xl md:text-3xl text-[#2A1F1D] mt-1">
              Eva's notebook
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-sm text-[#5C4E4A] hover:text-[#2A1F1D] transition-colors"
            data-testid="admin-logout-button"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <nav className="flex gap-8" data-testid="admin-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`relative py-4 text-sm tracking-wide uppercase transition-colors ${
                  active === t.key
                    ? "text-[#2A1F1D]"
                    : "text-[#5C4E4A] hover:text-[#2A1F1D]"
                }`}
                data-testid={`admin-tab-${t.key}`}
              >
                {t.label}
                <span className="ml-2 text-xs text-[#C05A3A]">
                  {(data[t.key] || []).length || ""}
                </span>
                {active === t.key && (
                  <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#C05A3A]" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Toolbar */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-[#5C4E4A]" data-testid="admin-count">
          {loading
            ? "Loading…"
            : selectableTab && selectedCount > 0
            ? `${selectedCount} of ${current.length} ${active} selected`
            : `${current.length} ${active}`}
        </p>
        <div className="flex items-center gap-3">
          {selectableTab && selectedCount > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="inline-flex items-center gap-2 text-sm text-[#C05A3A] hover:text-[#2A1F1D] disabled:opacity-50"
              data-testid="admin-delete-selected-button"
            >
              <Trash2 size={14} />
              {deleting
                ? "Deleting…"
                : `Delete ${selectedCount} ${selectedCount === 1 ? "row" : "rows"}`}
            </button>
          )}
          <button
            onClick={() => fetchTab(active)}
            className="btn-outline inline-flex items-center gap-2 text-sm"
            data-testid="admin-refresh-button"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {active !== "decks" && active !== "journal" && (
            <button
              onClick={exportCsv}
              disabled={!current.length}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
              data-testid="admin-export-button"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Panel */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pb-20">
        {error && active !== "decks" && (
          <p className="text-sm text-[#C05A3A] mb-4" data-testid="admin-error">
            {error}
          </p>
        )}
        {active === "decks" ? (
          <DecksPanel
            decks={current}
            token={token}
            onChange={() => fetchTab("decks")}
            error={error}
          />
        ) : active === "journal" ? (
          <JournalPanel
            articles={current}
            token={token}
            onChange={() => fetchTab("journal")}
          />
        ) : (
          <Table
            columns={columns[active]}
            rows={current}
            emptyLabel={`No ${active} entries yet.`}
            testid={`admin-${active}`}
            selectable={selectableTab}
            selected={currentSelection}
            onToggle={toggleRow}
            onToggleAll={toggleAll}
          />
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));

  // Verify token on mount; clear if rejected
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
      .catch((err) => {
        if (err?.response?.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      });
  }, [token]);

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) return <AdminLogin onLogin={setToken} />;
  return <AdminDashboard token={token} onLogout={logout} />;
}
