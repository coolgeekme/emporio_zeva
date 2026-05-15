import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, ChevronRight, ArrowRight, Check, Mail, Phone, Calendar } from "lucide-react";
import { IMAGES, LOGO_URL, SF_MADE_BADGE } from "../content";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// =========================================================================
// Slide content (data-driven so the deck stays declarative)
// =========================================================================

const packages = [
  {
    name: "The Curated",
    price: "From $46/recipient",
    blurb:
      "Quiet appreciation. Slide a Not-A-Salami onto the desk of every PM, advisor, or relationship lead.",
    tier: "Min. 25 units",
    includes: [
      "Not-A-Salami Classic, 300g",
      "Linen-feel parchment wrap, BlackRock monogram seal",
      "Letterpress serving card",
      "Hand-tied butcher's twine",
    ],
    cta: "Outreach gifts · Q1 onboarding",
  },
  {
    name: "The Signature",
    price: "From $98/recipient",
    blurb:
      "Our flagship corporate hamper. Designed for senior clients, board members, and the conversation that lasts past dessert.",
    tier: "Min. 50 units",
    includes: [
      "Not-A-Salami Classic, 300g",
      "Hand-finished olive-wood serving board",
      "Italian linen napkin, hemmed",
      "Monogrammed wax-seal closure",
      "Custom-printed dedication card",
      "Kraft presentation box with twine",
    ],
    badge: "Most chosen for institutional gifting",
    cta: "Holiday · Investor Day · Anniversary",
  },
  {
    name: "The Bespoke",
    price: "Quoted per program",
    blurb:
      "A program built around your moment. Custom flavor, custom packaging, custom story. We co-create with your brand team.",
    tier: "Min. 250 units · 60-day lead",
    includes: [
      "Custom flavor profile (Bronte pistachio, hazelnut, citrus)",
      "Co-branded butcher paper, printed in Italy",
      "Engraved olive-wood board with BlackRock crest",
      "Bespoke serving card co-written with your team",
      "Choice of ParcelPath / FedEx Priority shipping",
      "Dedicated production slot, Eva's personal sign-off",
    ],
    cta: "Investor Day · Aladdin Summit · Founder gifts",
  },
];

const useCases = [
  { title: "Client appreciation", body: "Q1 gestures to private wealth and institutional clients. Memorable, conversational." },
  { title: "Board & executive gifting", body: "A considered alternative to the same wine and same chocolates. Your gift becomes the story." },
  { title: "Investor Day takeaways", body: "Branded box at the seat or shipped post-event. 500+ units, 14-day lead." },
  { title: "New-hire welcome", body: "A refined first-day welcome — for senior hires in NY, SF, or London." },
];

const logistics = [
  ["Lead time", "14 days standard. 30–60 days for bespoke / large-volume programs."],
  ["Capacity", "1,500 units / month in-house. Vetted commissary partner for higher volumes."],
  ["Shipping", "FedEx Priority Overnight, climate-controlled below 75°F. ParcelPath for scale."],
  ["Quality", "Hand-checked by Eva. SF Made certified. Selected for 'Here & Now' 2024."],
  ["Allergens", "Cocoa, dairy, eggs, wheat. Gluten-free / dairy-free on bespoke programs."],
];

const nextSteps = [
  ["Tasting", "We courier a sample box of three Not-A-Salami to your team — no obligation."],
  ["Brief", "30-minute call with Eva to size the program: volumes, moments, dates."],
  ["Quote", "Custom written proposal with co-branding mockups within 5 business days."],
  ["Production", "PO signed, slot locked, batch produced and shipped on date."],
];

// =========================================================================
// Slide chrome
// =========================================================================

const Slide = ({ id, n, total, dark = false, children, testid }) => (
  <section
    id={id}
    data-testid={testid}
    className={`snap-start shrink-0 w-screen h-full flex items-center relative ${
      dark ? "bg-[#2A1F1D] text-[#F9F6F0] grain" : "bg-[#F9F6F0]"
    }`}
  >
    <div className="absolute top-8 md:top-10 left-6 md:left-10 z-10">
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
    </div>
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 w-full h-full flex items-center">
      <div className="w-full py-20 md:py-24">{children}</div>
    </div>
  </section>
);

