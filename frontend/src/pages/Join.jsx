import { useState } from "react";
import axios from "axios";
import { ArrowRight, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "../hooks/useSiteContent";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// QR landing page — the printed insert card / label QR points at
// https://notasalami.com/join and that URL must never change.
//
// Built to Eva's Nov 3 brief: four sections, with the Private Batch List
// signup as the single primary call to action. Captures first name, email,
// optional preferred pickup area and an explicit (never preselected) consent
// checkbox, stored in the newsletter collection with source "qr_private_batch"
// so it can be exported on its own.
//
// Every visible string is a site-content field on the "join" page, so Eva can
// change the copy, swap the image and drop in the Instagram URL without a
// rebuild.

const PICKUP_AREAS = [
  { value: "", label: "No preference" },
  { value: "san_francisco", label: "San Francisco" },
  { value: "napa_valley", label: "Napa Valley" },
  { value: "either", label: "Either" },
];

// Analytics. The site configures GA4 directly (G-CJ1BE32W1P, send_page_view:false)
// alongside GTM, so events go through gtag() and land in GA4 without needing GTM
// Custom Event tags built for them.
//
// Do NOT also add GTM triggers for these three names: gtag() pushes into
// dataLayer, so GTM would fire as well and every event would be counted twice.
const track = (event, data = {}) => {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", event, data);
    return;
  }
  // Fallback if gtag is blocked/unavailable — still visible to GTM.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
};

