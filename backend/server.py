from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    password: str


class AdminToken(BaseModel):
    token: str
    expires_at: str


class DeckCreate(BaseModel):
    client_name: str
    intro_text: Optional[str] = None
    logo_url: Optional[str] = None


class DeckUpdate(BaseModel):
    client_name: Optional[str] = None
    logo_url: Optional[str] = None
    intro_text: Optional[str] = None
    domain: Optional[str] = None


class Deck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    client_name: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    intro_text: str
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


def _admin_password() -> str:
    pw = os.environ.get("ADMIN_PASSWORD")
    if not pw:
        raise HTTPException(
            status_code=503,
            detail="Admin auth is not configured on this environment.",
        )
    return pw


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _create_admin_token() -> AdminToken:
    exp = datetime.now(timezone.utc) + timedelta(hours=ADMIN_TOKEN_TTL_HOURS)
    payload = {"role": "admin", "exp": exp, "iat": datetime.now(timezone.utc)}
    token = jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)
    return AdminToken(token=token, expires_at=exp.isoformat())


async def require_admin(request: Request) -> dict:
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
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return payload


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
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/zg1blozr_Salami_board.JPG",
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/55ktafkm_image1.jpeg",
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
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/zg1blozr_Salami_board.JPG",
            "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/55ktafkm_image1.jpeg",
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
    # Idempotent upsert by slug — keeps the catalog in sync with code on every restart
    for p in SEED_PRODUCTS:
        doc = Product(**p).model_dump()
        await db.products.update_one(
            {"slug": p["slug"]},
            {"$set": doc},
            upsert=True,
        )
    logging.getLogger(__name__).info("Upserted %d products", len(SEED_PRODUCTS))


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
    return obj


@api_router.post("/newsletter", response_model=NewsletterEntry)
async def subscribe(payload: NewsletterCreate):
    existing = await db.newsletter.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        return existing
    entry = NewsletterEntry(email=payload.email)
    await db.newsletter.insert_one(entry.model_dump())
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
    return entry


# ---------- Admin routes ----------
@api_router.post("/admin/login", response_model=AdminToken)
async def admin_login(payload: AdminLogin, request: Request):
    ip = _client_ip(request)
    now = datetime.now(timezone.utc)
    rec = await db.admin_login_attempts.find_one({"_id": ip})
    locked_until = rec.get("locked_until") if rec else None
    if locked_until and locked_until.tzinfo is None:
        # Mongo stores datetimes as naive UTC; restore tzinfo before comparing.
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until and locked_until > now:
        remaining = int((locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {remaining} minute(s).",
        )
    if not secrets.compare_digest(payload.password or "", _admin_password()):
        attempts = (rec.get("attempts", 0) if rec else 0) + 1
        update = {"attempts": attempts, "last_attempt": now}
        if attempts >= MAX_FAILED_ATTEMPTS:
            update["locked_until"] = now + timedelta(minutes=LOCKOUT_MINUTES)
            update["attempts"] = 0
        await db.admin_login_attempts.update_one(
            {"_id": ip}, {"$set": update}, upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid password")
    # success — clear attempts
    await db.admin_login_attempts.delete_one({"_id": ip})
    return _create_admin_token()


@api_router.get("/admin/me")
async def admin_me(payload: dict = Depends(require_admin)):
    return {"role": payload.get("role"), "exp": payload.get("exp")}


@api_router.get("/admin/inquiries", response_model=List[Inquiry])
async def admin_list_inquiries(_: dict = Depends(require_admin)):
    docs = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/admin/newsletter", response_model=List[NewsletterEntry])
async def admin_list_newsletter(_: dict = Depends(require_admin)):
    docs = await db.newsletter.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/admin/waitlist", response_model=List[WaitlistEntry])
async def admin_list_waitlist(_: dict = Depends(require_admin)):
    docs = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


# ---------- Admin: Journal ----------
@api_router.get("/admin/journal", response_model=List[JournalArticle])
async def admin_list_journal(_: dict = Depends(require_admin)):
    docs = await db.journal.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return docs


@api_router.get("/admin/journal/{slug}", response_model=JournalArticle)
async def admin_get_journal(slug: str, _: dict = Depends(require_admin)):
    doc = await db.journal.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")
    return doc


@api_router.patch("/admin/journal/{slug}", response_model=JournalArticle)
async def admin_update_journal(
    slug: str,
    payload: JournalArticleUpdate,
    _: dict = Depends(require_admin),
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
async def admin_delete_waitlist(payload: BulkDelete, _: dict = Depends(require_admin)):
    if not payload.ids:
        raise HTTPException(status_code=422, detail="No ids supplied")
    result = await db.waitlist.delete_many({"id": {"$in": payload.ids}})
    return {"deleted_count": result.deleted_count}


@api_router.post("/admin/inquiries/delete")
async def admin_delete_inquiries(payload: BulkDelete, _: dict = Depends(require_admin)):
    if not payload.ids:
        raise HTTPException(status_code=422, detail="No ids supplied")
    result = await db.inquiries.delete_many({"id": {"$in": payload.ids}})
    return {"deleted_count": result.deleted_count}


# ---------- Deck routes ----------
from decks import personalize, make_slug, generate_intro  # noqa: E402


@api_router.post("/admin/decks/preview")
async def admin_preview_deck(payload: DeckCreate, _: dict = Depends(require_admin)):
    """Generate logo + intro for a client name without saving."""
    if not payload.client_name.strip():
        raise HTTPException(status_code=422, detail="client_name is required")
    data = await personalize(payload.client_name.strip())
    return {"client_name": payload.client_name.strip(), **data}


@api_router.post("/admin/decks/regenerate-intro")
async def admin_regenerate_intro(payload: DeckCreate, _: dict = Depends(require_admin)):
    """Re-roll the intro text for a given client name."""
    if not payload.client_name.strip():
        raise HTTPException(status_code=422, detail="client_name is required")
    text = await generate_intro(payload.client_name.strip())
    return {"intro_text": text}


@api_router.post("/admin/decks", response_model=Deck)
async def admin_create_deck(payload: DeckCreate, _: dict = Depends(require_admin)):
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
    deck = Deck(
        slug=make_slug(name),
        client_name=name,
        domain=domain,
        logo_url=logo_url,
        intro_text=intro_text,
    )
    await db.decks.insert_one(deck.model_dump())
    return deck


@api_router.get("/admin/decks", response_model=List[Deck])
async def admin_list_decks(_: dict = Depends(require_admin)):
    docs = await db.decks.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.patch("/admin/decks/{deck_id}", response_model=Deck)
async def admin_update_deck(
    deck_id: str,
    payload: DeckUpdate,
    _: dict = Depends(require_admin),
):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")
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
async def admin_delete_deck(deck_id: str, _: dict = Depends(require_admin)):
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


@app.on_event("startup")
async def on_startup():
    await seed_products()
    await seed_journal()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
