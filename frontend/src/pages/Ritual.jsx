import { RITUAL, IMAGES, FOUNDER_LETTER, BRAND, TAGLINES } from "../content";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MonogramDivider from "../components/MonogramDivider";
import { useReveal } from "../hooks/useReveal";

export default function Ritual() {
  const r1 = useReveal();
  const r2 = useReveal();

  return (
    <div className="pt-[90px]" data-testid="ritual-page">
      {/* HERO */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]">The serving ritual</p>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight mt-5 text-[#2A1F1D] max-w-3xl">
          Sliced.
          <br />
          <span className="italic">Served.</span>{" "}
          Savored.
          <br />
          <span className="italic text-[#C05A3A]">Shared.</span>
        </h1>
        <p className="mt-7 text-lg text-[#5C4E4A] max-w-xl leading-relaxed">
          Not A Salami is meant to be sliced, shared, and savored. Four moments
          — one small ritual, the Italian way.
        </p>
      </section>

      {/* THE FOUR STEPS */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28 reveal" ref={r1}>
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          {RITUAL.map((step, i) => (
            <article
              key={step.key}
              data-testid={`ritual-step-${step.key}`}
              className={`flex flex-col gap-6 ${i % 2 === 1 ? "md:translate-y-20" : ""}`}
            >
              <div className="flex items-baseline gap-6">
                <span className="font-serif text-[80px] md:text-[120px] text-[#C05A3A] leading-none italic">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="overline">Ritual</p>
                  <h2 className="font-serif text-4xl md:text-5xl mt-2 text-[#2A1F1D] leading-tight">
                    {step.title}.
                  </h2>
                </div>
              </div>
              <p className="text-base md:text-lg text-[#5C4E4A] leading-relaxed max-w-md pl-2 border-l border-[#DFD7CA] py-2">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <MonogramDivider className="my-12" />

      {/* PAIRINGS BLOCK */}
      <section className="bg-[#2A1F1D] text-[#F9F6F0] py-20 md:py-28 grain relative">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <p className="overline text-[#B9935A]">Pair it with</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5">
              Coffee. Wine.
              <br />
              <span className="italic text-[#C05A3A]">Fruit. Cheese.</span>
            </h2>
            <p className="mt-7 text-lg text-[#DFD7CA] leading-relaxed max-w-xl">
              Each pairing pulls a different layer forward — espresso heightens
              the cocoa, a glass of red lengthens the finish, fresh fruit
              brightens the biscotti crunch, aged cheese surprises everyone.
            </p>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {["Coffee", "Wine", "Fruit", "Cheese"].map((p, i) => (
                <div key={p} data-testid={`pairing-${p.toLowerCase()}`}>
                  <p className="overline text-[#B9935A]">No 0{i + 1}</p>
                  <p className="font-serif text-2xl text-[#F9F6F0] mt-2">{p}.</p>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-5 img-wash aspect-[4/5]">
            <img src={IMAGES.product} alt="Sliced Not A Salami with espresso" />
          </div>
        </div>
      </section>

      {/* KEEP IT PERFECT */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28 reveal" ref={r2}>
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-5">
            <p className="overline text-[#C05A3A]">Keep it perfect</p>
            <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-5 text-[#2A1F1D]">
              Storage,
              <br />
              <span className="italic text-[#C05A3A]">simply.</span>
            </h2>
          </div>
          <div className="md:col-span-7 space-y-5">
            {[
              ["Store", "Refrigerate. Out of direct sunlight."],
              ["Before serving", "Remove from the fridge 15–20 minutes before slicing."],
              ["Shelf life", "8 weeks unopened. Best enjoyed within 2 weeks of opening."],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-12 gap-4 pb-4 border-b border-[#DFD7CA]">
                <p className="overline text-[#C05A3A] col-span-12 sm:col-span-3 pt-1">{k}</p>
                <p className="col-span-12 sm:col-span-9 text-[#2A1F1D] leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 text-center">
        <p className="overline text-[#C05A3A]">{TAGLINES.secondary}</p>
        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5 text-[#2A1F1D] max-w-3xl mx-auto">
          {FOUNDER_LETTER[2]}
        </h2>
        <p className="font-serif text-2xl italic text-[#C05A3A] mt-8">
          Buon Appetito, <span className="not-italic text-[#2A1F1D]">— {BRAND.founder}</span>
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link to="/collection" className="btn-primary" data-testid="ritual-shop-cta">
            Explore the Collection <ArrowRight size={14} />
          </Link>
          <Link to="/our-story" className="btn-outline" data-testid="ritual-story-cta">
            Read our story
          </Link>
        </div>
        <MonogramDivider className="mt-16" />
      </section>
    </div>
  );
}
