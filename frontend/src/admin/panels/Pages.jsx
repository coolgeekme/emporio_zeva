// Pages panel — CMS create/edit/delete with parent/child hierarchy, bulk actions,
// and Nav/Footer visibility checkboxes.
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Plus, Trash2, X, Edit2, ChevronRight, Image as ImageIcon } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail, formatDate } from "../api";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

// Modal that lets the editor pick an image from the Media library and inject
// its markdown into a textarea at the current cursor position.
function BodyMediaPicker({ open, onPick, onClose, token }) {
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
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white border border-[#DFD7CA] w-full max-w-4xl shadow-xl" data-testid="page-body-media-picker">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA]">
          <h3 className="font-serif text-lg text-[#2A1F1D]">Insert image into body</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="p-6">
          {loading ? (
            <p className="text-sm text-[#5C4E4A]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#5C4E4A]">No images in Media yet. Upload some in the Media tab first.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPick(m)}
                  className="aspect-square bg-[#F5EFE2] hover:ring-2 hover:ring-[#C05A3A] overflow-hidden"
                  data-testid={`page-body-media-pick-${m.id}`}
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

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  parent_id: "",
  menu_order: 0,
  status: "draft",
  show_in_nav: false,
  show_in_footer: false,
};

function PageEditor({ token, page, allPages, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    page
      ? {
          title: page.title || "",
          slug: page.slug || "",
          excerpt: page.excerpt || "",
          body: page.body || "",
          parent_id: page.parent_id || "",
          menu_order: page.menu_order || 0,
          status: page.status || "draft",
          show_in_nav: !!page.show_in_nav,
          show_in_footer: !!page.show_in_footer,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const bodyRef = useRef(null);

  const insertAtCursor = (snippet) => {
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, body: (f.body || "") + "\n\n" + snippet }));
      return;
    }
    const start = el.selectionStart ?? form.body.length;
    const end = el.selectionEnd ?? form.body.length;
    const before = form.body.slice(0, start);
    const after = form.body.slice(end);
    // Add surrounding newlines if needed so markdown image renders as block
    const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
    const next = before + prefix + snippet + suffix + after;
    setForm((f) => ({ ...f, body: next }));
    // Restore caret after React updates
    const caret = (before + prefix + snippet + suffix).length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  // Available parents = published or any pages, excluding self & own descendants
  const parents = useMemo(() => {
    if (!page) return allPages;
    const descendants = new Set([page.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of allPages) {
        if (p.parent_id && descendants.has(p.parent_id) && !descendants.has(p.id)) {
          descendants.add(p.id);
          changed = true;
        }
      }
    }
    return allPages.filter((p) => !descendants.has(p.id));
  }, [allPages, page]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt,
      body: form.body,
      parent_id: form.parent_id || null,
      menu_order: Number(form.menu_order) || 0,
      status: form.status,
      show_in_nav: form.show_in_nav,
      show_in_footer: form.show_in_footer,
    };
    try {
      if (page) {
        await axios.patch(`${API}/admin/pages/${page.id}`, payload, { headers: authHeaders(token) });
      } else {
        await axios.post(`${API}/admin/pages`, payload, { headers: authHeaders(token) });
      }
      onSaved();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save the page."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <div
        className="bg-white border border-[#DFD7CA] w-full max-w-3xl shadow-xl"
        data-testid="page-editor-dialog"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA]">
          <h3 className="font-serif text-xl text-[#2A1F1D]">
            {page ? "Edit page" : "New page"}
          </h3>
          <button onClick={onClose} aria-label="Close" data-testid="page-editor-close">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={submit} className="p-6 space-y-4" data-testid="page-editor-form">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="field">
              <label htmlFor="pg-title">Title</label>
              <input
                id="pg-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                data-testid="page-title-input"
              />
            </div>
            <div className="field">
              <label htmlFor="pg-slug">Slug (optional)</label>
              <input
                id="pg-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto from title"
                data-testid="page-slug-input"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pg-excerpt">Excerpt</label>
            <input
              id="pg-excerpt"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="One sentence summary."
              data-testid="page-excerpt-input"
            />
          </div>
          <div className="field">
            <div className="flex items-center justify-between gap-3 mb-1">
              <label htmlFor="pg-body" className="!mb-0">Body</label>
              <button
                type="button"
                onClick={() => setMediaOpen(true)}
                className="btn-outline text-xs inline-flex items-center gap-1"
                data-testid="page-body-insert-image-button"
              >
                <ImageIcon size={12} /> Insert image
              </button>
            </div>
            <textarea
              id="pg-body"
              ref={bodyRef}
              rows={12}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={"Markdown supported. Examples:\n\n## A heading\n\nA paragraph. Blank line above and below.\n\n- A bullet\n- Another bullet\n\n**bold** · *italic* · [link text](https://example.com)\n\n![alt text](https://image-url)"}
              data-testid="page-body-input"
            />
            <p className="text-xs text-[#5C4E4A] mt-1">
              Markdown supported: blank-line paragraphs, <code>**bold**</code>, <code>*italic*</code>, <code>- bullets</code>, <code>## headings</code>, links, images.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="field">
              <label htmlFor="pg-parent">Parent page</label>
              <select
                id="pg-parent"
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                data-testid="page-parent-select"
              >
                <option value="">— None (top level)</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pg-order">Menu order</label>
              <input
                id="pg-order"
                type="number"
                value={form.menu_order}
                onChange={(e) => setForm({ ...form, menu_order: e.target.value })}
                data-testid="page-order-input"
              />
            </div>
            <div className="field">
              <label htmlFor="pg-status">Status</label>
              <select
                id="pg-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                data-testid="page-status-select"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="text-sm text-[#2A1F1D] flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.show_in_nav}
                onChange={(e) => setForm({ ...form, show_in_nav: e.target.checked })}
                className="accent-[#C05A3A] h-4 w-4"
                data-testid="page-show-nav-checkbox"
              />
              Show in top nav
            </label>
            <label className="text-sm text-[#2A1F1D] flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.show_in_footer}
                onChange={(e) => setForm({ ...form, show_in_footer: e.target.checked })}
                className="accent-[#C05A3A] h-4 w-4"
                data-testid="page-show-footer-checkbox"
              />
              Show in footer
            </label>
          </div>
          {error && (
            <p className="text-sm text-[#C05A3A]" data-testid="page-editor-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-sm"
              data-testid="page-editor-save-button"
            >
              {saving ? "Saving…" : "Save page"}
            </button>
          </div>
        </form>
        <BodyMediaPicker
          open={mediaOpen}
          token={token}
          onClose={() => setMediaOpen(false)}
          onPick={(m) => {
            const url = `${BACKEND}${m.url}`;
            const alt = (m.alt_text || m.caption || m.original_filename || "image").replace(/[\[\]]/g, "");
            insertAtCursor(`![${alt}](${url})`);
            setMediaOpen(false);
          }}
        />
      </div>
    </div>
  );
}

export default function PagesPanel({ token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | page object
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/pages`, { headers: authHeaders(token) });
      setRows(data);
      setSelected(new Set());
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load pages."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  // Build hierarchical view: top-level first, with children indented below.
  const tree = useMemo(() => {
    const byParent = new Map();
    rows.forEach((r) => {
      const key = r.parent_id || "_root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(r);
    });
    byParent.forEach((arr) =>
      arr.sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
    );
    const out = [];
    const walk = (parentKey, depth) => {
      (byParent.get(parentKey) || []).forEach((p) => {
        out.push({ ...p, _depth: depth });
        walk(p.id, depth + 1);
      });
    };
    walk("_root", 0);
    // Also surface orphans whose parent_id no longer exists
    rows.forEach((r) => {
      if (r.parent_id && !out.find((o) => o.id === r.id)) {
        out.push({ ...r, _depth: 0 });
      }
    });
    return out;
  }, [rows]);

  const toggle = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const bulk = async (action) => {
    if (selected.size === 0) return;
    if (action === "delete" && !window.confirm(`Delete ${selected.size} page(s)?`)) return;
    setBulkBusy(true);
    try {
      await axios.post(
        `${API}/admin/pages/bulk`,
        { ids: Array.from(selected), action },
        { headers: authHeaders(token) }
      );
      await load();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Bulk action failed."));
    } finally {
      setBulkBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this page?")) return;
    try {
      await axios.delete(`${API}/admin/pages/${id}`, { headers: authHeaders(token) });
      await load();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't delete."));
    }
  };

  return (
    <div className="space-y-5" data-testid="admin-pages-panel">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-[#2A1F1D]">Pages</h2>
          <p className="text-xs text-[#5C4E4A] mt-1">
            Custom CMS pages. Render at <code className="text-[#C05A3A]">/p/&lt;slug&gt;</code>.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="btn-primary inline-flex items-center gap-2 text-sm"
          data-testid="pages-new-button"
        >
          <Plus size={14} /> New page
        </button>
      </header>

      {error && (
        <p className="text-sm text-[#C05A3A]" data-testid="pages-error">
          {error}
        </p>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#FBF7EE] border border-[#DFD7CA] px-4 py-3">
          <p className="text-sm text-[#2A1F1D]" data-testid="pages-bulk-count">
            {selected.size} selected
          </p>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => bulk("publish")}
              disabled={bulkBusy}
              className="btn-outline text-sm"
              data-testid="pages-bulk-publish-button"
            >
              Publish
            </button>
            <button
              onClick={() => bulk("unpublish")}
              disabled={bulkBusy}
              className="btn-outline text-sm"
              data-testid="pages-bulk-unpublish-button"
            >
              Move to draft
            </button>
            <button
              onClick={() => bulk("delete")}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1 text-sm text-[#C05A3A] hover:underline"
              data-testid="pages-bulk-delete-button"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center">Loading…</p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center" data-testid="pages-empty">
          No pages yet. Click "New page" to add one.
        </p>
      ) : (
        <div className="overflow-x-auto border border-[#DFD7CA]" data-testid="pages-table">
          <table className="w-full text-sm">
            <thead className="bg-[#F5EFE2]">
              <tr>
                <th className="px-3 py-3 w-10 border-b border-[#DFD7CA]">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    className="accent-[#C05A3A] h-4 w-4"
                    data-testid="pages-select-all"
                    aria-label="Select all pages"
                  />
                </th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Title</th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Slug</th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Status</th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Visible in</th>
                <th className="text-left px-4 py-3 overline text-[#5C4E4A] border-b border-[#DFD7CA]">Updated</th>
                <th className="px-4 py-3 border-b border-[#DFD7CA]"></th>
              </tr>
            </thead>
            <tbody>
              {tree.map((p) => (
                <tr
                  key={p.id}
                  className={`${
                    selected.has(p.id) ? "bg-[#F0E6CF]" : "odd:bg-[#FBF7EE] even:bg-white"
                  } hover:bg-[#F5EFE2]/60 transition-colors`}
                >
                  <td className="px-3 py-3 border-b border-[#DFD7CA] align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="accent-[#C05A3A] h-4 w-4"
                      data-testid={`pages-row-checkbox-${p.id}`}
                      aria-label={`Select ${p.title}`}
                    />
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA] text-[#2A1F1D]">
                    <span style={{ paddingLeft: `${(p._depth || 0) * 18}px` }} className="flex items-center gap-1">
                      {p._depth > 0 && <ChevronRight size={12} className="text-[#5C4E4A]" />}
                      <span className="font-medium">{p.title}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA] text-[#5C4E4A]">/p/{p.slug}</td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA]">
                    <span
                      className={`text-xs px-2 py-0.5 ${
                        p.status === "published"
                          ? "bg-[#E3F0E1] text-[#2D5C32]"
                          : "bg-[#F5EFE2] text-[#5C4E4A]"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA] text-xs text-[#5C4E4A]">
                    {[p.show_in_nav && "Nav", p.show_in_footer && "Footer"]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA] text-xs text-[#5C4E4A]">
                    {formatDate(p.updated_at)}
                  </td>
                  <td className="px-4 py-3 border-b border-[#DFD7CA]">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditing(p)}
                        className="text-[#2A1F1D] hover:underline inline-flex items-center gap-1"
                        data-testid={`pages-edit-${p.id}`}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="text-[#C05A3A] hover:underline inline-flex items-center gap-1"
                        data-testid={`pages-delete-${p.id}`}
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
        <PageEditor
          token={token}
          page={editing === "new" ? null : editing}
          allPages={rows}
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
