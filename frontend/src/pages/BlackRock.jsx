import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, ChevronRight, ArrowRight, Mail, Phone, Globe } from "lucide-react";
import {
  IMAGES,
  LOGO_URL,
  SF_MADE_BADGE,
  BRAND,
  CONTACT,
  TAGLINES,
  PILLARS,
  CORPORATE_USE_CASES,
  CUSTOMIZATION,
  CORPORATE_PACKAGES,
  FULFILLMENT,
  PROCESS,
  FOUNDER_LETTER,
} from "../content";
import MonogramDivider from "../components/MonogramDivider";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============================================================================
// Slide chrome
// ============================================================================

const Slide = ({ id, n, total, dark = false, children, testid, isActive = false }) => (
  <section
    id={id}
    data-testid={testid}
    className={`snap-start shrink-0 w-screen h-full flex md:items-center overflow-y-auto md:overflow-y-hidden relative ${
      dark ? "bg-[#2A1F1D] text-[#F9F6F0] grain" : "bg-[#F9F6F0]"
    }`}
  >
    <div className="absolute top-8 md:top-10 left-6 md:left-10 z-10 flex items-center gap-4">
      <p
        className={`text-[11px] tracking-[0.22em] uppercase font-semibold ${
          dark ? "text-[#B9935A]" : "text-[#5C4E4A]"
        }`}
      >
        {String(n).padStart(2, "0")}{" "}
        <span className={dark ? "text-[#5C4E4A]" : "text-[#DFD7CA]"}>
          / {String(total).padStart(2, "0")}
        </span>
      </p>
      <span className={`overline ${dark ? "text-[#5C4E4A]" : "text-[#DFD7CA]"} hidden md:inline`}>
        Not A Salami · Corporate Gifting
      </span>
    </div>
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 w-full md:h-full flex md:items-center">
      <div className={`w-full pt-24 pb-20 md:py-24 slide-fx ${isActive ? "in" : ""}`}>
        {children}
      </div>
    </div>
  </section>
);

// ============================================================================
// Deck
// ============================================================================

