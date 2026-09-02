"""One-off helper: verify the UI-submitted corporate inquiry, print it, then delete it."""
import json
import os

import requests
from dotenv import dotenv_values

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
tok = requests.post(f"{BASE}/api/admin/login", json={"email": "admin@notasalami.com", "password": "zeva-admin-2026"}).json()
token = tok.get("token") or tok.get("access_token")
h = {"Authorization": f"Bearer {token}"}
rows = requests.get(f"{BASE}/api/admin/inquiries", headers=h).json()
hits = [r for r in rows if r.get("email") == "test_ui_corp@example.com"]
print("matches:", len(hits))
for r in hits:
    print(json.dumps(r, indent=2)[:1200])
ids = [r["id"] for r in hits]
if ids:
    d = requests.post(f"{BASE}/api/admin/inquiries/delete", headers=h, json={"ids": ids})
    print("delete status:", d.status_code, d.text[:200])
rows2 = requests.get(f"{BASE}/api/admin/inquiries", headers=h).json()
print("remaining test rows:", len([r for r in rows2 if str(r.get("email", "")).startswith("test_ui_corp")]))
print("total inquiries now:", len(rows2))
print("TEST_ prefixed leftovers:", [r.get("email") for r in rows2 if "TEST" in str(r.get("email", "")) or "TEST" in str(r.get("name", ""))])
