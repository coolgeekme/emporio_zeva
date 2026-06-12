import { Mail, MapPin, Instagram, Phone } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import InquiryForm from "../components/InquiryForm";
import { CONTACT } from "../content";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Contact() {
  const [searchParams] = useSearchParams();
  const productSlug = searchParams.get("product");
  const c = useSiteContent("contact");
  return (
    <div className="pt-[90px]" data-testid="contact-page">
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-12 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]">{c("hero_overline", "Inquire · Wholesale · Press · Corporate")}</p>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight mt-5 max-w-4xl text-[#2A1F1D]">
          {c("hero_h1_line1", "Let's create a memorable")}
          <br />
          <span className="italic text-[#C05A3A]">{c("hero_h1_line2", "gifting experience.")}</span>
        </h1>
        <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-xl">
          {c("hero_body", "Whether it's a dinner party, a corporate program, a wedding favor run, or a shop that wants to stock the classic — leave us a note. Eva reads every one.")}
        </p>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28 grid grid-cols-1 md:grid-cols-12 gap-16">
        <aside className="md:col-span-4 space-y-10">
          <div>
            <p className="overline text-[#C05A3A]">Atelier</p>
            <div className="mt-4 flex gap-3 items-start">
              <MapPin size={18} className="text-[#C05A3A] mt-1" />
              <p className="text-[#2A1F1D] leading-relaxed">
                {CONTACT.city}
                <br />
                <span className="text-[#5C4E4A]">Visits by appointment</span>
              </p>
            </div>
          </div>
          <div>
            <p className="overline text-[#C05A3A]">Direct</p>
            <ul className="mt-4 space-y-4">
              <li className="flex gap-3 items-center">
                <Mail size={18} className="text-[#C05A3A]" />
                <a
                  href={`mailto:${CONTACT.email_primary}`}
                  className="text-[#2A1F1D] hover:text-[#C05A3A] transition-colors"
                  data-testid="contact-email"
                >
                  {CONTACT.email_primary}
                </a>
              </li>
              <li className="flex gap-3 items-center">
                <Instagram size={18} className="text-[#C05A3A]" />
                <a href="#" className="text-[#2A1F1D] hover:text-[#C05A3A] transition-colors" data-testid="contact-instagram">
                  {CONTACT.instagram}
                </a>
              </li>
            </ul>
          </div>
          <div className="border-t border-[#DFD7CA] pt-10">
            <p className="overline text-[#C05A3A]">{c("shipping_overline", "Shipping & corporate")}</p>
            <p className="mt-3 text-sm text-[#5C4E4A] leading-relaxed">
              {c("shipping_body", "We ship within the continental United States in small batches. Standard lead time is 5–7 days. For corporate programs (24-unit minimum), see the corporate deck or request the one-sheet.")}
            </p>
          </div>
        </aside>

        <div className="md:col-span-8">
          <InquiryForm productSlug={productSlug} />
        </div>
      </section>
    </div>
  );
}
