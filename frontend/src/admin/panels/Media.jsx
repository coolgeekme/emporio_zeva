// Media library — drag-and-drop upload, grid preview, edit alt-text/caption, delete.
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Upload, X, Trash2, Edit2, Copy, FileText, Film, Image as ImageIcon, Music } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail, formatDate } from "../api";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

function fmtBytes(n) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(mime) {
  if (!mime) return FileText;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Film;
  if (mime.startsWith("audio/")) return Music;
  return FileText;
}

function MediaItemCard({ item, onSelect, onCopy, onDelete }) {
  const Icon = iconFor(item.mime_type);
  const isImage = item.mime_type?.startsWith("image/");
  const fullUrl = `${BACKEND}${item.url}`;
  return (
    <div
      className="bg-white border border-[#DFD7CA] flex flex-col group"
      data-testid={`media-card-${item.id}`}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="aspect-square bg-[#F5EFE2] flex items-center justify-center overflow-hidden focus:outline-none"
        aria-label={`Open ${item.original_filename}`}
      >
        {isImage ? (
          <img
            src={fullUrl}
            alt={item.alt_text || item.original_filename}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            loading="lazy"
          />
        ) : (
          <Icon size={40} className="text-[#5C4E4A]" />
        )}
      </button>
      <div className="p-3 text-xs space-y-1 flex-1 flex flex-col">
        <p
          className="truncate text-[#2A1F1D] font-medium"
          title={item.original_filename}
        >
          {item.original_filename}
        </p>
        <p className="text-[#5C4E4A]">
          {fmtBytes(item.size_bytes)} · {item.mime_type}
        </p>
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={() => onCopy(fullUrl)}
            className="text-[#5C4E4A] hover:text-[#2A1F1D] inline-flex items-center gap-1"
            title="Copy URL"
            data-testid={`media-copy-${item.id}`}
          >
            <Copy size={12} /> URL
          </button>
          <button
            onClick={() => onSelect(item)}
            className="text-[#5C4E4A] hover:text-[#2A1F1D] inline-flex items-center gap-1"
            data-testid={`media-edit-${item.id}`}
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            className="ml-auto text-[#C05A3A] hover:underline inline-flex items-center gap-1"
            data-testid={`media-delete-${item.id}`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaDetailDialog({ item, token, onClose, onSaved }) {
  const [alt, setAlt] = useState(item.alt_text || "");
  const [caption, setCaption] = useState(item.caption || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isImage = item.mime_type?.startsWith("image/");
  const fullUrl = `${BACKEND}${item.url}`;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await axios.patch(
        `${API}/admin/media/${item.id}`,
        { alt_text: alt, caption },
        { headers: authHeaders(token) }
      );
      onSaved(data);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <div
        className="bg-white border border-[#DFD7CA] w-full max-w-3xl shadow-xl"
        data-testid="media-detail-dialog"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA]">
          <h3 className="font-serif text-xl text-[#2A1F1D]">Edit media</h3>
          <button onClick={onClose} aria-label="Close" data-testid="media-detail-close">
            <X size={18} />
          </button>
        </header>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="bg-[#F5EFE2] aspect-square flex items-center justify-center overflow-hidden">
            {isImage ? (
              <img src={fullUrl} alt={alt || item.original_filename} className="w-full h-full object-contain" />
            ) : (
              <FileText size={64} className="text-[#5C4E4A]" />
            )}
          </div>
          <div className="space-y-4">
            <div>
              <p className="overline text-[#5C4E4A] text-[10px]">File</p>
              <p className="text-sm text-[#2A1F1D] break-all">{item.original_filename}</p>
              <p className="text-xs text-[#5C4E4A] mt-1">
                {fmtBytes(item.size_bytes)} · {item.mime_type}
              </p>
              <p className="text-xs text-[#5C4E4A] mt-1">Uploaded {formatDate(item.uploaded_at)}</p>
            </div>
            <div className="field">
              <label htmlFor="m-alt">Alt text</label>
              <input
                id="m-alt"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image for accessibility."
                data-testid="media-alt-input"
              />
            </div>
            <div className="field">
              <label htmlFor="m-caption">Caption</label>
              <input
                id="m-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                data-testid="media-caption-input"
              />
            </div>
            <div className="field">
              <label>Public URL</label>
              <input readOnly value={fullUrl} className="text-xs" />
            </div>
            {error && <p className="text-sm text-[#C05A3A]">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn-outline text-sm">
                Close
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary text-sm"
                data-testid="media-save-button"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MediaPanel({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState([]); // [{name, progress}]
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState("");
  const inputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/media`, { headers: authHeaders(token) });
      setItems(data);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load media."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  const upload = async (files) => {
    const queue = Array.from(files);
    if (queue.length === 0) return;
    setUploading(queue.map((f) => ({ name: f.name, progress: 0 })));
    for (let i = 0; i < queue.length; i++) {
      const f = queue[i];
      const fd = new FormData();
      fd.append("file", f);
      try {
        await axios.post(`${API}/admin/media`, fd, {
          headers: { ...authHeaders(token) },
          onUploadProgress: (e) => {
            const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
            setUploading((u) =>
              u.map((it, idx) => (idx === i ? { ...it, progress: pct } : it))
            );
          },
        });
      } catch (err) {
        setError(
          formatApiErrorDetail(err?.response?.data?.detail, `Couldn't upload ${f.name}.`)
        );
      }
    }
    setUploading([]);
    await load();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) upload(e.dataTransfer.files);
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.original_filename}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/media/${item.id}`, { headers: authHeaders(token) });
      await load();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't delete."));
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setToast("URL copied");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(""), 2000);
    }
  };

  return (
    <div className="space-y-5" data-testid="admin-media-panel">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-[#2A1F1D]">Media</h2>
          <p className="text-xs text-[#5C4E4A] mt-1">
            Images (incl. iPhone HEIC), video, audio, PDFs. Max 25MB per file.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-primary inline-flex items-center gap-2 text-sm"
          data-testid="media-pick-button"
        >
          <Upload size={14} /> Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif,video/*,audio/*,application/pdf"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
          data-testid="media-file-input"
        />
      </header>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed py-10 px-6 text-center transition-colors ${
          dragOver ? "border-[#C05A3A] bg-[#FBF7EE]" : "border-[#DFD7CA] bg-[#F5EFE2]/60"
        }`}
        data-testid="media-drop-zone"
      >
        <Upload size={20} className="mx-auto text-[#5C4E4A]" />
        <p className="text-sm text-[#5C4E4A] mt-2">
          Drag & drop files here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="underline text-[#C05A3A]"
          >
            choose from your device
          </button>
        </p>
      </div>

      {uploading.length > 0 && (
        <div className="bg-[#FBF7EE] border border-[#DFD7CA] p-4 space-y-2" data-testid="media-upload-progress">
          {uploading.map((u, i) => (
            <div key={i} className="text-xs text-[#2A1F1D]">
              <p className="truncate">{u.name}</p>
              <div className="bg-[#F0E6CF] h-1 mt-1">
                <div
                  className="bg-[#C05A3A] h-1 transition-all"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-[#C05A3A]" data-testid="media-error">{error}</p>}
      {toast && (
        <p className="text-sm text-[#2D5C32]" data-testid="media-toast">
          {toast}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center" data-testid="media-empty">
          No media yet. Drop some files in.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" data-testid="media-grid">
          {items.map((it) => (
            <MediaItemCard
              key={it.id}
              item={it}
              onSelect={setEditing}
              onCopy={copy}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {editing && (
        <MediaDetailDialog
          item={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((arr) => arr.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
