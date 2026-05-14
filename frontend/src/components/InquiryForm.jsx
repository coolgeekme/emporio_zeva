import { useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function InquiryForm({ productSlug = null, compact = false }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: productSlug ? "Product inquiry" : "General inquiry",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err
  const [msg, setMsg] = useState("");

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await axios.post(`${API}/inquiries`, {
        ...form,
        product_slug: productSlug,
      });
      setStatus("ok");
      setMsg("Grazie. Your note is in Eva's inbox — expect a reply within two days.");
      setForm({ name: "", email: "", phone: "", subject: form.subject, message: "" });
    } catch (err) {
      setStatus("err");
      setMsg("Something didn't go through. Try again or email hello@emporiozeva.com directly.");
    }
  };

  return (
    <form
      onSubmit={submit}
      className={compact ? "space-y-5" : "space-y-7"}
      data-testid="inquiry-form"
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="iq-name">Your name</label>
          <input
            id="iq-name"
            type="text"
            required
            value={form.name}
            onChange={update("name")}
            placeholder="Eva Margherita"
            data-testid="inquiry-name-input"
          />
        </div>
        <div className="field">
          <label htmlFor="iq-email">Email</label>
          <input
            id="iq-email"
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            placeholder="your@table.com"
            data-testid="inquiry-email-input"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="iq-phone">Phone (optional)</label>
          <input
            id="iq-phone"
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="+1 415 …"
            data-testid="inquiry-phone-input"
          />
        </div>
        <div className="field">
          <label htmlFor="iq-subject">Subject</label>
          <select
            id="iq-subject"
            value={form.subject}
            onChange={update("subject")}
            data-testid="inquiry-subject-select"
          >
            <option>General inquiry</option>
            <option>Product inquiry</option>
            <option>Wholesale</option>
            <option>Press · Editorial</option>
            <option>Events · Gifting</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="iq-message">Your note</label>
        <textarea
          id="iq-message"
          required
          value={form.message}
          onChange={update("message")}
          placeholder="Tell us what you're planning, when, and for how many."
          data-testid="inquiry-message-input"
        />
      </div>

      <div className="flex items-center gap-6 pt-2">
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary"
          data-testid="inquiry-submit-button"
        >
          {status === "loading" ? "Sending…" : "Send your note →"}
        </button>
        {status === "ok" && (
          <p className="text-sm text-[#C05A3A]" data-testid="inquiry-success">{msg}</p>
        )}
        {status === "err" && (
          <p className="text-sm text-[#C05A3A]" data-testid="inquiry-error">{msg}</p>
        )}
      </div>
    </form>
  );
}
