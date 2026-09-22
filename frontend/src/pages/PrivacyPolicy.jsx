import { useSiteContent } from "../hooks/useSiteContent";

// ---------------------------------------------------------------------------
// Privacy Policy — added Sep 2026 (Eva's corporate form requires a policy link).
// All copy is editable from Admin → Site Content → Privacy Policy, so Eva can
// drop in her own policy the moment she has one.
//
// The body supports a light markdown subset, because a full privacy policy is
// unreadable as one wall of paragraphs and the raw ** markers were previously
// rendering as literal asterisks on the live page:
//   **A line on its own**  -> section heading
//   - item (one per line)  -> bullet list
//   inline **bold**        -> <strong>
// ---------------------------------------------------------------------------

function renderInline(text, keyPrefix) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter((s) => s !== "");
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-[#2A1F1D]">
          {m[1]}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

function Block({ block, index }) {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // A paragraph that is exactly one bold run becomes a section heading.
  if (lines.length === 1 && /^\*\*[^*]+\*\*$/.test(lines[0])) {
    return (
      <h2 className="font-serif text-2xl md:text-[28px] leading-snug tracking-tight text-[#2A1F1D] pt-6">
        {lines[0].replace(/\*\*/g, "")}
      </h2>
    );
  }

  // Bullet list.
  if (lines.length && lines.every((l) => l.startsWith("- "))) {
    return (
      <ul className="list-disc pl-6 space-y-2">
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.slice(2), `${index}-${i}`)}</li>
        ))}
      </ul>
    );
  }

  return <p className="whitespace-pre-line">{renderInline(block, index)}</p>;
}

export default function PrivacyPolicy() {
  const c = useSiteContent("privacy");
  const body = c("privacy_body", "");
  const blocks = body
    .split("\n\n")
    .map((b) => b.trim())
    .filter(Boolean);

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
          {blocks.map((b, i) => (
            <Block key={i} block={b} index={i} />
          ))}
        </div>
        <p className="mt-14 pt-8 border-t border-[#DFD7CA] text-[#2A1F1D]">{c("privacy_contact", "")}</p>
      </section>
    </div>
  );
}
