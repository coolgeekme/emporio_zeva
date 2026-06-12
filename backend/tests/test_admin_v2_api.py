"""
Backend regression tests for the v2 Admin Dashboard (Pages CMS, Media, Users RBAC,
Settings, Stats, Bulk actions, Newsletter delete, brute-force lockout).

Login flow CHANGED from {password} -> {email, password}.
Existing endpoints continue to work but now use require_admin / require_editor / require_viewer.
"""
import io
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@notasalami.com"
ADMIN_PASSWORD = "zeva-admin-2026"


# ---------------- shared fixtures ----------------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(
        f"{API}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _create_user(session, admin_headers, role: str, prefix: str = "TEST"):
    email = f"{prefix}_{role}_{uuid.uuid4().hex[:6]}@example.com"
    password = "Test-Pass-1234"
    r = session.post(
        f"{API}/admin/users",
        headers=admin_headers,
        json={"email": email, "name": f"TEST {role}", "role": role, "password": password},
    )
    assert r.status_code in (200, 201), f"create {role} failed: {r.status_code} {r.text}"
    body = r.json()
    return {"id": body["id"], "email": email, "password": password, "role": role}


def _login(session, email, password):
    return session.post(f"{API}/admin/login", json={"email": email, "password": password})


# =============== LOGIN ===============
class TestLogin:
    def test_admin_login_returns_user_payload(self, session):
        r = _login(session, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        data = r.json()
        assert set(["token", "expires_at", "user"]).issubset(data.keys())
        u = data["user"]
        for f in ("id", "email", "name", "role", "created_at"):
            assert f in u
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"

    def test_login_wrong_password_401(self, session):
        r = _login(session, ADMIN_EMAIL, "WRONG_" + uuid.uuid4().hex[:6])
        # Could be 401 (default) — should not be 200
        assert r.status_code in (401, 429), f"unexpected {r.status_code}: {r.text}"
        assert r.status_code != 200

    def test_login_unknown_email_401(self, session):
        r = _login(session, f"missing_{uuid.uuid4().hex[:6]}@example.com", "anything")
        assert r.status_code in (401, 404)

    def test_legacy_password_only_login_rejected(self, session):
        """Old endpoint shape {password} only must NOT log in as admin."""
        r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
        assert r.status_code in (400, 401, 422)


# =============== /admin/me & /admin/stats ===============
class TestMeAndStats:
    def test_me_no_token_401(self, session):
        assert session.get(f"{API}/admin/me").status_code == 401

    def test_me_with_token(self, session, admin_headers):
        r = session.get(f"{API}/admin/me", headers=admin_headers)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"

    def test_stats_shape(self, session, admin_headers):
        r = session.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        for k in [
            "pages",
            "journal",
            "inquiries",
            "waitlist",
            "newsletter",
            "decks",
            "media",
            "users",
        ]:
            assert k in data, f"missing stat key: {k}"
            v = data[k]
            # Accept either int count or richer dict (e.g. pages -> {total, published})
            assert isinstance(v, (int, dict)), f"unexpected type for {k}: {type(v)}"
            if isinstance(v, dict):
                assert "total" in v, f"{k} dict missing 'total'"
        assert "recent_inquiries" in data and isinstance(data["recent_inquiries"], list)
        assert len(data["recent_inquiries"]) <= 5
        assert "recent_waitlist" in data and isinstance(data["recent_waitlist"], list)
        assert len(data["recent_waitlist"]) <= 5


# =============== PAGES CRUD + BULK + PUBLIC ===============
@pytest.fixture(scope="module")
def created_pages(session, admin_headers):
    """Create a parent + child + draft via admin; cleaned up at module end."""
    created = []

    def _new(payload):
        r = session.post(f"{API}/admin/pages", headers=admin_headers, json=payload)
        assert r.status_code in (200, 201), f"create page failed: {r.status_code} {r.text}"
        body = r.json()
        created.append(body["id"])
        return body

    parent = _new(
        {
            "title": f"TEST Parent {uuid.uuid4().hex[:6]}",
            "body": "Parent body",
            "status": "published",
            "show_in_nav": True,
        }
    )
    child = _new(
        {
            "title": f"TEST Child {uuid.uuid4().hex[:6]}",
            "body": "Child body",
            "status": "published",
            "parent_id": parent["id"],
            "show_in_footer": True,
        }
    )
    draft = _new(
        {
            "title": f"TEST Draft {uuid.uuid4().hex[:6]}",
            "body": "Draft body",
            "status": "draft",
        }
    )

    yield {"parent": parent, "child": child, "draft": draft}

    # cleanup
    for pid in created:
        session.delete(f"{API}/admin/pages/{pid}", headers=admin_headers)


class TestPagesCRUD:
    def test_create_auto_slugifies(self, session, admin_headers):
        title = f"TEST Auto Slug {uuid.uuid4().hex[:6]}"
        r = session.post(
            f"{API}/admin/pages",
            headers=admin_headers,
            json={"title": title, "body": "x", "status": "draft"},
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body["slug"], "slug missing"
        assert body["slug"].startswith("test-auto-slug-")
        assert "_id" not in body
        # cleanup
        session.delete(f"{API}/admin/pages/{body['id']}", headers=admin_headers)

    def test_patch_updates_fields(self, session, admin_headers, created_pages):
        pid = created_pages["draft"]["id"]
        r = session.patch(
            f"{API}/admin/pages/{pid}",
            headers=admin_headers,
            json={"body": "Updated body", "status": "published"},
        )
        assert r.status_code == 200, r.text
        # verify via GET
        r2 = session.get(f"{API}/admin/pages", headers=admin_headers)
        assert r2.status_code == 200
        found = next((p for p in r2.json() if p["id"] == pid), None)
        assert found and found["body"] == "Updated body" and found["status"] == "published"

    def test_orphan_child_on_parent_delete(self, session, admin_headers):
        # Create an isolated parent+child pair, delete parent, child must have parent_id=None
        parent = session.post(
            f"{API}/admin/pages",
            headers=admin_headers,
            json={"title": f"TEST Orph Par {uuid.uuid4().hex[:6]}", "body": "x"},
        ).json()
        child = session.post(
            f"{API}/admin/pages",
            headers=admin_headers,
            json={
                "title": f"TEST Orph Ch {uuid.uuid4().hex[:6]}",
                "body": "x",
                "parent_id": parent["id"],
            },
        ).json()
        assert child.get("parent_id") == parent["id"]

        r = session.delete(f"{API}/admin/pages/{parent['id']}", headers=admin_headers)
        assert r.status_code in (200, 204)

        # fetch child fresh
        listing = session.get(f"{API}/admin/pages", headers=admin_headers).json()
        ch = next((p for p in listing if p["id"] == child["id"]), None)
        assert ch is not None
        assert ch.get("parent_id") in (None, ""), f"orphan parent_id not reset: {ch.get('parent_id')}"

        # cleanup child
        session.delete(f"{API}/admin/pages/{child['id']}", headers=admin_headers)


class TestPagesBulk:
    def test_bulk_unpublish_then_publish_then_delete(self, session, admin_headers):
        ids = []
        for i in range(3):
            r = session.post(
                f"{API}/admin/pages",
                headers=admin_headers,
                json={
                    "title": f"TEST Bulk {i}-{uuid.uuid4().hex[:6]}",
                    "body": "b",
                    "status": "published",
                },
            )
            ids.append(r.json()["id"])

        # unpublish
        r = session.post(
            f"{API}/admin/pages/bulk",
            headers=admin_headers,
            json={"action": "unpublish", "ids": ids},
        )
        assert r.status_code == 200, r.text

        listing = session.get(f"{API}/admin/pages", headers=admin_headers).json()
        for pid in ids:
            p = next(x for x in listing if x["id"] == pid)
            assert p["status"] == "draft"

        # publish
        r = session.post(
            f"{API}/admin/pages/bulk",
            headers=admin_headers,
            json={"action": "publish", "ids": ids},
        )
        assert r.status_code == 200
        listing = session.get(f"{API}/admin/pages", headers=admin_headers).json()
        for pid in ids:
            p = next(x for x in listing if x["id"] == pid)
            assert p["status"] == "published"

        # delete
        r = session.post(
            f"{API}/admin/pages/bulk",
            headers=admin_headers,
            json={"action": "delete", "ids": ids},
        )
        assert r.status_code == 200
        listing = session.get(f"{API}/admin/pages", headers=admin_headers).json()
        existing = {p["id"] for p in listing}
        for pid in ids:
            assert pid not in existing


class TestPublicPages:
    def test_public_only_published(self, session, admin_headers, created_pages):
        r = session.get(f"{API}/pages")
        assert r.status_code == 200
        listing = r.json()
        statuses = {p.get("status") for p in listing}
        # if status is returned in public listing, all should be published; else accept ok
        if statuses and statuses != {None}:
            assert statuses.issubset({"published"})
        # parent (published) should be present
        slugs = {p["slug"] for p in listing}
        assert created_pages["parent"]["slug"] in slugs

    def test_public_get_by_slug_published(self, session, created_pages):
        slug = created_pages["parent"]["slug"]
        r = session.get(f"{API}/pages/{slug}")
        assert r.status_code == 200
        body = r.json()
        assert body["slug"] == slug

    def test_public_get_draft_404(self, session, admin_headers):
        # Make a fresh draft page
        r = session.post(
            f"{API}/admin/pages",
            headers=admin_headers,
            json={"title": f"TEST Draft Hidden {uuid.uuid4().hex[:6]}", "body": "x", "status": "draft"},
        )
        slug = r.json()["slug"]
        pid = r.json()["id"]
        try:
            r2 = session.get(f"{API}/pages/{slug}")
            assert r2.status_code == 404
        finally:
            session.delete(f"{API}/admin/pages/{pid}", headers=admin_headers)

    def test_public_unknown_slug_404(self, session):
        r = session.get(f"{API}/pages/zeva-refresh-does-not-exist-{uuid.uuid4().hex[:4]}")
        assert r.status_code == 404


# =============== MEDIA ===============
class TestMedia:
    def test_upload_png_and_lifecycle(self, session, admin_headers):
        # 1x1 PNG
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff"
            b"\xff?\x00\x05\xfe\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": (f"TEST_{uuid.uuid4().hex[:6]}.png", io.BytesIO(png), "image/png")}
        r = session.post(f"{API}/admin/media", headers=admin_headers, files=files)
        assert r.status_code in (200, 201), f"upload failed: {r.status_code} {r.text}"
        body = r.json()
        assert "id" in body and "url" in body
        assert body["url"].startswith("/api/static/media/"), f"unexpected url: {body['url']}"
        mid = body["id"]

        # Static asset retrievable
        r2 = session.get(f"{BASE_URL}{body['url']}")
        assert r2.status_code == 200, f"static asset not served: {r2.status_code}"

        # PATCH
        r3 = session.patch(
            f"{API}/admin/media/{mid}",
            headers=admin_headers,
            json={"alt_text": "TEST alt", "caption": "TEST cap"},
        )
        assert r3.status_code == 200, r3.text
        upd = r3.json()
        assert upd.get("alt_text") == "TEST alt"
        assert upd.get("caption") == "TEST cap"

        # DELETE
        r4 = session.delete(f"{API}/admin/media/{mid}", headers=admin_headers)
        assert r4.status_code in (200, 204)

        # Static no longer served
        r5 = session.get(f"{BASE_URL}{body['url']}")
        assert r5.status_code in (404, 403), f"file still served after delete: {r5.status_code}"

    def test_upload_rejects_html(self, session, admin_headers):
        files = {"file": ("evil.html", io.BytesIO(b"<html></html>"), "text/html")}
        r = session.post(f"{API}/admin/media", headers=admin_headers, files=files)
        assert r.status_code in (400, 415), f"expected reject, got {r.status_code}: {r.text}"


# =============== USERS + RBAC ===============
class TestUsersAndRBAC:
    def test_create_editor_user_and_login(self, session, admin_headers):
        u = _create_user(session, admin_headers, "editor")
        try:
            r = _login(session, u["email"], u["password"])
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["user"]["role"] == "editor"
            editor_token = data["token"]

            # editor must NOT access GET /api/admin/users -> 403
            r2 = session.get(
                f"{API}/admin/users", headers={"Authorization": f"Bearer {editor_token}"}
            )
            assert r2.status_code == 403, f"editor reached admin/users: {r2.status_code}"

            # editor CAN access /admin/me + /admin/stats
            r3 = session.get(
                f"{API}/admin/me", headers={"Authorization": f"Bearer {editor_token}"}
            )
            assert r3.status_code == 200

            r4 = session.get(
                f"{API}/admin/stats", headers={"Authorization": f"Bearer {editor_token}"}
            )
            assert r4.status_code == 200

            # editor CANNOT PATCH settings
            r5 = session.patch(
                f"{API}/admin/settings",
                headers={"Authorization": f"Bearer {editor_token}"},
                json={"general": {"brand_name": "Hacked"}},
            )
            assert r5.status_code == 403
        finally:
            session.delete(f"{API}/admin/users/{u['id']}", headers=admin_headers)

    def test_viewer_rbac(self, session, admin_headers):
        u = _create_user(session, admin_headers, "viewer")
        try:
            r = _login(session, u["email"], u["password"])
            assert r.status_code == 200, r.text
            tok = r.json()["token"]
            h = {"Authorization": f"Bearer {tok}"}

            assert session.get(f"{API}/admin/me", headers=h).status_code == 200
            assert session.get(f"{API}/admin/stats", headers=h).status_code == 200

            r2 = session.patch(
                f"{API}/admin/settings", headers=h, json={"general": {"brand_name": "x"}}
            )
            assert r2.status_code == 403
        finally:
            session.delete(f"{API}/admin/users/{u['id']}", headers=admin_headers)

    def test_patch_role_works(self, session, admin_headers):
        u = _create_user(session, admin_headers, "viewer")
        try:
            r = session.patch(
                f"{API}/admin/users/{u['id']}",
                headers=admin_headers,
                json={"role": "editor"},
            )
            assert r.status_code == 200, r.text
            assert r.json()["role"] == "editor"
        finally:
            session.delete(f"{API}/admin/users/{u['id']}", headers=admin_headers)

    def test_delete_self_blocked(self, session, admin_headers):
        me = session.get(f"{API}/admin/me", headers=admin_headers).json()
        r = session.delete(f"{API}/admin/users/{me['id']}", headers=admin_headers)
        assert r.status_code in (400, 403, 409), f"self-delete unexpectedly {r.status_code}"

    def test_delete_last_admin_blocked(self, session, admin_headers):
        # The bootstrap admin is the only admin in default state.
        # Attempt to delete should fail. But other tests create only non-admin users.
        me = session.get(f"{API}/admin/me", headers=admin_headers).json()
        users = session.get(f"{API}/admin/users", headers=admin_headers).json()
        admins = [u for u in users if u["role"] == "admin"]
        if len(admins) == 1 and admins[0]["id"] == me["id"]:
            r = session.delete(f"{API}/admin/users/{me['id']}", headers=admin_headers)
            assert r.status_code in (400, 403, 409)


# =============== SETTINGS ===============
class TestSettings:
    def test_get_defaults_and_patch_roundtrip(self, session, admin_headers):
        r = session.get(f"{API}/admin/settings", headers=admin_headers)
        assert r.status_code == 200
        original = r.json()
        original_email = original.get("general", {}).get("contact_email")

        # PATCH new contact_email
        new_email = f"orders+{uuid.uuid4().hex[:4]}@notasalami.com"
        r2 = session.patch(
            f"{API}/admin/settings",
            headers=admin_headers,
            json={"general": {"contact_email": new_email}},
        )
        assert r2.status_code == 200, r2.text

        # Public /api/settings reflects change
        r3 = session.get(f"{API}/settings")
        assert r3.status_code == 200
        pub = r3.json()
        assert pub.get("general", {}).get("contact_email") == new_email

        # restore
        if original_email is not None:
            session.patch(
                f"{API}/admin/settings",
                headers=admin_headers,
                json={"general": {"contact_email": original_email}},
            )


# =============== NEWSLETTER BULK DELETE ===============
class TestNewsletterBulkDelete:
    def test_bulk_delete(self, session, admin_headers):
        # seed 2 entries via public endpoint
        emails = [f"TEST_news_{uuid.uuid4().hex[:6]}@example.com" for _ in range(2)]
        for e in emails:
            r = session.post(f"{API}/newsletter", json={"email": e})
            assert r.status_code in (200, 201), r.text

        listing = session.get(f"{API}/admin/newsletter", headers=admin_headers).json()
        ids = [n["id"] for n in listing if n.get("email") in emails]
        assert len(ids) == 2, f"seed mismatch: {ids}"

        r = session.post(
            f"{API}/admin/newsletter/delete",
            headers=admin_headers,
            json={"ids": ids},
        )
        assert r.status_code == 200, r.text

        listing2 = session.get(f"{API}/admin/newsletter", headers=admin_headers).json()
        remaining = {n["id"] for n in listing2}
        for i in ids:
            assert i not in remaining


# =============== BRUTE-FORCE LOCKOUT ===============
class TestBruteForceLockout:
    def test_5_wrong_locks_account(self, session):
        target_email = f"lockout_{uuid.uuid4().hex[:8]}@example.com"
        # Use a non-existent email so we don't lock the real admin.
        codes = []
        for _ in range(6):
            r = session.post(
                f"{API}/admin/login",
                json={"email": target_email, "password": "wrong"},
            )
            codes.append(r.status_code)
            time.sleep(0.05)
        # Expect at least one 429 after 5th attempt
        assert 429 in codes, f"no 429 lockout triggered (codes={codes})"


# =============== LEGACY ENDPOINTS STILL WORK ===============
class TestLegacyStillWorks:
    def test_admin_waitlist_inquiries_newsletter_journal(self, session, admin_headers):
        for path in ("waitlist", "inquiries", "newsletter", "journal"):
            r = session.get(f"{API}/admin/{path}", headers=admin_headers)
            assert r.status_code == 200, f"{path}: {r.status_code} {r.text}"
            assert isinstance(r.json(), list)
