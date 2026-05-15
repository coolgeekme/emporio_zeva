import { IMAGES, SF_MADE_BADGE, FOUNDER_LETTER, BRAND, TAGLINES } from "../content";
import { useReveal } from "../hooks/useReveal";
import { Link } from "react-router-dom";
import MonogramDivider from "../components/MonogramDivider";

export default function OurStory() {
  const r1 = useReveal();
  const r2 = useReveal();
  const r3 = useReveal();

  return (
    <div className="pt-[90px]" data-testid="our-story-page">
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-20 md:pb-28 grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
        <div className="md:col-span-7">
          <p className="overline text-[#C05A3A]">{TAGLINES.italian_tradition}</p>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-[88px] leading-[1.02] tracking-tight mt-6 text-[#2A1F1D]">
            A Sicilian
            <br />
            <span className="italic text-[#C05A3A]">tradition.</span>
          </h1>
        </div>
        <div className="md:col-span-5 md:pl-10">
          <p className="text-[#5C4E4A] leading-relaxed">
            Returning to my roots, I reconnected with my grandmother's recipe and
            the chocolate tradition of <span className="text-[#2A1F1D] font-semibold">Modica, Sicily</span> —
            brought together in a confection designed to surprise, to be sliced and shared.
          </p>
        </div>
      </section>

      {/* Founder image full-bleed-ish */}
      <section className="reveal" ref={r1}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="img-wash aspect-[16/9] md:aspect-[21/9]">
            <img src={IMAGES.founder} alt="Eva, founder of Emporio Zeva" data-testid="story-founder-image" />
          </div>
          <p className="overline text-[#5C4E4A] mt-4">
            {BRAND.founder} · Founder · From Sicily, with seriousness
          </p>
        </div>
      </section>

      {/* Long-form letter from Eva */}
      <section
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 reveal"
        ref={r2}
        data-testid="story-body"
      >
        <aside className="md:col-span-3">
          <p className="overline text-[#C05A3A]">A letter from</p>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mt-3 text-[#2A1F1D]">
            Eva,
            <br />
            <span className="italic text-[#C05A3A]">founder.</span>
          </h2>
        </aside>
        <div className="md:col-span-9 space-y-6 text-lg text-[#2A1F1D] leading-relaxed max-w-3xl">
          {FOUNDER_LETTER.map((para, i) => (
            <p key={i} className={i === 1 ? "font-serif text-2xl md:text-3xl leading-[1.25] py-4 italic" : ""}>
              {para}
            </p>
          ))}
          <p className="font-serif text-2xl italic text-[#C05A3A] pt-2">
            Buon Appetito, <br />
            <span className="not-italic text-[#2A1F1D]">— Eva</span>
          </p>
        </div>
      </section>

      {/* Interlocking images */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-12 gap-8 reveal" ref={r3}>
        <div className="md:col-span-7 img-wash aspect-[4/3]">
          <img src={IMAGES.sicily} alt="Modica, Sicily — view of the town" data-testid="story-sicily-image" />
        </div>
        <div className="md:col-span-5 img-wash aspect-[4/5] md:translate-y-16">
          <img src={IMAGES.italian_moment} alt="Italian moment, espresso ritual" data-testid="story-italian-moment-image" />
        </div>
      </section>

      {/* Closing */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-32 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-8 md:col-start-3 text-center">
          <p className="overline text-[#C05A3A]">A modern ritual</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5 text-[#2A1F1D]">
            Everything is produced in small batches in California
            <br />
            <span className="italic text-[#C05A3A]">with a hands-on approach.</span>
          </h2>
          <p className="mt-8 text-[#5C4E4A] leading-relaxed max-w-2xl mx-auto">
            Italian tradition, crafted in California. Unexpected in appearance yet deeply nostalgic at heart — meant to create a moment of surprise, sharing, and conversation.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link to="/collection" data-testid="story-shop-cta" className="btn-primary">
              Explore the Collection
            </Link>
            <Link to="/ritual" data-testid="story-ritual-cta" className="btn-outline">
              The serving ritual
            </Link>
            <img src={SF_MADE_BADGE} alt="SF Made" className="h-14 w-auto" />
          </div>
          <MonogramDivider className="mt-16" />
        </div>
      </section>
    </div>
  );
}
