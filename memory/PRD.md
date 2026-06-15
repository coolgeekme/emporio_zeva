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
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/ | — | health |
| GET | /api/products | — | list products |
| GET | /api/products/{slug} | — | product detail (404 if missing) |
| POST | /api/inquiries | — | create inquiry |
| POST | /api/newsletter | — | subscribe (idempotent on email) |
| POST | /api/waitlist | — | join waitlist (idempotent on email+slug) |
| POST | /api/admin/login | — | exchange `ADMIN_PASSWORD` for an 8h JWT |
| GET | /api/admin/me | Bearer | verify admin token |
| GET | /api/admin/inquiries | Bearer | list inquiries (admin) |
| GET | /api/admin/newsletter | Bearer | list subscribers (admin) |
| GET | /api/admin/waitlist | Bearer | list waitlist entries (admin) |

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
- ✅ **ProductDetail refresh** (2026-02) — price/weight block removed; "Inquire to order" CTA replaced with "Join the Waitlist" that opens the same shared WaitlistDialog.
- ✅ **Home collection teaser** (2026-02) — price removed; each of the 3 featured products has its own "Join the Waitlist" button + "View piece" link, opening the shared WaitlistDialog without leaving the home page.
- ✅ **Admin dashboard** at `/admin` (2026-02) — single shared-password login (`ADMIN_PASSWORD` env), JWT bearer in sessionStorage (8h TTL), brute-force lockout (5 attempts / 15 min per IP), tabbed dashboard for Waitlist + Inquiries + Newsletter, per-tab CSV export, refresh, sign out. No Nav/Footer chrome on the admin shell.
- ✅ **Custom corporate decks** (2026-02) — Admin enters a client name only; backend auto-fetches the domain (Clearbit autocomplete, exact-name match preferred), builds a logo URL (DuckDuckGo icons), and generates a warm intro sentence (Claude Sonnet 4.5 via Emergent LLM key) in the brand voice. Decks save with auto-slug `<name>-<6hex>` and are sharable at public route `/deck/:slug`. Public route increments `view_count` and `last_viewed_at` atomically. Admin can preview before saving, regenerate the intro, copy link, open, delete. The same BlackRock cinematic deck is reused — only the cover slide personalizes.
- ✅ **Image rescue** (2026-02 · current) — Replaced 9 broken `emporiozeva.com` hotlinks (origin host suspended). Mapped 3 real Emergent assets (`Salami_board.JPG`, `image1.jpeg`, `banner-2.jpg`) across products + hero slots; filled founder/Sicily/Italian-moment/journal slots with curated royalty-free Unsplash editorial stock. Replaced `SF_MADE_BADGE` raster with inline SVG wordmark (parchment/ember/ochre, Bodoni Moda) — no external dep, crisp at any DPR.
- ✅ **Unique product imagery for variants** (2026-02 · current) — Generated 4 product photos via Gemini Nano Banana (gemini-3.1-flash-image-preview) using `Salami_board.JPG` as a reference shot, matching lighting/palette/composition. Outputs: Pistacchio di Bronte hero+slice (chocolate salami w/ visible Sicilian pistachio inclusions), Il Mini hero+detail (pocket-size variant next to espresso cup for scale). Saved at `/app/backend/static/products/*.png`, served via `/api/static/products/<filename>`. Generation script at `/app/backend/scripts/generate_product_images.py` (idempotent: skips files that already exist).
- ✅ **WordPress-style Admin v2** (2026-02 · current) — Complete CMS layer at `/admin`. New sidebar shell with 10 panels: Dashboard, Pages, Media, Journal, Decks, Inquiries, Waitlist, Newsletter, Users, Settings. **Multi-user RBAC** (`admin` / `editor` / `viewer`) with bcrypt-hashed passwords stored in `users` collection, JWT (8h TTL) keyed on `{sub, email, role}`, brute-force lockout per `(ip, email)`. **Dashboard** shows 8 live stat cards + quick-draft + latest signups/inquiries. **Pages CMS** with parent/child hierarchy, auto-slug, draft/published status, `show_in_nav` & `show_in_footer` flags (rendered at public `/p/<slug>`); bulk publish/unpublish/delete. **Media library** with drag-and-drop upload (image/video/audio/PDF ≤25MB), alt-text/caption editing, served at `/api/static/media/`. **Users panel** (admin-only) with create/edit/delete, guards against deleting self & last admin. **Settings** (admin-only write, viewer read) — General (brand identity wired into Nav/Footer/Contact email) + Reading (journal pagination, future-product visibility, journal enabled). All legacy panels (Decks/Journal/Waitlist/Inquiries/Newsletter) preserved with their existing CRUD + CSV export. 26/26 new v2 pytest cases pass; 18/18 legacy admin tests migrated to email+password and pass. Files: `/app/backend/server.py` (models, endpoints, seed_admin_user, ensure_indexes), `/app/frontend/src/admin/panels/{Dashboard,Pages,Media,Users,Settings}.jsx`, `/app/frontend/src/pages/Admin.jsx` (AdminShell), `/app/frontend/src/pages/PagePublic.jsx`, updated `Nav.jsx` + `Footer.jsx`.
- ✅ **Products CRUD + Site Content editor** (2026-02 · current) — Admin can now CREATE / EDIT / DELETE products and edit field-level content on every marketing page. **Products panel**: list grouped by status (active/future/archived), full editor with name/slug/tagline/badge/price/weight/pronunciation/status/short+long description/ingredients/pairings/serving + multi-image picker integrated with the Media library. **Site Content editor**: tabbed UI over a Python-side `SITE_CONTENT_MANIFEST` covering 6 pages (home, collection, ritual, our_story, journal_index, contact) with ~50 editable fields total — text, textarea, and image types — each with a "Reset to default" button. Frontend `useSiteContent` hook fetches per-page overrides and falls back to manifest defaults. PATCH uses dotted-path `$set` so partial updates merge per-key. **`seed_products` switched from upsert to insert-only** so admin edits to products persist across backend restarts. 24 new + 26 regression = **50/50 pytest** pass. Files: `/app/backend/server.py` (Product CRUD endpoints, ProductCreate/ProductUpdate models, SITE_CONTENT_MANIFEST, /admin/site-content + /site-content/{page}), `/app/frontend/src/admin/panels/{Products,SiteContent}.jsx`, `/app/frontend/src/hooks/useSiteContent.js`, refactored `Home/Collection/Ritual/OurStory/Journal/Contact.jsx`.
- ✅ **Deck overrides + Preview + Revision history** (2026-02 · current) — Three major capabilities shipped together. **Deck overrides:** `Deck` model gains `template_mode` (`"template"` | `"custom"`) and `slide_overrides` keyed by slide id; new admin `SlideEditor` (replaces legacy EditDeckDialog) exposes mode toggle + deck basics + collapsible sections for all 11 slides; Template mode locks slides 2-7, 9-11; Custom mode unlocks all. BlackRock.jsx wraps every text/image with `ov(slide_key, field_key, default)` fallback. `react-markdown` + `remark-gfm` installed; `SlideMarkdown` component renders **bold**, *italic*, bullets, paragraphs, links with both light + dark variants. **Preview before save:** sessionStorage-keyed working buffer + `?preview=<key>` URL — supported on Pages (/p/<slug>), Site Content (/, /collection, /ritual, /our-story, /journal, /contact), and Decks (/deck/<slug>). Buffers auto-clear after 1h. **Revision history:** new `revisions` collection storing per-doc snapshots (bounded at 50/doc, pruned automatically); endpoints `/admin/revisions/{doc_type}/{doc_id}` list / get / revert; revert writes a "pre-revert" snapshot for undo; History drawer component added to Pages, Site Content, Products, and Decks editors. Also: Ritual cards swapped (3=Share, 4=Savor) and matching H1 reorder ("Sliced. Served. Shared. Savored."); `/p/<slug>` overline changed from "Emporio Zeva" to "Not A Salami"; CMS pages now support `![alt](url)` markdown image embeds via an "Insert image" picker in the body editor; PagePublic renders full markdown with custom h2/h3/ul/ol/img styling. **82/82 pytest pass + zero frontend bugs** per iteration_6.json. Files: `/app/backend/server.py` (revisions endpoints + write_revision helper + Deck model extensions), `/app/frontend/src/admin/{SlideEditor,HistoryDrawer,deckManifest}.jsx`, `/app/frontend/src/pages/BlackRock.jsx` (override-aware + SlideMarkdown), `/app/frontend/src/pages/{DeckView,PagePublic}.jsx` (preview support), `/app/frontend/src/admin/panels/{Pages,SiteContent,Products}.jsx` (Preview + History buttons), `/app/frontend/src/hooks/useSiteContent.js` (preview support).
- ✅ **Persistent media storage via GridFS** (2026-02 · current) — Fixes broken-link bug where every redeploy wiped media uploads. Root cause: files were being written to `/app/backend/static/media/` on the container's local filesystem, which is ephemeral in Kubernetes. **Fix:** media binaries now live in MongoDB GridFS bucket `media_files`; `MediaItem` gains an optional `gridfs_id` field; new public streaming endpoint `GET /api/media/{id}` returns the file with the right MIME, `Content-Length`, and a 30-day immutable `Cache-Control`. Upload streams in 1 MB chunks straight into GridFS and aborts cleanly if the 25 MB cap is exceeded. Delete removes both the doc and the GridFS file. **Cleanup migration** runs on startup and removes orphaned legacy media records whose binaries were lost (so the gallery stops showing broken thumbnails). Existing `/api/static/products/*` (committed product imagery) is unaffected. Updated media lifecycle pytest verifies byte-identical round-trip via GridFS. **82/82 pytest still pass.** Files: `/app/backend/server.py` (`media_bucket`, rewritten `/admin/media` POST/DELETE, new `/media/{id}`, `cleanup_orphaned_media`), `/app/backend/tests/test_admin_v2_api.py`.
- ✅ **HEIC support for iPhone uploads** (2026-02 · current) — Admin can now drop `.heic` / `.heif` files (the default iPhone photo format) into the Media library. Browsers other than Safari can't render HEIC, so the backend transparently **converts to JPEG on upload** using `pillow_heif` + `Pillow`, preserving EXIF orientation (no sideways iPhone photos). Detection handles both proper `image/heic` MIME and the `application/octet-stream` + `.heic` extension fallback that some browsers send. Original filename is preserved in `original_filename`; the stored binary is JPEG (quality 88, progressive). Frontend `accept` attribute extended to `.heic,.heif` and copy updated. 2 new pytest cases cover both detection paths. **84/84 pytest pass.** Files: `/app/backend/server.py` (HEIC helpers + rewritten upload), `/app/backend/requirements.txt` (`pillow-heif==1.4.0`), `/app/frontend/src/admin/panels/Media.jsx`.
- ✅ **Deck slide image swaps** (2026-02 · current) — Shipped permanent default images for deck slides **2, 4, and 6** from user-provided photos, all served from `/api/static/decks/` so they ship with every deploy and survive DB wipes. Slide 2 ("Italian Tradition") uses a converted HEIC rooftop view of Modica; slide 4 ("From production to your recipient's door") uses a close-up of sliced Not-A-Salami; slide 6 ("A truly Sicilian treat") uses the branded NAS-seal wood-board hero. All images EXIF-rotated, resized to ≤2200px on the longest edge, saved as progressive JPEGs (q=88). Each has a dedicated `IMAGES.deck_slideN_*` key in `content.js`, leaving `IMAGES.founder` / `IMAGES.gift` untouched for use elsewhere. Per-slide deck overrides still take precedence — these are just the new defaults. Files: `/app/frontend/src/content.js`, `/app/frontend/src/pages/BlackRock.jsx`, `/app/backend/static/decks/`.
- ✅ **Resend transactional emails** (2026-02 · current) — Three site flows now send real email via Resend with branded HTML templates: **Corporate inquiry** (`/api/inquiries`), **Waitlist** (`/api/waitlist`), **Newsletter** (`/api/newsletter`). Each fires two emails: an internal notification to `RESEND_NOTIFY_TO` (currently `reggie+nas@coolgeek.me`) with `reply_to` set to the customer's address, plus a hand-written customer auto-reply from `RESEND_FROM` (`Eva <hello@notasalami.com>`) with `reply_to` pointed back to ops. All sends run as `asyncio.create_task` so form submission stays sub-200ms even if Resend is slow, and all failures are logged but never raised — a Resend outage cannot break form submission. Brand-styled HTML wrapper with the NAS palette + Georgia serif body. Global `RESEND_ENABLED=true/false` env toggle to pause all flows without code. Files: `/app/backend/emailer.py` (new module), `/app/backend/server.py` (3 endpoints wired), `/app/backend/.env` (`RESEND_API_KEY`, `RESEND_FROM`, `RESEND_NOTIFY_TO`, `RESEND_ENABLED`), `/app/backend/requirements.txt` (`resend==2.30.1`). End-to-end tested with curl — all 6 sends returned Resend message IDs. **84/84 pytest pass.**
- ✅ **User invites + self-service profile** (2026-02 · current) — Admin can invite new admins/editors/viewers directly from the Users panel. **Invite flow:** "Send invite" button → backend mints a 12-char temporary password via `secrets.token_urlsafe` (ambiguous chars stripped), bcrypt-hashes it, stores `must_change_password=True` on the user record, and sends a brand-styled invite email via Resend containing the email + temp password + a "Sign in" button. **First sign-in gate:** when `user.must_change_password` is true, Admin.jsx renders a dedicated `ForcePasswordChange` screen (using the new `ProfileSection` component in `forceChange` mode) before letting the user into the dashboard. Setting their own password automatically clears the flag. **Self-service profile:** new `PATCH /api/admin/me` accepts `name` / `email` / `current_password` + `new_password`. Email and password changes require the current password as a re-auth check; email uniqueness is enforced. Users panel gains a **Resend invite** action that mints a fresh temp password and re-sends the email. Admin-initiated password resets on other users automatically re-set `must_change_password=True` so admins never know a teammate's standing password. New `ProfileSection` component renders the "Your profile" + "Change password" cards inside Settings, and the standalone force-change screen reuses it. **92/92 pytest pass** (8 new TestInviteAndProfile cases). Files: `/app/backend/server.py` (PublicUser + MeUpdate models, rewritten `POST /admin/users`, new `POST /admin/users/{id}/resend-invite`, new `PATCH /admin/me`, `_generate_temp_password`), `/app/backend/emailer.py` (`notify_invite`), `/app/frontend/src/admin/panels/Users.jsx` (invite-not-password UX + Resend invite button + "Awaiting first sign-in" status pill), `/app/frontend/src/admin/panels/ProfileSection.jsx` (new), `/app/frontend/src/admin/panels/Settings.jsx` (mounts ProfileSection), `/app/frontend/src/pages/Admin.jsx` (`ForcePasswordChange` gate, `onUserUpdated` plumbing), `/app/backend/tests/test_admin_v2_api.py` (TestInviteAndProfile).

## Admin Auth (new)
- `ADMIN_PASSWORD` and `JWT_SECRET` live in `/app/backend/.env`
- Endpoints: `POST /api/admin/login`, `GET /api/admin/me`, `GET /api/admin/{waitlist|inquiries|newsletter}` (Bearer required)
- Decks: `POST /api/admin/decks/{preview|regenerate-intro|}`, `GET/PATCH/DELETE /api/admin/decks[/{id}]`, public `GET /api/decks/{slug}`
- Credentials documented in `/app/memory/test_credentials.md`

## 3rd-Party Integrations
- **Emergent LLM key** → Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `emergentintegrations.llm.chat.LlmChat` — generates corporate deck intro lines.
- **Clearbit autocomplete** (free, no auth) — company-name → domain lookup.
- **DuckDuckGo icons** (`icons.duckduckgo.com/ip3/{domain}.ico`) — logo image URL.

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
