"""Check whether clearing instagram_handle persists via the settings API. Restores original."""
import json
import os

import requests
from dotenv import dotenv_values

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
tok = requests.post(f"{BASE}/api/admin/login", json={"email": "admin@notasalami.com", "password": "zeva-admin-2026"}).json()
h = {"Authorization": f"Bearer {tok.get('token') or tok.get('access_token')}"}

pub = requests.get(f"{BASE}/api/settings").json()
orig = pub.get("general", {}).get("instagram_handle")
print("public settings instagram_handle BEFORE:", repr(orig))

r = requests.patch(f"{BASE}/api/admin/settings", headers=h, json={"general": {**pub.get("general", {}), "instagram_handle": ""}})
print("patch(clear):", r.status_code)
pub2 = requests.get(f"{BASE}/api/settings").json()
print("public settings instagram_handle AFTER clear:", repr(pub2.get("general", {}).get("instagram_handle")))

r2 = requests.patch(f"{BASE}/api/admin/settings", headers=h, json={"general": {**pub2.get("general", {}), "instagram_handle": orig}})
print("patch(restore):", r2.status_code)
pub3 = requests.get(f"{BASE}/api/settings").json()
print("public settings instagram_handle RESTORED:", repr(pub3.get("general", {}).get("instagram_handle")))
print("general keys:", list(pub3.get("general", {}).keys()))
