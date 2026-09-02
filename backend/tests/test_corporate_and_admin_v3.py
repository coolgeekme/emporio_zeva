"""Tests for corporate inquiry fields + admin upgrades (commit 6c3c220)."""
import os
import uuid

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
    assert token
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


def _find_inquiry(admin_session, email):
    r = admin_session.get(f"{BASE_URL}/api/admin/inquiries")
    assert r.status_code == 200, r.text[:300]
    rows = r.json()
    assert isinstance(rows, list)
    for row in rows:
        assert "_id" not in row
    return next((x for x in rows if x.get("email") == email), None)


def _delete_inquiry(admin_session, iid):
    r = admin_session.post(f"{BASE_URL}/api/admin/inquiries/delete", json={"ids": [iid]})
    assert r.status_code == 200, r.text[:300]


# --- POST /api/inquiries with new corporate fields ---
class TestCorporateInquiry:
    def test_corporate_tasting_inquiry_persists_fields(self, client, admin):
        email = f"TEST_corp_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "TEST Corp Contact",
            "email": email,
            "phone": "+1 415 555 0000",
            "subject": "Book a Corporate Tasting",
            "message": "TEST corporate tasting request",
            "kind": "corporate_tasting",
            "company": "TEST Company Inc",
            "preferred_date": "2026-09-15",
            "location": "TEST Office SF",
            "num_guests": "12",
            "occasion": "TEST client appreciation",
            "special_requirements": "TEST nut free",
        }
        r = client.post(f"{BASE_URL}/api/inquiries", json=payload)
        assert r.status_code in (200, 201), r.text[:400]
        body = r.json()
        assert body.get("email") == email or body.get("ok") or body.get("id")

        row = _find_inquiry(admin, email)
        assert row is not None, "inquiry not persisted"
        try:
            assert row["kind"] == "corporate_tasting"
            assert row["company"] == "TEST Company Inc"
            assert row["preferred_date"] == "2026-09-15"
            assert row["location"] == "TEST Office SF"
            assert row["num_guests"] == "12"
            assert row["occasion"] == "TEST client appreciation"
            assert row["special_requirements"] == "TEST nut free"
        finally:
            _delete_inquiry(admin, row["id"])
        assert _find_inquiry(admin, email) is None

    def test_corporate_proposal_kind(self, client, admin):
        email = f"TEST_prop_{uuid.uuid4().hex[:8]}@example.com"
        r = client.post(f"{BASE_URL}/api/inquiries", json={
            "name": "TEST Proposal", "email": email,
            "subject": "Request a Corporate Proposal",
            "message": "TEST proposal", "kind": "corporate_proposal",
            "company": "TEST Prop Co", "num_guests": "40",
        })
        assert r.status_code in (200, 201), r.text[:400]
        row = _find_inquiry(admin, email)
        assert row is not None
        try:
            assert row["kind"] == "corporate_proposal"
            assert row["company"] == "TEST Prop Co"
        finally:
            _delete_inquiry(admin, row["id"])

    def test_legacy_inquiry_backward_compatible(self, client, admin):
        email = f"TEST_legacy_{uuid.uuid4().hex[:8]}@example.com"
        r = client.post(f"{BASE_URL}/api/inquiries", json={
            "name": "TEST Legacy", "email": email, "message": "TEST legacy message only",
        })
        assert r.status_code in (200, 201), r.text[:400]
        row = _find_inquiry(admin, email)
        assert row is not None
        try:
            assert row.get("kind", "general") == "general"
            assert row.get("company", "") == ""
        finally:
            _delete_inquiry(admin, row["id"])

    def test_invalid_email_rejected(self, client):
        r = client.post(f"{BASE_URL}/api/inquiries", json={
            "name": "TEST", "email": "not-an-email", "message": "x"})
        assert r.status_code == 422


# --- Pages duplicate flow (frontend does POST /api/admin/pages with copied fields) ---
class TestPagesDuplicate:
    def test_create_duplicate_delete(self, admin):
        slug = f"test-scratch-{uuid.uuid4().hex[:6]}"
        r = admin.post(f"{BASE_URL}/api/admin/pages", json={
            "title": "TEST Scratch Page", "slug": slug,
            "excerpt": "TEST excerpt", "body": "TEST body", "status": "published",
        })
        assert r.status_code in (200, 201), r.text[:400]
        original = r.json()
        oid = original["id"]
        copy_id = None
        dup_id = None
        try:
            r2 = admin.post(f"{BASE_URL}/api/admin/pages", json={
                "title": "TEST Scratch Page (copy)", "slug": f"{slug}-copy",
                "excerpt": "TEST excerpt", "body": "TEST body", "status": "draft",
            })
            assert r2.status_code in (200, 201), r2.text[:400]
            copy = r2.json()
            copy_id = copy["id"]
            assert copy["slug"] == f"{slug}-copy"
            assert copy["status"] == "draft"
            # duplicate slug is currently ACCEPTED by the API (no uniqueness
            # constraint) — frontend guards against it by scanning existing slugs.
            r3 = admin.post(f"{BASE_URL}/api/admin/pages", json={
                "title": "TEST dup", "slug": slug, "body": "x"})
            if r3.status_code in (200, 201):
                dup_id = r3.json().get("id")
            assert r3.status_code in (200, 201, 400, 409)
            # draft copy must not be publicly visible
            rp = requests.get(f"{BASE_URL}/api/pages/{slug}-copy")
            assert rp.status_code == 404
        finally:
            for pid in [x for x in (oid, copy_id, dup_id) if x]:
                dr = admin.delete(f"{BASE_URL}/api/admin/pages/{pid}")
                assert dr.status_code in (200, 204), dr.text[:200]


# --- Admin lists used by search panels ---
class TestAdminLists:
    @pytest.mark.parametrize("path", ["waitlist", "newsletter", "inquiries"])
    def test_lists_ok_and_no_mongo_id(self, admin, path):
        r = admin.get(f"{BASE_URL}/api/admin/{path}")
        assert r.status_code == 200, r.text[:300]
        rows = r.json()
        assert isinstance(rows, list)
        for row in rows[:20]:
            assert "_id" not in row

    def test_settings_has_instagram_handle(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/settings")
        assert r.status_code == 200
        data = r.json()
        assert "general" in data
        assert "instagram_handle" in data["general"]

    def test_unauthenticated_admin_list_blocked(self, client):
        r = client.get(f"{BASE_URL}/api/admin/inquiries")
        assert r.status_code in (401, 403)