// =========================================================================
// Deck
// =========================================================================

export default function BlackRock() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const TOTAL = 9;

  const scrollToSlide = useCallback((idx) => {
    const el = trackRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(idx, TOTAL - 1));
    el.scrollTo({ left: el.clientWidth * target, behavior: "smooth" });
  }, []);

  const next = useCallback(() => scrollToSlide(active + 1), [active, scrollToSlide]);
  const prev = useCallback(() => scrollToSlide(active - 1), [active, scrollToSlide]);

  // keyboard nav
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

  // scroll → active index
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
    document.title = "A proposal for BlackRock · Emporio Zeva";
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/inquiries`, {
        ...form,
        subject: "BlackRock — Corporate Gifting Proposal",
        product_slug: "blackrock-proposal",
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
      className="fixed inset-0 top-[90px] flex flex-col bg-[#F9F6F0]"
    >
      {/* slide track */}
      <div
        ref={trackRef}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
        data-testid="deck-track"
      >
        {/* -------- 01 COVER -------- */}
        <Slide id="cover" n={1} total={TOTAL} testid="deck-slide-cover">
          <div className="grid md:grid-cols-12 gap-8 md:gap-14 items-center">
            <div className="md:col-span-7">
              <p className="overline text-[#5C4E4A] mb-5">
                Confidential · Prepared for BlackRock, Inc.
              </p>
              <h1
                className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[104px] leading-[0.95] tracking-tight text-[#2A1F1D]"
                data-testid="pitch-cover-title"
              >
                A proposal for
                <br />
                <span className="italic text-[#C05A3A]">BlackRock</span>.
              </h1>
              <p className="mt-7 text-xl md:text-2xl font-serif text-[#5C4E4A] max-w-2xl leading-snug">
                On bringing a small, considered piece of Sicily to the
                relationships that matter most to your firm.
              </p>
              <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-sm text-[#5C4E4A]">
                <div>
                  <p className="overline">Prepared by</p>
                  <p className="mt-1 text-[#2A1F1D]">Eva · Founder, Emporio Zeva</p>
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
              <div className="img-wash aspect-[4/5] max-h-[60vh]">
                <img src={IMAGES.product} alt="Not-A-Salami presentation" />
              </div>
              <img
                src={LOGO_URL}
                alt="Emporio Zeva"
                className="h-16 w-auto mt-6 select-none"
                draggable="false"
              />
            </div>
          </div>
        </Slide>

        {/* -------- 02 LETTER -------- */}
        <Slide id="brief" n={2} total={TOTAL} testid="deck-slide-brief">
          <div className="grid md:grid-cols-12 gap-10 md:gap-16">
            <div className="md:col-span-4">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
                A short letter,
                <br />
                <span className="italic text-[#C05A3A]">before the pitch.</span>
              </h2>
            </div>
            <div className="md:col-span-7 md:col-start-6 space-y-4 text-base md:text-lg text-[#2A1F1D] leading-relaxed">
              <p>Dear BlackRock,</p>
              <p>
                BlackRock has spent four decades convincing the world that quiet
                stewardship outperforms noise. The same is true of a good gift.
              </p>
              <p>
                I'm Eva. I came to San Francisco from Sicily with my children, a
                suitcase, and my grandmother Margherita's recipe for cocoa
                salami — a sliceable confection that looks like cured meat and
                is entirely chocolate. We sell it under the name{" "}
                <em>Not-A-Salami</em>.
              </p>
              <p>
                The firms that gift well are gifting differently now: less
                branded swag, more craft, more story. Not-A-Salami is a moment
                your clients won't forget — and one no one else is sending.
              </p>
              <p>
                This is a short, honest proposal for how Emporio Zeva can
                quietly become BlackRock's corporate-gifting partner.
              </p>
              <p className="font-serif text-2xl italic text-[#C05A3A] pt-2">— Eva</p>
            </div>
          </div>
        </Slide>

        {/* -------- 03 PRODUCT -------- */}
        <Slide id="product" n={3} total={TOTAL} dark testid="deck-slide-product">
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
            <div className="md:col-span-5 img-wash aspect-[4/5] max-h-[65vh]">
              <img src={IMAGES.hero} alt="Sliced Not-A-Salami" />
            </div>
            <div className="md:col-span-7">
              <p className="overline text-[#B9935A]">The product, in one paragraph</p>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-4">
                It looks like salami.
                <br />
                <span className="italic text-[#C05A3A]">It's entirely chocolate.</span>
              </h2>
              <p className="mt-6 text-base md:text-lg text-[#DFD7CA] leading-relaxed max-w-xl">
                A Sicilian Salame al Cioccolato — premium cocoa folded with
                crisp Italian cookie pieces, hand-rolled, wrapped in butcher's
                paper, tied with twine. Sliced at the table. The reveal is the gift.
              </p>
              <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-5">
                {[
                  ["Weight", "300g"],
                  ["Serves", "8–10"],
                  ["Shelf life", "14 days"],
                  ["Made in", "San Francisco"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="overline text-[#B9935A]">{k}</dt>
                    <dd className="font-serif text-2xl text-[#F9F6F0] mt-1">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Slide>

        {/* -------- 04 USE CASES -------- */}
        <Slide id="fit" n={4} total={TOTAL} testid="deck-slide-fit">
          <div className="grid md:grid-cols-12 gap-10 md:gap-12">
            <div className="md:col-span-4">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
                Why it
                <br />
                <span className="italic text-[#C05A3A]">fits BlackRock.</span>
              </h2>
              <p className="mt-5 text-[#5C4E4A] leading-relaxed">
                Four moments where Not-A-Salami earns its place on a BlackRock table.
              </p>
            </div>
            <div className="md:col-span-8 grid sm:grid-cols-2 gap-5">
              {useCases.map((u, i) => (
                <div
                  key={u.title}
                  data-testid={`pitch-usecase-${i}`}
                  className="border border-[#DFD7CA] bg-[#F9F6F0] p-6"
                >
                  <p className="overline text-[#5C4E4A]">Use case · 0{i + 1}</p>
                  <h3 className="font-serif text-2xl mt-2 text-[#2A1F1D]">{u.title}</h3>
                  <p className="text-sm text-[#5C4E4A] mt-3 leading-relaxed">{u.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* -------- 05 CO-BRANDING -------- */}
        <Slide id="cobrand" n={5} total={TOTAL} testid="deck-slide-cobrand">
          <div className="grid md:grid-cols-12 gap-10 md:gap-14 items-center">
            <div className="md:col-span-6">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
                Co-branded,
                <br />
                <span className="italic text-[#C05A3A]">without screaming.</span>
              </h2>
              <p className="mt-5 text-[#5C4E4A] leading-relaxed max-w-xl">
                We don't print logos on food. We add your monogram where it
                belongs — wax seal, the inside of the wrap, the serving card —
                so the gift still feels like a gift, not branded merch.
              </p>
              <ul className="mt-7 space-y-3 max-w-md">
                {[
                  "Custom wax seal with BlackRock monogram",
                  "Co-printed butcher paper, single-color heritage palette",
                  "Engraved olive-wood board (board only; food untouched)",
                  "Letterpress serving card with your dedication",
                  "Inner band with chairman's note",
                ].map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start text-[#2A1F1D]"
                    data-testid={`pitch-cobrand-item-${i}`}
                  >
                    <Check size={18} className="text-[#C05A3A] mt-1 flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-sm md:text-base">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-6 grid grid-cols-2 gap-4 max-h-[65vh]">
              <div className="img-wash aspect-[4/5]">
                <img src={IMAGES.gift} alt="Gift presentation" />
              </div>
              <div className="img-wash aspect-[4/5] translate-y-8">
                <img src={IMAGES.product} alt="Product board" />
              </div>
            </div>
          </div>
        </Slide>

        {/* -------- 06 PACKAGES -------- */}
        <Slide id="packages" n={6} total={TOTAL} testid="deck-slide-packages">
          <div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] text-[#2A1F1D] max-w-3xl">
                Three programs.
                <br />
                <span className="italic text-[#C05A3A]">Pick the one that fits.</span>
              </h2>
              <p className="text-sm text-[#5C4E4A] max-w-md">
                Indicative starting points — figures decrease meaningfully past
                100 units. Final quote depends on customization & shipping.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 md:gap-6">
              {packages.map((pkg, i) => (
                <article
                  key={pkg.name}
                  data-testid={`pitch-package-${i}`}
                  className={`border p-6 flex flex-col ${
                    i === 1
                      ? "bg-[#2A1F1D] text-[#F9F6F0] border-[#2A1F1D] md:-translate-y-4"
                      : "border-[#DFD7CA] bg-[#F9F6F0]"
                  }`}
                >
                  {pkg.badge && (
                    <p className="overline text-[#C05A3A] mb-3 text-[10px]">{pkg.badge}</p>
                  )}
                  <p className={`overline text-[10px] ${i === 1 ? "text-[#B9935A]" : "text-[#5C4E4A]"}`}>
                    Program 0{i + 1}
                  </p>
                  <h3
                    className={`font-serif text-2xl md:text-3xl mt-2 leading-tight ${
                      i === 1 ? "text-[#F9F6F0]" : "text-[#2A1F1D]"
                    }`}
                  >
                    {pkg.name}
                  </h3>
                  <p className="mt-3 font-serif text-lg text-[#C05A3A]">{pkg.price}</p>
                  <p className={`overline text-[10px] mt-1 ${i === 1 ? "text-[#B9935A]" : "text-[#5C4E4A]"}`}>
                    {pkg.tier}
                  </p>
                  <p className={`mt-4 text-xs md:text-sm leading-relaxed ${i === 1 ? "text-[#DFD7CA]" : "text-[#5C4E4A]"}`}>
                    {pkg.blurb}
                  </p>
                  <ul className="mt-4 space-y-2 text-xs md:text-sm">
                    {pkg.includes.map((inc) => (
                      <li key={inc} className="flex gap-2 items-start">
                        <span className="text-[#C05A3A]">·</span>
                        <span className={i === 1 ? "text-[#DFD7CA]" : "text-[#5C4E4A]"}>{inc}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`mt-5 pt-4 border-t ${i === 1 ? "border-[#5C4E4A]" : "border-[#DFD7CA]"}`}>
                    <p className={`overline text-[10px] ${i === 1 ? "text-[#B9935A]" : "text-[#5C4E4A]"}`}>
                      Best for
                    </p>
                    <p className={`text-xs mt-1 ${i === 1 ? "text-[#F9F6F0]" : "text-[#2A1F1D]"}`}>
                      {pkg.cta}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Slide>

        {/* -------- 07 LOGISTICS -------- */}
        <Slide id="logistics" n={7} total={TOTAL} testid="deck-slide-logistics">
          <div className="grid md:grid-cols-12 gap-10 md:gap-14">
            <div className="md:col-span-5">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
                Production
                <br />
                <span className="italic text-[#C05A3A]">& logistics.</span>
              </h2>
              <p className="mt-6 text-[#5C4E4A] leading-relaxed max-w-md">
                Small kitchen, serious cadence. For BlackRock we'd block a
                dedicated production window.
              </p>
            </div>

            <div className="md:col-span-7 space-y-5">
              {logistics.map(([k, v], i) => (
                <div
                  key={k}
                  className="grid grid-cols-12 gap-4 pb-4 border-b border-[#DFD7CA]"
                  data-testid={`pitch-logistics-row-${i}`}
                >
                  <p className="overline text-[#C05A3A] col-span-12 sm:col-span-3 pt-1">{k}</p>
                  <p className="col-span-12 sm:col-span-9 text-sm md:text-base text-[#2A1F1D] leading-relaxed">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* -------- 08 WHY US -------- */}
        <Slide id="why-us" n={8} total={TOTAL} dark testid="deck-slide-why-us">
          <div className="grid md:grid-cols-12 gap-10 md:gap-14 items-center">
            <div className="md:col-span-7">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
                You are not buying
                <br />
                <span className="italic text-[#C05A3A]">chocolate.</span>
              </h2>
              <p className="mt-6 text-base md:text-lg text-[#DFD7CA] leading-relaxed max-w-2xl">
                You're buying the moment your senior client unwraps a parcel
                that looks impossibly like cured salame, cuts into it with
                curiosity, and discovers it's chocolate from a Sicilian recipe
                a grandmother named Margherita wrote down by hand.
              </p>
              <p className="mt-4 text-base md:text-lg text-[#DFD7CA] leading-relaxed max-w-2xl">
                That story sits on their counter for two weeks. It gets retold
                at their next dinner. Your firm is in it.
              </p>
              <div className="mt-10 flex items-center gap-6 flex-wrap">
                <img src={SF_MADE_BADGE} alt="SF Made" className="h-14 w-auto" />
                <div className="text-sm text-[#DFD7CA] max-w-xs">
                  <p className="overline text-[#B9935A]">Selected</p>
                  <p className="mt-1">SF Made — Here & Now 2024</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-5 img-wash aspect-[4/5] max-h-[65vh]">
              <img src={IMAGES.founder} alt="Eva, founder" />
            </div>
          </div>
        </Slide>

        {/* -------- 09 NEXT STEPS + FORM -------- */}
        <Slide id="next" n={9} total={TOTAL} testid="deck-slide-next">
          <div className="grid md:grid-cols-12 gap-10 md:gap-12">
            <div className="md:col-span-5">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
                Next steps,
                <br />
                <span className="italic text-[#C05A3A]">should you wish.</span>
              </h2>
              <ol className="mt-8 space-y-5 max-w-md">
                {nextSteps.map(([title, body], i) => (
                  <li key={title} className="flex gap-4" data-testid={`pitch-step-${i}`}>
                    <span className="font-serif text-2xl text-[#C05A3A] leading-none w-8 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-serif text-xl text-[#2A1F1D] leading-tight">{title}</p>
                      <p className="text-xs md:text-sm text-[#5C4E4A] mt-1 leading-relaxed">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 pt-6 border-t border-[#DFD7CA] grid grid-cols-3 gap-3 text-xs">
                <div>
                  <Mail size={14} className="text-[#C05A3A] mb-1" />
                  <p className="overline text-[10px]">Email</p>
                  <p className="text-[#2A1F1D] mt-1">hello@emporiozeva.com</p>
                </div>
                <div>
                  <Phone size={14} className="text-[#C05A3A] mb-1" />
                  <p className="overline text-[10px]">By appointment</p>
                  <p className="text-[#2A1F1D] mt-1">San Francisco</p>
                </div>
                <div>
                  <Calendar size={14} className="text-[#C05A3A] mb-1" />
                  <p className="overline text-[10px]">Lead time</p>
                  <p className="text-[#2A1F1D] mt-1">14–60 days</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <div className="border border-[#DFD7CA] bg-[#F9F6F0] p-6 md:p-8">
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
                          placeholder="you@blackrock.com"
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

      {/* deck controls */}
      <div
        className="shrink-0 border-t border-[#DFD7CA] bg-[#F9F6F0]/95 backdrop-blur-md px-6 md:px-10 py-3 flex items-center justify-between gap-4"
        data-testid="deck-controls"
      >
        <div className="flex items-center gap-5">
          <p className="overline text-[#5C4E4A] hidden sm:block">
            BlackRock Proposal · Prepared by Eva
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
          {/* dots */}
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

          {/* counter */}
          <p
            className="font-serif text-xl text-[#2A1F1D] tabular-nums min-w-[64px] text-center"
            data-testid="deck-counter"
          >
            {String(active + 1).padStart(2, "0")}{" "}
            <span className="text-[#DFD7CA]">/ {String(TOTAL).padStart(2, "0")}</span>
          </p>

          {/* arrows */}
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
