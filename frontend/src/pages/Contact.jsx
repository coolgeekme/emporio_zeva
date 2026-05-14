import { Mail, MapPin, Instagram } from "lucide-react";
import InquiryForm from "../components/InquiryForm";

export default function Contact() {
  return (
    <div className="pt-[72px]" data-testid="contact-page">
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-12 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]">Inquire · Wholesale · Press</p>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight mt-5 max-w-4xl text-[#2A1F1D]">
          Tell us about
          <br />
          <span className="italic text-[#C05A3A]">your table.</span>
        </h1>
        <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-xl">
          We make in small batches. Whether it's a dinner party of ten, a wedding favor run, or a shop that wants to stock the classic — leave us a note. Eva reads every one.
        </p>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28 grid md:grid-cols-12 gap-16">
        <aside className="md:col-span-4 space-y-10">
          <div>
            <p className="overline text-[#C05A3A]">Atelier</p>
            <div className="mt-4 flex gap-3 items-start">
              <MapPin size={18} className="text-[#C05A3A] mt-1" />
              <p className="text-[#2A1F1D] leading-relaxed">
                San Francisco, California<br />
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
                  href="mailto:hello@emporiozeva.com"
                  className="text-[#2A1F1D] hover:text-[#C05A3A] transition-colors"
                  data-testid="contact-email"
                >
                  hello@emporiozeva.com
                </a>
              </li>
              <li className="flex gap-3 items-center">
                <Instagram size={18} className="text-[#C05A3A]" />
                <a href="#" className="text-[#2A1F1D] hover:text-[#C05A3A] transition-colors" data-testid="contact-instagram">
                  @emporiozeva
                </a>
              </li>
            </ul>
          </div>
          <div className="border-t border-[#DFD7CA] pt-10">
            <p className="overline text-[#C05A3A]">Shipping</p>
            <p className="mt-3 text-sm text-[#5C4E4A] leading-relaxed">
              We currently ship within the continental United States in small batches.
              Production runs are weekly; lead time is typically 5–7 days. Inquire for
              expedited dates, gift cards, or wholesale.
            </p>
          </div>
        </aside>

        <div className="md:col-span-8">
          <InquiryForm />
        </div>
      </section>
    </div>
  );
}
