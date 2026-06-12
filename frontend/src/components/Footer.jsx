import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { Instagram, Mail, Phone } from "lucide-react";
import { SF_MADE_BADGE, NOT_A_SALAMI_SEAL, BRAND, CONTACT, TAGLINES } from "../content";
import NewsletterForm from "./NewsletterForm";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Footer() {
  const [cmsLinks, setCmsLinks] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API}/pages`)
      .then(({ data }) => {
        if (cancelled) return;
        setCmsLinks(
          (data || [])
            .filter((p) => p.show_in_footer)
            .map((p) => ({ to: `/p/${p.slug}`, label: p.title }))
        );
      })
      .catch(() => {});
    axios
      .get(`${API}/settings`)
      .then(({ data }) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const email = settings?.general?.contact_email || CONTACT.email_primary;
  const instagram = settings?.general?.instagram_handle || CONTACT.instagram;
  const address = settings?.general?.address || CONTACT.city;
  return (
    <footer
      className="bg-[#2A1F1D] text-[#F9F6F0] mt-32 relative grain"
      data-testid="site-footer"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
        {/* Top: Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-[#5C4E4A]">
          <div className="md:col-span-6">
            <p className="overline text-[#B9935A]">The Journal</p>
            <h3 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-4 max-w-md">
              Slow notes from <span className="italic text-[#C05A3A]">Eva's kitchen.</span>
            </h3>
            <p className="mt-5 text-[#DFD7CA] max-w-md leading-relaxed">
              New flavor drops, dinner pairings, and a quiet head-start on
              holiday gift boxes — sent rarely, written by hand.
            </p>
          </div>
          <div className="md:col-span-6 flex md:items-end">
            <NewsletterForm />
          </div>
        </div>

        {/* Middle: links */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 py-16">
          <div className="md:col-span-5">
            <Link to="/" data-testid="footer-logo" className="inline-flex">
              <img
                src={NOT_A_SALAMI_SEAL}
                alt="Not A Salami · Sicilian Cocoa Confection"
                className="h-32 w-32 rounded-full select-none"
                draggable="false"
                style={{ filter: "invert(1) brightness(1.02)", mixBlendMode: "screen" }}
              />
            </Link>
            <p className="mt-6 text-[#DFD7CA] max-w-sm leading-relaxed italic font-serif text-lg">
              {TAGLINES.primary}
            </p>
            <p className="mt-3 text-[#DFD7CA] max-w-sm leading-relaxed text-sm">
              {TAGLINES.italian_tradition} Handcrafted in small batches in San Francisco.
            </p>
            <img
              src={SF_MADE_BADGE}
              alt="SF Made — Here and Now 2024"
              className="mt-8 h-16 w-auto opacity-90"
              data-testid="footer-sfmade-badge"
            />
          </div>

          <div className="md:col-span-2">
            <p className="overline text-[#B9935A]">Shop</p>
            <ul className="mt-5 space-y-3">
              <li><Link to="/collection" data-testid="footer-link-collection" className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors">Collection</Link></li>
              <li><Link to="/products/not-a-salami-classic" data-testid="footer-link-classic" className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors">The Classic</Link></li>
              <li><Link to="/products/not-a-salami-gift-board" data-testid="footer-link-gift" className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors">Gift Board</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="overline text-[#B9935A]">House</p>
            <ul className="mt-5 space-y-3">
              <li><Link to="/our-story" data-testid="footer-link-story" className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors">Our Story</Link></li>
              <li><Link to="/ritual" data-testid="footer-link-ritual" className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors">The Ritual</Link></li>
              <li><Link to="/journal" data-testid="footer-link-journal" className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors">Journal</Link></li>
              <li><Link to="/contact" data-testid="footer-link-contact" className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors">Contact</Link></li>
              {cmsLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    data-testid={`footer-cms-${l.to.split("/").pop()}`}
                    className="text-sm text-[#DFD7CA] hover:text-[#C05A3A] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="overline text-[#B9935A]">Reach out</p>
            <ul className="mt-5 space-y-3 text-sm text-[#DFD7CA]">
              <li>{address}</li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-[#C05A3A]" />
                <a href={`mailto:${email}`} data-testid="footer-email" className="hover:text-[#C05A3A] transition-colors">{email}</a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram size={14} className="text-[#C05A3A]" />
                <a href="#" data-testid="footer-instagram" className="hover:text-[#C05A3A] transition-colors">{instagram}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[#5C4E4A] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-[#5C4E4A] tracking-wide">
            © {new Date().getFullYear()} {BRAND.parent}. Handcrafted with reverence in San Francisco.
          </p>
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#5C4E4A]">
            notasalami.com · From Sicily, with seriousness
          </p>
        </div>
      </div>
    </footer>
  );
}
