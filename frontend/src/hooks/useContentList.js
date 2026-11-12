import { useSiteContent } from "./useSiteContent";

// The manifest has no repeater type, so list content is flattened into numbered
// fields: <prefix>_<n>_<prop>. These helpers rebuild the arrays at render time,
// falling back per item to the shipped copy so nothing breaks if a field is
// missing or empty.

export function useContentList(page, prefix, fallback, props, listProp) {
  const c = useSiteContent(page);
  return fallback.map((item, i) => {
    const n = i + 1;
    const out = { ...item };
    props.forEach((p) => {
      if (item[p] !== undefined) out[p] = c(`${prefix}_${n}_${p}`, item[p]);
    });
    if (listProp) {
      const arr = [];
      for (let j = 1; j <= 6; j++) {
        const fallbackLine = (item[listProp] || [])[j - 1] || "";
        const v = c(`${prefix}_${n}_${listProp}_${j}`, fallbackLine);
        if (v) arr.push(v);
      }
      out[listProp] = arr;
    }
    return out;
  });
}

// For plain string lists (e.g. pillars): <prefix>_<n>
export function useContentStrings(page, prefix, fallback) {
  const c = useSiteContent(page);
  return fallback.map((s, i) => c(`${prefix}_${i + 1}`, s));
}
