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


# ---------- Admin auth ----------
JWT_ALGORITHM = "HS256"
ADMIN_TOKEN_TTL_HOURS = 8
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def _admin_password() -> str:
    return os.environ["ADMIN_PASSWORD"]


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
        "weight": "300g · serves 8–10",
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
        "weight": "Boxed · serves 8–10",
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
        "weight": "300g · serves 8–10",
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
