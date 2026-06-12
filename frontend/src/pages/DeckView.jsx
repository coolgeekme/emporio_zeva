import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import BlackRock from "./BlackRock";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DeckView() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const previewKey = searchParams.get("preview");
  const [deck, setDeck] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound | err

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setDeck(null);
    axios
      .get(`${API}/decks/${slug}`)
      .then((r) => {
        if (!alive) return;
        let merged = r.data;
        // If admin opened with ?preview=<sessionKey>, overlay the working buffer.
        // Buffer auto-clears after 1h.
        if (previewKey) {
          try {
            const raw = sessionStorage.getItem(previewKey);
            if (raw) {
              const buf = JSON.parse(raw);
              if (buf.ts && Date.now() - buf.ts > 60 * 60 * 1000) {
                sessionStorage.removeItem(previewKey);
              } else {
                merged = { ...merged, ...buf };
              }
            }
          } catch {
            /* noop */
          }
        }
        setDeck(merged);
        setStatus("ok");
      })
      .catch((err) => {
        if (!alive) return;
        setStatus(err?.response?.status === 404 ? "notfound" : "err");
      });
    return () => {
      alive = false;
    };
  }, [slug, previewKey]);

  if (status === "loading") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-[#F9F6F0] text-[#5C4E4A]"
        data-testid="deck-loading"
      >
        <p className="overline">Preparing your presentation…</p>
      </div>
    );
  }

  if (status !== "ok") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-[#F9F6F0] px-6"
        data-testid="deck-not-found"
      >
        <div className="text-center max-w-md">
          <p className="overline text-[#C05A3A]">
            {status === "notfound" ? "Not on the table" : "Something's not right"}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-[#2A1F1D] mt-4 leading-tight">
            {status === "notfound"
              ? "This presentation isn't available."
              : "We couldn't load the presentation."}
          </h1>
          <p className="text-sm text-[#5C4E4A] mt-4 leading-relaxed">
            The link may have expired or been mistyped. Reach out to Eva and
            we'll send you a fresh one.
          </p>
          <Link to="/" className="btn-primary mt-8 inline-flex">
            Visit Not A Salami
          </Link>
        </div>
      </div>
    );
  }

  return <BlackRock deck={deck} />;
}
