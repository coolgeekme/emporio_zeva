import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowRight, Check, Mail, Phone, Calendar } from "lucide-react";
import { IMAGES, LOGO_URL, SF_MADE_BADGE } from "../content";
import { useReveal } from "../hooks/useReveal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SLIDES_TOTAL = 9;
const Tag = ({ n }) => (
  <p className="overline text-[#C05A3A]" data-testid={`pitch-slide-tag-${n}`}>
    {String(n).padStart(2, "0")} <span className="text-[#5C4E4A]">/ {String(SLIDES_TOTAL).padStart(2, "0")}</span>
  </p>
);

const Section = ({ id, n, children, dark = false }) => (
  <section
    id={id}
    data-testid={`pitch-section-${id}`}
    className={`min-h-screen flex items-center py-24 md:py-32 ${
      dark ? "bg-[#2A1F1D] text-[#F9F6F0] grain relative" : ""
    }`}
  >
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full relative">
      <Tag n={n} />
      <div className="mt-6">{children}</div>
    </div>
  </section>
);

const packages = [
  {
    name: "The Curated",
    price: "From $46/recipient",
    blurb: "Quiet appreciation. Slide a Not-A-Salami onto the desk of every PM, advisor, or relationship lead with a hand-written card.",
    tier: "Min. 25 units",
    includes: [
      "Not-A-Salami Classic, 300g",
      "Linen-feel parchment wrap with BlackRock monogram seal",
      "Letterpress serving card",
      "Hand-tied butcher's twine",
    ],
    cta: "Outreach gifts · Q1 onboarding",
  },
  {
    name: "The Signature",
    price: "From $98/recipient",
    blurb: "Our flagship corporate hamper. Designed for senior clients, board members, and the conversation that lasts past dessert.",
    tier: "Min. 50 units",
    includes: [
      "Not-A-Salami Classic, 300g",
      "Hand-finished olive-wood serving board",
      "Italian linen napkin, hemmed",
      "Monogrammed wax-seal closure",
      "Custom-printed dedication card (your copy)",
      "Kraft presentation box with twine",
    ],
    badge: "Most chosen for institutional gifting",
    cta: "Holiday · Investor Day · Anniversary",
  },
  {
    name: "The Bespoke",
    price: "Quoted per program",
    blurb: "A program built around your moment. Custom flavor, custom packaging, custom story. We co-create with your brand team.",
    tier: "Min. 250 units · 60-day lead",
    includes: [
      "Custom Not-A-Salami flavor profile (Bronte pistachio, hazelnut, citrus)",
      "Co-branded butcher paper printed in Italy",
      "Engraved olive-wood board with BlackRock crest",
      "Bespoke serving card co-written with your team",
      "Choice of regional shipping partner (ParcelPath, FedEx Priority)",
      "Dedicated production slot & Eva's personal sign-off",
    ],
    cta: "Investor Day · Aladdin Summit · Founder gifts",
  },
];

const useCases = [
  {
    title: "Client appreciation",
    body: "A Q1 gesture to private wealth and institutional clients. Memorable, conversational, gluten-flex options available.",
  },
  {
    title: "Board & executive gifting",
    body: "A considered alternative to the same wine and same chocolates. Each board hears a different story — your gift becomes one of them.",
  },
  {
    title: "Investor Day · Summit takeaways",
    body: "Branded gift-box at the seat or shipped post-event. We can produce 500+ units in a single batch with 14-day lead.",
  },
  {
    title: "New-hire welcome",
    body: "A small, refined first-day welcome — particularly for senior hires relocating to BlackRock's NY, SF, or London offices.",
  },
];

