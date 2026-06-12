// Tiny hook that fetches a page's site-content dict (with defaults merged
// server-side) and returns a getter `(key, fallback) => string` so callers
// never see undefined.
//
// Preview support: if the URL has ?preview=site-content-<page>, the hook reads
// the working buffer from sessionStorage instead of the API. This lets the admin
// preview edits before saving.
import { useEffect, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const cache = new Map(); // page -> dict; warm restores feel instant

export function useSiteContent(page) {
  const [data, setData] = useState(() => cache.get(page) || {});

  useEffect(() => {
    let cancelled = false;
    // Preview override
    try {
      const params = new URLSearchParams(window.location.search);
      const previewKey = params.get("preview");
      if (previewKey && previewKey === `site-content-${page}`) {
        const raw = sessionStorage.getItem(previewKey);
        if (raw) {
          const buf = JSON.parse(raw);
          if (!buf.ts || Date.now() - buf.ts < 60 * 60 * 1000) {
            setData(buf.fields || {});
            return () => {
              cancelled = true;
            };
          }
          sessionStorage.removeItem(previewKey);
        }
      }
    } catch {
      /* fall through */
    }
    axios
      .get(`${API}/site-content/${page}`)
      .then((res) => {
        if (cancelled) return;
        cache.set(page, res.data);
        setData(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (key, fallback = "") => {
    const v = data?.[key];
    return v === undefined || v === null || v === "" ? fallback : v;
  };
}
