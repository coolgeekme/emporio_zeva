import { useSiteContent } from "../hooks/useSiteContent";

// ---------------------------------------------------------------------------
// Privacy Policy — added Sep 2026 (Eva's corporate form requires a policy link).
// All copy is editable from Admin → Site Content → Privacy Policy, so Eva can
// drop in her own policy the moment she has one.
// ---------------------------------------------------------------------------
export default function PrivacyPolicy() {
  const c = useSiteContent("privacy");
  const body = c("privacy_body", "");
  const paragraphs = body.split("\n\n").filter((p) => p.trim());

  return (
    <div className="pt-[90px]" data-testid="privacy-page">
      <section className="max-w-[900px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-10 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]">Legal</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight mt-5 text-[#2A1F1D]">
          {c("privacy_title", "Privacy Policy")}
        </h1>
        <p className="mt-6 text-sm text-[#5C4E4A] tracking-wide">{c("privacy_updated", "")}</p>
      </section>

      <section className="max-w-[900px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <p className="text-[#5C4E4A] leading-relaxed text-lg">{c("privacy_intro", "")}</p>
        <div className="mt-10 space-y-6 text-[#5C4E4A] leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        <p className="mt-14 pt-8 border-t border-[#DFD7CA] text-[#2A1F1D]">{c("privacy_contact", "")}</p>
      </section>
    </div>
  );
}