export default function BlackRock({ deck = null }) {
  // Personalization overrides — when no deck is provided, render a clean general version.
  const isGeneric = !deck;
  const clientName = deck?.client_name || "Your Team";
  const clientFull = deck ? deck.client_name : null;
  const introText =
    deck?.intro_text ||
    "A curated Italian gifting experience, prepared by hand in San Francisco.";
  const clientLogo = deck?.logo_url || null;
  const clientDomain = (deck?.domain || "company").replace(/^www\./, "").split(".")[0];
  const emailPlaceholder = `you@${(deck?.domain) || "company.com"}`;

  const trackRef = useRef(null);
  const rafRef = useRef(0);
  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const TOTAL = 11; // matches the real corporate deck

  const [visited, setVisited] = useState(() => new Set());
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisited((prev) => new Set([...prev, 0])));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    setVisited((prev) => (prev.has(active) ? prev : new Set([...prev, active])));
  }, [active]);

  // Custom smooth scroll — longer, more cinematic curve
  const animateScrollTo = useCallback((targetLeft, duration = 1400) => {
    const el = trackRef.current;
    if (!el) return;
    cancelAnimationFrame(rafRef.current);
    const startLeft = el.scrollLeft;
    const distance = targetLeft - startLeft;
    if (Math.abs(distance) < 1) return;
    const startTime = performance.now();
    // easeInOutQuint — gentler start and finish
    const ease = (t) =>
      t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      el.scrollLeft = startLeft + distance * ease(t);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const scrollToSlide = useCallback(
    (idx) => {
      const el = trackRef.current;
      if (!el) return;
      const target = Math.max(0, Math.min(idx, TOTAL - 1));
      animateScrollTo(el.clientWidth * target);
    },
    [animateScrollTo]
  );

  const next = useCallback(() => scrollToSlide(active + 1), [active, scrollToSlide]);
  const prev = useCallback(() => scrollToSlide(active - 1), [active, scrollToSlide]);

  useEffect(() => {
    const onKey = (e) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToSlide(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToSlide(TOTAL - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, scrollToSlide]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let frame;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setActive(idx);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    document.title = isGeneric
      ? "Corporate Gifting Presentation · Not A Salami"
      : `A Corporate Gifting Presentation for ${clientName} · Not A Salami`;
  }, [isGeneric, clientName]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/inquiries`, {
        ...form,
        subject: `${clientName} — Corporate Gifting Presentation`,
        product_slug: `deck-${clientDomain}`,
      });
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="blackrock-pitch-page"
      className="fixed inset-0 flex flex-col bg-[#F9F6F0]"
    >
      {/* Floating exit */}
      <Link
        to="/"
        data-testid="deck-exit"
        className="fixed top-6 right-6 md:top-8 md:right-10 z-30 overline text-[#5C4E4A] hover:text-[#C05A3A] transition-colors flex items-center gap-1 bg-[#F9F6F0]/95 backdrop-blur-md px-3 py-2 border border-[#DFD7CA] shadow-sm"
      >
        Exit deck <span aria-hidden>✕</span>
      </Link>

      {/* Begin hint — slide 1 only */}
      <div
        data-testid="deck-begin-hint"
        className={`fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-700 ${
          active === 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="flex items-center gap-3 bg-[#2A1F1D] text-[#F9F6F0] px-5 py-3 shadow-lg">
          <span className="overline !text-[10px] text-[#B9935A]">Begin</span>
          <span className="text-xs tracking-wide">Press</span>
          <kbd className="font-serif text-base bg-[#F9F6F0] text-[#2A1F1D] px-2 py-[1px] leading-none deck-key-pulse">
            →
          </kbd>
          <span className="text-xs tracking-wide">or swipe</span>
        </div>
      </div>

      {/* Slide track */}
      <div
        ref={trackRef}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
        data-testid="deck-track"
      >
        {/* -------- 01 COVER -------- */}
        <Slide id="cover" n={1} total={TOTAL} testid="deck-slide-cover" isActive={visited.has(0)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center">
            <div className="md:col-span-7">
              <p className="overline text-[#5C4E4A] mb-5 fx fx-down fx-d1">
                {isGeneric ? "Corporate gifting · 2026" : `Confidential · Prepared for ${clientFull}`}
              </p>
              <h1
                className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[88px] leading-[0.95] tracking-tight text-[#2A1F1D] fx fx-left fx-d2"
                data-testid="pitch-cover-title"
              >
                {isGeneric ? (
                  <>
                    A Corporate Gifting
                    <br />
                    <span className="italic text-[#C05A3A]">Presentation.</span>
                  </>
                ) : (
                  <>
                    A Corporate Gifting Presentation
                    <br />
                    for <span className="italic text-[#C05A3A]">{clientName}</span>.
                  </>
                )}
              </h1>
              <p className="mt-7 text-xl md:text-2xl font-serif text-[#5C4E4A] max-w-2xl leading-snug italic fx fx-up fx-d3">
                {introText}
              </p>
              <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-sm text-[#5C4E4A] fx fx-up fx-d4">
                <div>
                  <p className="overline">Prepared by</p>
                  <p className="mt-1 text-[#2A1F1D]">{BRAND.founder} · Founder</p>
                </div>
                <div>
                  <p className="overline">Date</p>
                  <p className="mt-1 text-[#2A1F1D]">
                    {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="overline">Audience</p>
                  <p className="mt-1 text-[#2A1F1D]">Corporate Gifting · Brand</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-5 hidden md:block">
              <div className="img-wash aspect-[4/5] max-h-[60vh] fx fx-right fx-d2">
                <img src={IMAGES.product} alt="Not A Salami presentation" />
              </div>
              {clientLogo && (
                <div
                  className="mt-6 inline-flex items-center gap-3 bg-[#F5EFE2] border border-[#DFD7CA] px-4 py-3 fx fx-up fx-d4"
                  data-testid="pitch-client-logo-tile"
                >
                  <img
                    src={clientLogo}
                    alt={`${clientName} logo`}
                    className="h-8 w-8 object-contain"
                    draggable="false"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div>
                    <p className="overline text-[#5C4E4A] !text-[9px]">Presented to</p>
                    <p className="text-sm text-[#2A1F1D] mt-0.5">{clientName}</p>
                  </div>
                </div>
              )}
              <img
                src={LOGO_URL}
                alt="Emporio Zeva"
                className="h-16 w-auto mt-6 select-none fx fx-up fx-d5"
                draggable="false"
              />
            </div>
          </div>
        </Slide>

        {/* -------- 02 ITALIAN TRADITION — letter -------- */}
        <Slide id="tradition" n={2} total={TOTAL} testid="deck-slide-tradition" isActive={visited.has(1)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
            <div className="md:col-span-6">
              <p className="overline text-[#C05A3A] fx fx-down fx-d1">{TAGLINES.italian_tradition}</p>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-4 text-[#2A1F1D] fx fx-left fx-d2">
                Returning to my roots,
                <br />
                <span className="italic text-[#C05A3A]">a Sicilian story.</span>
              </h2>
              <p className="mt-6 text-base md:text-lg text-[#2A1F1D] leading-relaxed max-w-xl fx fx-up fx-d3">
                Returning to my roots, I reconnected with my grandmother's
                recipe and the chocolate tradition of <strong>Modica, Sicily</strong> —
                brought together in a confection designed to surprise, and to be
                sliced and shared.
              </p>
              <p className="mt-4 text-sm text-[#5C4E4A] leading-relaxed max-w-xl italic fx fx-up fx-d4">
                {FOUNDER_LETTER[1]}
              </p>
              <p className="font-serif text-2xl italic text-[#C05A3A] mt-6 fx fx-up fx-d5">
                — {BRAND.founder}, Founder
              </p>
            </div>
            <div className="md:col-span-6 img-wash aspect-[4/5] max-h-[65vh] fx fx-right fx-d2">
              <img src={IMAGES.founder} alt="View of Modica, Sicily from a rooftop terrace" />
            </div>
          </div>
        </Slide>

        {/* -------- 03 A DIFFERENT KIND OF CHOCOLATE -------- */}
        <Slide id="why-it-works" n={3} total={TOTAL} dark testid="deck-slide-why-it-works" isActive={visited.has(2)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
            <div className="md:col-span-5 img-wash aspect-[4/5] max-h-[60vh]">
              <img src={IMAGES.hero} alt="Sliced Not A Salami" />
            </div>
            <div className="md:col-span-7">
              <p className="overline text-[#B9935A]">A different kind of chocolate</p>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-4">
                Unexpected at first.
                <br />
                <span className="italic text-[#C05A3A]">Designed to surprise.</span>
              </h2>
              <p className="mt-6 text-base md:text-lg text-[#DFD7CA] leading-relaxed max-w-xl">
                A traditional Sicilian chocolate confection, shaped like a salami.
                Unexpected at first — designed to surprise, then to be shared.
              </p>
              <p className="overline text-[#B9935A] mt-8">Why it works</p>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-6">
                {PILLARS.map((p, i) => (
                  <div key={p} data-testid={`pitch-pillar-${i}`} className="min-w-0">
                    <p className="overline text-[#5C4E4A]">No 0{i + 1}</p>
                    <p className="font-serif text-xl md:text-2xl text-[#F9F6F0] mt-2 whitespace-nowrap">{p}.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Slide>

        {/* -------- 04 ONE PRODUCT, CAREFULLY EXECUTED -------- */}
        <Slide id="product" n={4} total={TOTAL} testid="deck-slide-product" isActive={visited.has(3)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
            <div className="md:col-span-7">
              <p className="overline text-[#C05A3A]">One product. Carefully executed.</p>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-4 text-[#2A1F1D]">
                From production
                <br />
                to <span className="italic text-[#C05A3A]">your recipient's door.</span>
              </h2>
              <p className="mt-6 text-base md:text-lg text-[#5C4E4A] leading-relaxed max-w-xl">
                Every order is personally overseen with attention and care — from
                ingredient to packaging to delivery.
              </p>
              <dl className="mt-8 grid grid-cols-2 sm:grid-cols-2 gap-5 max-w-xl">
                {[
                  ["Storage", "Refrigerated"],
                  ["Shelf life", "8 weeks unopened · 2 weeks opened"],
                  ["Made in", "San Francisco, California"],
                  ["Enjoy with", "Coffee, wine, fruit, or cheese"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="overline text-[#C05A3A]">{k}</dt>
                    <dd className="font-serif text-xl text-[#2A1F1D] mt-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="md:col-span-5 img-wash aspect-[4/5] max-h-[60vh]">
              <img src="https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/zg1blozr_Salami_board.JPG" alt="Not A Salami on a wooden board" />
            </div>
          </div>
        </Slide>

        {/* -------- 05 USE CASES — 6 real -------- */}
        <Slide id="use-cases" n={5} total={TOTAL} testid="deck-slide-use-cases" isActive={visited.has(4)}>
          <div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] text-[#2A1F1D] max-w-2xl">
                Corporate gifting,
                <br />
                <span className="italic text-[#C05A3A]">six considered moments.</span>
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {CORPORATE_USE_CASES.map((u, i) => (
                <div
                  key={u.title}
                  data-testid={`pitch-usecase-${i}`}
                  className="border border-[#DFD7CA] bg-[#F9F6F0] p-6"
                >
                  <p className="overline text-[#5C4E4A]">No 0{i + 1}</p>
                  <h3 className="font-serif text-2xl mt-2 text-[#2A1F1D]">{u.title}</h3>
                  <p className="text-sm text-[#5C4E4A] mt-3 leading-relaxed">{u.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* -------- 06 ONE PRODUCT, PURE EXPRESSION -------- */}
        <Slide id="expression" n={6} total={TOTAL} dark testid="deck-slide-expression" isActive={visited.has(5)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
            <div className="md:col-span-6">
              <p className="overline text-[#B9935A]">One product. Pure expression.</p>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-4">
                A truly Sicilian treat.
                <br />
                <span className="italic text-[#C05A3A]">For the unexpected.</span>
              </h2>
              <p className="mt-7 text-base md:text-lg text-[#DFD7CA] leading-relaxed max-w-xl">
                Every detail, from ingredient to packaging, is intentional. This
                is an elevated gift with history, a story the recipient can
                taste, and a sweet moment worth sharing.
              </p>
              <p className="overline text-[#B9935A] mt-8">notasalami.com</p>
            </div>
            <div className="md:col-span-6 img-wash aspect-[4/5] max-h-[60vh]">
              <img src={IMAGES.gift} alt="Not A Salami gift presentation" />
            </div>
          </div>
        </Slide>

        {/* -------- 07 CUSTOMIZATION — 4 real -------- */}
        <Slide id="customization" n={7} total={TOTAL} testid="deck-slide-customization" isActive={visited.has(6)}>
          <div>
            <div className="mb-8">
              <p className="overline text-[#C05A3A]">Elevated experience</p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] mt-3 text-[#2A1F1D] max-w-3xl">
                Tailored — without
                <br />
                <span className="italic text-[#C05A3A]">losing the gift.</span>
              </h2>
              <p className="text-sm text-[#5C4E4A] max-w-xl mt-3">
                Selected elements of the gift can be tailored to reflect your
                company. Additional branded details can be discussed as needed.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
              {CUSTOMIZATION.map((c, i) => (
                <div
                  key={c.title}
                  data-testid={`pitch-customization-${i}`}
                  className="border border-[#DFD7CA] bg-[#F9F6F0] p-6 flex flex-col"
                >
                  <p className="overline text-[#5C4E4A]">No 0{i + 1}</p>
                  <h3 className="font-serif text-xl mt-2 text-[#2A1F1D] leading-tight">{c.title}</h3>
                  <p className="text-xs text-[#5C4E4A] mt-3 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
            <MonogramDivider className="mt-10" />
          </div>
        </Slide>

        {/* -------- 08 PRICING — real Curated $58 / Executive $78 -------- */}
        <Slide id="pricing" n={8} total={TOTAL} testid="deck-slide-pricing" isActive={visited.has(7)}>
          <div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] text-[#2A1F1D] max-w-3xl">
                A curated, ready-to-ship
                <br />
                <span className="italic text-[#C05A3A]">corporate gift experience.</span>
              </h2>
              <p className="text-sm text-[#5C4E4A] max-w-md">
                All prices are per unit and include packaging, inserts, and
                multi-recipient delivery. Shipping quoted separately.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {CORPORATE_PACKAGES.map((pkg, i) => (
                <article
                  key={pkg.name}
                  data-testid={`pitch-package-${i}`}
                  className={`fx ${i === 0 ? "fx-left" : "fx-right"} ${i === 0 ? "fx-d2" : "fx-d4"} border p-7 md:p-9 flex flex-col ${
                    i === 1
                      ? "bg-[#2A1F1D] text-[#F9F6F0] border-[#2A1F1D]"
                      : "border-[#DFD7CA] bg-[#F9F6F0]"
                  }`}
                >
                  {pkg.badge && (
                    <p className="overline text-[#C05A3A] mb-3 text-[10px]">{pkg.badge}</p>
                  )}
                  <p className={`overline text-[10px] ${i === 1 ? "text-[#DFD7CA]" : "text-[#5C4E4A]"}`}>
                    {pkg.name.toUpperCase()}
                  </p>
                  <h3
                    className={`font-serif text-3xl md:text-4xl mt-2 leading-tight ${
                      i === 1 ? "text-[#F9F6F0]" : "text-[#2A1F1D]"
                    }`}
                  >
                    1 salami · {pkg.box}
                  </h3>
                  <p className="mt-4 font-serif text-5xl text-[#C05A3A]">
                    {pkg.price}
                    <span className={`text-base font-sans tracking-wide ml-2 ${i === 1 ? "text-[#DFD7CA]" : "text-[#5C4E4A]"}`}>
                      {pkg.unit}
                    </span>
                  </p>
                  <p className={`mt-4 text-sm md:text-base leading-relaxed ${i === 1 ? "text-[#F9F6F0]" : "text-[#5C4E4A]"}`}>
                    {pkg.blurb}
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {pkg.includes.map((inc) => (
                      <li key={inc} className="flex gap-2 items-start">
                        <span className="text-[#C05A3A]">·</span>
                        <span className={i === 1 ? "text-[#F9F6F0]" : "text-[#5C4E4A]"}>{inc}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={`overline text-[10px] mt-6 pt-4 border-t ${i === 1 ? "border-[#5C4E4A] text-[#DFD7CA]" : "border-[#DFD7CA] text-[#5C4E4A]"}`}>
                    {pkg.min}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </Slide>

        {/* -------- 09 FULFILLMENT -------- */}
        <Slide id="fulfillment" n={9} total={TOTAL} testid="deck-slide-fulfillment" isActive={visited.has(8)}>
          <div>
            <p className="overline text-[#C05A3A] mb-4">Fulfillment</p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] text-[#2A1F1D] max-w-3xl">
              {TAGLINES.logistics}
            </h2>
            <p className="text-sm text-[#5C4E4A] mt-4 max-w-2xl">
              All orders ship on the same day — every recipient receives their
              gift within the same delivery window regardless of address.
            </p>

            <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-4 gap-5">
              {FULFILLMENT.map((f, i) => (
                <div
                  key={f.title}
                  data-testid={`pitch-fulfillment-${i}`}
                  className="border border-[#DFD7CA] bg-[#F9F6F0] p-6 flex flex-col"
                >
                  <p className="overline text-[#5C4E4A]">No 0{i + 1}</p>
                  <h3 className="font-serif text-xl mt-2 text-[#2A1F1D] leading-tight">{f.title}</h3>
                  <p className="text-xs text-[#5C4E4A] mt-3 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* -------- 10 HOW IT WORKS — 4-step process -------- */}
        <Slide id="process" n={10} total={TOTAL} dark testid="deck-slide-process" isActive={visited.has(9)}>
          <div>
            <p className="overline text-[#B9935A] mb-4">How it works</p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] max-w-3xl">
              From first conversation to delivery —
              <br />
              <span className="italic text-[#C05A3A]">we make it easy.</span>
            </h2>
            <p className="text-sm text-[#DFD7CA] mt-4 max-w-2xl">
              You send us your list, we take care of everything else.
            </p>

            <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-4 gap-5">
              {PROCESS.map((step, i) => (
                <div
                  key={step.n}
                  data-testid={`pitch-process-${i}`}
                  className="border border-[#5C4E4A] p-6 flex flex-col"
                >
                  <span className="font-serif text-5xl text-[#C05A3A] leading-none italic">
                    {step.n}
                  </span>
                  <h3 className="font-serif text-xl mt-4 text-[#F9F6F0] leading-tight">{step.title}</h3>
                  <p className="text-xs text-[#DFD7CA] mt-3 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* -------- 11 CLOSING + form -------- */}
        <Slide id="contact" n={11} total={TOTAL} testid="deck-slide-contact" isActive={visited.has(10)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12">
            <div className="md:col-span-5">
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] text-[#2A1F1D] fx fx-left fx-d2">
                Let's create a memorable
                <br />
                <span className="italic text-[#C05A3A]">gifting experience together.</span>
              </h2>
              <p className="mt-6 text-[#5C4E4A] leading-relaxed max-w-md fx fx-up fx-d3">
                Ready to chat. Together we will design a gifting experience
                tailored to your team and clients.
              </p>

              <ul className="mt-10 space-y-4 max-w-md fx fx-up fx-d4">
                <li className="flex gap-3 items-center" data-testid="pitch-contact-email">
                  <Mail size={16} className="text-[#C05A3A]" />
                  <a href={`mailto:${CONTACT.email_primary}`} className="text-[#2A1F1D] hover:text-[#C05A3A] transition-colors">
                    {CONTACT.email_primary}
                  </a>
                </li>
                <li className="flex gap-3 items-center" data-testid="pitch-contact-phone">
                  <Phone size={16} className="text-[#C05A3A]" />
                  <a href={`tel:${CONTACT.phone.replace(/\s|·/g, "")}`} className="text-[#2A1F1D] hover:text-[#C05A3A] transition-colors">
                    {CONTACT.phone_display}
                  </a>
                </li>
                <li className="flex gap-3 items-center" data-testid="pitch-contact-web">
                  <Globe size={16} className="text-[#C05A3A]" />
                  <a href="https://notasalami.com" target="_blank" rel="noopener noreferrer" className="text-[#2A1F1D] hover:text-[#C05A3A] transition-colors">
                    notasalami.com
                  </a>
                </li>
              </ul>
              <div className="mt-10 flex items-center gap-5">
                <img src={SF_MADE_BADGE} alt="SF Made" className="h-14 w-auto" />
                <p className="text-xs text-[#5C4E4A] max-w-[200px] leading-relaxed">
                  Selected by <span className="text-[#2A1F1D] font-semibold">SF Made</span> for Here & Now 2024.
                </p>
              </div>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <div className="border border-[#DFD7CA] bg-[#F9F6F0] p-6 md:p-8 fx fx-right fx-d3">
                <p className="overline text-[#C05A3A]">Request a tasting</p>
                <h3 className="font-serif text-2xl md:text-3xl mt-2 text-[#2A1F1D] leading-tight">
                  One reply gets it started.
                </h3>

                {submitted ? (
                  <div
                    className="mt-6 p-5 border border-[#C05A3A] bg-[#F9F6F0]"
                    data-testid="pitch-form-success"
                  >
                    <p className="overline text-[#C05A3A]">Received</p>
                    <p className="font-serif text-xl mt-1 text-[#2A1F1D]">Grazie.</p>
                    <p className="mt-2 text-xs md:text-sm text-[#5C4E4A]">
                      Eva will respond within one business day.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submit} className="mt-5 space-y-4" data-testid="pitch-form">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="field">
                        <label htmlFor="br-name">Your name</label>
                        <input
                          id="br-name"
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Your name"
                          data-testid="pitch-form-name"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="br-email">Work email</label>
                        <input
                          id="br-email"
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder={emailPlaceholder}
                          data-testid="pitch-form-email"
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="br-phone">Phone (optional)</label>
                      <input
                        id="br-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+1 …"
                        data-testid="pitch-form-phone"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="br-message">A short note (use case, volumes, dates)</label>
                      <textarea
                        id="br-message"
                        required
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="e.g. Q1 client appreciation for 120 PMs across NY and SF."
                        data-testid="pitch-form-message"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full sm:w-auto"
                      data-testid="pitch-form-submit"
                    >
                      {submitting ? "Sending…" : "Send to Eva →"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Slide>
      </div>

      {/* Deck controls */}
      <div
        className="shrink-0 border-t border-[#DFD7CA] bg-[#F9F6F0]/95 backdrop-blur-md px-6 md:px-10 py-3 flex items-center justify-between gap-4"
        data-testid="deck-controls"
      >
        <div className="flex items-center gap-5">
          <p className="overline text-[#5C4E4A] hidden sm:block">
            {TAGLINES.logistics}
          </p>
          <Link
            to="/"
            className="overline text-[#C05A3A] hover:text-[#2A1F1D] transition-colors flex items-center gap-1"
            data-testid="deck-back-home"
          >
            <ArrowRight size={12} className="rotate-180" />
            Back home
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2" data-testid="deck-dots">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                data-testid={`deck-dot-${i}`}
                className={`h-1 transition-all ${
                  i === active ? "w-8 bg-[#C05A3A]" : "w-4 bg-[#DFD7CA] hover:bg-[#5C4E4A]"
                }`}
              />
            ))}
          </div>

          <p
            className="font-serif text-xl text-[#2A1F1D] tabular-nums min-w-[68px] text-center"
            data-testid="deck-counter"
          >
            {String(active + 1).padStart(2, "0")}{" "}
            <span className="text-[#DFD7CA]">/ {String(TOTAL).padStart(2, "0")}</span>
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              disabled={active === 0}
              aria-label="Previous slide"
              data-testid="deck-prev"
              className="h-10 w-10 flex items-center justify-center border border-[#DFD7CA] text-[#2A1F1D] hover:bg-[#2A1F1D] hover:text-[#F9F6F0] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#2A1F1D] transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              disabled={active === TOTAL - 1}
              aria-label="Next slide"
              data-testid="deck-next"
              className="h-10 w-10 flex items-center justify-center border border-[#2A1F1D] bg-[#2A1F1D] text-[#F9F6F0] hover:bg-[#C05A3A] hover:border-[#C05A3A] disabled:opacity-30 disabled:hover:bg-[#2A1F1D] disabled:hover:border-[#2A1F1D] transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
