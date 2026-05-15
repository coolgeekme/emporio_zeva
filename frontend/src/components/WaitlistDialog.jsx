import { useState, useEffect } from "react";
import axios from "axios";
import { X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WaitlistDialog({ open, onClose, product }) {
  const [form, setForm] = useState({ name: "", email: "", note: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setMsg("");
      setForm({ name: "", email: "", note: "" });
    }
  }, [open, product?.slug]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !product) return null;

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await axios.post(`${API}/waitlist`, {
        name: form.name,
        email: form.email,
        product_slug: product.slug,
        note: form.note,
      });
      setStatus("ok");
      setMsg(
        "Grazie. You're on the list — we'll write when this one comes out of Eva's kitchen."
      );
    } catch (err) {
      setStatus("err");
      setMsg("Something didn't go through. Try again or email hello@emporiozeva.com.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      data-testid="waitlist-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close waitlist dialog"
        onClick={onClose}
        className="absolute inset-0 bg-[#2A1F1D]/60 backdrop-blur-sm animate-fadeIn"
        data-testid="waitlist-backdrop"
      />

      {/* Panel */}
      <div className="relative bg-[#F5EFE2] w-full max-w-xl shadow-2xl border border-[#DFD7CA] animate-riseIn max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#5C4E4A] hover:text-[#2A1F1D] transition-colors"
          aria-label="Close"
          data-testid="waitlist-close-button"
        >
          <X size={18} />
        </button>

        <div className="p-8 md:p-12">
          <p
            className="overline text-[#C05A3A]"
            data-testid="waitlist-overline"
          >
            The Waitlist · {product.badge || "Limited release"}
          </p>
          <h2
            id="waitlist-title"
            className="font-serif text-3xl md:text-4xl mt-3 leading-tight text-[#2A1F1D]"
            data-testid="waitlist-product-name"
          >
            {product.name}
          </h2>
          <p className="text-sm text-[#5C4E4A] mt-4 leading-relaxed">
            Leave your name. We'll write the moment it's ready — small batch, in
            order of reservation. No spam, no newsletter.
          </p>

          {status === "ok" ? (
            <div
              className="mt-8 border border-[#C05A3A] bg-[#FBF7EE] p-6"
              data-testid="waitlist-success"
            >
              <p className="font-serif text-xl text-[#2A1F1D]">Reserved.</p>
              <p className="text-sm text-[#5C4E4A] mt-2 leading-relaxed">{msg}</p>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary mt-6"
                data-testid="waitlist-success-close"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5" data-testid="waitlist-form">
              <div className="field">
                <label htmlFor="wl-name">Your name</label>
                <input
                  id="wl-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Eva Margherita"
                  data-testid="waitlist-name-input"
                />
              </div>

              <div className="field">
                <label htmlFor="wl-email">Email</label>
                <input
                  id="wl-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={update("email")}
                  placeholder="your@table.com"
                  data-testid="waitlist-email-input"
                />
              </div>

              <div className="field">
                <label htmlFor="wl-note">A note (optional)</label>
                <textarea
                  id="wl-note"
                  rows={3}
                  value={form.note}
                  onChange={update("note")}
                  placeholder="Quantity, occasion, or anything we should know."
                  data-testid="waitlist-note-input"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-primary"
                  data-testid="waitlist-submit-button"
                >
                  {status === "loading" ? "Reserving…" : "Reserve my place →"}
                </button>
                {status === "err" && (
                  <p
                    className="text-sm text-[#C05A3A]"
                    data-testid="waitlist-error"
                  >
                    {msg}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
