// Shared revision history drawer. Pass docType + docId; can preview & revert.
// Triggered from an editor button: <HistoryDrawer trigger={...} docType="page" docId={page.id} onReverted={refresh}/>
import { useEffect, useState } from "react";
import axios from "axios";
import { History, X, RotateCcw, Eye } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail, formatDate } from "./api";

export function HistoryButton({ onClick, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-outline text-xs inline-flex items-center gap-1"
      data-testid="history-open-button"
    >
      <History size={12} /> History {count ? `(${count})` : ""}
    </button>
  );
}

export default function HistoryDrawer({
  open,
  onClose,
  docType, // "page" | "product" | "site_content" | "deck"
  docId,
  token,
  onReverted, // () => void — caller refreshes after a successful revert
  renderPreview, // optional (snapshot) => ReactNode — shows a snapshot summary
}) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!docType || !docId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(
        `${API}/admin/revisions/${docType}/${docId}`,
        { headers: authHeaders(token) }
      );
      setRevisions(data);
      setSelected(data[0] || null);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load history."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, docType, docId]); // eslint-disable-line

  const revert = async (rev) => {
    if (
      !window.confirm(
        `Revert to revision from ${formatDate(rev.created_at)}? Current state will be saved as a fresh revision before overwriting.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        `${API}/admin/revisions/${docType}/${docId}/${rev.id}/revert`,
        {},
        { headers: authHeaders(token) }
      );
      if (onReverted) onReverted();
      onClose();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Revert failed."));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/50">
      <aside
        className="w-full max-w-lg bg-white border-l border-[#DFD7CA] flex flex-col shadow-2xl"
        data-testid="history-drawer"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#DFD7CA]">
          <div>
            <p className="overline text-[#C05A3A]">Revision history</p>
            <h3 className="font-serif text-lg text-[#2A1F1D]">
              {revisions.length} {revisions.length === 1 ? "snapshot" : "snapshots"}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" data-testid="history-close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[#5C4E4A] p-6">Loading…</p>
          ) : error ? (
            <p className="text-sm text-[#C05A3A] p-6" data-testid="history-error">{error}</p>
          ) : revisions.length === 0 ? (
            <p className="text-sm text-[#5C4E4A] p-6" data-testid="history-empty">
              No revisions yet. Edits create snapshots from now on.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0E6CF]">
              {revisions.map((rev) => (
                <li
                  key={rev.id}
                  className={`px-5 py-4 cursor-pointer hover:bg-[#FBF7EE] ${selected?.id === rev.id ? "bg-[#FBF7EE]" : ""}`}
                  onClick={() => setSelected(rev)}
                  data-testid={`history-row-${rev.id}`}
                >
                  <div className="flex justify-between gap-3">
                    <p className="text-sm font-medium text-[#2A1F1D]">{rev.label || "Snapshot"}</p>
                    <p className="text-xs text-[#5C4E4A] whitespace-nowrap">{formatDate(rev.created_at)}</p>
                  </div>
                  <p className="text-xs text-[#5C4E4A] mt-1">By {rev.author_name || "Unknown"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="border-t border-[#DFD7CA] p-5 space-y-3 bg-[#FBF7EE]">
            <p className="overline text-[#C05A3A] !text-[10px]">Selected snapshot</p>
            <p className="text-sm text-[#2A1F1D]">{selected.label || "Snapshot"}</p>
            <p className="text-xs text-[#5C4E4A]">
              {formatDate(selected.created_at)} by {selected.author_name}
            </p>
            <div className="max-h-32 overflow-y-auto bg-white border border-[#DFD7CA] p-3 text-xs text-[#5C4E4A] font-mono whitespace-pre-wrap break-words" data-testid="history-snapshot-preview">
              {renderPreview
                ? renderPreview(selected.snapshot)
                : JSON.stringify(selected.snapshot, null, 2).slice(0, 600) + (JSON.stringify(selected.snapshot).length > 600 ? "…" : "")}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => revert(selected)}
                disabled={busy}
                className="btn-primary text-xs inline-flex items-center gap-1"
                data-testid="history-revert-button"
              >
                <RotateCcw size={12} /> Revert to this version
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
