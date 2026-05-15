import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import WaitlistDialog from "../components/WaitlistDialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [open, setOpen] = useState({ ingredients: true, pairings: false, serving: false });
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    setNotFound(false);
    setProduct(null);
    axios
      .get(`${API}/products/${slug}`)
      .then((r) => setProduct(r.data))
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      });
  }, [slug]);

  if (notFound) {
    return (
      <div
        className="pt-[180px] max-w-[1400px] mx-auto px-6 md:px-10 pb-32"
        data-testid="product-not-found"
      >
        <p className="overline text-[#C05A3A]">Not on the shelf</p>
        <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] mt-5 text-[#2A1F1D]">
          We couldn't find that one.
        </h1>
        <p className="mt-6 text-[#5C4E4A] max-w-md leading-relaxed">
          It may have sold through, or the link may be slightly off. Wander back to the collection.
        </p>
        <Link to="/collection" className="btn-primary mt-8 inline-flex" data-testid="product-notfound-back">
          Back to the collection
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-[180px] max-w-[1400px] mx-auto px-6 md:px-10 pb-32" data-testid="product-loading">
        <p className="text-[#5C4E4A]">Loading…</p>
      </div>
    );
  }

  const Section = ({ id, title, items }) => (
    <div className="border-b border-[#DFD7CA]" data-testid={`product-accordion-${id}`}>
      <button
        type="button"
        onClick={() => setOpen((s) => ({ ...s, [id]: !s[id] }))}
        className="flex items-center justify-between w-full py-5"
        data-testid={`product-accordion-toggle-${id}`}
      >
        <span className="overline">{title}</span>
        {open[id] ? <Minus size={16} /> : <Plus size={16} />}
      </button>
      {open[id] && (
        <ul className="pb-6 space-y-2 text-[#5C4E4A] leading-relaxed">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-[#C05A3A]">·</span> {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="pt-[90px]" data-testid="product-detail-page">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-10">
        <Link to="/collection" className="link-underline !text-[10px]" data-testid="product-back-link">
          <ArrowLeft size={14} /> Back to collection
        </Link>
      </div>

      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-20">
        {/* Left: images */}
        <div className="md:col-span-7 space-y-6" data-testid="product-images">
          {product.images.map((src, i) => (
            <div key={i} className="img-wash aspect-[4/5]">
              <img src={src} alt={`${product.name} — view ${i + 1}`} />
            </div>
          ))}
        </div>

        {/* Right: sticky info */}
        <div className="md:col-span-5">
          <div className="md:sticky md:top-28">
            {product.badge && (
              <span
                className="inline-block text-[10px] tracking-[0.22em] uppercase font-semibold text-[#C05A3A] border border-[#C05A3A] px-2 py-1"
                data-testid="product-badge"
              >
                {product.badge}
              </span>
            )}
            <h1
              className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[#2A1F1D] mt-5"
              data-testid="product-name"
            >
              {product.name}
            </h1>
            <p className="mt-5 text-lg text-[#5C4E4A] leading-relaxed">{product.tagline}</p>

            <p
              className="mt-8 text-[#5C4E4A] leading-relaxed border-t border-[#DFD7CA] pt-7"
              data-testid="product-long-description"
            >
              {product.long_description}
            </p>

            <div className="mt-9 flex flex-wrap gap-3" data-testid="product-ctas">
              <button
                onClick={() => setWaitlistOpen(true)}
                className="btn-primary"
                data-testid="product-waitlist-button"
              >
                Join the Waitlist
              </button>
              <Link to="/contact" className="btn-outline" data-testid="product-contact-link">
                Wholesale & press
              </Link>
            </div>

            <div className="mt-12 space-y-1">
              <Section id="ingredients" title="Ingredients" items={product.ingredients} />
              <Section id="pairings" title="Pairings" items={product.pairings} />
              <Section id="serving" title="Serving · Storage" items={product.serving} />
            </div>
          </div>
        </div>
      </section>

      <WaitlistDialog
        open={waitlistOpen}
        product={product}
        onClose={() => setWaitlistOpen(false)}
      />
    </div>
  );
}
