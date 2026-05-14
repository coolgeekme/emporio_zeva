import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import InquiryForm from "../components/InquiryForm";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [open, setOpen] = useState({ ingredients: true, pairings: false, serving: false });
  const [showInquiry, setShowInquiry] = useState(false);

  useEffect(() => {
    axios.get(`${API}/products/${slug}`).then((r) => setProduct(r.data)).catch(() => {});
  }, [slug]);

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
    <div className="pt-[72px]" data-testid="product-detail-page">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-10">
        <Link to="/collection" className="link-underline !text-[10px]" data-testid="product-back-link">
          <ArrowLeft size={14} /> Back to collection
        </Link>
      </div>

      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid md:grid-cols-12 gap-12 lg:gap-20">
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

            <div className="mt-8 flex items-baseline gap-5 border-y border-[#DFD7CA] py-5">
              <p className="font-serif text-3xl text-[#2A1F1D]" data-testid="product-price">{product.price}</p>
              <p className="overline text-[#5C4E4A]" data-testid="product-weight">{product.weight}</p>
            </div>

            <p className="mt-7 text-[#5C4E4A] leading-relaxed" data-testid="product-long-description">
              {product.long_description}
            </p>

            <div className="mt-9 flex flex-wrap gap-3" data-testid="product-ctas">
              <button
                onClick={() => setShowInquiry((v) => !v)}
                className="btn-primary"
                data-testid="product-inquire-button"
              >
                {product.available ? "Inquire to order" : "Join the waitlist"}
              </button>
              <Link to="/contact" className="btn-outline" data-testid="product-contact-link">
                Wholesale & press
              </Link>
            </div>

            {showInquiry && (
              <div className="mt-10 p-7 border border-[#DFD7CA] bg-[#F9F6F0]" data-testid="product-inquiry-panel">
                <p className="overline text-[#C05A3A]">Send a note</p>
                <h3 className="font-serif text-2xl mt-2 text-[#2A1F1D]">Tell us about your table.</h3>
                <p className="text-sm text-[#5C4E4A] mt-3">
                  Order quantities, gift logistics, ship-by dates — we read everything. Eva replies personally.
                </p>
                <div className="mt-6">
                  <InquiryForm productSlug={product.slug} compact />
                </div>
              </div>
            )}

            <div className="mt-12 space-y-1">
              <Section id="ingredients" title="Ingredients" items={product.ingredients} />
              <Section id="pairings" title="Pairings" items={product.pairings} />
              <Section id="serving" title="Serving · Storage" items={product.serving} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
