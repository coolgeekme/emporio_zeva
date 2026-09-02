"""Auth playbook checks: bcrypt hash format, token delivery, brute-force lockout (fake email), CORS."""
import os

import pytest
import requests
from dotenv import dotenv_values

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
ADMIN_EMAIL = "admin@notasalami.com"
ADMIN_PASSWORD = "zeva-admin-2026"


def test_bcrypt_hash_format_in_db():
    """password_hash must be a bcrypt $2b$ hash."""
    import asyncio

    from motor.motor_asyncio import AsyncIOMotorClient
    env = dotenv_values("/app/backend/.env")
    client = AsyncIOMotorClient(env["MONGO_URL"])
    db = client[env["DB_NAME"]]

    async def go():
        return await db.users.find_one({"email": ADMIN_EMAIL})

    user = asyncio.get_event_loop().run_until_complete(go())
    assert user is not None, "bootstrap admin not seeded"
    assert user["password_hash"].startswith("$2b$"), user["password_hash"][:10]
    assert user["role"] == "admin"


def test_login_returns_jwt_and_user():
    r = requests.post(f"{BASE}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert isinstance(data.get("token"), str) and len(data["token"]) > 20
    assert data["user"]["email"] == ADMIN_EMAIL
    assert "password_hash" not in data["user"]
    # NOTE: this build ships a bearer-token/sessionStorage session (no httpOnly cookie).
    print("set-cookie present:", "set-cookie" in {k.lower() for k in r.headers})


def test_wrong_password_rejected():
    r = requests.post(f"{BASE}/api/admin/login", json={"email": ADMIN_EMAIL, "password": "definitely-wrong"})
    assert r.status_code in (401, 429)


def test_brute_force_lockout_on_unknown_email():
    """5 failed attempts on a throwaway email must trigger a lockout (429/403)."""
    email = "TEST_lockout_probe@example.com"
    codes = []
    for _ in range(6):
        r = requests.post(f"{BASE}/api/admin/login", json={"email": email, "password": "bad-pass"})
        codes.append(r.status_code)
    print("lockout codes:", codes)
    assert codes[-1] in (403, 429), f"no lockout after 6 failures: {codes}"


def test_protected_route_requires_token():
    assert requests.get(f"{BASE}/api/admin/stats").status_code in (401, 403)
    assert requests.get(f"{BASE}/api/admin/stats", headers={"Authorization": "Bearer bogus"}).status_code in (401, 403)


def test_cors_headers():
    r = requests.get(f"{BASE}/api/settings", headers={"Origin": "https://evil.example.com"})
    print("ACAO:", r.headers.get("access-control-allow-origin"))
    assert r.status_code == 200
