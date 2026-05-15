# Emporio Zeva — Brand Site Refresh · PRD

## Original Problem Statement
> Please review this website: https://www.emporiozeva.com/
> I would like a refresh of this site to make it look more relevant. Use the same images and elements, but make it more in tune with the business and follow more recent best practices.
> Keep in mind this is currently on Woocommerce, but we can change.

## User Choices (gathered before build)
- **Scope:** Full marketing site — Home + Collection + Product Detail + Our Story + Journal + Contact
- **Stack:** Off WooCommerce — open to a modern stack. Interested in eventual ParcelPath / shipping provider integration.
- **Design direction:** Elegant editorial / luxury (translated to luxury artisan food aesthetic — Aesop / Tartine vibe)
- **Language:** English only (US market — Italian product sold in the States)
- **Integrations this iteration:** Showcase only (no payments)

## Brand Brief (sourced from existing site)
- **Brand:** Emporio Zeva · flagship product **Not-A-Salami**
- **What it is:** A sliceable Sicilian cocoa confection (Salame al Cioccolato). Looks like cured salumi, is 100% chocolate + crisp cookie shards.
- **Founder:** Eva, from Sicily, now in San Francisco. Recipe from her grandmother Margherita.
- **Accolade:** Selected by SF Made for "Here & Now" 2024.
- **Tagline pool:** "Born in Sicily. Served in slices.", "Slice thin. Serve slow. Share generously.", "One slice. One cup. One pause."

## Architecture
- **Frontend:** React 19 + React Router 7 + Tailwind 3 (custom parchment/cocoa/ember palette). Bodoni Moda (headings) + Manrope (body) via Google Fonts.
- **Backend:** FastAPI + Motor (async MongoDB). Pydantic v2 models. EmailStr validation.
- **DB:** MongoDB collections — `products`, `inquiries`, `newsletter`, `waitlist`.
- **Seeding:** 3 products seeded on FastAPI startup if `products` collection is empty.

## API Surface (all `/api/*`)
| Method | Path | Purpose |
|---|---|---|
| GET | /api/ | health |
| GET | /api/products | list products |
| GET | /api/products/{slug} | product detail (404 if missing) |
| POST | /api/inquiries | create inquiry (name, email, phone, subject, message, product_slug?) |
| GET | /api/inquiries | list inquiries (admin) |
| POST | /api/newsletter | subscribe (idempotent on email) |
| GET | /api/newsletter | list subscribers (admin) |
| POST | /api/waitlist | join waitlist for a product (name, email, product_slug, note?). Idempotent on (email, product_slug). |
| GET | /api/waitlist | list waitlist entries (admin) |

## Pages Built
1. **Home** — editorial asymmetric hero, press marquee, "It looks like salami / it is entirely chocolate" illusion section, collection teaser (live from API), serving ritual (slice / pair / share), dark testimonials block, journal teaser.
2. **Collection** — editorial product grid (asymmetric column spans) with badges, prices, weights.
3. **Product Detail** — two-column sticky layout, image stack on left, sticky info + ingredients/pairings/serving accordion + inline Inquiry form on right. 404 state implemented.
4. **Our Story** — magazine-style long form. Founder image, Sicilian landscape interlocking with Italian moment image, oversized pull-quote.
5. **Journal** — staggered article list using the original 3 blog images.
6. **Contact** — left aside (atelier + direct + shipping note), right full Inquiry form.

## What's Implemented (Iteration 1 — Jan 2026)
- ✅ All 6 pages built per design guidelines
- ✅ Custom Tailwind theme (parchment #F9F6F0 / cocoa #2A1F1D / ember #C05A3A / ochre #B9935A)
- ✅ Bodoni Moda + Manrope typography
- ✅ Glass nav with mobile menu
- ✅ Footer with SF Made badge, newsletter form, sitemap
- ✅ Backend: products, inquiries, newsletter — all working, validated with EmailStr
- ✅ MongoDB `_id` excluded from all responses (no leakage)
- ✅ Reuses ALL original site images (10 image URLs from emporiozeva.com)
- ✅ data-testid on every interactive element
- ✅ Scroll-reveal animations, image zoom on hover, marquee press strip
- ✅ Tested: 14/14 backend tests green; all critical frontend flows verified by testing agent
- ✅ ProductDetail 404 not-found state
- ✅ **Waitlist** — per-product "Join the Waitlist" CTAs on Collection cards; price/weight removed from cards; modal dialog captures name, email, optional note; persists to `waitlist` collection (idempotent on email+slug). Added 2026-02.

## Backlog (P1 / P2 — future iterations)
- **P1 — ParcelPath / shipping integration** (user expressed interest)
- **P1 — Stripe Checkout** (test mode) when client is ready to sell
- **P1 — Admin dashboard** to view/manage inquiries, newsletter, and waitlist
- **P1 — Send transactional email** for inquiries + waitlist confirmation (Resend/SendGrid)
- **P2 — Full journal CMS** (currently 3 static teaser cards)
- **P2 — Wholesale portal** with tiered pricing
- **P2 — Gift card flow**
- **P2 — Recipe / serving-card download PDFs**
- **P2 — Auto-play / demo mode for `/blackrock` pitch deck** (trade-show display)
- **P2 — Migrate `@app.on_event` → `lifespan` handler** (FastAPI deprecation)

## Test Credentials
N/A — no auth implemented.

## Notes
- Backend URL is consumed only via `process.env.REACT_APP_BACKEND_URL` on the frontend; backend uses `MONGO_URL` + `DB_NAME`.
- Backend has 3 seed products: Classic Cocoa ($32), Tavola Gift Board ($78), Pistachio di Bronte (in development).
- Showcase only — all CTAs say "Inquire to order" / "Join the waitlist" instead of "Add to cart".
