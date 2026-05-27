import { useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewsletterForm({ variant = "dark" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await axios.post(`${API}/newsletter`, { email });
      setStatus("ok");
      setMsg("Benvenuto. We'll write when there's news worth sharing.");
      setEmail("");
    } catch (err) {
      setStatus("err");
      setMsg("Something went wrong. Try again in a moment.");
    }
  };

  const isDark = variant === "dark";

  return (
    <form
      onSubmit={submit}
      className="w-full"
      data-testid="newsletter-form"
    >
      <div
        className={`flex items-end gap-3 border-b ${
          isDark ? "border-[#5C4E4A]" : "border-[#DFD7CA]"
        }`}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@table.com"
          className={`flex-1 bg-transparent border-none outline-none py-3 text-base ${
            isDark
              ? "text-[#F9F6F0] placeholder-[#5C4E4A]"
              : "text-[#2A1F1D] placeholder-[#5C4E4A]"
          }`}
          data-testid="newsletter-email-input"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={`pb-3 text-[11px] tracking-[0.22em] uppercase font-semibold transition-colors ${
            isDark
              ? "text-[#F9F6F0] hover:text-[#C05A3A]"
              : "text-[#2A1F1D] hover:text-[#C05A3A]"
          }`}
          data-testid="newsletter-submit-button"
        >
          {status === "loading" ? "Sending…" : "Subscribe →"}
        </button>
      </div>
      {status === "ok" && (
        <p
          className={`mt-4 text-sm ${isDark ? "text-[#B9935A]" : "text-[#C05A3A]"}`}
          data-testid="newsletter-success"
        >
          {msg}
        </p>
      )}
      {status === "err" && (
        <p className="mt-4 text-sm text-[#C05A3A]" data-testid="newsletter-error">
          {msg}
        </p>
      )}
    </form>
  );
}
