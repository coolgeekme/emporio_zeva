import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { JOURNAL } from "../content";
import MonogramDivider from "../components/MonogramDivider";

export default function JournalArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const idx = JOURNAL.findIndex((j) => j.slug === slug);
  const article = idx >= 0 ? JOURNAL[idx] : null;

  if (!article) {
    return (
      <div
        className="pt-[180px] max-w-[1400px] mx-auto px-6 md:px-10 pb-32"
        data-testid="journal-article-not-found"
      >
        <p className="overline text-[#C05A3A]">Not on the shelf</p>
        <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] mt-5 text-[#2A1F1D]">
          We couldn't find that article.
        </h1>
        <p className="mt-6 text-[#5C4E4A] max-w-md leading-relaxed">
          The link may have moved or been mistyped. The full journal is one click away.
        </p>
        <Link
          to="/journal"
          className="btn-primary mt-8 inline-flex"
          data-testid="journal-notfound-back"
        >
          Back to the journal
        </Link>
      </div>
    );
  }

  const prev = idx > 0 ? JOURNAL[idx - 1] : null;
  const next = idx < JOURNAL.length - 1 ? JOURNAL[idx + 1] : null;

  return (
    <article
      className="pt-[90px]"
      data-testid={`journal-article-page-${article.slug}`}
    >
      {/* Breadcrumb */}
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="link-underline !text-[10px] inline-flex items-center gap-2"
          data-testid="journal-article-back"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Header */}
      <header className="max-w-[1100px] mx-auto px-6 md:px-10 pt-10 pb-12">
        <p className="overline text-[#C05A3A]" data-testid="journal-article-meta">
          The Journal · No 0{idx + 1} · {article.date} · {article.read}
        </p>
        <h1
          className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mt-6 text-[#2A1F1D] max-w-4xl"
          data-testid="journal-article-title"
        >
          {article.title}
        </h1>
        <p
          className="mt-7 text-xl md:text-2xl font-serif italic text-[#5C4E4A] max-w-3xl leading-snug"
          data-testid="journal-article-excerpt"
        >
          {article.excerpt}
        </p>
      </header>

      {/* Hero image */}
      <figure className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="img-wash aspect-[16/9]" data-testid="journal-article-hero">
          <img src={article.image} alt={article.title} />
        </div>
      </figure>

      {/* Body */}
      <section className="max-w-[760px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="prose-zeva" data-testid="journal-article-body">
          {(article.body || []).map((para, i) => (
            <p
              key={i}
              className="text-lg leading-[1.75] text-[#2A1F1D] mb-7 first:first-letter:font-serif first:first-letter:text-[#C05A3A] first:first-letter:text-6xl first:first-letter:float-left first:first-letter:mr-3 first:first-letter:mt-1 first:first-letter:leading-none"
            >
              {para}
            </p>
          ))}
        </div>

        <MonogramDivider className="mt-16" />

        <p className="text-center mt-12 font-serif italic text-[#5C4E4A] text-lg">
          — Eva &amp; the Not A Salami team
        </p>
      </section>

      {/* Prev / Next */}
      <nav
        className="bg-[#EAE4D9]/50 border-t border-[#DFD7CA]"
        data-testid="journal-article-nav"
        aria-label="More from the Journal"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
          {prev ? (
            <Link
              to={`/journal/${prev.slug}`}
              className="group block"
              data-testid={`journal-prev-${prev.slug}`}
            >
              <p className="overline text-[#5C4E4A] inline-flex items-center gap-2">
                <ArrowLeft size={12} /> Previously
              </p>
              <p className="font-serif text-2xl md:text-3xl mt-3 text-[#2A1F1D] group-hover:text-[#C05A3A] transition-colors leading-tight">
                {prev.title}
              </p>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to={`/journal/${next.slug}`}
              className="group block md:text-right md:ml-auto md:max-w-md"
              data-testid={`journal-next-${next.slug}`}
            >
              <p className="overline text-[#5C4E4A] inline-flex items-center gap-2 md:justify-end">
                Next from the journal <ArrowRight size={12} />
              </p>
              <p className="font-serif text-2xl md:text-3xl mt-3 text-[#2A1F1D] group-hover:text-[#C05A3A] transition-colors leading-tight">
                {next.title}
              </p>
            </Link>
          ) : (
            <span />
          )}
        </div>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pb-16 text-center">
          <Link
            to="/journal"
            className="btn-outline inline-flex items-center gap-2 text-sm"
            data-testid="journal-back-to-index"
          >
            All articles <ArrowRight size={14} />
          </Link>
        </div>
      </nav>
    </article>
  );
}
