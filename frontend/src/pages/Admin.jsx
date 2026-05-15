import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { LogOut, Download, RefreshCw, Lock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "ez_admin_token";

const TABS = [
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

function AdminDashboard({ token, onLogout }) {
  const [active, setActive] = useState("waitlist");
  const [data, setData] = useState({ waitlist: [], inquiries: [], newsletter: [] });
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
          <button
            onClick={exportCsv}
            disabled={!current.length}
            className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            data-testid="admin-export-button"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pb-20">
        {error && (
          <p className="text-sm text-[#C05A3A] mb-4" data-testid="admin-error">
            {error}
          </p>
        )}
        <Table
          columns={columns[active]}
          rows={current}
          emptyLabel={`No ${active} entries yet.`}
          testid={`admin-${active}`}
        />
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
