from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
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


class AdminLogin(BaseModel):
    password: str


class AdminToken(BaseModel):
    token: str
    expires_at: str


class DeckCreate(BaseModel):
    client_name: str


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
        "name": "Not A Salami — Classic Cocoa",
        "tagline": "A truly Sicilian treat. For the unexpected.",
        "price": "$32",
        "weight": "300g · 16–17 slices",
        "description": "Rich cocoa folded with crunchy biscotti, chocolate chips, and delicate sugar crystals. Hand-shaped, wrapped, and tied. Slice at the table.",
        "long_description": "Inspired by Eva's grandmother's recipe from Modica, Sicily — premium cocoa folded with crunchy biscotti, chocolate chips, and delicate sugar crystals. Hand-rolled and rested to develop its signature firm-yet-tender bite. Wrapped in butcher's twine and parchment so it arrives looking impossibly like cured meat. Cut it open at the table and watch the room turn.",
        "ingredients": [
            "Rich cocoa",
            "Crunchy biscotti",
            "Chocolate chips",
            "Delicate sugar crystals",
            "Unsalted butter",
            "Cane sugar",
            "Free-range eggs",
            "A whisper of espresso"
        ],
        "pairings": [
            "Coffee",
            "Wine",
            "Fresh fruit",
            "Aged cheese"
        ],
        "serving": [
            "Store refrigerated. Remove from the fridge 15–20 minutes before serving — best at room temperature.",
            "Slice with a sharp knife, 1¼–1½ inches thick. Each slice reveals its own pattern.",
            "Arrange in an overlapping fan. Serve slowly, around good conversation.",
            "8-week shelf life unopened. Best enjoyed within 2 weeks of opening."
        ],
        "images": [
            "https://www.emporiozeva.com/wp-content/uploads/2024/06/split-img1.jpg",
            "https://www.emporiozeva.com/wp-content/uploads/2024/06/product-scaled.jpg",
            "https://www.emporiozeva.com/wp-content/uploads/2024/06/image017.jpg"
        ],
        "badge": "Soft launch",
        "available": True,
    },
    {
        "slug": "not-a-salami-gift-board",
        "name": "The Tavola Gift Board",
        "tagline": "One Not A Salami, a hand-finished olive-wood board, linen napkin, and twine.",
        "price": "$78",
        "weight": "Boxed · 16–17 slices",
        "description": "A complete table ritual. Our cocoa salami nestled with a small olive-wood board, a hemmed linen napkin, and our serving card.",
        "long_description": "Designed as a host gift or a quiet indulgence. Each board is sourced from a small workshop in San Francisco and finished by hand. Pair it with our classic Not A Salami and a printed serving card pulled from Eva's notebook.",
        "ingredients": [
            "Includes: 1× Not A Salami Classic",
            "1× Olive-wood serving board, ~10in",
            "1× Italian linen napkin",
            "1× Letterpress serving card",
            "Wrapped in natural kraft, sealed with wax"
        ],
        "pairings": [
            "Espresso, naturally",
            "A late afternoon with friends",
            "Anyone hosting their first dinner of the season"
        ],
        "serving": [
            "Present the board unwrapped at the table.",
            "Slice generously, share generously.",
            "Keep the board — it gets better with use."
        ],
        "images": [
            "https://www.emporiozeva.com/wp-content/uploads/2024/06/image017.jpg",
            "https://www.emporiozeva.com/wp-content/uploads/2024/06/product-scaled.jpg"
        ],
        "badge": "Gift",
        "available": True,
    },
    {
        "slug": "not-a-salami-pistachio",
        "name": "Not A Salami — Pistachio di Bronte",
        "tagline": "Coming soon. Sicilian pistachio folded through dark cocoa.",
        "price": "$36",
        "weight": "300g · 16–17 slices",
        "description": "A future flavor in development — pistachio di Bronte from Mount Etna's slopes, paired with our signature cocoa base.",
        "long_description": "Still in Eva's kitchen. We're testing batches of pistachio from Bronte, on the volcanic slopes of Etna — the same nuts our family used for celebrations. Join the list to be first when it launches.",
        "ingredients": [
            "Premium dark cocoa",
            "Pistachio di Bronte D.O.P.",
            "Italian cookie crumbs",
            "Unsalted butter, cane sugar"
        ],
        "pairings": [
            "Marsala secco",
            "Affogato",
            "A long Sunday"
        ],
        "serving": [
            "Slice thin to reveal the pistachio mosaic.",
            "Serve at room temperature with a chilled dessert wine."
        ],
        "images": [
            "https://emporiozeva.com/wp-content/uploads/2025/03/iStock-1286886227-scaled.jpg",
            "https://emporiozeva.com/wp-content/uploads/2025/03/iStock-1170670861-scaled.jpg"
        ],
        "badge": "In development",
        "available": False,
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
    data = await personalize(name)
    deck = Deck(
        slug=make_slug(name),
        client_name=name,
        domain=data["domain"],
        logo_url=data["logo_url"],
        intro_text=data["intro_text"],
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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
