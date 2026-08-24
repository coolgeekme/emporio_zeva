import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone, Globe, Printer } from "lucide-react";
import {
  BRAND,
  CONTACT,
  TAGLINES,
  CORPORATE_PACKAGES,
  IMAGES,
  NOT_A_SALAMI_SEAL,
  TIER_TONES,
  toneFor,
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
              src={NOT_A_SALAMI_SEAL}
              alt="Not A Salami"
              className="h-24 w-24 mx-auto rounded-full select-none"
              draggable="false"
              style={{ mixBlendMode: "multiply" }}
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

          {/* Packages — Curated / Executive / Il Mini */}
          <section
            className={`grid gap-6 md:gap-8 ${
              CORPORATE_PACKAGES.length === 1
                ? "md:grid-cols-1"
                : CORPORATE_PACKAGES.length === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-3"
            }`}
            data-testid="one-sheet-packages"
          >
            {CORPORATE_PACKAGES.map((pkg, i) => {
              const t = TIER_TONES[toneFor(pkg)] || TIER_TONES.light;
              return (
                <div key={pkg.name} className={`p-7 border flex flex-col ${t.card}`}>
                  {pkg.image && (
                    <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-sm bg-[#F5EFE2]">
                      <img
                        src={pkg.image}
                        alt={pkg.name}
                        className="h-full w-full object-cover"
                        draggable="false"
                      />
                    </div>
                  )}
                  <p className={`overline text-[10px] ${t.badge}`}>{pkg.name}</p>
                  <h2 className={`font-serif text-3xl mt-2 ${t.title}`}>1 salami · {pkg.box}</h2>
                  <p className={`mt-3 font-serif text-3xl ${t.price}`}>
                    {pkg.price}
                    <span className={`text-sm tracking-wide ml-1 ${t.unit}`}>{pkg.unit}</span>
                  </p>
                  <ul className={`mt-5 space-y-2 text-sm ${t.inc}`}>
                    {pkg.includes.map((it) => (
                      <li key={it} className="flex gap-2">
                        <span className={t.bullet}>·</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={`overline text-[10px] mt-5 pt-4 border-t ${t.min}`}>{pkg.min}</p>
                </div>
              );
            })}
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
