import { useEffect, useState } from "react";
import { CONTACT, BRAND } from "../content";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Settings are site-wide and rarely change, so fetch once and share.
let cache = null;
let inflight = null;

export function useContact() {
  const [settings, setSettings] = useState(cache);

  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = fetch(`${API}/settings`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((s) => {
          cache = s;
          return s;
        });
    }
    let alive = true;
    inflight.then((s) => {
      if (alive) setSettings(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const g = settings?.general || {};
  return {
    brandName: g.brand_name || BRAND.name,
    email: g.contact_email || CONTACT.email_primary,
    phone: g.phone || CONTACT.phone,
    phoneDisplay: g.phone_display || CONTACT.phone_display,
    address: g.address || CONTACT.city,
    instagram: g.instagram_handle || CONTACT.instagram,
  };
}
