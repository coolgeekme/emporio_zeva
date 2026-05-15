import { JOURNAL } from "../content";
import { ArrowRight } from "lucide-react";

export default function Journal() {
  return (
    <div className="pt-[90px]" data-testid="journal-page">
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-20 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]">The Journal</p>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight mt-5 max-w-3xl text-[#2A1F1D]">
          Pairings, heritage, and slow notes
          <span className="italic text-[#C05A3A]"> from Eva's kitchen.</span>
        </h1>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28 space-y-24">
        {JOURNAL.map((j, i) => (
          <article
            key={j.slug}
            data-testid={`journal-article-${j.slug}`}
            className={`grid md:grid-cols-12 gap-10 items-center ${
              i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div className="md:col-span-7 img-wash aspect-[4/3]">
              <img src={j.image} alt={j.title} />
            </div>
            <div className="md:col-span-5">
              <p className="overline text-[#5C4E4A]">No 0{i + 1} · {j.date} · {j.read}</p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.1] mt-4 text-[#2A1F1D]">
                {j.title}
              </h2>
              <p className="mt-5 text-[#5C4E4A] leading-relaxed">{j.excerpt}</p>
              <a href="#" className="mt-7 link-underline inline-flex" data-testid={`journal-read-${j.slug}`}>
                Read article <ArrowRight size={14} />
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
