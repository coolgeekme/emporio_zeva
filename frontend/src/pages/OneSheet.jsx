import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone, Globe, Printer } from "lucide-react";
import {
  BRAND,
  CONTACT,
  TAGLINES,
  CORPORATE_PACKAGES,
  IMAGES,
  LOGO_URL,
} from "../content";
import MonogramDivider from "../components/MonogramDivider";

// Digital one-sheet — print-friendly single page version of the Corporate
// One-Sheet PDF. Sales team can share /one-sheet as a link.

export default function OneSheet() {
  return (
    <div className="pt-[90px] bg-[#F9F6F0] min-h-screen" data-testid="one-sheet-page">
      <div className="max-w-[1000px] mx-auto px-6 md:px-12 py-12">
        {/* Print button (hidden when printing) */}
        <div className="flex items-center justify-between mb-10 print:hidden">
          <Link to="/" className="link-underline" data-testid="one-sheet-back">
            <ArrowRight size={14} className="rotate-180" /> Back home
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-outline !py-2 !px-4 !text-[10px] flex items-center gap-2"
            data-testid="one-sheet-print"
          >
            <Printer size={14} /> Print one-sheet
          </button>
        </div>

        {/* Sheet */}
        <article className="bg-[#F9F6F0] border border-[#DFD7CA] p-10 md:p-16 print:border-0 print:p-0">
          {/* Header */}
          <header className="text-center pb-10 border-b border-[#DFD7CA]">
            <img
              src={LOGO_URL}
              alt="Emporio Zeva"
              className="h-20 w-auto mx-auto select-none"
              draggable="false"
            />
            <p className="overline text-[#C05A3A] mt-6">A Sicilian Cocoa Confection</p>
            <h1 className="font-serif text-5xl md:text-6xl mt-3 text-[#2A1F1D] leading-tight">
              {BRAND.name}.
            </h1>
            <p className="mt-5 text-base text-[#5C4E4A] max-w-xl mx-auto leading-relaxed italic">
              {BRAND.name} is a handcrafted Italian confection inspired by a traditional Sicilian recipe. Shaped like a salami, it creates a moment of surprise — then reveals a rich, sliceable chocolate experience.
            </p>
          </header>

          {/* Hero image */}
          <div className="img-wash aspect-[16/8] my-10">
            <img src={IMAGES.hero} alt="Sliced Not A Salami" />
          </div>

          {/* Packages — real Curated / Executive */}
          <section className="grid md:grid-cols-2 gap-6 md:gap-8" data-testid="one-sheet-packages">
            {CORPORATE_PACKAGES.map((pkg, i) => (
              <div
                key={pkg.name}
                className={`p-7 border ${
                  i === 1
                    ? "bg-[#2A1F1D] text-[#F9F6F0] border-[#2A1F1D]"
                    : "bg-[#F9F6F0] border-[#DFD7CA]"
                }`}
              >
                <p className={`overline text-[10px] ${i === 1 ? "text-[#B9935A]" : "text-[#C05A3A]"}`}>
                  {pkg.name}
                </p>
                <h2
                  className={`font-serif text-3xl mt-2 ${
                    i === 1 ? "text-[#F9F6F0]" : "text-[#2A1F1D]"
                  }`}
                >
                  1 salami · {pkg.box}
                </h2>
                <p className="mt-3 font-serif text-3xl text-[#C05A3A]">
                  {pkg.price}
                  <span className={`text-sm tracking-wide ml-1 ${i === 1 ? "text-[#B9935A]" : "text-[#5C4E4A]"}`}>
                    {pkg.unit}
                  </span>
                </p>
                <ul className={`mt-5 space-y-2 text-sm ${i === 1 ? "text-[#DFD7CA]" : "text-[#5C4E4A]"}`}>
                  {pkg.includes.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="text-[#C05A3A]">·</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <p className={`overline text-[10px] mt-5 pt-4 border-t ${i === 1 ? "border-[#5C4E4A] text-[#B9935A]" : "border-[#DFD7CA] text-[#5C4E4A]"}`}>
                  {pkg.min}
                </p>
              </div>
            ))}
          </section>

          <MonogramDivider className="my-12" />

          {/* Tagline + contact */}
          <section className="grid sm:grid-cols-2 gap-8 items-end">
            <div>
              <p className="font-serif text-3xl md:text-4xl italic text-[#C05A3A] leading-tight">
                {TAGLINES.primary}
              </p>
              <p className="overline text-[#5C4E4A] mt-3">
                {TAGLINES.italian_tradition}
              </p>
            </div>
            <ul className="space-y-3 text-sm text-[#2A1F1D]" data-testid="one-sheet-contact">
              <li className="flex gap-3 items-center">
                <Phone size={14} className="text-[#C05A3A]" />
                <a href={`tel:${CONTACT.phone.replace(/\s|·/g, "")}`} className="hover:text-[#C05A3A] transition-colors">
                  {CONTACT.phone_display}
                </a>
              </li>
              <li className="flex gap-3 items-center">
                <Globe size={14} className="text-[#C05A3A]" />
                <a href="https://notasalami.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C05A3A] transition-colors">
                  www.{BRAND.domain}
                </a>
              </li>
              <li className="flex gap-3 items-center">
                <Mail size={14} className="text-[#C05A3A]" />
                <a href={`mailto:${CONTACT.email_primary}`} className="hover:text-[#C05A3A] transition-colors">
                  {CONTACT.email_primary}
                </a>
              </li>
            </ul>
          </section>
        </article>

        <p className="text-center overline text-[#5C4E4A] mt-10 print:hidden">
          Made for sharing — send this page to a corporate prospect.
        </p>
      </div>
    </div>
  );
}
