// Public renderer for CMS pages created from the admin dashboard.
// Route: /p/:slug — fetches from GET /api/pages/:slug (404 if unpublished/missing).
// Body is rendered as markdown: blank-line paragraphs, **bold**, *italic*, [links](url),
// `- bullets`, headings, and `![alt](url)` images.
import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PagePublic() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const previewKey = searchParams.get("preview");
  const [page, setPage] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    // Preview path: read working buffer from sessionStorage instead of API.
    if (previewKey) {
      try {
        const raw = sessionStorage.getItem(previewKey);
        if (raw) {
          const buf = JSON.parse(raw);
          if (!buf.ts || Date.now() - buf.ts < 60 * 60 * 1000) {
            setPage(buf);
            setStatus("ok");
            return () => {
              mounted = false;
            };
          }
          sessionStorage.removeItem(previewKey);
        }
      } catch {
        /* fall through to API fetch */
      }
    }
    axios
      .get(`${API}/pages/${slug}`)
      .then(({ data }) => {
        if (mounted) {
          setPage(data);
          setStatus("ok");
        }
      })
      .catch(() => {
        if (mounted) setStatus("missing");
      });
    return () => {
      mounted = false;
    };
  }, [slug, previewKey]);

  if (status === "loading") {
    return (
      <>
        <Nav />
        <main className="min-h-[60vh] flex items-center justify-center">
          <p className="text-sm text-[#5C4E4A]">Loading…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (status === "missing") {
    return (
      <>
        <Nav />
        <main className="min-h-[60vh] flex items-center justify-center px-6 text-center">
          <div>
            <p className="overline text-[#C05A3A]">404</p>
            <h1 className="font-serif text-4xl text-[#2A1F1D] mt-2">Page not found.</h1>
            <p className="text-sm text-[#5C4E4A] mt-3 max-w-md mx-auto">
              The page you're looking for has moved or was never published.
            </p>
            <Link to="/" className="btn-primary mt-6 inline-block text-sm" data-testid="page-404-home-link">
              Back home
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const body = page.body || "";

  return (
    <>
      <Nav />
      <main className="bg-[#F9F6F0]" data-testid={`page-public-${page.slug}`}>
        <section className="max-w-3xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <p className="overline text-[#C05A3A]" data-testid="page-public-overline">
            Not A Salami
          </p>
          <h1
            className="font-serif text-4xl md:text-5xl text-[#2A1F1D] mt-3 leading-tight"
            data-testid="page-public-title"
          >
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="text-[#5C4E4A] text-lg mt-5 leading-relaxed" data-testid="page-public-excerpt">
              {page.excerpt}
            </p>
          )}
          <div
            className="mt-10 text-[#2A1F1D] leading-relaxed prose-page"
            data-testid="page-public-body"
          >
            {body.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ node, ...props }) => <p className="text-base mb-5 leading-relaxed" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="font-serif text-2xl md:text-3xl mt-10 mb-4 text-[#2A1F1D]" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="font-serif text-xl md:text-2xl mt-8 mb-3 text-[#2A1F1D]" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-5 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-5 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-base leading-relaxed" {...props} />,
                  a: ({ node, ...props }) => <a className="underline text-[#C05A3A] hover:text-[#2A1F1D]" {...props} />,
                  img: ({ node, ...props }) => (
                    <span className="block my-8 img-wash">
                      <img className="w-full h-auto" loading="lazy" {...props} />
                    </span>
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="font-serif text-xl md:text-2xl italic text-[#5C4E4A] border-l-2 border-[#C05A3A] pl-5 my-6" {...props} />
                  ),
                }}
              >
                {body}
              </ReactMarkdown>
            ) : (
              <p className="text-[#5C4E4A] italic">This page has no body content yet.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
