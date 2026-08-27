# Emporio Zeva / Not-A-Salami — PRD

## Original problem statement
User wants a refresh of Emporio Zeva / Not A Salami: React + FastAPI + MongoDB. Elegant editorial / luxury fashion aesthetic for an artisan Sicilian cocoa confection brand. Full marketing site (home, collection, product detail, about/contact, journal), custom corporate pitch-deck generator, and a WP-style Admin Dashboard to manage users, media, custom pages, site content, products, decks, inquiries, waitlist, newsletter.

## Architecture
- **Frontend**: React (CRA). Admin at `/admin` (multi-tab shell). Marketing pages under `/`, `/collection`, `/products/:slug`, `/our-story`, `/journal`, `/contact`, `/ritual`, `/p/:slug`, `/deck/:slug`, `/corporate`.
- **Backend**: FastAPI, all routes prefixed `/api`. `server.py` (~2500 lines) + `decks.py` + `emailer.py`.
- **DB**: MongoDB (Motor). GridFS for media binaries. Collections: `users`, `media`, `media_files.*` (GridFS), `pages`, `products`, `journal`, `decks`, `settings`, `inquiries`, `waitlist`, `newsletter`.
- **Auth**: JWT (8h), bcrypt password hashing, brute-force lockout (5 attempts / 15 min per IP+email). RBAC: `admin` | `editor` | `viewer`.

## Integrations
- **Emergent LLM key** — Claude Sonnet 4.5 (deck intros), Gemini Nano Banana (product imagery).
- **Resend** — waitlist / inquiry / newsletter emails, admin invites. `RESEND_API_KEY` in `/app/backend/.env`.
- **Clearbit + DuckDuckGo icons** — logo lookup (no key).

## What's been implemented (highlights)
- Marketing pages + CMS-editable "Site Content".
- Admin Dashboard with Pages, Media, Products, Journal, Decks, Users, Settings, Inquiries, Waitlist, Newsletter.
- Media Library on **GridFS** (ephemeral-container safe) + HEIC → JPEG auto-conversion.
- Admin invites (Resend), self-service Profile/Password updates.
- Deck slides 5/7/8 fully editable via `SlideEditor.jsx` `ListField`; 3-tier pricing including "Il Mini".
- Deck **Copy** feature (`POST /api/admin/decks/{id}/copy`) with optional custom `client_name` and rename prompt on the client. **(Feb 2026)**

## Test credentials
See `/app/memory/test_credentials.md`.

## Backlog (prioritized)
### P1
- Integrate ParcelPath or another shipping provider.
- Auto-play / "demo mode" for `/corporate` deck for unattended displays.
### P2
- Real discount-code flow tied to the newsletter subscription.
- "Compare to current" toggle in Revisions History drawer (side-by-side diff).
### Refactor
- Break `/app/backend/server.py` into `/routes/` + `/models/` — currently ~2500 lines.
