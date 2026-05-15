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

function Table({ columns, rows, emptyLabel, testid }) {
  if (!rows.length) {
    return (
      <p className="text-[#5C4E4A] py-12 text-center" data-testid={`${testid}-empty`}>
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto border border-[#DFD7CA]" data-testid={`${testid}-table`}>
      <table className="w-full text-sm">
        <thead className="bg-[#F5EFE2]">
          <tr>
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
          {rows.map((r, i) => (
            <tr
              key={r.id || i}
              className="odd:bg-[#FBF7EE] even:bg-white hover:bg-[#F5EFE2]/60 transition-colors"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-4 py-3 align-top text-[#2A1F1D] border-b border-[#DFD7CA] max-w-md"
                >
                  {c.render ? c.render(r) : r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
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
        { client_name: clientName.trim() },
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
                {preview.logo_url ? (
                  <img
                    src={preview.logo_url}
                    alt={`${preview.client_name} logo`}
                    className="h-14 w-14 object-contain bg-white p-1.5 border border-[#DFD7CA]"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    data-testid="new-deck-preview-logo"
                  />
                ) : (
                  <div className="h-14 w-14 bg-[#DFD7CA] flex items-center justify-center text-[#5C4E4A] text-xs">
                    no logo
                  </div>
                )}
                <div className="flex-1">
                  <p className="overline text-[#5C4E4A] !text-[9px]">For</p>
                  <p
                    className="font-serif text-2xl text-[#2A1F1D] mt-0.5"
                    data-testid="new-deck-preview-name"
                  >
                    {preview.client_name}
                  </p>
                  {preview.domain && (
                    <p className="text-xs text-[#5C4E4A] mt-1">{preview.domain}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="overline text-[#5C4E4A] mb-2">Intro · cover slide</p>
                <p
                  className="font-serif text-lg italic text-[#2A1F1D] leading-snug bg-[#FBF7EE] border border-[#DFD7CA] p-5"
                  data-testid="new-deck-preview-intro"
                >
                  {preview.intro_text}
                </p>
                <button
                  type="button"
                  onClick={regenerateIntro}
                  disabled={busy}
                  className="text-xs uppercase tracking-wider text-[#C05A3A] hover:text-[#2A1F1D] mt-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                  data-testid="new-deck-regenerate-button"
                >
                  <RefreshCw size={12} />
                  {busy ? "Writing…" : "Try a different intro"}
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

function DecksPanel({ decks, token, onChange, error }) {
  const [creating, setCreating] = useState(false);
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
    </div>
  );
}

function AdminDashboard({ token, onLogout }) {
  const [active, setActive] = useState("decks");
  const [data, setData] = useState({ decks: [], waitlist: [], inquiries: [], newsletter: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          {loading ? "Loading…" : `${current.length} ${active}`}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTab(active)}
            className="btn-outline inline-flex items-center gap-2 text-sm"
            data-testid="admin-refresh-button"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {active !== "decks" && (
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
        ) : (
          <Table
            columns={columns[active]}
            rows={current}
            emptyLabel={`No ${active} entries yet.`}
            testid={`admin-${active}`}
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
