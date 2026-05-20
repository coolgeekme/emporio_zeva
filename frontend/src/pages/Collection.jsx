import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import WaitlistDialog from "../components/WaitlistDialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Collection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waitlistProduct, setWaitlistProduct] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/products`)
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = products.filter((p) => (p.status || "active") === "active");
  const future = products.filter((p) => p.status === "future");

  return (
    <div data-testid="collection-page" className="pt-[90px]">
      {/* Header */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-12 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]" data-testid="collection-overline">
          The Collection
        </p>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mt-6 items-end">
          <h1 className="md:col-span-8 font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.02] text-[#2A1F1D]">
            One signature.
            <br />
            <span className="italic text-[#C05A3A]">Made slowly.</span>
          </h1>
          <p className="md:col-span-4 text-[#5C4E4A] leading-relaxed max-w-md">
            We make one thing for now — and we make it well. Below: the signature
            Not A Salami. Further down: what's next from Eva's kitchen, reservable
            today.
          </p>
        </div>
      </section>

      {loading ? (
        <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
          <p className="text-[#5C4E4A]" data-testid="collection-loading">Loading…</p>
        </section>
      ) : (
        <>
          {/* ============== THE SIGNATURE ============== */}
          {active.map((p) => (
            <section
              key={p.slug}
              className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28"
              data-testid={`collection-card-${p.slug}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
                <Link
                  to={`/products/${p.slug}`}
                  data-testid={`collection-card-link-${p.slug}`}
                  className="block md:col-span-7 group"
                >
                  <div className="img-wash aspect-[5/6]">
                    <img src={p.images[0]} alt={p.name} />
                  </div>
                </Link>
                <div className="md:col-span-5">
                  <p className="overline text-[#5C4E4A]">No 01 · The signature</p>
                  {p.badge && (
                    <span className="ml-3 text-[10px] tracking-[0.22em] uppercase font-semibold text-[#C05A3A] border border-[#C05A3A] px-2 py-1">
                      {p.badge}
                    </span>
                  )}
                  <h2 className="font-serif text-4xl md:text-5xl mt-4 leading-tight text-[#2A1F1D]">
                    {p.name}
                  </h2>
                  <p className="text-base text-[#5C4E4A] mt-5 max-w-md leading-relaxed">
                    {p.tagline}
                  </p>
                  <p className="text-sm text-[#5C4E4A] mt-4 max-w-md leading-relaxed">
                    {p.description}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                    <button
                      type="button"
                      onClick={() => setWaitlistProduct(p)}
                      className="btn-primary"
                      data-testid={`waitlist-button-${p.slug}`}
                    >
                      Join the Waitlist
                    </button>
                    <Link
                      to={`/products/${p.slug}`}
                      className="link-underline inline-flex items-center gap-2"
                      data-testid={`view-product-${p.slug}`}
                    >
                      View piece <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          ))}

          {/* ============== FUTURE · FROM EVA'S KITCHEN ============== */}
          {future.length > 0 && (
            <section
              className="bg-[#EAE4D9]/40 py-24 md:py-32 border-t border-[#DFD7CA]"
              data-testid="collection-future-section"
            >
              <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
                  <div className="md:col-span-7">
                    <p className="overline text-[#C05A3A]">
                      From Eva's kitchen · future experiments
                    </p>
                    <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight mt-4 text-[#2A1F1D] leading-[1.05]">
                      Coming next.
                      <br />
                      <span className="italic text-[#C05A3A]">Reservable today.</span>
                    </h2>
                  </div>
                  <p className="md:col-span-5 text-[#5C4E4A] leading-relaxed max-w-md">
                    A small house grows slowly. These are the flavors, formats, and
                    bundles in development — join a list and we'll write when each
                    comes out of the kitchen.
                  </p>
                </div>

                <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                  {future.map((p) => (
                    <article
                      key={p.slug}
                      data-testid={`future-card-${p.slug}`}
                      className="group"
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
                        <h3 className="font-serif text-2xl md:text-3xl mt-4 text-[#2A1F1D] leading-tight">
                          {p.name}
                        </h3>
                        {p.pronunciation && (
                          <p
                            className="mt-2 text-[11px] tracking-[0.18em] uppercase text-[#B9935A] italic"
                            data-testid={`future-pronunciation-${p.slug}`}
                          >
                            <span className="text-[#5C4E4A] not-italic">say it · </span>
                            {p.pronunciation}
                          </p>
                        )}
                        <p className="text-sm text-[#5C4E4A] mt-3 max-w-md leading-relaxed">
                          {p.tagline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWaitlistProduct(p)}
                        className="btn-outline mt-6 text-sm"
                        data-testid={`future-waitlist-${p.slug}`}
                      >
                        Join the Waitlist →
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <WaitlistDialog
        open={!!waitlistProduct}
        product={waitlistProduct}
        onClose={() => setWaitlistProduct(null)}
      />
    </div>
  );
}
