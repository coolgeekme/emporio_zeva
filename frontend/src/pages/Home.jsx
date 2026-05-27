import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  TESTIMONIALS,
  PRESS,
  IMAGES,
  SF_MADE_BADGE,
  PILLARS,
  RITUAL,
  TAGLINES,
  NOT_A_SALAMI_SEAL,
} from "../content";
import { useReveal } from "../hooks/useReveal";
import MonogramDivider from "../components/MonogramDivider";
import WaitlistDialog from "../components/WaitlistDialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
  const [products, setProducts] = useState([]);
  const [journal, setJournal] = useState([]);
  const [waitlistProduct, setWaitlistProduct] = useState(null);
  const heroImgRef = useRef(null);
  const r1 = useReveal();
  const r2 = useReveal();
  const r3 = useReveal();
  const r4 = useReveal();
  const r5 = useReveal();
  const r6 = useReveal();
  const rFuture = useReveal();

  useEffect(() => {
    axios.get(`${API}/products`).then((res) => setProducts(res.data)).catch(() => {});
    axios.get(`${API}/journal`).then((res) => setJournal(res.data)).catch(() => {});
  }, []);

  // Subtle parallax — image translates at ~22% of scroll speed within its frame.
  // Respects prefers-reduced-motion. Capped so it never reveals empty space.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = heroImgRef.current;
        if (!el) return;
        const rect = el.parentElement.getBoundingClientRect();
        // Only animate while the hero is reasonably in view
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
        // 0 when hero is at top of viewport, grows as page scrolls down
        const offset = Math.max(0, -rect.top);
        const y = Math.min(offset * 0.22, 80); // cap at 80px
        el.style.transform = `translate3d(0, ${y}px, 0) scale(1.12)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div data-testid="home-page">
      {/* ============== HERO ============== */}
      <section className="pt-[90px] relative" data-testid="hero-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-20 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-end">
          <div className="md:col-span-6 md:pr-8">
            <p className="overline text-[#C05A3A]" data-testid="hero-overline">
              Sicilian Cocoa Confection · Est. SF
            </p>
            <h1
              className="font-serif text-[56px] leading-[0.95] sm:text-7xl md:text-8xl lg:text-[112px] tracking-tight mt-6 text-[#2A1F1D]"
              data-testid="hero-product-name"
            >
              Not A <span className="italic text-[#C05A3A]">Salami</span>.
            </h1>
            <p
              className="font-serif text-2xl sm:text-3xl md:text-4xl leading-[1.1] tracking-tight mt-5 text-[#2A1F1D] italic"
              data-testid="hero-tagline"
            >
              {TAGLINES.primary}
            </p>
            <p className="mt-8 text-lg text-[#5C4E4A] max-w-md leading-relaxed">
              A handcrafted Italian confection inspired by a traditional Sicilian
              recipe from Modica. Shaped like a salami, it creates a moment of
              surprise — then reveals a rich, sliceable chocolate experience.
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
                ref={heroImgRef}
                src={IMAGES.hero}
                alt="Hands slicing Not A Salami beside hand-wrapped gift boxes"
                data-testid="hero-image"
                className="will-change-transform"
                style={{ transform: "scale(1.12)" }}
              />
              {/* Warm cocoa-ember tint — pulls image toward brand palette */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 mix-blend-multiply"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(192,90,58,0.18) 0%, rgba(192,90,58,0.06) 38%, rgba(42,31,29,0.20) 100%)",
                }}
              />
              {/* Subtle vignette to lift the floating tile from the image */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 90% at 75% 30%, transparent 55%, rgba(42,31,29,0.18) 100%)",
                }}
              />
            </div>
            <div className="hidden md:block absolute -bottom-6 -left-6 md:-left-10 bg-[#F9F6F0] border border-[#DFD7CA] py-5 px-6 max-w-[220px]">
              <p className="overline text-[#C05A3A]">No 01 · Sicilian Cocoa Confection</p>
              <p className="font-serif text-2xl mt-2 leading-tight text-[#2A1F1D]">
                A little peculiar, <br />always delicious.
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

      {/* ============== WHY IT WORKS — 5 pillars ============== */}
      <section
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-24 reveal"
        ref={r6}
        data-testid="why-it-works-section"
      >
        <div className="text-center">
          <p className="overline text-[#C05A3A]">Why it works</p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl mt-4 text-[#2A1F1D] max-w-3xl mx-auto leading-tight">
            A different kind of chocolate.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-10">
          {PILLARS.map((p, i) => (
            <div
              key={p}
              className="text-center"
              data-testid={`pillar-${p.toLowerCase()}`}
            >
              <p className="overline text-[#5C4E4A]">No 0{i + 1}</p>
              <p className="font-serif text-3xl md:text-4xl mt-3 text-[#2A1F1D]">{p}.</p>
            </div>
          ))}
        </div>
        <MonogramDivider className="mt-16" />
      </section>

      {/* ============== THE ILLUSION ============== */}
      <section
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32 grid grid-cols-1 md:grid-cols-12 gap-12 items-center reveal"
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
            The reveal — that rich cocoa interior speckled with crunchy biscotti,
            chocolate chips, and delicate sugar crystals — is part of the dessert.
          </p>
          <div className="mt-8 divider" />
          <dl className="mt-8 grid grid-cols-3 gap-6">
            <div>
              <dt className="overline">Texture</dt>
              <dd className="font-serif text-2xl mt-2 text-[#2A1F1D]">Firm. Tender.</dd>
            </div>
            <div>
              <dt className="overline">Pairs with</dt>
              <dd className="font-serif text-2xl mt-2 text-[#2A1F1D]">Coffee. Wine.</dd>
            </div>
            <div>
              <dt className="overline">Slices</dt>
              <dd className="font-serif text-2xl mt-2 text-[#2A1F1D]">16–17.</dd>
            </div>
          </dl>
        </div>
        <div className="md:col-span-6 md:order-1">
          <div className="img-wash aspect-[5/6]">
            <img src={IMAGES.product} alt="Not A Salami on a wood board" data-testid="illusion-image" />
          </div>
        </div>
      </section>

      {/* ============== COLLECTION TEASER — the signature ============== */}
      <section
        className="bg-[#EAE4D9]/50 pt-24 md:pt-32 pb-12 md:pb-16 reveal"
        ref={r2}
        data-testid="collection-teaser-section"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <p className="overline text-[#C05A3A]">The Collection</p>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight mt-4 text-[#2A1F1D] max-w-xl leading-[1.05]">
                One signature.
                <br />
                <span className="italic text-[#C05A3A]">Made slowly.</span>
              </h2>
            </div>
            <Link to="/collection" data-testid="collection-teaser-cta" className="link-underline">
              See the collection <ArrowRight size={14} />
            </Link>
          </div>

          {(() => {
            const active = products.filter((p) => (p.status || "active") === "active");
            const hero = active[0];
            if (!hero) {
              return (
                <p className="mt-12 text-[#5C4E4A]" data-testid="collection-teaser-loading">
                  Loading…
                </p>
              );
            }
            return (
              <article
                className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center"
                data-testid={`collection-teaser-card-${hero.slug}`}
              >
                <Link
                  to={`/products/${hero.slug}`}
                  data-testid={`collection-teaser-link-${hero.slug}`}
                  className="block md:col-span-7 group"
                >
                  <div className="img-wash aspect-[5/6]">
                    <img src={hero.images[0]} alt={hero.name} />
                  </div>
                </Link>
                <div className="md:col-span-5">
                  {hero.badge && <p className="overline text-[#C05A3A]">{hero.badge}</p>}
                  <Link
                    to={`/products/${hero.slug}`}
                    data-testid={`home-view-product-title-${hero.slug}`}
                    className="inline-block"
                  >
                    <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl mt-3 text-[#2A1F1D] leading-tight hover:text-[#C05A3A] transition-colors">
                      {hero.name}
                    </h3>
                  </Link>
                  <p className="text-base text-[#5C4E4A] mt-5 max-w-md leading-relaxed">
                    {hero.tagline}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Link
                      to={`/contact?product=${hero.slug}`}
                      className="btn-primary"
                      data-testid={`home-inquire-button-${hero.slug}`}
                    >
                      Inquire to order
                    </Link>
                    <Link
                      to={`/products/${hero.slug}`}
                      className="link-underline inline-flex items-center gap-2"
                      data-testid={`home-view-product-${hero.slug}`}
                    >
                      View piece <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })()}
        </div>
      </section>

      {/* ============== FUTURE OFFERINGS · FROM EVA'S KITCHEN ============== */}
      <section
        ref={rFuture}
        className="bg-[#EAE4D9]/50 pt-4 md:pt-8 pb-24 md:pb-32 reveal"
        data-testid="future-flavors-section"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="border-t border-[#DFD7CA] pt-16 md:pt-20">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
              <div className="md:col-span-7">
                <p className="overline text-[#C05A3A]">
                  From Eva's kitchen · future offerings
                </p>
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight mt-4 text-[#2A1F1D] leading-[1.05]">
                  Coming next.
                  <br />
                  <span className="italic text-[#C05A3A]">Reservable today.</span>
                </h2>
              </div>
              <p className="md:col-span-5 text-[#5C4E4A] leading-relaxed max-w-md">
                New formats and flavors arrive only when Eva is happy with them.
                Reserve your place — we'll write when each one comes out of the
                kitchen.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {products
                .filter((p) => p.status === "future")
                .slice(0, 3)
                .map((p) => (
                  <article
                    key={p.slug}
                    data-testid={`future-flavor-card-${p.slug}`}
                    className="group"
                  >
                    <Link
                      to={`/products/${p.slug}`}
                      data-testid={`future-flavor-link-${p.slug}`}
                      className="block"
                    >
                      <div className="img-wash aspect-[4/5]">
                        <img src={p.images[0]} alt={p.name} />
                      </div>
                      <div className="mt-5">
                        {p.badge && (
                          <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[#C05A3A] border border-[#C05A3A] px-2 py-1">
                            {p.badge}
                          </span>
                        )}
                        <h3 className="font-serif text-2xl md:text-3xl mt-4 text-[#2A1F1D] leading-tight group-hover:text-[#C05A3A] transition-colors">
                          {p.name}
                        </h3>
                        {p.pronunciation && (
                          <p
                            className="mt-2 text-[11px] tracking-[0.18em] uppercase text-[#B9935A] italic"
                            data-testid={`future-flavor-pronunciation-${p.slug}`}
                          >
                            <span className="text-[#5C4E4A] not-italic">say it · </span>
                            {p.pronunciation}
                          </p>
                        )}
                        <p className="text-sm text-[#5C4E4A] mt-3 leading-relaxed">
                          {p.tagline}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setWaitlistProduct(p)}
                      className="btn-outline mt-6 text-sm"
                      data-testid={`future-flavor-waitlist-${p.slug}`}
                    >
                      Join the Waitlist →
                    </button>
                  </article>
                ))}
            </div>
          </div>
        </div>
      </section>

      <WaitlistDialog
        open={!!waitlistProduct}
        product={waitlistProduct}
        onClose={() => setWaitlistProduct(null)}
      />

      {/* ============== THE RITUAL — SLICE / SERVE / SAVOR / SHARE ============== */}
      <section
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32 reveal"
        ref={r3}
        data-testid="ritual-section"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <p className="overline text-[#C05A3A]">The serving ritual</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] mt-5 text-[#2A1F1D]">
              Sliced.
              <br />
              <span className="italic">Served.</span>
              <br />
              Savored.
              <br />
              <span className="italic text-[#C05A3A]">Shared.</span>
            </h2>
            <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-md">
              Not A Salami is meant to be sliced, shared, and savored. Four
              moments. One small ritual, the Italian way.
            </p>
            <Link to="/ritual" className="link-underline mt-8 inline-flex" data-testid="ritual-section-cta">
              Read the full ritual <ArrowRight size={14} />
            </Link>
          </div>
          <div className="md:col-span-7 grid sm:grid-cols-2 gap-5">
            {RITUAL.map((step, i) => (
              <div
                key={step.key}
                className={`border border-[#DFD7CA] p-7 bg-[#F9F6F0] flex flex-col gap-4 ${
                  i % 2 === 1 ? "sm:translate-y-8" : ""
                }`}
                data-testid={`ritual-step-${step.key}`}
              >
                <p className="overline">No 0{i + 1}</p>
                <h3 className="font-serif text-3xl text-[#2A1F1D]">{step.title}</h3>
                <p className="text-sm text-[#5C4E4A] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== TESTIMONIALS ============== */}
      <section
        className="bg-[#2A1F1D] text-[#F9F6F0] py-24 md:py-32 relative grain reveal overflow-hidden"
        ref={r4}
        data-testid="testimonials-section"
      >
        {/* Brand seal watermark — large, low-opacity, inverted to cream on dark */}
        <img
          src={NOT_A_SALAMI_SEAL}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-32 -bottom-40 w-[680px] h-[680px] hidden md:block"
          style={{ filter: "invert(1)", mixBlendMode: "screen", opacity: 0.06 }}
          data-testid="testimonials-watermark"
        />
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

          <MonogramDivider variant="light" className="mt-20" />
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
          {journal.map((j, i) => (
            <Link
              key={j.slug}
              to={`/journal/${j.slug}`}
              data-testid={`journal-card-${j.slug}`}
              className={`group block ${i === 1 ? "md:translate-y-12" : ""}`}
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
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
