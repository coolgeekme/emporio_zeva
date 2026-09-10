// Brand logo resolver — the logo can be replaced from the dashboard
// (Admin → Settings → Brand logo). When nothing is uploaded we fall back to the
// logo shipped with the site, so the site always renders.
//
// Usage:
//   const { logo, logoLight } = useBrandLogo();
//
// `logo`      → light backgrounds (nav, one-sheet, deck cover)
// `logoLight` → dark backgrounds (footer, dark sections, dividers on dark)
import { useEffect, useState } from "react";
import axios from "axios";
import { NOT_A_SALAMI_SEAL, NOT_A_SALAMI_SEAL_LIGHT } from "../content";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

let cached = null; // promise -> {logo, logoLight}
let listeners = new Set();

function load() {
  if (!cached) {
    cached = axios
      .get(`${API}/settings`)
      .then((res) => {
        const g = res.data?.general || {};
        return {
          logo: g.brand_logo_url || NOT_A_SALAMI_SEAL,
          logoLight: g.brand_logo_light_url || NOT_A_SALAMI_SEAL_LIGHT,
        };
      })
      .catch(() => ({ logo: NOT_A_SALAMI_SEAL, logoLight: NOT_A_SALAMI_SEAL_LIGHT }));
  }
  return cached;
}

// Lets the admin panel refresh every mounted consumer after an upload.
export function refreshBrandLogo() {
  cached = null;
  load().then((v) => listeners.forEach((fn) => fn(v)));
}

function applyFavicon(url) {
  try {
    const links = document.querySelectorAll("link[rel='icon'], link[rel='apple-touch-icon']");
    links.forEach((l) => l.setAttribute("href", url));
  } catch {
    /* no-op */
  }
}

export function useBrandLogo() {
  const [value, setValue] = useState(() => ({
    logo: NOT_A_SALAMI_SEAL,
    logoLight: NOT_A_SALAMI_SEAL_LIGHT,
  }));

  useEffect(() => {
    let alive = true;
    const fn = (v) => alive && setValue(v);
    listeners.add(fn);
    load().then((v) => {
      if (!alive) return;
      setValue(v);
      applyFavicon(v.logo);
    });
    return () => {
      alive = false;
      listeners.delete(fn);
    };
  }, []);

  return value;
}
