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

  return (
    <div data-testid="collection-page" className="pt-[90px]">
      {/* Header */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-12 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]" data-testid="collection-overline">
          The Collection · No 01 → No 03
        </p>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mt-6 items-end">
          <h1 className="md:col-span-8 font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.02] text-[#2A1F1D]">
            A small house.
            <br />
            <span className="italic text-[#C05A3A]">A few honest things.</span>
          </h1>
          <p className="md:col-span-4 text-[#5C4E4A] leading-relaxed max-w-md">
            We make one thing for now — and we make it slowly. New flavors arrive
            only when Eva is happy. Reserve your place; we ship in small batches.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
        {loading ? (
          <p className="text-[#5C4E4A]" data-testid="collection-loading">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-20">
            {products.map((p, i) => {
              const layout =
                i % 3 === 0
                  ? "md:col-span-7"
                  : i % 3 === 1
                  ? "md:col-span-5 md:translate-y-16"
                  : "md:col-span-6 md:col-start-4";
              return (
                <article
                  key={p.id}
                  data-testid={`collection-card-${p.slug}`}
                  className={`group block ${layout}`}
                >
                  <Link
                    to={`/products/${p.slug}`}
                    data-testid={`collection-card-link-${p.slug}`}
                    className="block"
                  >
                    <div className="img-wash aspect-[4/5]">
                      <img src={p.images[0]} alt={p.name} />
                    </div>
                    <div className="mt-6">
                      <div className="flex items-center gap-3">
                        <p className="overline text-[#5C4E4A]">No 0{i + 1}</p>
                        {p.badge && (
                          <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[#C05A3A] border border-[#C05A3A] px-2 py-1">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <h2 className="font-serif text-3xl md:text-4xl mt-3 leading-tight text-[#2A1F1D] group-hover:text-[#C05A3A] transition-colors">
                        {p.name}
                      </h2>
                      <p className="text-sm text-[#5C4E4A] mt-3 max-w-md leading-relaxed">
                        {p.tagline}
                      </p>
                    </div>
                  </Link>

                  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
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
                </article>
              );
            })}
          </div>
        )}
      </section>

      <WaitlistDialog
        open={!!waitlistProduct}
        product={waitlistProduct}
        onClose={() => setWaitlistProduct(null)}
      />
    </div>
  );
}
