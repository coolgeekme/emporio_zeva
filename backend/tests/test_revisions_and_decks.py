"""
Backend tests for iteration 6:
  - Deck template_mode + slide_overrides (create/update/get)
  - Revisions for page, product, site_content, deck (list/get/revert + pre-revert snapshot)
  - RBAC on /api/admin/revisions endpoints
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@notasalami.com"
ADMIN_PASSWORD = "zeva-admin-2026"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _make_user(session, admin_headers, role):
    email = f"TEST_{role}_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "Test-Pass-1234"
    r = session.post(
        f"{API}/admin/users",
        headers=admin_headers,
        json={"email": email, "name": f"TEST {role}", "role": role, "password": pwd},
    )
    assert r.status_code in (200, 201), r.text
    uid = r.json()["id"]
    r2 = session.post(f"{API}/admin/login", json={"email": email, "password": pwd})
    assert r2.status_code == 200, r2.text
    return {"id": uid, "headers": {"Authorization": f"Bearer {r2.json()['token']}"}}


@pytest.fixture(scope="module")
def editor_user(session, admin_headers):
    u = _make_user(session, admin_headers, "editor")
    yield u
    session.delete(f"{API}/admin/users/{u['id']}", headers=admin_headers)


@pytest.fixture(scope="module")
def viewer_user(session, admin_headers):
    u = _make_user(session, admin_headers, "viewer")
    yield u
    session.delete(f"{API}/admin/users/{u['id']}", headers=admin_headers)


# ====================== DECKS: template_mode + slide_overrides ======================
class TestDeckTemplateMode:
    def test_create_deck_default_template_mode(self, session, admin_headers):
        name = f"TEST Default Mode {uuid.uuid4().hex[:6]}"
        r = session.post(
            f"{API}/admin/decks",
            headers=admin_headers,
            json={"client_name": name, "intro_text": "x", "logo_url": ""},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["template_mode"] == "template"
        assert body["slide_overrides"] == {}
        session.delete(f"{API}/admin/decks/{body['id']}", headers=admin_headers)

    def test_create_deck_custom_mode_with_overrides(self, session, admin_headers):
        name = f"TEST Custom Mode {uuid.uuid4().hex[:6]}"
        overrides = {"slide_1_cover": {"subtitle": "**bold** intro"}}
        r = session.post(
            f"{API}/admin/decks",
            headers=admin_headers,
            json={
                "client_name": name,
                "intro_text": "x",
                "logo_url": "",
                "template_mode": "custom",
                "slide_overrides": overrides,
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["template_mode"] == "custom"
        assert body["slide_overrides"]["slide_1_cover"]["subtitle"] == "**bold** intro"

        # Public deck route exposes both fields
        slug = body["slug"]
        r2 = session.get(f"{API}/decks/{slug}")
        assert r2.status_code == 200
        pub = r2.json()
        assert pub["template_mode"] == "custom"
        assert pub["slide_overrides"]["slide_1_cover"]["subtitle"] == "**bold** intro"

        session.delete(f"{API}/admin/decks/{body['id']}", headers=admin_headers)

    def test_create_deck_rejects_invalid_template_mode(self, session, admin_headers):
        name = f"TEST Bad Mode {uuid.uuid4().hex[:6]}"
        r = session.post(
            f"{API}/admin/decks",
            headers=admin_headers,
            json={"client_name": name, "intro_text": "x", "logo_url": "", "template_mode": "weird"},
        )
        assert r.status_code == 422, r.text

    def test_patch_deck_updates_mode_and_overrides(self, session, admin_headers):
        name = f"TEST Patch Mode {uuid.uuid4().hex[:6]}"
        r = session.post(
            f"{API}/admin/decks",
            headers=admin_headers,
            json={"client_name": name, "intro_text": "x", "logo_url": ""},
        )
        assert r.status_code == 200
        deck_id = r.json()["id"]
        try:
            r2 = session.patch(
                f"{API}/admin/decks/{deck_id}",
                headers=admin_headers,
                json={
                    "template_mode": "custom",
                    "slide_overrides": {"slide_8_pricing": {"title": "Custom Pricing"}},
                },
            )
            assert r2.status_code == 200, r2.text
            body = r2.json()
            assert body["template_mode"] == "custom"
            assert body["slide_overrides"]["slide_8_pricing"]["title"] == "Custom Pricing"

            # Invalid mode rejected
            r3 = session.patch(
                f"{API}/admin/decks/{deck_id}",
                headers=admin_headers,
                json={"template_mode": "garbage"},
            )
            assert r3.status_code == 422
        finally:
            session.delete(f"{API}/admin/decks/{deck_id}", headers=admin_headers)


# ====================== REVISIONS ======================
def _create_page(session, headers, title="TEST Rev Page"):
    r = session.post(
        f"{API}/admin/pages",
        headers=headers,
        json={"title": f"{title} {uuid.uuid4().hex[:6]}", "body": "v1 body", "status": "published"},
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


def _create_product(session, headers):
    name = f"TEST Rev Product {uuid.uuid4().hex[:6]}"
    r = session.post(
        f"{API}/admin/products",
        headers=headers,
        json={"name": name, "tagline": "tag1", "status": "future"},
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


class TestPageRevisions:
    def test_edit_writes_revision(self, session, admin_headers):
        page = _create_page(session, admin_headers)
        pid = page["id"]
        try:
            r = session.patch(
                f"{API}/admin/pages/{pid}",
                headers=admin_headers,
                json={"title": page["title"] + " UPDATED", "body": "v2 body"},
            )
            assert r.status_code == 200
            # List
            r2 = session.get(f"{API}/admin/revisions/page/{pid}", headers=admin_headers)
            assert r2.status_code == 200
            revs = r2.json()
            assert isinstance(revs, list) and len(revs) >= 1
            # desc order: most recent first
            if len(revs) >= 2:
                assert revs[0]["created_at"] >= revs[1]["created_at"]
            assert revs[0]["doc_type"] == "page"
            assert revs[0]["doc_id"] == pid
            assert "snapshot" in revs[0]
        finally:
            session.delete(f"{API}/admin/pages/{pid}", headers=admin_headers)

    def test_get_revision_by_id(self, session, admin_headers):
        page = _create_page(session, admin_headers)
        pid = page["id"]
        try:
            session.patch(
                f"{API}/admin/pages/{pid}",
                headers=admin_headers,
                json={"body": "v2"},
            )
            revs = session.get(f"{API}/admin/revisions/page/{pid}", headers=admin_headers).json()
            assert len(revs) >= 1
            rid = revs[0]["id"]
            r = session.get(f"{API}/admin/revisions/page/{pid}/{rid}", headers=admin_headers)
            assert r.status_code == 200
            assert r.json()["id"] == rid

            # Missing rev id -> 404
            r404 = session.get(
                f"{API}/admin/revisions/page/{pid}/does-not-exist",
                headers=admin_headers,
            )
            assert r404.status_code == 404
        finally:
            session.delete(f"{API}/admin/pages/{pid}", headers=admin_headers)

    def test_revert_writes_pre_revert_and_restores(self, session, admin_headers):
        page = _create_page(session, admin_headers)
        pid = page["id"]
        try:
            # Edit 1 -> body v2
            session.patch(
                f"{API}/admin/pages/{pid}",
                headers=admin_headers,
                json={"body": "v2"},
            )
            # Edit 2 -> body v3
            session.patch(
                f"{API}/admin/pages/{pid}",
                headers=admin_headers,
                json={"body": "v3"},
            )
            revs = session.get(f"{API}/admin/revisions/page/{pid}", headers=admin_headers).json()
            assert len(revs) >= 2
            count_before = len(revs)
            # Find the revision whose snapshot.body == "v1 body" (the original, before edit 1)
            target = None
            for r in revs:
                if r["snapshot"].get("body") == "v1 body":
                    target = r
                    break
            assert target is not None, f"could not find v1 revision in {[r['snapshot'].get('body') for r in revs]}"

            # Revert
            rr = session.post(
                f"{API}/admin/revisions/page/{pid}/{target['id']}/revert",
                headers=admin_headers,
            )
            assert rr.status_code == 200, rr.text

            # Page now back to v1 body
            r = session.get(f"{API}/admin/pages", headers=admin_headers)
            current = next(p for p in r.json() if p["id"] == pid)
            assert current["body"] == "v1 body"

            # Revisions count grew by AT LEAST 2 (pre-revert + revert itself)
            revs2 = session.get(f"{API}/admin/revisions/page/{pid}", headers=admin_headers).json()
            assert len(revs2) >= count_before + 2
            labels = [r.get("label", "") for r in revs2]
            assert any("pre-revert" in lbl.lower() for lbl in labels), f"no pre-revert label in {labels}"
        finally:
            session.delete(f"{API}/admin/pages/{pid}", headers=admin_headers)


class TestProductRevisions:
    def test_revert_does_not_change_slug(self, session, admin_headers):
        prod = _create_product(session, admin_headers)
        original_slug = prod["slug"]
        try:
            # Edit tagline
            r = session.patch(
                f"{API}/admin/products/{original_slug}",
                headers=admin_headers,
                json={"tagline": "tag2"},
            )
            assert r.status_code == 200
            revs = session.get(
                f"{API}/admin/revisions/product/{original_slug}",
                headers=admin_headers,
            ).json()
            assert len(revs) >= 1
            # The revision should snapshot the pre-edit state (tag1)
            target = next((r for r in revs if r["snapshot"].get("tagline") == "tag1"), None)
            assert target is not None
            rr = session.post(
                f"{API}/admin/revisions/product/{original_slug}/{target['id']}/revert",
                headers=admin_headers,
            )
            assert rr.status_code == 200
            # slug unchanged
            r = session.get(f"{API}/products/{original_slug}")
            assert r.status_code == 200
            assert r.json()["slug"] == original_slug
            assert r.json()["tagline"] == "tag1"
        finally:
            session.delete(f"{API}/admin/products/{original_slug}", headers=admin_headers)


class TestSiteContentRevisions:
    def test_edit_writes_revision(self, session, admin_headers):
        # Read current overrides (admin returns all pages at once)
        r0 = session.get(f"{API}/admin/site-content", headers=admin_headers)
        assert r0.status_code == 200
        all_pages = r0.json() or {}
        baseline_fields = (all_pages.get("home") or {}).get("fields", {}) or {}

        # Edit
        r = session.patch(
            f"{API}/admin/site-content/home",
            headers=admin_headers,
            json={"fields": {**baseline_fields, "hero_overline": "TEST REV OVERLINE"}},
        )
        assert r.status_code == 200
        try:
            revs = session.get(
                f"{API}/admin/revisions/site_content/home", headers=admin_headers
            ).json()
            assert isinstance(revs, list) and len(revs) >= 1
            assert revs[0]["doc_id"] == "home"
            assert revs[0]["doc_type"] == "site_content"
        finally:
            # restore
            session.patch(
                f"{API}/admin/site-content/home",
                headers=admin_headers,
                json={"fields": baseline_fields},
            )


class TestDeckRevisions:
    def test_edit_writes_revision_and_revert_preserves_slug_id(self, session, admin_headers):
        name = f"TEST Deck Rev {uuid.uuid4().hex[:6]}"
        r = session.post(
            f"{API}/admin/decks",
            headers=admin_headers,
            json={"client_name": name, "intro_text": "v1 intro", "logo_url": ""},
        )
        assert r.status_code == 200
        deck = r.json()
        did = deck["id"]
        original_slug = deck["slug"]
        try:
            session.patch(
                f"{API}/admin/decks/{did}",
                headers=admin_headers,
                json={"intro_text": "v2 intro"},
            )
            revs = session.get(
                f"{API}/admin/revisions/deck/{did}", headers=admin_headers
            ).json()
            assert len(revs) >= 1
            target = next((r for r in revs if r["snapshot"].get("intro_text") == "v1 intro"), None)
            assert target is not None
            rr = session.post(
                f"{API}/admin/revisions/deck/{did}/{target['id']}/revert",
                headers=admin_headers,
            )
            assert rr.status_code == 200
            # Confirm fields restored but slug/id preserved
            r2 = session.get(f"{API}/decks/{original_slug}")
            assert r2.status_code == 200
            cur = r2.json()
            assert cur["slug"] == original_slug
            assert cur["id"] == did
            assert cur["intro_text"] == "v1 intro"
        finally:
            session.delete(f"{API}/admin/decks/{did}", headers=admin_headers)


class TestRevisionsValidation:
    def test_invalid_doc_type_returns_422(self, session, admin_headers):
        r = session.get(f"{API}/admin/revisions/garbage/abc", headers=admin_headers)
        assert r.status_code == 422
        r2 = session.get(f"{API}/admin/revisions/garbage/abc/xyz", headers=admin_headers)
        assert r2.status_code == 422
        r3 = session.post(
            f"{API}/admin/revisions/garbage/abc/xyz/revert", headers=admin_headers
        )
        assert r3.status_code == 422

    def test_missing_rev_id_returns_404(self, session, admin_headers):
        page = _create_page(session, admin_headers)
        try:
            r = session.get(
                f"{API}/admin/revisions/page/{page['id']}/does-not-exist",
                headers=admin_headers,
            )
            assert r.status_code == 404
            r2 = session.post(
                f"{API}/admin/revisions/page/{page['id']}/does-not-exist/revert",
                headers=admin_headers,
            )
            assert r2.status_code == 404
        finally:
            session.delete(f"{API}/admin/pages/{page['id']}", headers=admin_headers)


class TestRevisionsRBAC:
    def test_viewer_forbidden(self, session, admin_headers, viewer_user):
        page = _create_page(session, admin_headers)
        pid = page["id"]
        try:
            r = session.get(
                f"{API}/admin/revisions/page/{pid}", headers=viewer_user["headers"]
            )
            assert r.status_code == 403
            # Even with a valid rev_id, viewer can't get
            r2 = session.get(
                f"{API}/admin/revisions/page/{pid}/whatever",
                headers=viewer_user["headers"],
            )
            assert r2.status_code == 403
            r3 = session.post(
                f"{API}/admin/revisions/page/{pid}/whatever/revert",
                headers=viewer_user["headers"],
            )
            assert r3.status_code == 403
        finally:
            session.delete(f"{API}/admin/pages/{pid}", headers=admin_headers)

    def test_editor_allowed(self, session, admin_headers, editor_user):
        page = _create_page(session, admin_headers)
        pid = page["id"]
        try:
            r = session.get(
                f"{API}/admin/revisions/page/{pid}", headers=editor_user["headers"]
            )
            assert r.status_code == 200
        finally:
            session.delete(f"{API}/admin/pages/{pid}", headers=admin_headers)
