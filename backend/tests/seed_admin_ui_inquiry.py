"""Seed one corporate inquiry for admin UI testing (delete with --delete)."""
import os
import sys

import requests
from dotenv import dotenv_values

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
EMAIL = "test_admin_corp@example.com"
tok = requests.post(f"{BASE}/api/admin/login", json={"email": "admin@notasalami.com", "password": "zeva-admin-2026"}).json()
h = {"Authorization": f"Bearer {tok.get('token') or tok.get('access_token')}"}

if "--delete" in sys.argv:
    rows = requests.get(f"{BASE}/api/admin/inquiries", headers=h).json()
    ids = [r["id"] for r in rows if r.get("email") == EMAIL]
    print("deleting", ids)
    if ids:
        print(requests.post(f"{BASE}/api/admin/inquiries/delete", headers=h, json={"ids": ids}).text)
else:
    r = requests.post(f"{BASE}/api/inquiries", json={
        "name": "ZQTEST Contact", "email": EMAIL, "phone": "+1 415 000 9999",
        "subject": "Book a Corporate Tasting", "message": "ZQTEST admin ui corporate inquiry",
        "kind": "corporate_tasting", "company": "ZQTESTCO Holdings",
        "preferred_date": "2026-11-05", "location": "ZQTEST Venue Oakland",
        "num_guests": "22", "occasion": "ZQTEST milestone",
        "special_requirements": "ZQTEST dairy free",
    })
    print(r.status_code, r.text[:200])
