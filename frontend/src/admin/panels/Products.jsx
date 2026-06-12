// Products admin — CRUD for the product catalog. Image fields integrate with
// the Media library (paste URL or browse media). Status: active / future / archived.
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Trash2, X, Edit2, Image as ImageIcon } from "lucide-react";
import { API, authHeaders, formatApiErrorDetail, formatDate } from "../api";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const STATUSES = ["active", "future", "archived"];

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
      <div className="bg-white border border-[#DFD7CA] w-full max-w-4xl shadow-xl" data-testid="media-picker-dialog">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA]">
          <h3 className="font-serif text-lg text-[#2A1F1D]">Pick an image from the Media library</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="p-6">
          {loading ? (
            <p className="text-sm text-[#5C4E4A]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#5C4E4A]">No images uploaded yet. Add some in the Media tab.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3" data-testid="media-picker-grid">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPick(`${BACKEND}${m.url}`)}
                  className="aspect-square bg-[#F5EFE2] hover:ring-2 hover:ring-[#C05A3A] overflow-hidden"
                  data-testid={`media-picker-item-${m.id}`}
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

function ImageField({ value, onChange, label, token, testid }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="flex gap-2 items-start">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or /api/static/…"
          data-testid={testid}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="btn-outline text-xs whitespace-nowrap inline-flex items-center gap-1"
          data-testid={`${testid}-pick-button`}
        >
          <ImageIcon size={12} /> Browse
        </button>
      </div>
      {value && (
        <div className="mt-2 inline-block bg-[#F5EFE2] border border-[#DFD7CA] p-1">
          <img src={value} alt="" className="h-20 w-20 object-cover" />
        </div>
      )}
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

function ImagesField({ values, onChange, label, token }) {
  const update = (i, v) => onChange(values.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...values, ""]);
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div>
      <p className="overline text-[#5C4E4A] text-[10px]">{label}</p>
      <div className="space-y-3 mt-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1">
              <ImageField
                value={v}
                onChange={(nv) => update(i, nv)}
                token={token}
                testid={`product-image-${i}`}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[#C05A3A] hover:underline text-xs mt-7"
              data-testid={`product-image-${i}-remove`}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={add} className="btn-outline text-xs inline-flex items-center gap-1" data-testid="product-image-add">
          <Plus size={12} /> Add image
        </button>
      </div>
    </div>
  );
}

function ListField({ values, onChange, label, placeholder }) {
  const update = (i, v) => onChange(values.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...values, ""]);
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div>
      <p className="overline text-[#5C4E4A] text-[10px]">{label}</p>
      <div className="space-y-2 mt-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              className="field-bare flex-1"
              value={v}
              placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
              data-testid={`product-list-${label.toLowerCase().replace(/\s+/g, "-")}-${i}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[#C05A3A] hover:underline text-xs mt-2"
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={add} className="btn-outline text-xs inline-flex items-center gap-1">
          <Plus size={12} /> Add row
        </button>
      </div>
    </div>
  );
}

const EMPTY_PRODUCT = {
  slug: "",
  name: "",
  tagline: "",
  price: "",
  weight: "",
  description: "",
  long_description: "",
  ingredients: [],
  pairings: [],
  serving: [],
  images: [],
  badge: "",
  available: true,
  status: "active",
  pronunciation: "",
};

function ProductEditor({ product, token, onClose, onSaved }) {
  const isNew = !product;
  const [form, setForm] = useState(() => ({
    ...EMPTY_PRODUCT,
    ...(product || {}),
    badge: product?.badge || "",
    pronunciation: product?.pronunciation || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Strip empty strings for optional fields to keep MongoDB clean
      const payload = {
        ...form,
        badge: form.badge?.trim() || null,
        pronunciation: form.pronunciation?.trim() || null,
        images: form.images.filter((x) => x?.trim()),
        ingredients: form.ingredients.filter((x) => x?.trim()),
        pairings: form.pairings.filter((x) => x?.trim()),
        serving: form.serving.filter((x) => x?.trim()),
      };
      if (isNew) {
        await axios.post(`${API}/admin/products`, payload, { headers: authHeaders(token) });
      } else {
        await axios.patch(`${API}/admin/products/${product.slug}`, payload, { headers: authHeaders(token) });
      }
      onSaved();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't save product."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 md:p-10 overflow-y-auto">
      <div
        className="bg-white border border-[#DFD7CA] w-full max-w-4xl shadow-xl"
        data-testid="product-editor-dialog"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#DFD7CA] sticky top-0 bg-white z-10">
          <h3 className="font-serif text-xl text-[#2A1F1D]">
            {isNew ? "New product" : `Edit · ${product.name}`}
          </h3>
          <button onClick={onClose} aria-label="Close" data-testid="product-editor-close">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={submit} className="p-6 space-y-6" data-testid="product-editor-form">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="field">
              <label htmlFor="pr-name">Name</label>
              <input id="pr-name" value={form.name} onChange={(e) => upd("name", e.target.value)} required data-testid="product-name-input" />
            </div>
            <div className="field">
              <label htmlFor="pr-slug">Slug</label>
              <input id="pr-slug" value={form.slug} onChange={(e) => upd("slug", e.target.value)} placeholder="auto from name" data-testid="product-slug-input" />
            </div>
            <div className="field">
              <label htmlFor="pr-tagline">Tagline</label>
              <input id="pr-tagline" value={form.tagline} onChange={(e) => upd("tagline", e.target.value)} data-testid="product-tagline-input" />
            </div>
            <div className="field">
              <label htmlFor="pr-badge">Badge (optional)</label>
              <input id="pr-badge" value={form.badge} onChange={(e) => upd("badge", e.target.value)} placeholder="e.g. The signature" data-testid="product-badge-input" />
            </div>
            <div className="field">
              <label htmlFor="pr-price">Price (display)</label>
              <input id="pr-price" value={form.price} onChange={(e) => upd("price", e.target.value)} placeholder="e.g. $48" data-testid="product-price-input" />
            </div>
            <div className="field">
              <label htmlFor="pr-weight">Weight</label>
              <input id="pr-weight" value={form.weight} onChange={(e) => upd("weight", e.target.value)} placeholder="e.g. 7 oz / 200 g" data-testid="product-weight-input" />
            </div>
            <div className="field">
              <label htmlFor="pr-pronounce">Pronunciation (optional)</label>
              <input id="pr-pronounce" value={form.pronunciation} onChange={(e) => upd("pronunciation", e.target.value)} placeholder="e.g. pee-stah-kee-oh dee BRON-tay" data-testid="product-pronunciation-input" />
            </div>
            <div className="field">
              <label htmlFor="pr-status">Status</label>
              <select id="pr-status" value={form.status} onChange={(e) => upd("status", e.target.value)} data-testid="product-status-select">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="text-xs text-[#5C4E4A] mt-1">
                <b>active</b> = sold now · <b>future</b> = waitlist only · <b>archived</b> = hidden from public site
              </p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="pr-desc">Short description</label>
            <textarea id="pr-desc" rows={3} value={form.description} onChange={(e) => upd("description", e.target.value)} data-testid="product-description-input" />
          </div>
          <div className="field">
            <label htmlFor="pr-long">Long description</label>
            <textarea id="pr-long" rows={6} value={form.long_description} onChange={(e) => upd("long_description", e.target.value)} data-testid="product-long-description-input" />
          </div>

          <ImagesField
            values={form.images}
            onChange={(v) => upd("images", v)}
            label="Images"
            token={token}
          />

          <div className="grid md:grid-cols-3 gap-6">
            <ListField values={form.ingredients} onChange={(v) => upd("ingredients", v)} label="Ingredients" placeholder="Single line per ingredient" />
            <ListField values={form.pairings} onChange={(v) => upd("pairings", v)} label="Pairings" placeholder="e.g. Espresso" />
            <ListField values={form.serving} onChange={(v) => upd("serving", v)} label="Serving notes" placeholder="e.g. Slice 1/4 inch thick" />
          </div>

          <label className="text-sm text-[#2A1F1D] flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => upd("available", e.target.checked)}
              className="accent-[#C05A3A] h-4 w-4"
              data-testid="product-available-checkbox"
            />
            Available for inquiries
          </label>

          {error && <p className="text-sm text-[#C05A3A]" data-testid="product-editor-error">{error}</p>}
          <div className="flex justify-end gap-3 sticky bottom-0 bg-white border-t border-[#DFD7CA] -mx-6 px-6 py-4 mt-6">
            <button type="button" onClick={onClose} className="btn-outline text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm" data-testid="product-editor-save-button">
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPanel({ token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/products`, { headers: authHeaders(token) });
      setRows(data);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't load products."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/products/${p.slug}`, { headers: authHeaders(token) });
      await load();
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail, "Couldn't delete."));
    }
  };

  const grouped = useMemo(() => {
    const out = { active: [], future: [], archived: [] };
    rows.forEach((p) => {
      const s = STATUSES.includes(p.status) ? p.status : "active";
      out[s].push(p);
    });
    return out;
  }, [rows]);

  return (
    <div className="space-y-5" data-testid="admin-products-panel">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-[#2A1F1D]">Products</h2>
          <p className="text-xs text-[#5C4E4A] mt-1">Manage the product catalog. Active products show on Collection. Future products show in the "Coming next" block with a waitlist button.</p>
        </div>
        <button onClick={() => setEditing("new")} className="btn-primary inline-flex items-center gap-2 text-sm" data-testid="products-new-button">
          <Plus size={14} /> New product
        </button>
      </header>

      {error && <p className="text-sm text-[#C05A3A]" data-testid="products-error">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#5C4E4A] py-12 text-center">No products yet.</p>
      ) : (
        STATUSES.map((status) => {
          const list = grouped[status];
          if (list.length === 0) return null;
          return (
            <section key={status} className="bg-white border border-[#DFD7CA]" data-testid={`products-group-${status}`}>
              <div className="px-4 py-3 border-b border-[#DFD7CA] flex items-center justify-between">
                <p className="overline text-[#C05A3A] capitalize">{status}</p>
                <span className="text-xs text-[#5C4E4A]">{list.length}</span>
              </div>
              <ul>
                {list.map((p) => (
                  <li key={p.slug} className="flex items-center gap-4 px-4 py-3 border-b border-[#F0E6CF] last:border-0" data-testid={`product-row-${p.slug}`}>
                    <div className="w-14 h-14 bg-[#F5EFE2] flex-shrink-0 overflow-hidden">
                      {p.images?.[0] && (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2A1F1D] truncate">{p.name}</p>
                      <p className="text-xs text-[#5C4E4A] truncate">/products/{p.slug} · {p.price || "no price"} · {p.weight || "no weight"}</p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => setEditing(p)} className="text-[#2A1F1D] hover:underline inline-flex items-center gap-1" data-testid={`products-edit-${p.slug}`}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => remove(p)} className="text-[#C05A3A] hover:underline inline-flex items-center gap-1" data-testid={`products-delete-${p.slug}`}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {editing && (
        <ProductEditor
          token={token}
          product={editing === "new" ? null : editing}
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
