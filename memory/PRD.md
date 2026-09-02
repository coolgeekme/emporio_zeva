# Emporio Zeva / Not-A-Salami — PRD

## Original problem statement
User wants a refresh of Emporio Zeva / Not A Salami: React + FastAPI + MongoDB. Elegant editorial / luxury fashion aesthetic for an artisan Sicilian cocoa confection brand. Full marketing site (home, collection, product detail, about/contact, journal), custom corporate pitch-deck generator, and a WP-style Admin Dashboard to manage users, media, custom pages, site content, products, decks, inquiries, waitlist, newsletter.

## Architecture
- **Frontend**: React (CRA). Admin at `/admin` (multi-tab shell). Public routes: `/`, `/collection`, `/products/:slug`, `/our-story`, `/journal`, `/journal/:slug`, `/contact`, `/ritual`, `/corporate-experiences`, `/p/:slug`, `/deck/:slug`, `/corporate` (legacy deck).
- **Backend**: FastAPI, all routes prefixed `/api`. `server.py` (~2500 lines) + `decks.py` + `emailer.py`.
- **DB**: MongoDB (Motor). GridFS for media binaries. Collections: `users`, `media`, `media_files.*`, `pages`, `products`, `journal`, `decks`, `settings`, `inquiries`, `waitlist`, `newsletter`.
- **Auth**: JWT (8h), bcrypt password hashing, brute-force lockout (5 attempts / 15 min per IP+email). RBAC: `admin` | `editor` | `viewer`.

## Integrations
- **Emergent LLM key** — Claude Sonnet 4.5 (deck intros), Gemini Nano Banana (product imagery).
- **Resend** — waitlist / inquiry / newsletter emails, admin invites. `RESEND_API_KEY` in `/app/backend/.env`.
- **Clearbit + DuckDuckGo icons** — logo lookup (no key).

## What's been implemented (highlights)
- Marketing pages + CMS-editable Site Content.
- Admin Dashboard with Pages, Media, Products, Journal, Decks, Users, Settings, Inquiries, Waitlist, Newsletter.
- Media Library on **GridFS** + HEIC → JPEG auto-conversion.
- Admin invites (Resend), self-service Profile/Password updates.
- Deck slides 5/7/8 fully editable; 3-tier pricing including "Il Mini".
- Deck **Copy** feature (`POST /api/admin/decks/{id}/copy`) with optional custom `client_name` + rename prompt.
- **Feb 2026 (commit 98aa6bf)**:
  - New public **/corporate-experiences** page with structured corporate inquiry form (kind, company, preferred_date, location, num_guests, occasion, special_requirements — optional and backward-compatible on `POST /api/inquiries`).
  - Nav + footer link to Corporate Experiences.
  - Admin: live search on Inquiries/Waitlist/Newsletter with match count; Company + Request columns on Inquiries table + CSV; Request-details block in inquiry dialog; Pages Copy/Duplicate button; Settings helper text on Instagram handle.
  - Instagram link renders only when handle is set (footer + contact page both use `settings.general.instagram_handle`).

## Test credentials
See `/app/memory/test_credentials.md`.

## Backlog (prioritized)
### P1
- Integrate ParcelPath or another shipping provider.
- Auto-play / demo mode for `/corporate` deck for unattended displays.
- Add at least one inquiry notification recipient in Settings so corporate-inquiry emails actually send.
### P2
- Real discount-code flow tied to newsletter subscription.
- "Compare to current" toggle in Revisions History drawer (side-by-side diff).
- Inquiries CSV: export the friendly "Request" label alongside `kind` (currently exports raw subject).
- Corporate form: replace native date input with a styled shadcn calendar.
- `POST /api/inquiries`: accept JSON number for `num_guests` (currently `str`-only, 422 on int).
### Refactor
- Extract shared `instagramUrl()` helper (logic still duplicated in `Footer.jsx` and `Contact.jsx`).
- Break `/app/backend/server.py` into `/routes/` + `/models/` (~2500 lines).
- Break `/app/frontend/src/pages/Admin.jsx` into modules (~1600 lines, mixes login + 6 panels).
