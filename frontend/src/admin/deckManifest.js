// SLIDE_MANIFEST drives both the deck override admin UI and the deck render
// fallback. Each slide lists its overridable fields with type + label.
// Frontend treats a missing/empty override as "use the hardcoded default".
//
// Field types:
//   text     — single line input
//   textarea — multi-line input (also used for short copy without markdown)
//   markdown — multi-line, rendered with react-markdown (paragraphs, **bold**,
//              *italic*, - bullets, [links](url))
//   image    — URL, with Browse media-library button
//
// The TEMPLATE_SLIDES set marks which slides are editable in Template mode.

export const TEMPLATE_SLIDES = new Set(["slide_1_cover", "slide_8_pricing"]);

export const SLIDE_MANIFEST = [
  {
    key: "slide_1_cover",
    label: "Slide 1 · Cover",
    fields: [
      { key: "label_top", type: "text", label: "Top label (e.g. 'Confidential · Prepared for X')" },
      { key: "title_main", type: "textarea", label: "Title — main text" },
      { key: "title_italic", type: "text", label: "Title — italic ending (cocoa-ember color)" },
      { key: "subtitle", type: "markdown", label: "Subtitle / intro paragraph" },
      { key: "prepared_by_label", type: "text", label: "Stat 1 — label" },
      { key: "prepared_by_value", type: "text", label: "Stat 1 — value" },
      { key: "date_label", type: "text", label: "Stat 2 — label" },
      { key: "date_value", type: "text", label: "Stat 2 — value (blank for auto-current month)" },
      { key: "audience_label", type: "text", label: "Stat 3 — label" },
      { key: "audience_value", type: "text", label: "Stat 3 — value" },
      { key: "hero_image", type: "image", label: "Hero image (right column)" },
    ],
  },
  {
    key: "slide_2_tradition",
    label: "Slide 2 · Italian Tradition",
    fields: [
      { key: "overline", type: "text", label: "Overline" },
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line (ember color)" },
      { key: "body", type: "markdown", label: "Body" },
      { key: "letter", type: "markdown", label: "Founder letter quote" },
      { key: "signature", type: "text", label: "Signature line" },
      { key: "image", type: "image", label: "Image" },
    ],
  },
  {
    key: "slide_3_why",
    label: "Slide 3 · A Different Kind of Chocolate",
    fields: [
      { key: "overline", type: "text", label: "Overline" },
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
      { key: "body", type: "markdown", label: "Body" },
      { key: "pillars_label", type: "text", label: "Pillars overline" },
      { key: "image", type: "image", label: "Image" },
    ],
  },
  {
    key: "slide_4_product",
    label: "Slide 4 · One Product",
    fields: [
      { key: "overline", type: "text", label: "Overline" },
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
      { key: "body", type: "markdown", label: "Body" },
      { key: "image", type: "image", label: "Image" },
    ],
  },
  {
    key: "slide_5_use_cases",
    label: "Slide 5 · Use Cases",
    fields: [
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
    ],
  },
  {
    key: "slide_6_expression",
    label: "Slide 6 · Pure Expression",
    fields: [
      { key: "overline", type: "text", label: "Overline" },
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
      { key: "body", type: "markdown", label: "Body" },
      { key: "image", type: "image", label: "Image" },
    ],
  },
  {
    key: "slide_7_customization",
    label: "Slide 7 · Customization",
    fields: [
      { key: "overline", type: "text", label: "Overline" },
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
      { key: "body", type: "markdown", label: "Body" },
    ],
  },
  {
    key: "slide_8_pricing",
    label: "Slide 8 · Offer / Pricing",
    fields: [
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
      { key: "subtitle", type: "markdown", label: "Subtitle paragraph" },
      { key: "package_1_badge", type: "text", label: "Package 1 — badge (optional)" },
      { key: "package_1_name", type: "text", label: "Package 1 — name" },
      { key: "package_1_box", type: "text", label: "Package 1 — box description (e.g. 'curated gift box')" },
      { key: "package_1_price", type: "text", label: "Package 1 — price (e.g. '$58')" },
      { key: "package_1_unit", type: "text", label: "Package 1 — unit suffix (e.g. 'per gift')" },
      { key: "package_1_blurb", type: "markdown", label: "Package 1 — blurb" },
      { key: "package_1_includes", type: "markdown", label: "Package 1 — includes (one bullet per line, no `- ` prefix needed)" },
      { key: "package_1_min", type: "text", label: "Package 1 — minimum / footnote" },
      { key: "package_2_badge", type: "text", label: "Package 2 — badge (optional)" },
      { key: "package_2_name", type: "text", label: "Package 2 — name" },
      { key: "package_2_box", type: "text", label: "Package 2 — box description" },
      { key: "package_2_price", type: "text", label: "Package 2 — price" },
      { key: "package_2_unit", type: "text", label: "Package 2 — unit suffix" },
      { key: "package_2_blurb", type: "markdown", label: "Package 2 — blurb" },
      { key: "package_2_includes", type: "markdown", label: "Package 2 — includes (one bullet per line)" },
      { key: "package_2_min", type: "text", label: "Package 2 — minimum / footnote" },
    ],
  },
  {
    key: "slide_9_fulfillment",
    label: "Slide 9 · Fulfillment",
    fields: [
      { key: "overline", type: "text", label: "Overline" },
      { key: "title", type: "textarea", label: "H2" },
      { key: "subtitle", type: "markdown", label: "Subtitle" },
    ],
  },
  {
    key: "slide_10_process",
    label: "Slide 10 · How It Works",
    fields: [
      { key: "overline", type: "text", label: "Overline" },
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
      { key: "subtitle", type: "markdown", label: "Subtitle" },
    ],
  },
  {
    key: "slide_11_contact",
    label: "Slide 11 · Closing & Contact",
    fields: [
      { key: "title_line1", type: "text", label: "H2 line 1" },
      { key: "title_italic", type: "text", label: "H2 italic line" },
      { key: "body", type: "markdown", label: "Body" },
      { key: "form_title", type: "text", label: "Form box H3" },
      { key: "form_overline", type: "text", label: "Form box overline" },
    ],
  },
];

// Helper: returns the per-slide field value falling back to undefined.
// In Template mode, only TEMPLATE_SLIDES are honored when rendering.
export function getSlideField(deck, slideKey, fieldKey) {
  if (!deck?.slide_overrides) return undefined;
  if (deck.template_mode === "template" && !TEMPLATE_SLIDES.has(slideKey)) {
    return undefined;
  }
  const slide = deck.slide_overrides[slideKey];
  if (!slide) return undefined;
  const v = slide[fieldKey];
  return v === undefined || v === null || v === "" ? undefined : v;
}
