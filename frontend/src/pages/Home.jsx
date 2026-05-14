import { Link } from "react-router-dom";
import { ArrowRight, Coffee, Scissors, Hand } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { TESTIMONIALS, JOURNAL, PRESS, IMAGES, SF_MADE_BADGE } from "../content";
import { useReveal } from "../hooks/useReveal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
  const [products, setProducts] = useState([]);
  const r1 = useReveal();
  const r2 = useReveal();
  const r3 = useReveal();
  const r4 = useReveal();
  const r5 = useReveal();

  useEffect(() => {
    axios.get(`${API}/products`).then((res) => setProducts(res.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* ============== HERO ============== */}
      <section className="pt-[72px] relative" data-testid="hero-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-20 grid md:grid-cols-12 gap-10 md:gap-12 items-end">
          <div className="md:col-span-6 md:pr-8">
            <p className="overline text-[#C05A3A]" data-testid="hero-overline">
              Sicilian Cocoa Confection · Est. SF
            </p>
            <h1 className="font-serif text-[44px] leading-[1.02] sm:text-6xl md:text-7xl lg:text-[88px] tracking-tight mt-6 text-[#2A1F1D]">
              Born in <span className="italic text-[#C05A3A]">Sicily</span>.
              <br />
              Served in slices.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-[#5C4E4A] max-w-md leading-relaxed">
              A sliceable cocoa confection that looks like cured salumi and
              tastes like Grandma Margherita's kitchen. Hand-rolled in San Francisco,
              no meat involved — only cocoa, cookie, and ritual.
            </p>
            <div className="mt-10 flex flex-wrap gap-4" data-testid="hero-ctas">
              <Link to="/collection" className="btn-primary" data-testid="hero-shop-cta">
                Explore the Collection <ArrowRight size={14} />
              </Link>
              <Link to="/our-story" className="btn-outline" data-testid="hero-story-cta">
                Read our story
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-5">
              <img
                src={SF_MADE_BADGE}
                alt="SF Made — Here and Now 2024"
                className="h-14 w-auto"
                data-testid="hero-sfmade-badge"
              />
              <p className="text-xs text-[#5C4E4A] max-w-[240px] leading-relaxed">
                Selected by <span className="text-[#2A1F1D] font-semibold">SF Made</span> for the
                Here & Now 2024 event.
              </p>
            </div>
          </div>

          <div className="md:col-span-6 relative">
            <div className="img-wash aspect-[4/5] md:aspect-[5/6] relative overflow-hidden">
              <img
                src={IMAGES.hero}
                alt="Sliced cocoa salami on a wooden board"
                data-testid="hero-image"
                className="grayscale-0"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 md:-left-10 bg-[#F9F6F0] border border-[#DFD7CA] py-5 px-6 max-w-[220px]">
              <p className="overline text-[#C05A3A]">No 01 · Cocoa Classic</p>
              <p className="font-serif text-2xl mt-2 leading-tight text-[#2A1F1D]">
                Slice thin. <br />Share generously.
              </p>
            </div>
          </div>
        </div>

        {/* marquee strip */}
        <div className="border-y border-[#DFD7CA] bg-[#EAE4D9]/40 py-5 overflow-hidden">
          <div className="marquee-track">
            {[...PRESS, ...PRESS].map((p, i) => (
              <span
                key={i}
                className="overline text-[#5C4E4A] flex items-center gap-12"
              >
                {p}
                <span className="text-[#C05A3A]">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== THE ILLUSION ============== */}
      <section
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32 grid md:grid-cols-12 gap-12 items-center reveal"
        ref={r1}
        data-testid="illusion-section"
      >
        <div className="md:col-span-6 md:order-2">
          <p className="overline text-[#C05A3A]">The wink, on the table</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5 text-[#2A1F1D]">
            It looks like salami.
            <br />
            It is <span className="italic text-[#C05A3A]">entirely</span> chocolate.
          </h2>
          <p className="mt-7 text-lg text-[#5C4E4A] leading-relaxed max-w-lg">
            Wrapped in butcher paper and tied with twine. Cut at the table.
            The reveal — that rich cocoa interior speckled with crisp cookie
            shards — is part of the dessert.
          </p>
          <div className="mt-8 divider" />
          <dl className="mt-8 grid grid-cols-3 gap-6">
            <div>
              <dt className="overline">Texture</dt>
              <dd className="font-serif text-2xl mt-2 text-[#2A1F1D]">Firm. Tender.</dd>
            </div>
            <div>
              <dt className="overline">Pairing</dt>
              <dd className="font-serif text-2xl mt-2 text-[#2A1F1D]">Espresso.</dd>
            </div>
            <div>
              <dt className="overline">Serves</dt>
              <dd className="font-serif text-2xl mt-2 text-[#2A1F1D]">8–10.</dd>
            </div>
          </dl>
        </div>
        <div className="md:col-span-6 md:order-1">
          <div className="img-wash aspect-[5/6]">
            <img src={IMAGES.product} alt="Not-A-Salami on a wood board" data-testid="illusion-image" />
          </div>
        </div>
      </section>

      {/* ============== COLLECTION TEASER ============== */}
      <section
        className="bg-[#EAE4D9]/50 py-24 md:py-32 reveal"
        ref={r2}
        data-testid="collection-teaser-section"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <p className="overline text-[#C05A3A]">The Collection</p>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight mt-4 text-[#2A1F1D] max-w-xl leading-[1.05]">
                A small house. A few honest things.
              </h2>
            </div>
            <Link to="/collection" data-testid="collection-teaser-cta" className="link-underline">
              See everything <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-16 grid md:grid-cols-12 gap-8 md:gap-10">
            {products.slice(0, 3).map((p, i) => (
              <Link
                key={p.id}
                to={`/products/${p.slug}`}
                data-testid={`collection-teaser-card-${p.slug}`}
                className={`group block ${
                  i === 0
                    ? "md:col-span-6 md:row-span-2"
                    : "md:col-span-6"
                }`}
              >
                <div className={`img-wash ${i === 0 ? "aspect-[4/5]" : "aspect-[4/3]"}`}>
                  <img src={p.images[0]} alt={p.name} />
                </div>
                <div className="mt-5 flex items-start justify-between gap-6">
                  <div>
                    {p.badge && <p className="overline text-[#C05A3A]">{p.badge}</p>}
                    <h3 className="font-serif text-2xl md:text-3xl mt-2 text-[#2A1F1D] group-hover:text-[#C05A3A] transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-sm text-[#5C4E4A] mt-2 max-w-md">{p.tagline}</p>
                  </div>
                  <p className="font-serif text-xl text-[#2A1F1D] whitespace-nowrap pt-2">{p.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============== RITUAL ============== */}
      <section
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32 reveal"
        ref={r3}
        data-testid="ritual-section"
      >
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <p className="overline text-[#C05A3A]">A moment, the Italian way</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5 text-[#2A1F1D]">
              One slice.
              <br />
              <span className="italic">One cup.</span>
              <br />
              One pause.
            </h2>
            <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-md">
              In Sicily, Salame al Cioccolato is a table ritual — sliced thin and
              passed alongside espresso, after a long lunch. We've changed nothing
              of the gesture, only the place.
            </p>
          </div>
          <div className="md:col-span-7 grid sm:grid-cols-3 gap-6">
            {[
              { icon: Scissors, title: "Slice", body: "Rounds 4–6mm, with a warmed knife." },
              { icon: Coffee, title: "Pair", body: "Espresso, cappuccino, Vin Santo." },
              { icon: Hand, title: "Share", body: "Pass the board. Don't rush." },
            ].map((step, i) => (
              <div
                key={i}
                className="border border-[#DFD7CA] p-7 bg-[#F9F6F0] flex flex-col gap-5"
                data-testid={`ritual-step-${step.title.toLowerCase()}`}
              >
                <step.icon size={28} className="text-[#C05A3A]" strokeWidth={1.2} />
                <div>
                  <p className="overline">No 0{i + 1}</p>
                  <h3 className="font-serif text-3xl mt-2 text-[#2A1F1D]">{step.title}</h3>
                  <p className="text-sm text-[#5C4E4A] mt-3 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== TESTIMONIALS ============== */}
      <section
        className="bg-[#2A1F1D] text-[#F9F6F0] py-24 md:py-32 relative grain reveal"
        ref={r4}
        data-testid="testimonials-section"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
          <p className="overline text-[#B9935A]">What people say</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5 max-w-3xl">
            The smile, the moment they realise
            <span className="italic text-[#C05A3A]"> — there is no meat.</span>
          </h2>

          <div className="mt-16 grid md:grid-cols-2 gap-y-14 gap-x-16">
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} data-testid={`testimonial-${i}`} className="border-l border-[#5C4E4A] pl-7">
                <blockquote className="font-serif text-xl md:text-2xl leading-snug text-[#F9F6F0]">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="text-[#C05A3A] text-lg">—</span>
                  <div>
                    <p className="text-sm tracking-wide">{t.name}</p>
                    <p className="overline text-[#B9935A]">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============== JOURNAL TEASER ============== */}
      <section
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32 reveal"
        ref={r5}
        data-testid="journal-teaser-section"
      >
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <p className="overline text-[#C05A3A]">From the journal</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-4 text-[#2A1F1D] max-w-2xl">
              Notes, pairings, and small heritage detours.
            </h2>
          </div>
          <Link to="/journal" data-testid="journal-teaser-cta" className="link-underline">
            Read the journal <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-10 md:gap-12">
          {JOURNAL.map((j, i) => (
            <article
              key={j.slug}
              data-testid={`journal-card-${j.slug}`}
              className={`group ${i === 1 ? "md:translate-y-12" : ""}`}
            >
              <div className="img-wash aspect-[4/5]">
                <img src={j.image} alt={j.title} />
              </div>
              <div className="mt-5">
                <p className="overline">{j.date} · {j.read}</p>
                <h3 className="font-serif text-2xl md:text-3xl mt-3 leading-snug text-[#2A1F1D] group-hover:text-[#C05A3A] transition-colors">
                  {j.title}
                </h3>
                <p className="text-sm text-[#5C4E4A] mt-3 leading-relaxed">{j.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