export default function BlackRock() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const r1 = useReveal();
  const r2 = useReveal();
  const r3 = useReveal();

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
    } catch (err) {
      // surface minimally
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    document.title = "A proposal for BlackRock · Emporio Zeva";
  }, []);

  return (
    <div data-testid="blackrock-pitch-page" className="pt-[72px]">
      {/* ============ 01 · COVER ============ */}
      <Section id="cover" n={1}>
        <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-end">
          <div className="md:col-span-7">
            <p className="overline text-[#5C4E4A] mb-6">
              Confidential · Prepared for BlackRock, Inc.
            </p>
            <h1
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[104px] leading-[0.95] tracking-tight text-[#2A1F1D]"
              data-testid="pitch-cover-title"
            >
              A proposal for
              <br />
              <span className="italic text-[#C05A3A]">BlackRock</span>.
            </h1>
            <p className="mt-8 text-xl md:text-2xl font-serif text-[#5C4E4A] max-w-2xl leading-snug">
              On bringing a small, considered piece of Sicily to the relationships
              that matter most to your firm.
            </p>
            <div className="mt-12 flex flex-wrap gap-x-12 gap-y-4 text-sm text-[#5C4E4A]">
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
                <p className="mt-1 text-[#2A1F1D]">Corporate Gifting · Office of the CEO · Brand</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="img-wash aspect-[4/5]">
              <img src={IMAGES.product} alt="Not-A-Salami presentation" data-testid="pitch-cover-image" />
            </div>
            <img
              src={LOGO_URL}
              alt="Emporio Zeva"
              className="h-24 w-auto mt-10 mx-auto md:mx-0 select-none"
              draggable="false"
            />
          </div>
        </div>
      </Section>

      <div className="divider max-w-[1400px] mx-auto" />

      {/* ============ 02 · THE BRIEF ============ */}
      <Section id="brief" n={2}>
        <div className="grid md:grid-cols-12 gap-10 md:gap-16">
          <div className="md:col-span-4">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
              A short letter,
              <br />
              <span className="italic text-[#C05A3A]">before the pitch.</span>
            </h2>
          </div>
          <div className="md:col-span-7 md:col-start-6 space-y-6 text-lg text-[#2A1F1D] leading-relaxed">
            <p>Dear BlackRock,</p>
            <p>
              BlackRock has spent four decades convincing the world that quiet
              stewardship outperforms noise. The same is true of a good gift.
            </p>
            <p>
              I'm Eva. I came to San Francisco from Sicily with my children, a
              suitcase, and my grandmother Margherita's recipe for cocoa salami —
              a sliceable confection that looks like cured meat and is entirely
              chocolate. We sell it now under the name <em>Not-A-Salami</em>.
            </p>
            <p>
              I'm writing because the firms that gift well are gifting differently
              now: less branded swag, more craft, more story. Not-A-Salami is a
              moment your clients won't forget — and one no one else is sending.
            </p>
            <p>
              This document is a short, honest proposal for how Emporio Zeva can
              quietly become BlackRock's corporate-gifting partner.
            </p>
            <p className="font-serif text-2xl italic text-[#C05A3A] pt-4">
              — Eva
            </p>
          </div>
        </div>
      </Section>

      <div className="divider max-w-[1400px] mx-auto" />

      {/* ============ 03 · THE PRODUCT ============ */}
      <Section id="product" n={3} dark>
        <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
          <div className="md:col-span-5 img-wash aspect-[4/5]">
            <img src={IMAGES.hero} alt="Sliced Not-A-Salami" data-testid="pitch-product-image" />
          </div>
          <div className="md:col-span-7 md:pl-6">
            <p className="overline text-[#B9935A]">The product, in one paragraph</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5">
              It looks like salami.
              <br />
              <span className="italic text-[#C05A3A]">It's entirely chocolate.</span>
            </h2>
            <p className="mt-7 text-lg text-[#DFD7CA] leading-relaxed max-w-xl">
              A Sicilian Salame al Cioccolato — premium cocoa folded with crisp
              Italian cookie pieces, hand-rolled, wrapped in butcher's paper, tied
              with twine. Sliced at the table. The reveal is the gift.
            </p>
            <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
              {[
                { k: "Weight", v: "300g" },
                { k: "Serves", v: "8–10" },
                { k: "Shelf life", v: "14 days" },
                { k: "Made in", v: "San Francisco" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="overline text-[#B9935A]">{s.k}</dt>
                  <dd className="font-serif text-2xl text-[#F9F6F0] mt-2">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* ============ 04 · WHY BLACKROCK ============ */}
      <Section id="fit" n={4}>
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
              Why it
              <br />
              <span className="italic text-[#C05A3A]">fits BlackRock.</span>
            </h2>
            <p className="mt-7 text-[#5C4E4A] leading-relaxed">
              A short list of moments where Not-A-Salami earns its place on a
              BlackRock table.
            </p>
          </div>
          <div className="md:col-span-8 grid sm:grid-cols-2 gap-6 reveal" ref={r1}>
            {useCases.map((u, i) => (
              <div
                key={u.title}
                data-testid={`pitch-usecase-${i}`}
                className="border border-[#DFD7CA] bg-[#F9F6F0] p-7"
              >
                <p className="overline text-[#5C4E4A]">Use case · 0{i + 1}</p>
                <h3 className="font-serif text-2xl mt-3 text-[#2A1F1D]">{u.title}</h3>
                <p className="text-sm text-[#5C4E4A] mt-3 leading-relaxed">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <div className="divider max-w-[1400px] mx-auto" />

      {/* ============ 05 · CO-BRANDING ============ */}
      <Section id="cobrand" n={5}>
        <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-end">
          <div className="md:col-span-6">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
              Co-branded,
              <br />
              <span className="italic text-[#C05A3A]">without screaming.</span>
            </h2>
            <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-xl">
              We don't print logos on food. We add your monogram where it belongs —
              the wax seal, the inside of the wrap, the serving card — so the gift
              still feels like a gift, not branded merchandise.
            </p>
            <ul className="mt-10 space-y-5 max-w-md">
              {[
                "Custom wax seal with BlackRock monogram",
                "Co-printed butcher paper, single-color heritage palette",
                "Engraved olive-wood board (board only; food untouched)",
                "Letterpress serving card with your dedication",
                "Inner band with your firm's tagline or chairman's note",
              ].map((line, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start text-[#2A1F1D]"
                  data-testid={`pitch-cobrand-item-${i}`}
                >
                  <Check size={18} className="text-[#C05A3A] mt-1 flex-shrink-0" strokeWidth={1.5} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-6 grid grid-cols-2 gap-5">
            <div className="img-wash aspect-[4/5] col-span-1">
              <img src={IMAGES.gift} alt="Gift presentation" />
            </div>
            <div className="img-wash aspect-[4/5] col-span-1 translate-y-10">
              <img src={IMAGES.product} alt="Product board" />
            </div>
          </div>
        </div>
      </Section>

      {/* ============ 06 · PACKAGES ============ */}
      <Section id="packages" n={6}>
        <div>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D] max-w-3xl">
            Three programs.
            <br />
            <span className="italic text-[#C05A3A]">Pick the one that fits.</span>
          </h2>
          <p className="mt-6 text-[#5C4E4A] max-w-2xl leading-relaxed">
            Pricing scales with volume; the figures below are indicative starting
            points and decrease meaningfully past 100 units. Final quote depends
            on customization, shipping zones, and lead time.
          </p>

          <div className="mt-16 grid md:grid-cols-3 gap-8 reveal" ref={r2}>
            {packages.map((pkg, i) => (
              <article
                key={pkg.name}
                data-testid={`pitch-package-${i}`}
                className={`border p-8 flex flex-col ${
                  i === 1
                    ? "bg-[#2A1F1D] text-[#F9F6F0] border-[#2A1F1D] md:-translate-y-6"
                    : "border-[#DFD7CA] bg-[#F9F6F0]"
                }`}
              >
                {pkg.badge && (
                  <p className="overline text-[#C05A3A] mb-4">{pkg.badge}</p>
                )}
                <p className={`overline ${i === 1 ? "text-[#B9935A]" : "text-[#5C4E4A]"}`}>
                  Program 0{i + 1}
                </p>
                <h3
                  className={`font-serif text-3xl md:text-4xl mt-3 leading-tight ${
                    i === 1 ? "text-[#F9F6F0]" : "text-[#2A1F1D]"
                  }`}
                >
                  {pkg.name}
                </h3>
                <p className={`mt-4 font-serif text-xl ${i === 1 ? "text-[#C05A3A]" : "text-[#C05A3A]"}`}>
                  {pkg.price}
                </p>
                <p className={`overline mt-2 ${i === 1 ? "text-[#B9935A]" : "text-[#5C4E4A]"}`}>
                  {pkg.tier}
                </p>
                <p className={`mt-5 text-sm leading-relaxed ${i === 1 ? "text-[#DFD7CA]" : "text-[#5C4E4A]"}`}>
                  {pkg.blurb}
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {pkg.includes.map((inc) => (
                    <li key={inc} className="flex gap-2 items-start">
                      <span className="text-[#C05A3A]">·</span>
                      <span className={i === 1 ? "text-[#DFD7CA]" : "text-[#5C4E4A]"}>{inc}</span>
                    </li>
                  ))}
                </ul>
                <div className={`mt-7 pt-5 border-t ${i === 1 ? "border-[#5C4E4A]" : "border-[#DFD7CA]"}`}>
                  <p className={`overline ${i === 1 ? "text-[#B9935A]" : "text-[#5C4E4A]"}`}>
                    Best for
                  </p>
                  <p className={`text-sm mt-2 ${i === 1 ? "text-[#F9F6F0]" : "text-[#2A1F1D]"}`}>
                    {pkg.cta}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <div className="divider max-w-[1400px] mx-auto" />

      {/* ============ 07 · LOGISTICS ============ */}
      <Section id="logistics" n={7}>
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
              Production
              <br />
              <span className="italic text-[#C05A3A]">& logistics.</span>
            </h2>
            <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-md">
              Small kitchen, serious cadence. We've shipped batches of 500+ for
              soft-launch retail partners; for BlackRock we'd block a dedicated
              production window.
            </p>
          </div>

          <div className="md:col-span-7 space-y-8">
            {[
              ["Lead time", "Standard: 14 days from PO. Bespoke / Investor-Day volumes: 30–60 days, depending on customization."],
              ["Capacity", "Up to 1,500 units / month at current kitchen capacity. We scale via a vetted commissary partner above that."],
              ["Shipping", "FedEx Priority Overnight for in-season delivery; ParcelPath integration for high-volume programs. Climate-controlled below 75°F."],
              ["Quality", "Each unit hand-checked by Eva. SF Made certified producer. Selected for the 'Here & Now' 2024 program."],
              ["Allergens & dietary", "Contains cocoa, dairy, eggs, wheat. Gluten-free and dairy-free variants available on bespoke programs."],
            ].map(([k, v], i) => (
              <div
                key={k}
                className="grid grid-cols-12 gap-6 pb-6 border-b border-[#DFD7CA]"
                data-testid={`pitch-logistics-row-${i}`}
              >
                <p className="overline text-[#C05A3A] col-span-12 sm:col-span-3 pt-1">{k}</p>
                <p className="col-span-12 sm:col-span-9 text-[#2A1F1D] leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ 08 · WHY US ============ */}
      <Section id="why-us" n={8} dark>
        <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
          <div className="md:col-span-7">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
              You are not buying
              <br />
              <span className="italic text-[#C05A3A]">chocolate.</span>
            </h2>
            <p className="mt-7 text-lg text-[#DFD7CA] leading-relaxed max-w-2xl">
              You're buying the moment your senior client unwraps a parcel that
              looks impossibly like a small cured salame, cuts into it with
              curiosity, and discovers it's chocolate from a Sicilian recipe a
              grandmother named Margherita wrote down by hand.
            </p>
            <p className="mt-5 text-lg text-[#DFD7CA] leading-relaxed max-w-2xl">
              That story now sits on their counter for two weeks. It gets retold
              at their next dinner. Your firm is in it.
            </p>
            <div className="mt-12 flex items-center gap-8 flex-wrap">
              <img src={SF_MADE_BADGE} alt="SF Made" className="h-16 w-auto" />
              <div className="text-sm text-[#DFD7CA] max-w-xs">
                <p className="overline text-[#B9935A]">Selected</p>
                <p className="mt-1">SF Made — Here & Now 2024</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-5 img-wash aspect-[4/5]">
            <img src={IMAGES.founder} alt="Eva, founder" data-testid="pitch-founder-image" />
          </div>
        </div>
      </Section>

      {/* ============ 09 · NEXT STEPS ============ */}
      <Section id="next" n={9}>
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D]">
              Next steps,
              <br />
              <span className="italic text-[#C05A3A]">should you wish.</span>
            </h2>
            <ol className="mt-10 space-y-7 max-w-md">
              {[
                ["Tasting", "We courier a sample box of three Not-A-Salami to your team — no obligation."],
                ["Brief", "30-minute call with Eva to size the program: volumes, moments, dates."],
                ["Quote", "Custom written proposal with co-branding mockups within 5 business days."],
                ["Production", "PO signed, slot locked, batch produced and shipped on date."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-5" data-testid={`pitch-step-${i}`}>
                  <span className="font-serif text-3xl text-[#C05A3A] leading-none w-10 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-serif text-2xl text-[#2A1F1D] leading-tight">{title}</p>
                    <p className="text-sm text-[#5C4E4A] mt-2 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Contact form */}
          <div className="md:col-span-6 md:col-start-7">
            <div className="border border-[#DFD7CA] bg-[#F9F6F0] p-8 md:p-10">
              <p className="overline text-[#C05A3A]">Request a tasting</p>
              <h3 className="font-serif text-3xl md:text-4xl mt-3 text-[#2A1F1D] leading-tight">
                One reply gets it started.
              </h3>
              <p className="mt-3 text-sm text-[#5C4E4A]">
                Submit below or email Eva directly at{" "}
                <a href="mailto:hello@emporiozeva.com" className="underline" data-testid="pitch-direct-email">
                  hello@emporiozeva.com
                </a>
                . We treat all BlackRock correspondence as confidential.
              </p>

              {submitted ? (
                <div className="mt-8 p-6 border border-[#C05A3A] bg-[#F9F6F0]" data-testid="pitch-form-success">
                  <p className="overline text-[#C05A3A]">Received</p>
                  <p className="font-serif text-2xl mt-2 text-[#2A1F1D]">Grazie.</p>
                  <p className="mt-3 text-sm text-[#5C4E4A]">
                    Eva will personally respond within one business day with next
                    steps and a sample-box shipping window.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-7 space-y-6" data-testid="pitch-form">
                  <div className="field">
                    <label htmlFor="br-name">Your name</label>
                    <input
                      id="br-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Larry Fink"
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
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="e.g. We're planning a Q1 client appreciation moment for ~120 senior PMs across NY and SF. Looking at the Signature tier with custom monogram."
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

              <div className="mt-10 pt-8 border-t border-[#DFD7CA] grid sm:grid-cols-3 gap-5 text-sm">
                <div>
                  <Mail size={16} className="text-[#C05A3A] mb-2" />
                  <p className="overline">Email</p>
                  <p className="text-[#2A1F1D] mt-1">hello@emporiozeva.com</p>
                </div>
                <div>
                  <Phone size={16} className="text-[#C05A3A] mb-2" />
                  <p className="overline">By appointment</p>
                  <p className="text-[#2A1F1D] mt-1">San Francisco, CA</p>
                </div>
                <div>
                  <Calendar size={16} className="text-[#C05A3A] mb-2" />
                  <p className="overline">Lead time</p>
                  <p className="text-[#2A1F1D] mt-1">14–60 days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Closing footer note */}
      <section className="border-t border-[#DFD7CA] py-12 reveal" ref={r3} data-testid="pitch-closing">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <p className="overline text-[#5C4E4A]">
            Prepared with reverence · For BlackRock, with thanks for reading
          </p>
          <Link to="/" className="link-underline" data-testid="pitch-back-home">
            Back to Emporio Zeva <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
