// Dashboard home — site stats + quick draft area for a new journal article.
import { useEffect, useState } from "react";
import axios from "axios";
import { FileText, Users, Mail, MessageSquare, Layers, Image as ImageIcon, BookOpen, Presentation } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail, formatDate } from "../api";

function StatCard({ icon: Icon, label, value, testid }) {
  return (
    <div
      className="bg-white border border-[#DFD7CA] p-5 flex items-start gap-3"
      data-testid={testid}
    >
      <div className="text-[#C05A3A]">
        <Icon size={20} />
      </div>
      <div>
        <p className="overline text-[#5C4E4A] text-[10px]">{label}</p>
        <p className="text-2xl font-serif text-[#2A1F1D] mt-1">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPanel({ token, user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Quick draft
  const [draft, setDraft] = useState({ title: "", excerpt: "", body: "" });
  const [draftStatus, setDraftStatus] = useState("idle");
  const [draftErr, setDraftErr] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/stats`, {
        headers: authHeaders(token),
      });
      setStats(data);
    } catch (e) {
      setError(formatApiErrorDetail(e?.response?.data?.detail, "Couldn't load stats."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const slugify = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const saveDraft = async (publish = false) => {
    if (!draft.title.trim()) {
      setDraftErr("Title is required.");
      return;
    }
    setDraftStatus("saving");
    setDraftErr("");
    try {
      // Quick draft creates a Page (CMS) in either draft or published status.
      await axios.post(
        `${API}/admin/pages`,
        {
          slug: slugify(draft.title),
          title: draft.title.trim(),
          excerpt: draft.excerpt.trim(),
          body: draft.body.trim(),
          status: publish ? "published" : "draft",
        },
        { headers: authHeaders(token) }
      );
      setDraftStatus("ok");
      setDraft({ title: "", excerpt: "", body: "" });
      await load();
      setTimeout(() => setDraftStatus("idle"), 2500);
    } catch (e) {
      setDraftErr(formatApiErrorDetail(e?.response?.data?.detail, "Couldn't save the draft."));
      setDraftStatus("idle");
    }
  };

  return (
    <div className="space-y-10" data-testid="admin-dashboard-panel">
      <div>
        <p className="overline text-[#C05A3A]">Welcome back</p>
        <h2 className="font-serif text-3xl text-[#2A1F1D] mt-1">
          Hello, {user?.name || "Eva"}.
        </h2>
        <p className="text-[#5C4E4A] mt-2 text-sm">
          You're signed in as <span className="font-medium">{user?.role}</span>. Here's a quick read on the site.
        </p>
      </div>

      {error && <p className="text-sm text-[#C05A3A]" data-testid="dashboard-error">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Pages"
          value={loading ? "—" : `${stats?.pages?.published ?? 0} / ${stats?.pages?.total ?? 0}`}
          testid="stat-pages"
        />
        <StatCard
          icon={BookOpen}
          label="Journal articles"
          value={loading ? "—" : stats?.journal ?? 0}
          testid="stat-journal"
        />
        <StatCard
          icon={MessageSquare}
          label="Inquiries"
          value={loading ? "—" : stats?.inquiries ?? 0}
          testid="stat-inquiries"
        />
        <StatCard
          icon={Layers}
          label="Waitlist"
          value={loading ? "—" : stats?.waitlist ?? 0}
          testid="stat-waitlist"
        />
        <StatCard
          icon={Mail}
          label="Newsletter"
          value={loading ? "—" : stats?.newsletter ?? 0}
          testid="stat-newsletter"
        />
        <StatCard
          icon={Presentation}
          label="Decks"
          value={loading ? "—" : stats?.decks ?? 0}
          testid="stat-decks"
        />
        <StatCard
          icon={ImageIcon}
          label="Media"
          value={loading ? "—" : stats?.media ?? 0}
          testid="stat-media"
        />
        <StatCard
          icon={Users}
          label="Users"
          value={loading ? "—" : stats?.users ?? 0}
          testid="stat-users"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white border border-[#DFD7CA] p-6" data-testid="quick-draft-card">
          <p className="overline text-[#C05A3A]">Quick draft</p>
          <h3 className="font-serif text-xl text-[#2A1F1D] mt-1">Start a new page</h3>
          <p className="text-xs text-[#5C4E4A] mt-1">
            Drafts go to Pages and aren't visible until you publish.
          </p>

          <div className="space-y-3 mt-5">
            <div className="field">
              <label htmlFor="qd-title">Title</label>
              <input
                id="qd-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Press & inquiries"
                data-testid="quick-draft-title-input"
              />
            </div>
            <div className="field">
              <label htmlFor="qd-excerpt">Excerpt</label>
              <input
                id="qd-excerpt"
                value={draft.excerpt}
                onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                placeholder="One sentence for the page list."
                data-testid="quick-draft-excerpt-input"
              />
            </div>
            <div className="field">
              <label htmlFor="qd-body">Body</label>
              <textarea
                id="qd-body"
                rows={5}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Markdown or plain text. Edit later in Pages."
                data-testid="quick-draft-body-input"
              />
            </div>
            {draftErr && (
              <p className="text-sm text-[#C05A3A]" data-testid="quick-draft-error">
                {draftErr}
              </p>
            )}
            {draftStatus === "ok" && (
              <p className="text-sm text-[#5C4E4A]" data-testid="quick-draft-success">
                Saved. Manage it in Pages.
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => saveDraft(false)}
                disabled={draftStatus === "saving"}
                className="btn-outline text-sm"
                data-testid="quick-draft-save-button"
              >
                {draftStatus === "saving" ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={() => saveDraft(true)}
                disabled={draftStatus === "saving"}
                className="btn-primary text-sm"
                data-testid="quick-draft-publish-button"
              >
                Save & publish
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-[#DFD7CA] p-6">
            <p className="overline text-[#C05A3A]">Latest inquiries</p>
            {(stats?.recent_inquiries || []).length === 0 ? (
              <p className="text-sm text-[#5C4E4A] mt-3">No inquiries yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {stats.recent_inquiries.map((r) => (
                  <li
                    key={r.id}
                    className="text-sm text-[#2A1F1D] flex justify-between gap-3 py-1 border-b border-[#F0E6CF] last:border-0"
                  >
                    <span className="truncate">
                      <span className="font-medium">{r.name}</span>
                      {" — "}
                      <span className="text-[#5C4E4A]">{r.subject || "General"}</span>
                    </span>
                    <span className="text-xs text-[#5C4E4A] whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white border border-[#DFD7CA] p-6">
            <p className="overline text-[#C05A3A]">Latest waitlist signups</p>
            {(stats?.recent_waitlist || []).length === 0 ? (
              <p className="text-sm text-[#5C4E4A] mt-3">No signups yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {stats.recent_waitlist.map((r) => (
                  <li
                    key={r.id}
                    className="text-sm text-[#2A1F1D] flex justify-between gap-3 py-1 border-b border-[#F0E6CF] last:border-0"
                  >
                    <span className="truncate">
                      <span className="font-medium">{r.name}</span>
                      {" — "}
                      <span className="text-[#5C4E4A]">{r.product_slug}</span>
                    </span>
                    <span className="text-xs text-[#5C4E4A] whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
