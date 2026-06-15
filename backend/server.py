from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os
import re
import logging
import asyncio
import secrets
import shutil
import jwt
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import emailer  # noqa: E402  -- relies on env loaded above

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
# GridFS bucket for persistent media storage (uploaded images, video, audio, PDFs).
# Files in the local filesystem don't survive container redeploys; GridFS does.
media_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="media_files")

app = FastAPI(title="Emporio Zeva API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    tagline: str
    price: str  # display only; showcase site
    weight: str
    description: str
    long_description: str
    ingredients: List[str]
    pairings: List[str]
    serving: List[str]
    images: List[str]
    badge: Optional[str] = None
    available: bool = True
    # "active" = currently sold; "future" = experiment / coming soon (drives waitlist UI)
    status: str = "active"
    pronunciation: Optional[str] = None


class ProductCreate(BaseModel):
    slug: Optional[str] = None
    name: str
    tagline: str = ""
    price: str = ""
    weight: str = ""
    description: str = ""
    long_description: str = ""
    ingredients: List[str] = Field(default_factory=list)
    pairings: List[str] = Field(default_factory=list)
    serving: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    badge: Optional[str] = None
    available: bool = True
    status: str = "active"
    pronunciation: Optional[str] = None


class ProductUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    tagline: Optional[str] = None
    price: Optional[str] = None
    weight: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    ingredients: Optional[List[str]] = None
    pairings: Optional[List[str]] = None
    serving: Optional[List[str]] = None
    images: Optional[List[str]] = None
    badge: Optional[str] = None
    available: Optional[bool] = None
    status: Optional[str] = None
    pronunciation: Optional[str] = None


class JournalArticle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    title: str
    excerpt: str
    image: str
    date: str
    read: str
    body: List[str]
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class JournalArticleUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    image: Optional[str] = None
    date: Optional[str] = None
    read: Optional[str] = None
    body: Optional[List[str]] = None
    order: Optional[int] = None


class InquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    subject: Optional[str] = "General Inquiry"
    message: str
    product_slug: Optional[str] = None


class Inquiry(InquiryCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class NewsletterCreate(BaseModel):
    email: EmailStr


class NewsletterEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WaitlistCreate(BaseModel):
    name: str
    email: EmailStr
    product_slug: str
    note: Optional[str] = ""


class WaitlistEntry(WaitlistCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BulkDelete(BaseModel):
    ids: List[str]


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminToken(BaseModel):
    token: str
    expires_at: str
    user: "PublicUser"


# ---------- User / Role models ----------
ROLES = ("admin", "editor", "viewer")


class PublicUser(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: str
    must_change_password: bool = False


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    # Optional. When omitted, the server generates a temporary password and
    # emails it to the user via Resend, forcing a change on first login.
    password: Optional[str] = None
    role: str = "viewer"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


class MeUpdate(BaseModel):
    """Self-service profile update. Email/password changes require the user's
    current password as a basic re-authentication step."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


# ---------- Page (CMS) models ----------
class PageCreate(BaseModel):
    slug: Optional[str] = None
    title: str
    excerpt: str = ""
    body: str = ""
    parent_id: Optional[str] = None
    menu_order: int = 0
    status: str = "draft"  # draft | published
    show_in_nav: bool = False
    show_in_footer: bool = False


class PageUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    excerpt: Optional[str] = None
    body: Optional[str] = None
    parent_id: Optional[str] = None
    menu_order: Optional[int] = None
    status: Optional[str] = None
    show_in_nav: Optional[bool] = None
    show_in_footer: Optional[bool] = None


class Page(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    title: str
    excerpt: str = ""
    body: str = ""
    parent_id: Optional[str] = None
    menu_order: int = 0
    status: str = "draft"
    show_in_nav: bool = False
    show_in_footer: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None


class BulkAction(BaseModel):
    ids: List[str]
    action: str  # delete | publish | unpublish


# ---------- Media models ----------
class MediaItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    mime_type: str
    size_bytes: int
    url: str
    alt_text: str = ""
    caption: str = ""
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    uploaded_by: Optional[str] = None
    # ObjectId (as str) of the file stored in GridFS bucket "media_files".
    # Optional only for legacy rows; new uploads always set this.
    gridfs_id: Optional[str] = None


class MediaUpdate(BaseModel):
    alt_text: Optional[str] = None
    caption: Optional[str] = None


# ---------- Settings ----------
class GeneralSettings(BaseModel):
    brand_name: str = "Not A Salami"
    tagline: str = "A truly Sicilian treat. For the unexpected."
    contact_email: str = "hello@emporiozeva.com"
    instagram_handle: str = "@notasalami"
    address: str = "San Francisco, CA"


class ReadingSettings(BaseModel):
    journal_per_page: int = 10
    show_future_products: bool = True
    journal_enabled: bool = True


class SiteSettings(BaseModel):
    general: GeneralSettings = Field(default_factory=GeneralSettings)
    reading: ReadingSettings = Field(default_factory=ReadingSettings)


class SettingsUpdate(BaseModel):
    general: Optional[GeneralSettings] = None
    reading: Optional[ReadingSettings] = None


class DeckCreate(BaseModel):
    client_name: str
    intro_text: Optional[str] = None
    logo_url: Optional[str] = None
    template_mode: str = "template"  # "template" | "custom"
    slide_overrides: Optional[dict] = None


class DeckUpdate(BaseModel):
    client_name: Optional[str] = None
    logo_url: Optional[str] = None
    intro_text: Optional[str] = None
    domain: Optional[str] = None
    template_mode: Optional[str] = None
    slide_overrides: Optional[dict] = None


class Deck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    client_name: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    intro_text: str
    # "template" = only slide_1 + slide_8 are editable in admin; "custom" = all slides
    template_mode: str = "template"
    # Free-form dict of slide-keyed overrides — schema enforced on the frontend
    # via SLIDE_MANIFEST. Each value is a per-field dict.
    slide_overrides: dict = Field(default_factory=dict)
    view_count: int = 0
    last_viewed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Admin auth ----------
JWT_ALGORITHM = "HS256"
ADMIN_TOKEN_TTL_HOURS = 8
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="Admin auth is not configured on this environment.",
        )
    return secret


def _bootstrap_admin_email() -> str:
    return os.environ.get("ADMIN_EMAIL", "admin@notasalami.com").lower()


def _bootstrap_admin_password() -> str:
    pw = os.environ.get("ADMIN_PASSWORD")
    if not pw:
        raise HTTPException(
            status_code=503,
            detail="Admin auth is not configured on this environment.",
        )
    return pw


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, AttributeError):
        return False


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _create_admin_token(user: dict) -> AdminToken:
    exp = datetime.now(timezone.utc) + timedelta(hours=ADMIN_TOKEN_TTL_HOURS)
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": exp,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)
    return AdminToken(
        token=token,
        expires_at=exp.isoformat(),
        user=PublicUser(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"],
            must_change_password=bool(user.get("must_change_password", False)),
        ),
    )


async def _load_user_from_token(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    if user.get("role") not in ROLES:
        raise HTTPException(status_code=403, detail="Invalid role")
    return user


def require_role(*allowed: str):
    """Dependency factory — restricts an endpoint to the given role(s)."""

    async def _inner(request: Request) -> dict:
        user = await _load_user_from_token(request)
        if user["role"] not in allowed:
            raise HTTPException(
                status_code=403, detail="Insufficient permissions"
            )
        return user

    return _inner


# Common shortcuts
require_admin = require_role("admin")
require_editor = require_role("admin", "editor")
require_viewer = require_role("admin", "editor", "viewer")


# ---------- Seed data ----------
SEED_PRODUCTS = [
    {
        "slug": "not-a-salami-classic",
        "name": "Not A Salami — Sicilian Cocoa Confection",
        "tagline": "A truly Sicilian treat. For the unexpected.",
        "price": "$32",
        "weight": "300g · 16–17 slices",
        "description": "Rich Guittard cocoa folded with crunchy biscotti, chocolate chips, and delicate sugar crystals. Hand-shaped, wrapped, and tied. Slice at the table.",
        "long_description": "Inspired by Eva's grandmother's recipe from Modica, Sicily — premium Guittard cocoa folded with crunchy biscotti, chocolate chips, and delicate sugar crystals. Hand-rolled and rested to develop its signature firm-yet-tender bite. Wrapped in parchment paper and gold foil so it arrives looking impossibly like cured meat. Cut it open at the table and watch the room turn.",
        "ingredients": [
            "Guittard cocoa powder",
            "Crunchy biscotti",
            "Chocolate chips",
            "Delicate sugar crystals",
            "Powdered sugar",
            "Unsalted butter",
        ],
        "pairings": [
            "Coffee",
            "Wine",
            "Fresh fruit",
            "Aged cheese",
        ],
        "serving": [
            "Store refrigerated. Remove from the fridge 15–20 minutes before serving — best at room temperature.",
            "Slice with a sharp knife, 1¼–1½ inches thick. Each slice reveals its own pattern.",
            "Arrange in an overlapping fan. Serve slowly, around good conversation.",
            "8-week shelf life unopened. Best enjoyed within 2 weeks of opening.",
        ],
        "images": [
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/zg1blozr_Salami_board.JPG",
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/1qyii5ao_banner-2.jpg",
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/55ktafkm_image1.jpeg",
        ],
        "badge": "The signature",
        "available": True,
        "status": "active",
    },
    # ---------------------------------------------------------------- FUTURE
    {
        "slug": "not-a-salami-pistachio",
        "name": "Pistacchio di Bronte",
        "tagline": "Coming from Eva's kitchen. Sicilian pistachio folded through dark cocoa.",
        "price": "TBD",
        "weight": "300g · 16–17 slices",
        "description": "A future flavor in development — pistachio di Bronte from Mount Etna's slopes, paired with our signature cocoa base.",
        "long_description": "Still in Eva's kitchen. We're testing batches of pistachio from Bronte, on the volcanic slopes of Etna — the same nuts our family used for celebrations. Join the list to be first when it launches.",
        "ingredients": [
            "Premium dark cocoa",
            "Pistachio di Bronte D.O.P.",
            "Italian cookie crumbs",
            "Unsalted butter, cane sugar",
        ],
        "pairings": [
            "Marsala secco",
            "Affogato",
            "A long Sunday",
        ],
        "serving": [
            "Slice thin to reveal the pistachio mosaic.",
            "Serve at room temperature with a chilled dessert wine.",
        ],
        "images": [
            "/api/static/products/pistacchio-di-bronte-hero.png",
            "/api/static/products/pistacchio-di-bronte-slice.png",
        ],
        "badge": "Future flavor",
        "available": False,
        "status": "future",
        "pronunciation": "pee-STAHK-kee-oh dee BRON-teh",
    },
    {
        "slug": "not-a-salami-mini",
        "name": "Il Mini",
        "tagline": "A pocket-sized Not A Salami. Perfect for one, two, or a quiet evening.",
        "price": "TBD",
        "weight": "120g · 6–7 slices",
        "description": "The full Classic Cocoa recipe, scaled down for smaller tables — and smaller gifts.",
        "long_description": "Eva keeps a few of these on her bench at all times. A scaled-down Not A Salami for the table of two, the office desk, or the corporate tasting flight. Same cocoa, same biscotti, same wrap-and-tie — half the size, twice the charm. We're finalizing batch sizes; reserve a spot to be first.",
        "ingredients": [
            "Rich cocoa",
            "Crunchy biscotti",
            "Chocolate chips",
            "Delicate sugar crystals",
            "Unsalted butter, cane sugar",
        ],
        "pairings": [
            "An afternoon espresso",
            "A glass of port",
            "A small, considered gift",
        ],
        "serving": [
            "Slice 1 inch thick — the whole piece serves two beautifully.",
            "Ideal for tasting flights and curated corporate boxes.",
        ],
        "images": [
            "/api/static/products/il-mini-hero.png",
            "/api/static/products/il-mini-detail.png",
        ],
        "badge": "On the workbench",
        "available": False,
        "status": "future",
        "pronunciation": "eel MEE-nee",
    },
    {
        "slug": "not-a-salami-assaggio",
        "name": "L'Assaggio · Tasting Slices",
        "tagline": "Pre-sliced sample portions, individually wrapped. For tables, gifts, and tastings.",
        "price": "TBD",
        "weight": "Per-slice · sold in sets",
        "description": "Single hand-cut slices, individually wrapped in waxed parchment. Designed for tasting events and corporate gifting drops.",
        "long_description": "L'Assaggio is the answer to one of our most-asked questions: 'Can I share Not A Salami without slicing it?' Yes — and now we have a format for it. Hand-cut slices, individually wrapped in waxed parchment, sealed with a wax dot. Ideal for hotels, restaurants, in-store sampling, and corporate welcome boxes. We're piloting sets of 12, 24, and 50.",
        "ingredients": [
            "Sliced from our Classic Cocoa",
            "Individually wrapped in food-safe waxed parchment",
            "Sealed with a small wax stamp",
        ],
        "pairings": [
            "Welcome amenities",
            "Tasting flights",
            "After-dinner mints — but better",
        ],
        "serving": [
            "Shelf-stable in original wrap for up to 6 weeks.",
            "Best enjoyed within 10 minutes of unwrapping.",
        ],
        "images": [
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/55ktafkm_image1.jpeg",
            "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1600&q=80",
        ],
        "badge": "Coming soon",
        "available": False,
        "status": "future",
        "pronunciation": "lah-SAH-jo",
    },
    # Retained for any old links — repositioned as a future bundle, not an active SKU
    {
        "slug": "not-a-salami-gift-board",
        "name": "The Tavola Gift Board",
        "tagline": "A future complete-table ritual. Cocoa salami, olive-wood board, linen napkin.",
        "price": "TBD",
        "weight": "Boxed · 16–17 slices",
        "description": "An upcoming complete table ritual — our cocoa salami with a small olive-wood board, a hemmed linen napkin, and a serving card.",
        "long_description": "Designed as a host gift or a quiet indulgence. Currently in development with a small San Francisco workshop. Join the waitlist to reserve a board from the first run.",
        "ingredients": [
            "Includes: 1× Not A Salami Classic",
            "1× Olive-wood serving board, ~10in",
            "1× Italian linen napkin",
            "1× Letterpress serving card",
            "Wrapped in natural kraft, sealed with wax",
        ],
        "pairings": [
            "Espresso, naturally",
            "A late afternoon with friends",
            "Anyone hosting their first dinner of the season",
        ],
        "serving": [
            "Present the board unwrapped at the table.",
            "Slice generously, share generously.",
            "Keep the board — it gets better with use.",
        ],
        "images": [
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/1qyii5ao_banner-2.jpg",
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/55ktafkm_image1.jpeg",
        ],
        "badge": "Future bundle",
        "available": False,
        "status": "future",
    },
]


async def seed_products():
    # Insert-only by slug — preserves admin edits on restart.
    # To reseed from code, drop a product manually (admin Delete) and restart.
    inserted = 0
    for p in SEED_PRODUCTS:
        existing = await db.products.find_one({"slug": p["slug"]})
        if existing:
            continue
        doc = Product(**p).model_dump()
        await db.products.insert_one(doc)
        inserted += 1
    if inserted:
        logging.getLogger(__name__).info("Seeded %d new products", inserted)


# ---------- Journal seed + persistence ----------
SEED_JOURNAL = [
    {
        "slug": "a-sweet-journey-through-sicily",
        "title": "Not A Salami: A Sweet Journey Through Sicily and Beyond",
        "excerpt": "Not A Salami may seem like a modern culinary trend, but its roots run deep in the traditions of Sicilian holiday tables, where cocoa salami was made from what the pantry offered.",
        "image": "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1600&q=80",
        "date": "Summer 2024",
        "read": "6 min read",
        "order": 1,
        "body": [
            "Long before Not A Salami was a brand, it was simply something Eva's grandmother made on the kitchen table in Modica. A wooden board, a long sheet of parchment paper, a length of twine. Cocoa folded into broken biscotti, butter, a measure of sugar, and whatever was in the pantry that week. Rolled by hand, tied at both ends, set in the cold corner of the cellar to firm up.",
            "It wasn't a recipe written down. It was the recipe — passed from one woman to another, slightly different in every house, never quite the same twice. In Sicilian, it had as many names as it had grandmothers. Salame di cioccolato. Salame turco. Salame del nonno. In our house, it was just la salame inglese — the English salami — for the way it sat on the table looking like one thing and revealing itself as another.",
            "The original use of the salami shape was practical, not theatrical. Cured meats hung from rafters; sweets were rolled to a similar diameter so they could be wrapped in the same paper and tied with the same twine, then placed alongside the prosciutto and the bresaola at the holidays. The wink was a happy accident. The reveal — that the dense, cool, fragrant slice was chocolate, not pork — became the joke that made the meal.",
            "We brought the recipe to San Francisco in our own kitchen, then a small commissary, then a slightly larger one. We tested cocoa from four continents and settled on Guittard, a San Francisco institution whose cocoa holds its temper even at room temperature. We tracked down biscotti with the precise crunch — not too sweet, not too soft. We argued about sugar crystals (yes, in the end). And then we did the only thing that mattered: we slowed down.",
            "Every Not A Salami is still rolled by hand, tied by hand, rested in our cold room for the same number of days. Each one travels in the same parchment and twine our family has used for three generations. When you cut it open at the table, what you're slicing is not a product — it's a small piece of a Sunday afternoon in Sicily, half a century ago, in a kitchen that smelled like coffee and cocoa and rain on the cobblestones.",
            "That's the journey. From Modica to a table in San Francisco — or yours, wherever it sits.",
        ],
    },
    {
        "slug": "the-ultimate-gourmet-gift",
        "title": "Elevate Your Dessert Game: Not A Salami as the Ultimate Gourmet Gift",
        "excerpt": "Finding the perfect gift can be a challenge, especially when you want something unique and unforgettable. Here is why a sliceable cocoa confection belongs on every host's table.",
        "image": "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/1qyii5ao_banner-2.jpg",
        "date": "Autumn 2024",
        "read": "4 min read",
        "order": 2,
        "body": [
            "The best gifts hold a secret. A wrapped object that hints at one thing and turns out to be another. A box that opens slowly. A name in a language the recipient doesn't quite speak yet. Generosity is, almost always, a small act of theater.",
            "Not A Salami was designed for exactly that. From the outside, it looks like a hand-tied cured meat — wrapped in parchment paper and gold foil, dusted in cocoa powder that reads as fresh pepper or fine mold. Most people, even the food-curious ones, miss the wink at first. They lift it, smell it, ask about the curing. Then someone slices it.",
            "What they find inside is the moment we built the whole thing around. A dense, cool interior speckled with crunchy biscotti, dark chocolate chips, and the faintest glitter of sugar crystals. Not too sweet. Not soft. Architectural. The room goes quiet for a second and then everyone laughs.",
            "We've heard this story dozens of times from corporate clients, hosts, restaurants. The cardiologist who unwrapped one at the office and watched colleagues stage an intervention. The wine bar that started slicing it alongside their cheese plate. The mother-in-law who hid hers in the fridge for two months and gave a slice to anyone she liked. (Apparently three people made the list.)",
            "It works as a gift because it does what gifts are supposed to do — it surprises, it photographs well, it travels well, it lasts about a week longer than it should, and it gives the recipient a story they'll tell for months. The unboxing alone tends to live on a phone for a while.",
            "For corporate gifting, we ship in white or black boxes with letterpressed serving cards, custom messages, and your logo tucked discreetly into the tissue. Eva packs each one. We deliver to one address or fifty. The story is the same either way: someone unwraps a salami, finds chocolate, and remembers who sent it.",
            "That's the whole pitch. It's a small thing, but it's a very good one.",
        ],
    },
    {
        "slug": "rediscovering-a-classic",
        "title": "A Nostalgic Journey: Rediscovering a Classic Treat",
        "excerpt": "In a world where culinary trends come and go, there is something comforting about a classic treat that pulls you back to a kitchen you used to know.",
        "image": "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=1600&q=80",
        "date": "Winter 2024",
        "read": "5 min read",
        "order": 3,
        "body": [
            "There is a particular way that cocoa smells when it's being worked by hand, and if you grew up in a house where someone made dessert from scratch, you know it. Not the dry powder smell. The hydrated one. The smell of Guittard cocoa meeting warm butter, sugar dissolving, biscotti turning slightly soft at the edges. That smell does something to memory.",
            "When we started serving Not A Salami at small dinners in San Francisco, the most common reaction was not 'wow, what is this?' It was 'wait — this is the thing my grandmother used to make.' Italian-American guests would go silent for a moment and then start naming their nonnas. A guest from Buenos Aires recognized it as the salchichón de chocolate from her childhood. Someone from Lebanon called it lazy cake. The Polish version is similar enough that the recognition was instant.",
            "What we kept hearing was a version of the same sentence: 'I haven't had this in twenty years.' Sometimes thirty. Sometimes since their mother passed.",
            "We didn't set out to make something nostalgic. We set out to make something good — to honor the original Sicilian recipe and the technique it deserved. But food, more than almost anything else, is a vehicle for memory. A flavor you ate as a child is wired into the same neural circuits as your bedroom from age six. Bite into the right thing as an adult and you are eight years old again, in a kitchen that doesn't exist anymore.",
            "We think this is the quiet power of a classic treat done carefully. It doesn't compete with new desserts. It is, by design, older than the room you're standing in. It asks nothing of you except to slice it and pass it around.",
            "In a year when food trends seem to arrive and exit at speed, we are content to be making something one woman in our family was already making in 1962. The recipe has barely changed. The room around it has changed completely. That contrast is the point.",
            "Cut a slice. Pass it to your left. Tell whoever takes it about the kitchen you used to know.",
        ],
    },
]


async def seed_journal():
    """One-time seed if the collection is empty (does not overwrite admin edits)."""
    count = await db.journal.count_documents({})
    if count > 0:
        return
    for j in SEED_JOURNAL:
        article = JournalArticle(**j)
        await db.journal.insert_one(article.model_dump())
    logging.getLogger(__name__).info("Seeded %d journal articles", len(SEED_JOURNAL))


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Emporio Zeva — Sicilian Cocoa Confection."}


@api_router.get("/products", response_model=List[Product])
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).to_list(100)
    return docs


@api_router.get("/products/{slug}", response_model=Product)
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc


# ---------- Journal (public) ----------
@api_router.get("/journal", response_model=List[JournalArticle])
async def list_journal():
    docs = await db.journal.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return docs


@api_router.get("/journal/{slug}", response_model=JournalArticle)
async def get_journal(slug: str):
    doc = await db.journal.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")
    return doc


@api_router.post("/inquiries", response_model=Inquiry)
async def create_inquiry(payload: InquiryCreate):
    obj = Inquiry(**payload.model_dump())
    await db.inquiries.insert_one(obj.model_dump())
    # Fire-and-forget so a slow Resend response can't block the form submit.
    asyncio.create_task(emailer.notify_inquiry(obj.model_dump()))
    return obj


@api_router.post("/newsletter", response_model=NewsletterEntry)
async def subscribe(payload: NewsletterCreate):
    existing = await db.newsletter.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        return existing
    entry = NewsletterEntry(email=payload.email)
    await db.newsletter.insert_one(entry.model_dump())
    asyncio.create_task(emailer.notify_newsletter(entry.model_dump()))
    return entry


@api_router.post("/waitlist", response_model=WaitlistEntry)
async def join_waitlist(payload: WaitlistCreate):
    # Idempotent per (email, product_slug)
    existing = await db.waitlist.find_one(
        {"email": payload.email, "product_slug": payload.product_slug},
        {"_id": 0},
    )
    if existing:
        return existing
    entry = WaitlistEntry(**payload.model_dump())
    await db.waitlist.insert_one(entry.model_dump())
    asyncio.create_task(emailer.notify_waitlist(entry.model_dump()))
    return entry


# ---------- Admin routes ----------
@api_router.post("/admin/login", response_model=AdminToken)
async def admin_login(payload: AdminLogin, request: Request):
    ip = _client_ip(request)
    now = datetime.now(timezone.utc)
    email = payload.email.lower().strip()
    lockout_key = f"{ip}:{email}"
    rec = await db.admin_login_attempts.find_one({"_id": lockout_key})
    locked_until = rec.get("locked_until") if rec else None
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until and locked_until > now:
        remaining = int((locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {remaining} minute(s).",
        )
    user = await db.users.find_one({"email": email})
    ok = bool(user) and _verify_password(payload.password, user.get("password_hash", ""))
    if not ok:
        attempts = (rec.get("attempts", 0) if rec else 0) + 1
        update = {"attempts": attempts, "last_attempt": now}
        if attempts >= MAX_FAILED_ATTEMPTS:
            update["locked_until"] = now + timedelta(minutes=LOCKOUT_MINUTES)
            update["attempts"] = 0
        await db.admin_login_attempts.update_one(
            {"_id": lockout_key}, {"$set": update}, upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.admin_login_attempts.delete_one({"_id": lockout_key})
    user_doc = {k: user.get(k) for k in ("id", "email", "name", "role", "created_at", "must_change_password")}
    return _create_admin_token(user_doc)


@api_router.get("/admin/me", response_model=PublicUser)
async def admin_me(user: dict = Depends(require_viewer)):
    return PublicUser(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
        must_change_password=bool(user.get("must_change_password", False)),
    )


@api_router.patch("/admin/me", response_model=PublicUser)
async def admin_update_me(payload: MeUpdate, current: dict = Depends(require_viewer)):
    """Self-service profile update. Any signed-in user can edit their own name;
    email and password changes require re-authentication via current_password.
    Used both for normal profile edits and for the force-change-password flow
    on first login."""
    update: dict = {}
    needs_reauth = payload.email is not None or payload.new_password is not None

    if needs_reauth:
        if not payload.current_password:
            raise HTTPException(
                status_code=422,
                detail="current_password is required to change email or password",
            )
        fresh = await db.users.find_one({"id": current["id"]})
        if not fresh or not _verify_password(
            payload.current_password, fresh.get("password_hash", "")
        ):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty")
        update["name"] = name

    if payload.email is not None:
        new_email = payload.email.lower().strip()
        if new_email != current["email"]:
            clash = await db.users.find_one({"email": new_email, "id": {"$ne": current["id"]}})
            if clash:
                raise HTTPException(
                    status_code=409, detail="That email is already in use"
                )
            update["email"] = new_email

    if payload.new_password is not None:
        if len(payload.new_password) < 8:
            raise HTTPException(
                status_code=422, detail="New password must be at least 8 characters"
            )
        if payload.current_password and payload.current_password == payload.new_password:
            raise HTTPException(
                status_code=422, detail="New password must differ from the current one"
            )
        update["password_hash"] = _hash_password(payload.new_password)
        # Clear the forced-change flag whenever the user themselves changes
        # their password — covers both first-login flow and routine rotation.
        update["must_change_password"] = False

    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.users.find_one_and_update(
        {"id": current["id"]},
        {"$set": update},
        return_document=True,
        projection={"_id": 0, "password_hash": 0},
    )
    return PublicUser(
        id=result["id"],
        email=result["email"],
        name=result["name"],
        role=result["role"],
        created_at=result["created_at"],
        must_change_password=bool(result.get("must_change_password", False)),
    )


@api_router.get("/admin/inquiries", response_model=List[Inquiry])
async def admin_list_inquiries(_: dict = Depends(require_editor)):
    docs = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/admin/newsletter", response_model=List[NewsletterEntry])
async def admin_list_newsletter(_: dict = Depends(require_editor)):
    docs = await db.newsletter.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/admin/waitlist", response_model=List[WaitlistEntry])
async def admin_list_waitlist(_: dict = Depends(require_editor)):
    docs = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


# ---------- Admin: Journal ----------
@api_router.get("/admin/journal", response_model=List[JournalArticle])
async def admin_list_journal(_: dict = Depends(require_editor)):
    docs = await db.journal.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return docs


@api_router.get("/admin/journal/{slug}", response_model=JournalArticle)
async def admin_get_journal(slug: str, _: dict = Depends(require_editor)):
    doc = await db.journal.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")
    return doc


@api_router.patch("/admin/journal/{slug}", response_model=JournalArticle)
async def admin_update_journal(
    slug: str,
    payload: JournalArticleUpdate,
    _: dict = Depends(require_editor),
):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.journal.find_one_and_update(
        {"slug": slug},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Article not found")
    return result


@api_router.post("/admin/waitlist/delete")
async def admin_delete_waitlist(payload: BulkDelete, _: dict = Depends(require_editor)):
    if not payload.ids:
        raise HTTPException(status_code=422, detail="No ids supplied")
    result = await db.waitlist.delete_many({"id": {"$in": payload.ids}})
    return {"deleted_count": result.deleted_count}


@api_router.post("/admin/inquiries/delete")
async def admin_delete_inquiries(payload: BulkDelete, _: dict = Depends(require_editor)):
    if not payload.ids:
        raise HTTPException(status_code=422, detail="No ids supplied")
    result = await db.inquiries.delete_many({"id": {"$in": payload.ids}})
    return {"deleted_count": result.deleted_count}


# ---------- Deck routes ----------
from decks import personalize, make_slug, generate_intro  # noqa: E402


@api_router.post("/admin/decks/preview")
async def admin_preview_deck(payload: DeckCreate, _: dict = Depends(require_editor)):
    """Generate logo + intro for a client name without saving."""
    if not payload.client_name.strip():
        raise HTTPException(status_code=422, detail="client_name is required")
    data = await personalize(payload.client_name.strip())
    return {"client_name": payload.client_name.strip(), **data}


@api_router.post("/admin/decks/regenerate-intro")
async def admin_regenerate_intro(payload: DeckCreate, _: dict = Depends(require_editor)):
    """Re-roll the intro text for a given client name."""
    if not payload.client_name.strip():
        raise HTTPException(status_code=422, detail="client_name is required")
    text = await generate_intro(payload.client_name.strip())
    return {"intro_text": text}


@api_router.post("/admin/decks", response_model=Deck)
async def admin_create_deck(payload: DeckCreate, _: dict = Depends(require_editor)):
    name = payload.client_name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="client_name is required")
    # If the admin already supplied an intro/logo (from the preview step), trust
    # them and skip the personalize() round-trip for those fields.
    if payload.intro_text and (payload.logo_url is not None):
        intro_text = payload.intro_text.strip()
        logo_url = payload.logo_url
        domain = None  # may be backfilled in a future PATCH
    else:
        data = await personalize(name)
        intro_text = (payload.intro_text or data["intro_text"]).strip()
        logo_url = payload.logo_url if payload.logo_url is not None else data["logo_url"]
        domain = data["domain"]
    mode = (payload.template_mode or "template").strip().lower()
    if mode not in ("template", "custom"):
        raise HTTPException(status_code=422, detail="template_mode must be 'template' or 'custom'")
    deck = Deck(
        slug=make_slug(name),
        client_name=name,
        domain=domain,
        logo_url=logo_url,
        intro_text=intro_text,
        template_mode=mode,
        slide_overrides=payload.slide_overrides or {},
    )
    await db.decks.insert_one(deck.model_dump())
    return deck


@api_router.get("/admin/decks", response_model=List[Deck])
async def admin_list_decks(_: dict = Depends(require_editor)):
    docs = await db.decks.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.patch("/admin/decks/{deck_id}", response_model=Deck)
async def admin_update_deck(
    deck_id: str,
    payload: DeckUpdate,
    current: dict = Depends(require_editor),
):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "template_mode" in update and update["template_mode"] not in ("template", "custom"):
        raise HTTPException(status_code=422, detail="template_mode must be 'template' or 'custom'")
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")
    existing = await db.decks.find_one({"id": deck_id}, {"_id": 0})
    if existing:
        await write_revision("deck", deck_id, existing, current, label="Edited")
    result = await db.decks.find_one_and_update(
        {"id": deck_id},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Deck not found")
    return result


@api_router.delete("/admin/decks/{deck_id}")
async def admin_delete_deck(deck_id: str, _: dict = Depends(require_editor)):
    result = await db.decks.delete_one({"id": deck_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deck not found")
    return {"deleted": True}


@api_router.get("/decks/{slug}", response_model=Deck)
async def get_deck(slug: str):
    """Public — fetch a deck by slug and increment view count."""
    deck = await db.decks.find_one_and_update(
        {"slug": slug},
        {
            "$inc": {"view_count": 1},
            "$set": {"last_viewed_at": datetime.now(timezone.utc).isoformat()},
        },
        return_document=True,
        projection={"_id": 0},
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


# ---------- Admin: Users ----------
@api_router.get("/admin/users", response_model=List[PublicUser])
async def admin_list_users(_: dict = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return [
        PublicUser(
            id=d["id"],
            email=d["email"],
            name=d.get("name") or d["email"],
            role=d.get("role", "viewer"),
            created_at=d["created_at"],
            must_change_password=bool(d.get("must_change_password", False)),
        )
        for d in docs
    ]


def _generate_temp_password() -> str:
    """Generate a friendly-but-strong 12-char temporary password.

    Uses ``secrets.token_urlsafe`` then strips ambiguous characters so the
    user has an easy time typing it from email into the login form.
    """
    raw = secrets.token_urlsafe(16)
    # Drop chars that look alike on screen / in some serif fonts.
    cleaned = re.sub(r"[Il10oO/_=+\-]", "", raw)
    return (cleaned + secrets.token_urlsafe(8))[:12]


@api_router.post("/admin/users", response_model=PublicUser)
async def admin_create_user(payload: UserCreate, current: dict = Depends(require_admin)):
    if payload.role not in ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {ROLES}")
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="A user with that email already exists")

    # If the inviting admin passes an explicit password we honour it (e.g.
    # automated tests), otherwise we mint a temp one and email it to the
    # invitee. Either way the invitee MUST change it on first login.
    if payload.password:
        if len(payload.password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        temp_password = payload.password
    else:
        temp_password = _generate_temp_password()

    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name.strip() or email.split("@")[0],
        "role": payload.role,
        "password_hash": _hash_password(temp_password),
        "must_change_password": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "invited_by": current.get("id"),
    }
    await db.users.insert_one(user)

    # Fire the invite email in the background so the response stays snappy.
    asyncio.create_task(
        emailer.notify_invite(
            {
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "inviter_name": current.get("name") or current.get("email") or "the team",
            },
            temp_password,
        )
    )
    return PublicUser(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
        must_change_password=True,
    )


@api_router.post("/admin/users/{user_id}/resend-invite", response_model=PublicUser)
async def admin_resend_invite(user_id: str, current: dict = Depends(require_admin)):
    """Mint a fresh temporary password and email it. Useful when the original
    invite email was lost or the temp password expired in the user's memory."""
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    temp_password = _generate_temp_password()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password_hash": _hash_password(temp_password),
            "must_change_password": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    asyncio.create_task(
        emailer.notify_invite(
            {
                "name": target.get("name") or target["email"],
                "email": target["email"],
                "role": target.get("role", "viewer"),
                "inviter_name": current.get("name") or current.get("email") or "the team",
            },
            temp_password,
        )
    )
    return PublicUser(
        id=target["id"],
        email=target["email"],
        name=target.get("name") or target["email"],
        role=target.get("role", "viewer"),
        created_at=target["created_at"],
        must_change_password=True,
    )


@api_router.patch("/admin/users/{user_id}", response_model=PublicUser)
async def admin_update_user(
    user_id: str, payload: UserUpdate, current: dict = Depends(require_admin)
):
    update: dict = {}
    if payload.name is not None:
        update["name"] = payload.name.strip()
    if payload.role is not None:
        if payload.role not in ROLES:
            raise HTTPException(status_code=422, detail=f"role must be one of {ROLES}")
        update["role"] = payload.role
    if payload.password is not None:
        if len(payload.password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        update["password_hash"] = _hash_password(payload.password)
        # When an admin sets another user's password, force them to rotate it
        # on next login so the admin never knows the user's standing password.
        if user_id != current["id"]:
            update["must_change_password"] = True
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Guard: don't allow removing the last admin
    if payload.role and payload.role != "admin":
        target = await db.users.find_one({"id": user_id})
        if target and target.get("role") == "admin":
            admin_count = await db.users.count_documents({"role": "admin"})
            if admin_count <= 1:
                raise HTTPException(status_code=409, detail="Cannot demote the last admin")
    result = await db.users.find_one_and_update(
        {"id": user_id},
        {"$set": update},
        return_document=True,
        projection={"_id": 0, "password_hash": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return PublicUser(
        id=result["id"],
        email=result["email"],
        name=result["name"],
        role=result["role"],
        created_at=result["created_at"],
        must_change_password=bool(result.get("must_change_password", False)),
    )


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current: dict = Depends(require_admin)):
    if user_id == current["id"]:
        raise HTTPException(status_code=409, detail="You cannot delete your own account")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="Cannot delete the last admin")
    await db.users.delete_one({"id": user_id})
    return {"deleted": True}


# ---------- Admin: Stats ----------
@api_router.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_viewer)):
    pages_count = await db.pages.count_documents({})
    pages_published = await db.pages.count_documents({"status": "published"})
    journal_count = await db.journal.count_documents({})
    inquiries_count = await db.inquiries.count_documents({})
    waitlist_count = await db.waitlist.count_documents({})
    newsletter_count = await db.newsletter.count_documents({})
    decks_count = await db.decks.count_documents({})
    media_count = await db.media.count_documents({})
    users_count = await db.users.count_documents({})
    recent_inquiries = await db.inquiries.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    recent_waitlist = await db.waitlist.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    return {
        "pages": {"total": pages_count, "published": pages_published},
        "journal": journal_count,
        "inquiries": inquiries_count,
        "waitlist": waitlist_count,
        "newsletter": newsletter_count,
        "decks": decks_count,
        "media": media_count,
        "users": users_count,
        "recent_inquiries": recent_inquiries,
        "recent_waitlist": recent_waitlist,
    }


# ---------- Admin: Pages CMS ----------
_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(text: str) -> str:
    s = _SLUG_RE.sub("-", text.lower()).strip("-")
    return s or f"page-{uuid.uuid4().hex[:6]}"


async def _unique_page_slug(base: str, ignore_id: Optional[str] = None) -> str:
    candidate = base
    n = 2
    while True:
        q = {"slug": candidate}
        if ignore_id:
            q["id"] = {"$ne": ignore_id}
        existing = await db.pages.find_one(q)
        if not existing:
            return candidate
        candidate = f"{base}-{n}"
        n += 1


@api_router.get("/admin/pages", response_model=List[Page])
async def admin_list_pages(_: dict = Depends(require_editor)):
    docs = await db.pages.find({}, {"_id": 0}).sort([("menu_order", 1), ("created_at", -1)]).to_list(500)
    return docs


@api_router.post("/admin/pages", response_model=Page)
async def admin_create_page(payload: PageCreate, current: dict = Depends(require_editor)):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title is required")
    base_slug = _slugify(payload.slug or title)
    slug = await _unique_page_slug(base_slug)
    if payload.status not in ("draft", "published"):
        raise HTTPException(status_code=422, detail="status must be draft or published")
    page = Page(
        slug=slug,
        title=title,
        excerpt=payload.excerpt,
        body=payload.body,
        parent_id=payload.parent_id or None,
        menu_order=payload.menu_order,
        status=payload.status,
        show_in_nav=payload.show_in_nav,
        show_in_footer=payload.show_in_footer,
        created_by=current["id"],
    )
    await db.pages.insert_one(page.model_dump())
    await write_revision("page", page.id, page.model_dump(), current, label="Created")
    return page


@api_router.patch("/admin/pages/{page_id}", response_model=Page)
async def admin_update_page(
    page_id: str, payload: PageUpdate, current: dict = Depends(require_editor)
):
    # Capture pre-edit snapshot for history
    existing = await db.pages.find_one({"id": page_id}, {"_id": 0})
    if existing:
        await write_revision("page", page_id, existing, current, label="Edited")
    update: dict = {}
    raw = payload.model_dump(exclude_unset=True)
    if "title" in raw and raw["title"] is not None:
        update["title"] = raw["title"].strip()
    if "slug" in raw and raw["slug"] is not None:
        update["slug"] = await _unique_page_slug(_slugify(raw["slug"]), ignore_id=page_id)
    for key in ("excerpt", "body", "parent_id", "menu_order", "show_in_nav", "show_in_footer"):
        if key in raw:
            update[key] = raw[key]
    if "status" in raw and raw["status"] is not None:
        if raw["status"] not in ("draft", "published"):
            raise HTTPException(status_code=422, detail="status must be draft or published")
        update["status"] = raw["status"]
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.pages.find_one_and_update(
        {"id": page_id},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Page not found")
    return result


@api_router.delete("/admin/pages/{page_id}")
async def admin_delete_page(page_id: str, _: dict = Depends(require_editor)):
    # Detach children if any (set their parent_id to null)
    await db.pages.update_many({"parent_id": page_id}, {"$set": {"parent_id": None}})
    result = await db.pages.delete_one({"id": page_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"deleted": True}


@api_router.post("/admin/pages/bulk")
async def admin_pages_bulk(payload: BulkAction, _: dict = Depends(require_editor)):
    if not payload.ids:
        raise HTTPException(status_code=422, detail="No ids supplied")
    if payload.action == "delete":
        await db.pages.update_many(
            {"parent_id": {"$in": payload.ids}}, {"$set": {"parent_id": None}}
        )
        r = await db.pages.delete_many({"id": {"$in": payload.ids}})
        return {"action": "delete", "affected": r.deleted_count}
    if payload.action in ("publish", "unpublish"):
        status = "published" if payload.action == "publish" else "draft"
        r = await db.pages.update_many(
            {"id": {"$in": payload.ids}},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"action": payload.action, "affected": r.modified_count}
    raise HTTPException(status_code=422, detail="Unknown action")


@api_router.post("/admin/journal/bulk")
async def admin_journal_bulk(payload: BulkAction, _: dict = Depends(require_editor)):
    if not payload.ids:
        raise HTTPException(status_code=422, detail="No ids supplied")
    if payload.action == "delete":
        r = await db.journal.delete_many({"id": {"$in": payload.ids}})
        return {"action": "delete", "affected": r.deleted_count}
    raise HTTPException(status_code=422, detail="Unknown action")


@api_router.post("/admin/newsletter/delete")
async def admin_delete_newsletter(payload: BulkDelete, _: dict = Depends(require_editor)):
    if not payload.ids:
        raise HTTPException(status_code=422, detail="No ids supplied")
    r = await db.newsletter.delete_many({"id": {"$in": payload.ids}})
    return {"deleted_count": r.deleted_count}


# ---------- Public: Pages ----------
@api_router.get("/pages", response_model=List[Page])
async def public_list_pages():
    """Published pages — used to power Nav + Footer + sitemap."""
    docs = await db.pages.find(
        {"status": "published"}, {"_id": 0}
    ).sort([("menu_order", 1), ("created_at", -1)]).to_list(200)
    return docs


@api_router.get("/pages/{slug}", response_model=Page)
async def public_get_page(slug: str):
    doc = await db.pages.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Page not found")
    return doc


# ---------- Admin: Media ----------
# Media binaries live in MongoDB GridFS (bucket: "media_files") so they persist
# across container redeploys. The legacy filesystem path below is kept only as a
# fallback for any older rows that haven't been cleaned up yet.
_MEDIA_DIR = Path(__file__).parent / "static" / "media"
_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED_MIME_PREFIXES = ("image/", "video/", "application/pdf", "audio/")
# HEIC/HEIF (iPhone format) — accepted on upload, transparently converted to
# JPEG below so the resulting image renders in every browser.
_HEIC_MIME_TYPES = {"image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"}
_HEIC_EXTENSIONS = {".heic", ".heif"}
_MAX_MEDIA_BYTES = 25 * 1024 * 1024  # 25MB


def _is_heic(mime: str, filename: str) -> bool:
    """Detect HEIC/HEIF — some browsers send `application/octet-stream`, so
    fall back to the file extension."""
    if (mime or "").lower() in _HEIC_MIME_TYPES:
        return True
    return Path(filename or "").suffix.lower() in _HEIC_EXTENSIONS


def _convert_heic_to_jpeg(raw: bytes) -> bytes:
    """Decode a HEIC byte payload and return a JPEG byte payload.
    Preserves EXIF orientation so iPhone photos don't appear sideways."""
    # Local imports keep top-of-file lean and let the server boot even if
    # pillow_heif isn't installed — but it should be in requirements.txt.
    import io as _io
    from PIL import Image, ImageOps
    import pillow_heif

    pillow_heif.register_heif_opener()
    src = Image.open(_io.BytesIO(raw))
    src = ImageOps.exif_transpose(src)  # honour iPhone EXIF rotation
    if src.mode not in ("RGB", "L"):
        src = src.convert("RGB")
    out = _io.BytesIO()
    src.save(out, format="JPEG", quality=88, optimize=True, progressive=True)
    return out.getvalue()


def _safe_filename(original: str) -> str:
    stem = Path(original).stem
    suffix = Path(original).suffix.lower()
    safe = re.sub(r"[^a-z0-9._-]+", "-", stem.lower()).strip("-") or "file"
    return f"{safe}-{uuid.uuid4().hex[:8]}{suffix}"


@api_router.get("/admin/media", response_model=List[MediaItem])
async def admin_list_media(_: dict = Depends(require_editor)):
    docs = await db.media.find({}, {"_id": 0}).sort("uploaded_at", -1).to_list(500)
    return docs


@api_router.post("/admin/media", response_model=MediaItem)
async def admin_upload_media(
    file: UploadFile = File(...),
    alt_text: str = Form(""),
    caption: str = Form(""),
    current: dict = Depends(require_editor),
):
    raw_mime = (file.content_type or "application/octet-stream").lower()
    raw_name = file.filename or "upload"
    heic = _is_heic(raw_mime, raw_name)

    # Allow HEIC even if browser tagged it as octet-stream; otherwise the
    # MIME must be in the allowed prefix list.
    if not heic and not any(
        raw_mime == p or raw_mime.startswith(p) for p in _ALLOWED_MIME_PREFIXES
    ):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {raw_mime}")

    # Buffer the upload, abort if it blows the cap.
    buffer = bytearray()
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > _MAX_MEDIA_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds {_MAX_MEDIA_BYTES // (1024 * 1024)}MB limit",
            )

    if heic:
        # Convert HEIC → JPEG so the image renders in Chrome/Firefox/Edge.
        try:
            payload = _convert_heic_to_jpeg(bytes(buffer))
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Couldn't read HEIC file. It may be corrupt: {exc}",
            )
        store_mime = "image/jpeg"
        # Keep the original stem, swap the extension to .jpg.
        store_name = _safe_filename(Path(raw_name).with_suffix(".jpg").name)
    else:
        payload = bytes(buffer)
        store_mime = raw_mime
        store_name = _safe_filename(raw_name)

    # Stream the (possibly converted) payload into GridFS.
    grid_in = media_bucket.open_upload_stream(
        store_name,
        metadata={
            "content_type": store_mime,
            "original_filename": raw_name,
            "uploaded_by": current["id"],
            "converted_from_heic": heic,
        },
    )
    try:
        # Single write is fine; GridFS chunks internally at 255 KB.
        await grid_in.write(payload)
        await grid_in.close()
    except Exception as exc:
        try:
            await grid_in.abort()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")

    media_id = str(uuid.uuid4())
    item = MediaItem(
        id=media_id,
        filename=store_name,
        original_filename=raw_name,
        mime_type=store_mime,
        size_bytes=len(payload),
        # Public URL points at the GridFS-backed streaming endpoint.
        url=f"/api/media/{media_id}",
        alt_text=alt_text,
        caption=caption,
        uploaded_by=current["id"],
        gridfs_id=str(grid_in._id),
    )
    await db.media.insert_one(item.model_dump())
    return item


@api_router.patch("/admin/media/{media_id}", response_model=MediaItem)
async def admin_update_media(
    media_id: str, payload: MediaUpdate, _: dict = Depends(require_editor)
):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")
    result = await db.media.find_one_and_update(
        {"id": media_id},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Media not found")
    return result


@api_router.delete("/admin/media/{media_id}")
async def admin_delete_media(media_id: str, _: dict = Depends(require_editor)):
    item = await db.media.find_one({"id": media_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")
    # Remove the binary from GridFS if we have a reference.
    grid_id = item.get("gridfs_id")
    if grid_id:
        try:
            from bson import ObjectId  # local import keeps top-of-file lean
            await media_bucket.delete(ObjectId(grid_id))
        except Exception:
            # Either the file was already gone or the id was malformed; either
            # way the record itself should still be removed.
            pass
    # Legacy filesystem cleanup for any pre-GridFS rows still floating around.
    fpath = _MEDIA_DIR / item.get("filename", "")
    if fpath.exists():
        try:
            fpath.unlink()
        except OSError:
            pass
    await db.media.delete_one({"id": media_id})
    return {"deleted": True}


@api_router.get("/media/{media_id}")
async def public_get_media(media_id: str):
    """Stream a media file from GridFS by its media doc id. Public read."""
    item = await db.media.find_one({"id": media_id}, {"_id": 0})
    if not item or not item.get("gridfs_id"):
        raise HTTPException(status_code=404, detail="Media not found")
    from bson import ObjectId
    try:
        grid_out = await media_bucket.open_download_stream(ObjectId(item["gridfs_id"]))
    except Exception:
        raise HTTPException(status_code=404, detail="Media file missing")

    async def iter_file():
        try:
            while True:
                chunk = await grid_out.readchunk()
                if not chunk:
                    break
                yield chunk
        finally:
            grid_out.close()

    headers = {
        # 30-day cache; filenames already include a hex suffix so they're unique.
        "Cache-Control": "public, max-age=2592000, immutable",
        "Content-Disposition": f'inline; filename="{item.get("original_filename", item.get("filename", "file"))}"',
    }
    if item.get("size_bytes"):
        headers["Content-Length"] = str(item["size_bytes"])
    return StreamingResponse(
        iter_file(),
        media_type=item.get("mime_type") or "application/octet-stream",
        headers=headers,
    )


# ---------- Settings (general + reading) ----------
async def _load_settings() -> SiteSettings:
    doc = await db.settings.find_one({"_id": "site"})
    if not doc:
        return SiteSettings()
    doc.pop("_id", None)
    return SiteSettings(**doc)


@api_router.get("/admin/settings", response_model=SiteSettings)
async def admin_get_settings(_: dict = Depends(require_viewer)):
    return await _load_settings()


@api_router.patch("/admin/settings", response_model=SiteSettings)
async def admin_update_settings(payload: SettingsUpdate, _: dict = Depends(require_admin)):
    current = await _load_settings()
    data = current.model_dump()
    if payload.general is not None:
        data["general"] = payload.general.model_dump()
    if payload.reading is not None:
        data["reading"] = payload.reading.model_dump()
    await db.settings.update_one({"_id": "site"}, {"$set": data}, upsert=True)
    return SiteSettings(**data)


# Public read of settings — Nav/Footer can consume safely
@api_router.get("/settings", response_model=SiteSettings)
async def public_get_settings():
    return await _load_settings()




# ---------- Admin: Products CRUD ----------
@api_router.get("/admin/products", response_model=List[Product])
async def admin_list_products(_: dict = Depends(require_editor)):
    """Admin sees all products regardless of status."""
    docs = await db.products.find({}, {"_id": 0}).sort("status", 1).to_list(500)
    return docs


@api_router.post("/admin/products", response_model=Product)
async def admin_create_product(payload: ProductCreate, current: dict = Depends(require_editor)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    base_slug = _slugify(payload.slug or name)
    candidate = base_slug
    n = 2
    while await db.products.find_one({"slug": candidate}):
        candidate = f"{base_slug}-{n}"
        n += 1
    if payload.status not in ("active", "future", "archived"):
        raise HTTPException(status_code=422, detail="status must be active, future, or archived")
    data = payload.model_dump()
    data["slug"] = candidate
    data["name"] = name
    product = Product(**data)
    await db.products.insert_one(product.model_dump())
    await write_revision("product", product.slug, product.model_dump(), current, label="Created")
    return product


@api_router.patch("/admin/products/{slug}", response_model=Product)
async def admin_update_product(
    slug: str, payload: ProductUpdate, current: dict = Depends(require_editor)
):
    existing = await db.products.find_one({"slug": slug}, {"_id": 0})
    if existing:
        await write_revision("product", slug, existing, current, label="Edited")
    raw = payload.model_dump(exclude_unset=True)
    if not raw:
        raise HTTPException(status_code=422, detail="No fields to update")
    if "status" in raw and raw["status"] not in ("active", "future", "archived"):
        raise HTTPException(status_code=422, detail="status must be active, future, or archived")
    if "slug" in raw and raw["slug"]:
        new_slug = _slugify(raw["slug"])
        if new_slug != slug:
            conflict = await db.products.find_one({"slug": new_slug})
            if conflict:
                raise HTTPException(status_code=409, detail="A product with that slug already exists")
            raw["slug"] = new_slug
        else:
            raw.pop("slug", None)
    if "name" in raw and raw["name"] is not None:
        raw["name"] = raw["name"].strip()
        if not raw["name"]:
            raise HTTPException(status_code=422, detail="name cannot be empty")
    result = await db.products.find_one_and_update(
        {"slug": slug},
        {"$set": raw},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return result


@api_router.delete("/admin/products/{slug}")
async def admin_delete_product(slug: str, _: dict = Depends(require_editor)):
    result = await db.products.delete_one({"slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}


# ---------- Site Content (field-level CMS for hardcoded pages) ----------
SITE_CONTENT_MANIFEST = {
    "home": {
        "label": "Home",
        "sections": [
            {"label": "Hero", "fields": [
                {"key": "hero_overline", "type": "text", "label": "Overline",
                 "default": "Sicilian Cocoa Confection · Est. SF"},
                {"key": "hero_h1_line1", "type": "text", "label": "H1 — first word(s)", "default": "Not A"},
                {"key": "hero_h1_italic", "type": "text", "label": "H1 — italic word", "default": "Salami."},
                {"key": "hero_intro_body", "type": "textarea", "label": "Hero intro paragraph",
                 "default": "A handcrafted Italian confection inspired by a traditional Sicilian recipe from Modica. Shaped like a salami, it creates a moment of surprise — then reveals a rich, sliceable chocolate experience."},
                {"key": "hero_image", "type": "image", "label": "Hero image", "default": ""},
                {"key": "hero_card_overline", "type": "text", "label": "Floating card overline",
                 "default": "No 01 · Sicilian Cocoa Confection"},
                {"key": "hero_card_title", "type": "textarea", "label": "Floating card title",
                 "default": "A little peculiar, always delicious."},
            ]},
            {"label": "Why it works", "fields": [
                {"key": "why_overline", "type": "text", "label": "Overline", "default": "Why it works"},
                {"key": "why_title", "type": "textarea", "label": "H2", "default": "A different kind of chocolate."},
            ]},
            {"label": "The illusion", "fields": [
                {"key": "illusion_overline", "type": "text", "label": "Overline", "default": "The wink, on the table"},
                {"key": "illusion_title_line1", "type": "text", "label": "H2 — first line",
                 "default": "It looks like salami."},
                {"key": "illusion_title_line2", "type": "text", "label": "H2 — italic word",
                 "default": "entirely"},
                {"key": "illusion_body", "type": "textarea", "label": "Body",
                 "default": "Wrapped in parchment paper and gold foil. Cut at the table. The reveal — that rich cocoa interior speckled with crunchy biscotti, chocolate chips, and delicate sugar crystals — is part of the dessert."},
                {"key": "illusion_image", "type": "image", "label": "Image",
                 "default": "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/55ktafkm_image1.jpeg"},
            ]},
            {"label": "Collection teaser", "fields": [
                {"key": "collection_overline", "type": "text", "label": "Overline", "default": "The Collection"},
                {"key": "collection_title_line1", "type": "text", "label": "H2 line 1", "default": "One signature."},
                {"key": "collection_title_line2", "type": "text", "label": "H2 line 2 (italic)", "default": "Made slowly."},
            ]},
            {"label": "Future offerings", "fields": [
                {"key": "future_overline", "type": "text", "label": "Overline",
                 "default": "From Eva's kitchen · future offerings"},
                {"key": "future_title_line1", "type": "text", "label": "H2 line 1", "default": "Coming next."},
                {"key": "future_title_line2", "type": "text", "label": "H2 line 2 (italic)", "default": "Reservable today."},
                {"key": "future_body", "type": "textarea", "label": "Body",
                 "default": "New formats and flavors arrive only when Eva is happy with them. Reserve your place — we'll write when each one comes out of the kitchen."},
            ]},
            {"label": "Ritual teaser", "fields": [
                {"key": "ritual_overline", "type": "text", "label": "Overline", "default": "The serving ritual"},
                {"key": "ritual_body", "type": "textarea", "label": "Body",
                 "default": "Not A Salami is meant to be sliced, shared, and savored. Four moments. One small ritual, the Italian way."},
            ]},
            {"label": "Testimonials", "fields": [
                {"key": "testimonials_overline", "type": "text", "label": "Overline", "default": "What people say"},
                {"key": "testimonials_title", "type": "textarea", "label": "H2 (italic part starts after em-dash)",
                 "default": "The smile, the moment they realise — there is no meat."},
            ]},
            {"label": "Journal teaser", "fields": [
                {"key": "journal_overline", "type": "text", "label": "Overline", "default": "From the journal"},
                {"key": "journal_title", "type": "textarea", "label": "H2",
                 "default": "Notes, pairings, and small heritage detours."},
            ]},
        ],
    },
    "collection": {
        "label": "Collection",
        "sections": [
            {"label": "Header", "fields": [
                {"key": "header_overline", "type": "text", "label": "Overline", "default": "The Collection"},
                {"key": "header_title_line1", "type": "text", "label": "H1 line 1", "default": "One signature."},
                {"key": "header_title_line2", "type": "text", "label": "H1 line 2 (italic)", "default": "Made slowly."},
                {"key": "header_body", "type": "textarea", "label": "Body",
                 "default": "We make one thing for now — and we make it well. Below: the signature Not A Salami. Further down: what's next from Eva's kitchen, reservable today."},
            ]},
            {"label": "Future offerings", "fields": [
                {"key": "future_overline", "type": "text", "label": "Overline",
                 "default": "From Eva's kitchen · future offerings"},
                {"key": "future_title_line1", "type": "text", "label": "H2 line 1", "default": "Coming next."},
                {"key": "future_title_line2", "type": "text", "label": "H2 line 2 (italic)", "default": "Reservable today."},
                {"key": "future_body", "type": "textarea", "label": "Body",
                 "default": "A small house grows slowly. These are the flavors, formats, and bundles in development — join a list and we'll write when each comes out of the kitchen."},
            ]},
        ],
    },
    "ritual": {
        "label": "Ritual",
        "sections": [
            {"label": "Hero", "fields": [
                {"key": "hero_overline", "type": "text", "label": "Overline", "default": "The serving ritual"},
                {"key": "hero_h1", "type": "textarea", "label": "H1 (newlines as line breaks)",
                 "default": "Sliced. Served. Shared. Savored."},
                {"key": "hero_body", "type": "textarea", "label": "Body",
                 "default": "Not A Salami is meant to be sliced, shared, and savored. Four moments — one small ritual, the Italian way."},
            ]},
            {"label": "Pairings", "fields": [
                {"key": "pairings_overline", "type": "text", "label": "Overline", "default": "Pair it with"},
                {"key": "pairings_h2_line1", "type": "text", "label": "H2 line 1", "default": "Coffee. Wine."},
                {"key": "pairings_h2_line2", "type": "text", "label": "H2 line 2 (italic)", "default": "Fruit. Cheese."},
                {"key": "pairings_body", "type": "textarea", "label": "Body",
                 "default": "Each pairing pulls a different layer forward — espresso heightens the cocoa, a glass of red lengthens the finish, fresh fruit brightens the biscotti crunch, aged cheese surprises everyone."},
                {"key": "pairings_image", "type": "image", "label": "Image", "default": ""},
            ]},
            {"label": "Closing", "fields": [
                {"key": "closing_overline", "type": "text", "label": "Overline",
                 "default": "Slice thin. Serve slow. Share generously."},
                {"key": "closing_quote", "type": "textarea", "label": "H2 quote",
                 "default": "I am at peace with where I have arrived, and proud of the path I followed."},
            ]},
        ],
    },
    "our_story": {
        "label": "Our Story",
        "sections": [
            {"label": "Hero", "fields": [
                {"key": "hero_overline", "type": "text", "label": "Overline",
                 "default": "An Italian tradition, reimagined"},
                {"key": "hero_h1_line1", "type": "text", "label": "H1 line 1", "default": "A Sicilian"},
                {"key": "hero_h1_line2", "type": "text", "label": "H1 line 2 (italic)", "default": "tradition."},
                {"key": "hero_body", "type": "textarea", "label": "Body",
                 "default": "Returning to my roots, I reconnected with my grandmother's recipe and the chocolate tradition of Modica, Sicily — brought together in a confection designed to surprise, to be sliced and shared."},
            ]},
            {"label": "Founder image", "fields": [
                {"key": "founder_image", "type": "image", "label": "Founder portrait", "default": ""},
                {"key": "founder_caption", "type": "text", "label": "Caption below image",
                 "default": "Eva · Founder · From Sicily, with seriousness"},
            ]},
            {"label": "Sicily / espresso pair", "fields": [
                {"key": "sicily_image", "type": "image", "label": "Sicily landscape image", "default": ""},
                {"key": "italian_moment_image", "type": "image", "label": "Italian moment image", "default": ""},
            ]},
            {"label": "Closing", "fields": [
                {"key": "closing_overline", "type": "text", "label": "Overline", "default": "A modern ritual"},
                {"key": "closing_h2_line1", "type": "text", "label": "H2 line 1",
                 "default": "Everything is produced in small batches in California"},
                {"key": "closing_h2_line2", "type": "text", "label": "H2 line 2 (italic)",
                 "default": "with a hands-on approach."},
                {"key": "closing_body", "type": "textarea", "label": "Body",
                 "default": "Italian tradition, crafted in California. Unexpected in appearance yet deeply nostalgic at heart — meant to create a moment of surprise, sharing, and conversation."},
            ]},
        ],
    },
    "journal_index": {
        "label": "Journal (index)",
        "sections": [
            {"label": "Header", "fields": [
                {"key": "header_overline", "type": "text", "label": "Overline", "default": "The Journal"},
                {"key": "header_title_line1", "type": "text", "label": "H1 line 1",
                 "default": "Pairings, heritage, and slow notes"},
                {"key": "header_title_line2", "type": "text", "label": "H1 line 2 (italic)",
                 "default": "from Eva's kitchen."},
            ]},
        ],
    },
    "contact": {
        "label": "Contact",
        "sections": [
            {"label": "Hero", "fields": [
                {"key": "hero_overline", "type": "text", "label": "Overline",
                 "default": "Inquire · Wholesale · Press · Corporate"},
                {"key": "hero_h1_line1", "type": "text", "label": "H1 line 1",
                 "default": "Let's create a memorable"},
                {"key": "hero_h1_line2", "type": "text", "label": "H1 line 2 (italic)",
                 "default": "gifting experience."},
                {"key": "hero_body", "type": "textarea", "label": "Body",
                 "default": "Whether it's a dinner party, a corporate program, a wedding favor run, or a shop that wants to stock the classic — leave us a note. Eva reads every one."},
            ]},
            {"label": "Shipping & corporate sidebar", "fields": [
                {"key": "shipping_overline", "type": "text", "label": "Overline", "default": "Shipping & corporate"},
                {"key": "shipping_body", "type": "textarea", "label": "Body",
                 "default": "We ship within the continental United States in small batches. Standard lead time is 5–7 days. For corporate programs (24-unit minimum), see the corporate deck or request the one-sheet."},
            ]},
        ],
    },
}

VALID_CONTENT_PAGES = set(SITE_CONTENT_MANIFEST.keys())


async def _load_site_content(page: str) -> dict:
    doc = await db.site_content.find_one({"_id": page})
    return doc.get("fields", {}) if doc else {}


def _merged_content(page: str, overrides: dict) -> dict:
    out = {}
    cfg = SITE_CONTENT_MANIFEST.get(page, {"sections": []})
    for section in cfg.get("sections", []):
        for f in section["fields"]:
            stored = overrides.get(f["key"])
            out[f["key"]] = stored if stored not in (None, "") else f.get("default", "")
    return out


@api_router.get("/site-content/{page}")
async def public_site_content(page: str):
    if page not in VALID_CONTENT_PAGES:
        raise HTTPException(status_code=404, detail="Unknown page")
    overrides = await _load_site_content(page)
    return _merged_content(page, overrides)


@api_router.get("/admin/site-content")
async def admin_site_content(_: dict = Depends(require_editor)):
    """Returns the full manifest plus stored overrides — drives the admin editor."""
    pages = []
    for page_key, cfg in SITE_CONTENT_MANIFEST.items():
        overrides = await _load_site_content(page_key)
        pages.append({
            "key": page_key,
            "label": cfg["label"],
            "sections": cfg["sections"],
            "overrides": overrides,
        })
    return {"pages": pages}


@api_router.patch("/admin/site-content/{page}")
async def admin_update_site_content(
    page: str, payload: dict, current: dict = Depends(require_editor)
):
    if page not in VALID_CONTENT_PAGES:
        raise HTTPException(status_code=404, detail="Unknown page")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Expected an object of {key: value}")
    # Snapshot existing state before changing
    existing = await db.site_content.find_one({"_id": page})
    if existing:
        snap = {k: v for k, v in existing.items() if k != "_id"}
        await write_revision("site_content", page, snap, current, label="Edited")
    valid_keys = {
        f["key"]
        for section in SITE_CONTENT_MANIFEST[page]["sections"]
        for f in section["fields"]
    }
    cleaned = {k: ("" if v is None else str(v)) for k, v in payload.items() if k in valid_keys}
    # Use dotted-path $set so partial PATCHes merge per-key instead of replacing
    # the whole "fields" sub-document.
    set_ops = {f"fields.{k}": v for k, v in cleaned.items()}
    set_ops["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_content.update_one(
        {"_id": page},
        {"$set": set_ops},
        upsert=True,
    )
    # Return the freshly merged content (re-read so partial updates surface correctly)
    overrides = await _load_site_content(page)
    return _merged_content(page, overrides)




# ---------- Revision history ----------
# Snapshot pattern: each save on a versioned doc writes a new revision entry.
# Bounded to MAX_REVISIONS_PER_DOC per (doc_type, doc_id) — older entries pruned.
VERSIONED_TYPES = ("page", "product", "site_content", "deck")
MAX_REVISIONS_PER_DOC = 50


async def write_revision(
    doc_type: str,
    doc_id: str,
    snapshot: dict,
    user: dict,
    label: str = "",
) -> None:
    """Record a snapshot. Best-effort: failures are logged but don't break saves."""
    if doc_type not in VERSIONED_TYPES:
        return
    try:
        rev = {
            "id": str(uuid.uuid4()),
            "doc_type": doc_type,
            "doc_id": doc_id,
            "snapshot": snapshot,
            "author_id": user.get("id"),
            "author_name": user.get("name") or user.get("email"),
            "label": label,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.revisions.insert_one(rev)
        # Prune older revisions beyond cap
        count = await db.revisions.count_documents({"doc_type": doc_type, "doc_id": doc_id})
        if count > MAX_REVISIONS_PER_DOC:
            extra = count - MAX_REVISIONS_PER_DOC
            cursor = (
                db.revisions.find({"doc_type": doc_type, "doc_id": doc_id}, {"_id": 0, "id": 1})
                .sort("created_at", 1)
                .limit(extra)
            )
            old_ids = [r["id"] async for r in cursor]
            if old_ids:
                await db.revisions.delete_many({"id": {"$in": old_ids}})
    except Exception:
        logging.getLogger(__name__).exception("Failed to write revision")


@api_router.get("/admin/revisions/{doc_type}/{doc_id}")
async def admin_list_revisions(
    doc_type: str, doc_id: str, _: dict = Depends(require_editor)
):
    if doc_type not in VERSIONED_TYPES:
        raise HTTPException(status_code=422, detail=f"doc_type must be one of {VERSIONED_TYPES}")
    docs = await (
        db.revisions.find({"doc_type": doc_type, "doc_id": doc_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(MAX_REVISIONS_PER_DOC)
        .to_list(MAX_REVISIONS_PER_DOC)
    )
    return docs


@api_router.get("/admin/revisions/{doc_type}/{doc_id}/{rev_id}")
async def admin_get_revision(
    doc_type: str, doc_id: str, rev_id: str, _: dict = Depends(require_editor)
):
    if doc_type not in VERSIONED_TYPES:
        raise HTTPException(status_code=422, detail=f"doc_type must be one of {VERSIONED_TYPES}")
    rev = await db.revisions.find_one(
        {"id": rev_id, "doc_type": doc_type, "doc_id": doc_id},
        {"_id": 0},
    )
    if not rev:
        raise HTTPException(status_code=404, detail="Revision not found")
    return rev


@api_router.post("/admin/revisions/{doc_type}/{doc_id}/{rev_id}/revert")
async def admin_revert_revision(
    doc_type: str,
    doc_id: str,
    rev_id: str,
    current: dict = Depends(require_editor),
):
    if doc_type not in VERSIONED_TYPES:
        raise HTTPException(status_code=422, detail=f"doc_type must be one of {VERSIONED_TYPES}")
    rev = await db.revisions.find_one(
        {"id": rev_id, "doc_type": doc_type, "doc_id": doc_id},
        {"_id": 0},
    )
    if not rev:
        raise HTTPException(status_code=404, detail="Revision not found")
    snapshot = rev["snapshot"]
    now = datetime.now(timezone.utc).isoformat()
    # Apply snapshot to the live doc
    if doc_type == "page":
        # Save current state first so revert is itself revertible
        current_doc = await db.pages.find_one({"id": doc_id}, {"_id": 0})
        if current_doc:
            await write_revision("page", doc_id, current_doc, current, label="Auto: pre-revert")
        snapshot["updated_at"] = now
        await db.pages.update_one({"id": doc_id}, {"$set": snapshot}, upsert=False)
    elif doc_type == "product":
        current_doc = await db.products.find_one({"slug": doc_id}, {"_id": 0})
        if current_doc:
            await write_revision("product", doc_id, current_doc, current, label="Auto: pre-revert")
        # Don't change the slug on revert — that would break public URLs
        snapshot = {k: v for k, v in snapshot.items() if k != "slug"}
        await db.products.update_one({"slug": doc_id}, {"$set": snapshot}, upsert=False)
    elif doc_type == "site_content":
        existing = await db.site_content.find_one({"_id": doc_id})
        if existing:
            existing_clean = {k: v for k, v in existing.items() if k != "_id"}
            await write_revision("site_content", doc_id, existing_clean, current, label="Auto: pre-revert")
        await db.site_content.update_one(
            {"_id": doc_id},
            {"$set": {"fields": snapshot.get("fields", {}), "updated_at": now}},
            upsert=True,
        )
    elif doc_type == "deck":
        current_doc = await db.decks.find_one({"id": doc_id}, {"_id": 0})
        if current_doc:
            await write_revision("deck", doc_id, current_doc, current, label="Auto: pre-revert")
        # Don't revert slug / id / created_at / view_count
        snapshot = {k: v for k, v in snapshot.items() if k not in ("slug", "id", "created_at", "view_count", "last_viewed_at")}
        await db.decks.update_one({"id": doc_id}, {"$set": snapshot}, upsert=False)
    # Write the revert itself as a revision so it appears in history
    await write_revision(
        doc_type,
        doc_id,
        snapshot,
        current,
        label=f"Reverted to revision from {rev.get('created_at', 'unknown')[:19]}",
    )
    return {"reverted": True}




app.include_router(api_router)

# Serve product/journal placeholder images.
# Files live in /app/backend/static/ and are referenced from product seed data
# as `/api/static/products/<filename>`. They ship with the deploy.
_static_dir = Path(__file__).parent / "static"
_static_dir.mkdir(exist_ok=True)
app.mount("/api/static", StaticFiles(directory=str(_static_dir)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def seed_admin_user():
    """Idempotent bootstrap of the seed admin user from ADMIN_EMAIL + ADMIN_PASSWORD."""
    email = _bootstrap_admin_email()
    pw = _bootstrap_admin_password()
    existing = await db.users.find_one({"email": email})
    if existing is None:
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": "Eva",
            "role": "admin",
            "password_hash": _hash_password(pw),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
        logging.getLogger(__name__).info("Seeded bootstrap admin user: %s", email)
    else:
        # If admin password was rotated in .env, keep the hash in sync
        if not _verify_password(pw, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "password_hash": _hash_password(pw),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            logging.getLogger(__name__).info("Rotated bootstrap admin password")


async def cleanup_orphaned_media():
    """Remove media records whose binary content is no longer available.

    Old media docs stored files on the container's local filesystem at
    `/api/static/media/<name>`. Those files are wiped on every redeploy, leaving
    broken links in the admin gallery. We drop the orphaned records on boot so
    the gallery stays clean. New uploads use GridFS and persist correctly.
    """
    legacy_cursor = db.media.find(
        {"$or": [
            {"gridfs_id": {"$exists": False}},
            {"gridfs_id": None},
            {"gridfs_id": ""},
        ]},
        {"id": 1, "filename": 1, "url": 1},
    )
    to_delete: list[str] = []
    async for doc in legacy_cursor:
        # If the legacy file happens to still exist on disk (dev only), keep it.
        fname = doc.get("filename") or ""
        if fname and (_MEDIA_DIR / fname).exists():
            continue
        to_delete.append(doc["id"])
    if to_delete:
        await db.media.delete_many({"id": {"$in": to_delete}})
        logging.getLogger(__name__).info(
            "Cleaned %d orphaned media records (files lost from ephemeral storage)",
            len(to_delete),
        )


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.pages.create_index("slug", unique=True)
    await db.pages.create_index("id", unique=True)
    await db.media.create_index("id", unique=True)


@app.on_event("startup")
async def on_startup():
    await seed_products()
    await seed_journal()
    await ensure_indexes()
    await seed_admin_user()
    await cleanup_orphaned_media()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
