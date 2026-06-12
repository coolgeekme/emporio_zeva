// Public renderer for CMS pages created from the admin dashboard.
// Route: /p/:slug — fetches from GET /api/pages/:slug (404 if unpublished/missing).
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PagePublic() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
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
  }, [slug]);

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

  const paragraphs = (page.body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <Nav />
      <main className="bg-[#F9F6F0]" data-testid={`page-public-${page.slug}`}>
        <section className="max-w-3xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <p className="overline text-[#C05A3A]" data-testid="page-public-overline">
            Emporio Zeva
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
          <div className="mt-10 space-y-5 text-[#2A1F1D] leading-relaxed" data-testid="page-public-body">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <p key={i} className="text-base">
                  {p}
                </p>
              ))
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
