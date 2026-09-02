"""Verification tests for commit 98aa6bf: corporate CTA kind sync, contact
Instagram wiring, inquiries CSV export fields."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN_EMAIL = "admin@notasalami.com"
ADMIN_PASSWORD = "zeva-admin-2026"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin(client):
    r = client.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("token") or r.json().get("access_token")
    assert token, f"no token in {r.json().keys()}"
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


def _inquiries(admin):
    r = admin.get(f"{BASE_URL}/api/admin/inquiries")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    return data if isinstance(data, list) else data.get("items", [])


# --- Item 1: UI-created inquiries must carry the right kind -----------------
def test_ui_created_inquiries_have_correct_kind(admin):
    rows = _inquiries(admin)
    prop = [x for x in rows if x.get("email") == "zqtest8_prop@example.com"]
    tast = [x for x in rows if x.get("email") == "zqtest8_tast@example.com"]
    assert prop, "proposal inquiry created via UI not found in DB"
    assert tast, "tasting inquiry created via UI not found in DB"
    assert prop[0].get("kind") == "corporate_proposal", f"got kind={prop[0].get('kind')}"
    assert tast[0].get("kind") == "corporate_tasting", f"got kind={tast[0].get('kind')}"
    assert prop[0].get("company") == "ZQTEST8 Proposal Co"
    assert prop[0].get("num_guests") in (14, "14")
    assert prop[0].get("occasion") == "ZQTEST8 offsite"
    assert "_id" not in prop[0]


def test_cleanup_ui_inquiries(admin):
    rows = _inquiries(admin)
    ids = [x["id"] for x in rows if x.get("email") in ("zqtest8_prop@example.com", "zqtest8_tast@example.com")]
    assert ids, "nothing to clean up"
    r = admin.post(f"{BASE_URL}/api/admin/inquiries/delete", json={"ids": ids})
    assert r.status_code == 200, r.text[:300]
    remaining = [x for x in _inquiries(admin) if x.get("email", "").startswith("zqtest8_")]
    assert remaining == [], f"cleanup failed: {remaining}"


# --- Item 3 support: corporate inquiry for the CSV export check ------------
def test_create_export_fixture_inquiry(admin):
    payload = {
        "kind": "corporate_proposal",
        "company": "ZQTEST8 Export Co",
        "name": "ZQTEST8 Export",
        "email": "zqtest8_export@example.com",
        "phone": "+1 415 555 0108",
        "subject": "Corporate proposal",
        "preferred_date": "2026-10-15",
        "location": "ZQTEST8 Rooftop",
        "num_guests": "22",
        "occasion": "ZQTEST8 client dinner",
        "special_requirements": "ZQTEST8 gluten free",
        "message": "ZQTEST8 export message",
    }
    r = requests.post(f"{BASE_URL}/api/inquiries", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:300]}"
    rows = [x for x in _inquiries(admin) if x.get("email") == "zqtest8_export@example.com"]
    assert rows, "export fixture inquiry not persisted"
    row = rows[0]
    for k, v in [("kind", "corporate_proposal"), ("location", "ZQTEST8 Rooftop"),
                 ("occasion", "ZQTEST8 client dinner"), ("special_requirements", "ZQTEST8 gluten free")]:
        assert row.get(k) == v, f"{k}={row.get(k)}"
    assert str(row.get("preferred_date", "")).startswith("2026-10-15")


def test_zz_cleanup_export_fixture(admin):
    rows = _inquiries(admin)
    ids = [x["id"] for x in rows if x.get("email", "").startswith("zqtest8_")]
    if ids:
        r = admin.post(f"{BASE_URL}/api/admin/inquiries/delete", json={"ids": ids})
        assert r.status_code == 200, r.text[:300]
    leftover = [x.get("email") for x in _inquiries(admin)
                if "zqtest8" in (x.get("email") or "").lower() or "ZQTEST8" in (x.get("company") or "")]
    assert leftover == [], f"leftover test records: {leftover}"


# --- Item 2 support: settings instagram handle -----------------------------
def test_public_settings_expose_instagram_handle():
    r = requests.get(f"{BASE_URL}/api/settings", timeout=30)
    assert r.status_code == 200
    assert r.json().get("general", {}).get("instagram_handle") == "@notasalami"
