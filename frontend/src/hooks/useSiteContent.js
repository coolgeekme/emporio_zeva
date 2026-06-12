// Tiny hook that fetches a page's site-content dict (with defaults merged
// server-side) and returns a getter `(key, fallback) => string` so callers
// never see undefined.
import { useEffect, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const cache = new Map(); // page -> dict; warm restores feel instant

export function useSiteContent(page) {
  const [data, setData] = useState(() => cache.get(page) || {});

  useEffect(() => {
    let cancelled = false;
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

  // (key, fallback) -> string. Empty stored values fall back to caller default.
  return (key, fallback = "") => {
    const v = data?.[key];
    return v === undefined || v === null || v === "" ? fallback : v;
  };
}