export default function Join() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pickup, setPickup] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err
  const [msg, setMsg] = useState("");
  const c = useSiteContent("join");

  const heroImage = c("join_s1_image", "");
  const instagram = (c("join_s4_instagram_url", "") || "").trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !consent) return;
    setStatus("loading");
    try {
      await axios.post(`${API}/newsletter`, {
        email,
        name,
        source: "qr_private_batch",
        pickup_area: pickup,
        consent: true,
      });
      track("join_signup", {
        pickup_area: pickup || "no_preference",
        source: "qr_private_batch",
      });
      setStatus("ok");
    } catch (err) {
      setStatus("err");
      setMsg("Something went wrong. Try again in a moment.");
    }
  };

  return (
    <div className="pt-[90px]" data-testid="join-page">
      {/* ---------- Section 1 — Brand intro ---------- */}
      <section className="max-w-[680px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16 text-center">
        {heroImage ? (
          <img
            src={heroImage}
            alt="Not-A-Salami, sliced"
            className="w-full max-w-md mx-auto mb-14 object-cover"
            data-testid="join-hero-image"
          />
        ) : null}
        <h1
          className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight text-[#2A1F1D]"
          data-testid="join-s1-headline"
        >
          {c("join_s1_headline", "Enjoyed the Unexpected?")}
        </h1>
        <p className="mt-7 text-lg text-[#5C4E4A] leading-relaxed max-w-md mx-auto">
          {c(
            "join_s1_body",
            "Not-A-Salami is a Sicilian cocoa confection, handcrafted in California. Inspired by tradition, made to be shared."
          )}
        </p>
      </section>

      {/* ---------- Section 2 — Private Batch List (primary CTA) ---------- */}
      <section
        className="max-w-[680px] mx-auto px-6 md:px-10 pb-20"
        data-testid="join-s2"
      >
        <div className="bg-[#FBF7EE] border border-[#DFD7CA] px-6 md:px-14 py-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl leading-tight text-[#2A1F1D]">
            {c("join_s2_headline", "Would You Like More?")}
          </h2>
          <p className="mt-6 text-base md:text-lg text-[#5C4E4A] leading-relaxed max-w-lg mx-auto whitespace-pre-line">
            {c(
              "join_s2_body",
              "While we specialize in corporate gifting, we occasionally make limited batches available for personal orders.\n\nJoin our Private Batch List to be the first to know when the next batch becomes available."
            )}
          </p>

          {status === "ok" ? (
            <div className="mt-10" data-testid="join-success">
              <p className="font-serif text-2xl text-[#2A1F1D]">
                {c("join_s2_success_title", "You're on the list!")}
              </p>
              <p className="mt-4 text-[#5C4E4A] leading-relaxed max-w-sm mx-auto">
                {c(
                  "join_s2_success_body",
                  "We'll let you know when our next limited batch becomes available for personal orders."
                )}
              </p>
              <Link to="/" className="link-underline mt-8 inline-flex items-center gap-2">
                Back to Not-A-Salami <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-10 max-w-sm mx-auto space-y-4"
              data-testid="join-form"
            >
              <div className="field text-left">
                <label htmlFor="join-name">First name</label>
                <input
                  id="join-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name"
                  autoComplete="given-name"
                  data-testid="join-name-input"
                />
              </div>
              <div className="field text-left">
                <label htmlFor="join-email">Email</label>
                <input
                  id="join-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@table.com"
                  autoComplete="email"
                  data-testid="join-email-input"
                />
              </div>
              <div className="field text-left">
                <label htmlFor="join-pickup">
                  Preferred pickup area <span className="text-[#8A7B74]">(optional)</span>
                </label>
                <select
                  id="join-pickup"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full bg-transparent border-b border-[#DFD7CA] py-2 text-[#2A1F1D] focus:outline-none focus:border-[#C05A3A]"
                  data-testid="join-pickup-select"
                >
                  {PICKUP_AREAS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <label
                htmlFor="join-consent"
                className="flex items-start gap-3 text-left text-sm text-[#5C4E4A] leading-relaxed cursor-pointer"
              >
                <input
                  id="join-consent"
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 shrink-0"
                  data-testid="join-consent-input"
                />
                <span>
                  {c(
                    "join_s2_consent",
                    "Yes, email me when a new batch is announced. I can unsubscribe at any time."
                  )}
                </span>
              </label>

              <button
                type="submit"
                disabled={status === "loading" || !consent}
                className="btn-primary w-full justify-center inline-flex items-center gap-2 disabled:opacity-50"
                data-testid="join-submit"
              >
                {status === "loading"
                  ? "Sending…"
                  : c("join_s2_button", "Join the Private Batch List")}{" "}
                <ArrowRight size={14} />
              </button>

              {status === "err" && (
                <p className="text-sm text-[#C05A3A]" data-testid="join-error">
                  {msg}
                </p>
              )}
            </form>
          )}

          <p className="mt-8 text-xs text-[#8A7B74] leading-relaxed max-w-sm mx-auto">
            {c(
              "join_s2_note",
              "Limited availability. Ordering and pickup details will be shared when each batch is announced."
            )}
          </p>
        </div>
      </section>

      {/* ---------- Section 3 — Corporate gifting ---------- */}
      <section
        className="max-w-[680px] mx-auto px-6 md:px-10 pb-16 text-center"
        data-testid="join-s3"
      >
        <h2 className="font-serif text-2xl md:text-3xl text-[#2A1F1D]">
          {c("join_s3_headline", "Something Special for Your Business?")}
        </h2>
        <p className="mt-4 text-[#5C4E4A] leading-relaxed max-w-md mx-auto">
          {c(
            "join_s3_body",
            "From client appreciation to corporate celebrations, Not-A-Salami makes gifting memorable."
          )}
        </p>
        <Link
          to="/corporate-experiences"
          className="link-underline mt-6 inline-flex items-center gap-2"
          data-testid="join-corporate-link"
          onClick={() => track("corporate_gifting_click", { from: "qr_landing_page" })}
        >
          {c("join_s3_button", "Explore Corporate Gifting")} <ArrowRight size={14} />
        </Link>
      </section>

      {/* ---------- Section 4 — Social ---------- */}
      <section
        className="max-w-[680px] mx-auto px-6 md:px-10 pb-28 text-center border-t border-[#DFD7CA] pt-14"
        data-testid="join-s4"
      >
        <h2 className="font-serif text-xl md:text-2xl text-[#2A1F1D]">
          {c("join_s4_headline", "Share Your Unexpected Moment")}
        </h2>
        <p className="mt-4 text-sm text-[#5C4E4A] leading-relaxed max-w-md mx-auto whitespace-pre-line">
          {c(
            "join_s4_body",
            "Unwrapped it? Sliced it? Shared it? We'd love to see your Not-A-Salami moment.\n\nShare it on Instagram and tag us."
          )}
        </p>
        {instagram ? (
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-[#C05A3A]"
            data-testid="join-instagram-link"
            aria-label="Not-A-Salami on Instagram"
            onClick={() => track("instagram_click", { from: "qr_landing_page" })}
          >
            <Instagram size={20} />
          </a>
        ) : null}
      </section>
    </div>
  );
}
