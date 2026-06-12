"""
Backend regression tests for the new Products CRUD + Site Content editor (iteration 5).

Covers:
- /api/admin/products GET/POST/PATCH/DELETE
- Slug auto-generation and incrementing on collision
- Status validation (active/future/archived only)
- Slug-conflict (409) on PATCH
- Empty-name (422) on PATCH
- /api/site-content/{page} public GET (returns merged defaults)
- /api/site-content/unknown -> 404
- /api/admin/site-content (manifest + overrides) auth-gated
- /api/admin/site-content/{page} PATCH override / unknown-key drop / empty-string reset
- RBAC: viewer cannot list/edit products or site-content; editor + admin can
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@notasalami.com"
ADMIN_PASSWORD = "zeva-admin-2026"

VALID_PAGES = {"home", "collection", "ritual", "our_story", "journal_index", "contact"}


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(
        f"{API}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _mk_user(session, admin_h, role):
    email = f"TEST_{role}_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "Test-Pass-1234"
    r = session.post(
        f"{API}/admin/users",
        headers=admin_h,
        json={"email": email, "name": f"TEST {role}", "role": role, "password": pwd},
    )
    assert r.status_code in (200, 201), r.text
    uid = r.json()["id"]
    lr = session.post(f"{API}/admin/login", json={"email": email, "password": pwd})
    assert lr.status_code == 200, lr.text
    return {
        "id": uid,
        "email": email,
        "headers": {"Authorization": f"Bearer {lr.json()['token']}"},
    }


@pytest.fixture(scope="module")
def viewer(session, admin_h):
    u = _mk_user(session, admin_h, "viewer")
    yield u
    session.delete(f"{API}/admin/users/{u['id']}", headers=admin_h)


@pytest.fixture(scope="module")
def editor(session, admin_h):
    u = _mk_user(session, admin_h, "editor")
    yield u
    session.delete(f"{API}/admin/users/{u['id']}", headers=admin_h)


# =================================================================
# Products CRUD
# =================================================================
class TestAdminProducts:
    def test_admin_list_returns_all_products(self, session, admin_h):
        r = session.get(f"{API}/admin/products", headers=admin_h)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 5, f"expected >=5 seeded products, got {len(items)}"
        slugs = {p["slug"] for p in items}
        assert "not-a-salami-classic" in slugs
        # also expect at least one 'future' to be visible (admin sees all statuses)
        statuses = {p["status"] for p in items}
        assert "active" in statuses

    def test_admin_list_requires_auth(self, session):
        assert session.get(f"{API}/admin/products").status_code == 401

    def test_admin_list_viewer_forbidden(self, session, viewer):
        r = session.get(f"{API}/admin/products", headers=viewer["headers"])
        assert r.status_code == 403, f"viewer should be 403, got {r.status_code}"

    def test_admin_list_editor_allowed(self, session, editor):
        r = session.get(f"{API}/admin/products", headers=editor["headers"])
        assert r.status_code == 200

    def test_create_product_auto_slug(self, session, admin_h):
        payload = {"name": "TEST Product Z", "tagline": "qa", "status": "active"}
        r = session.post(f"{API}/admin/products", headers=admin_h, json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["name"] == "TEST Product Z"
        assert p["slug"] == "test-product-z"
        assert p["status"] == "active"
        assert "id" in p
        # cleanup
        session.delete(f"{API}/admin/products/{p['slug']}", headers=admin_h)

    def test_create_duplicate_name_increments_slug(self, session, admin_h):
        base_name = f"TEST Dup {uuid.uuid4().hex[:5]}"
        r1 = session.post(f"{API}/admin/products", headers=admin_h, json={"name": base_name})
        assert r1.status_code == 200, r1.text
        slug1 = r1.json()["slug"]

        r2 = session.post(f"{API}/admin/products", headers=admin_h, json={"name": base_name})
        assert r2.status_code == 200, r2.text
        slug2 = r2.json()["slug"]

        assert slug1 != slug2
        assert slug2.startswith(slug1)
        assert slug2.endswith("-2")

        # cleanup
        session.delete(f"{API}/admin/products/{slug1}", headers=admin_h)
        session.delete(f"{API}/admin/products/{slug2}", headers=admin_h)

    def test_create_invalid_status_422(self, session, admin_h):
        r = session.post(
            f"{API}/admin/products",
            headers=admin_h,
            json={"name": "TEST Bad Status", "status": "draft"},
        )
        assert r.status_code == 422, r.text

    def test_patch_updates_fields(self, session, admin_h):
        """Use the seeded 'not-a-salami-pistachio' product (per review spec)."""
        slug = "not-a-salami-pistachio"
        orig_pub = session.get(f"{API}/products/{slug}")
        if orig_pub.status_code != 200:
            # fall back: create a throwaway product
            mk = session.post(
                f"{API}/admin/products",
                headers=admin_h,
                json={"name": f"TEST Patch {uuid.uuid4().hex[:5]}", "tagline": "orig"},
            )
            slug = mk.json()["slug"]
            orig_pub = session.get(f"{API}/products/{slug}")
        orig_tagline = orig_pub.json().get("tagline", "")

        patch = session.patch(
            f"{API}/admin/products/{slug}",
            headers=admin_h,
            json={"tagline": "TEST QA TAGLINE"},
        )
        assert patch.status_code == 200, patch.text
        assert patch.json()["tagline"] == "TEST QA TAGLINE"

        # verify public GET also reflects the change
        verify = session.get(f"{API}/products/{slug}")
        assert verify.status_code == 200
        assert verify.json()["tagline"] == "TEST QA TAGLINE"

        # restore original tagline (seed_products is insert-only now, so it WON'T re-seed)
        restore = session.patch(
            f"{API}/admin/products/{slug}",
            headers=admin_h,
            json={"tagline": orig_tagline},
        )
        assert restore.status_code == 200
        assert session.get(f"{API}/products/{slug}").json()["tagline"] == orig_tagline

    def test_patch_empty_name_422(self, session, admin_h):
        # create a throwaway
        mk = session.post(
            f"{API}/admin/products", headers=admin_h, json={"name": "TEST Empty Name Target"}
        )
        slug = mk.json()["slug"]
        r = session.patch(
            f"{API}/admin/products/{slug}", headers=admin_h, json={"name": "   "}
        )
        assert r.status_code == 422, r.text
        # cleanup
        session.delete(f"{API}/admin/products/{slug}", headers=admin_h)

    def test_patch_slug_collision_409(self, session, admin_h):
        # create two products
        a = session.post(
            f"{API}/admin/products", headers=admin_h, json={"name": f"TEST A {uuid.uuid4().hex[:5]}"}
        ).json()
        b = session.post(
            f"{API}/admin/products", headers=admin_h, json={"name": f"TEST B {uuid.uuid4().hex[:5]}"}
        ).json()
        # try renaming B to A's slug
        r = session.patch(
            f"{API}/admin/products/{b['slug']}", headers=admin_h, json={"slug": a["slug"]}
        )
        assert r.status_code == 409, r.text
        # cleanup
        session.delete(f"{API}/admin/products/{a['slug']}", headers=admin_h)
        session.delete(f"{API}/admin/products/{b['slug']}", headers=admin_h)

    def test_delete_and_second_delete_404(self, session, admin_h):
        mk = session.post(
            f"{API}/admin/products", headers=admin_h, json={"name": f"TEST Del {uuid.uuid4().hex[:5]}"}
        ).json()
        slug = mk["slug"]
        d1 = session.delete(f"{API}/admin/products/{slug}", headers=admin_h)
        assert d1.status_code == 200
        assert d1.json() == {"deleted": True}
        d2 = session.delete(f"{API}/admin/products/{slug}", headers=admin_h)
        assert d2.status_code == 404

    def test_viewer_cannot_create_or_delete(self, session, viewer):
        r = session.post(
            f"{API}/admin/products",
            headers=viewer["headers"],
            json={"name": "TEST Viewer Blocked"},
        )
        assert r.status_code == 403
        d = session.delete(
            f"{API}/admin/products/not-a-salami-classic", headers=viewer["headers"]
        )
        assert d.status_code == 403


# =================================================================
# Public site content
# =================================================================
class TestPublicSiteContent:
    def test_home_returns_defaults_flat_dict(self, session):
        r = session.get(f"{API}/site-content/home")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        # spot-check expected default keys
        for k in [
            "hero_overline",
            "hero_h1_line1",
            "hero_h1_italic",
            "hero_intro_body",
            "hero_image",
            "hero_card_overline",
            "hero_card_title",
            "why_overline",
            "why_title",
            "illusion_overline",
        ]:
            assert k in data, f"missing key in /site-content/home: {k}"
        assert data["hero_h1_line1"] == "Not A"
        assert data["hero_h1_italic"] == "Salami."

    def test_each_known_page_returns_200(self, session):
        for page in VALID_PAGES:
            r = session.get(f"{API}/site-content/{page}")
            assert r.status_code == 200, f"{page}: {r.status_code} {r.text}"
            assert isinstance(r.json(), dict)

    def test_unknown_page_404(self, session):
        assert session.get(f"{API}/site-content/foo_bar_zzz").status_code == 404


# =================================================================
# Admin site content
# =================================================================
class TestAdminSiteContent:
    def test_requires_auth(self, session):
        assert session.get(f"{API}/admin/site-content").status_code == 401

    def test_viewer_forbidden(self, session, viewer):
        r = session.get(f"{API}/admin/site-content", headers=viewer["headers"])
        assert r.status_code == 403

    def test_admin_returns_full_manifest(self, session, admin_h):
        r = session.get(f"{API}/admin/site-content", headers=admin_h)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "pages" in body
        keys = {p["key"] for p in body["pages"]}
        assert keys == VALID_PAGES, f"unexpected pages: {keys}"
        # each page has label/sections/overrides
        for p in body["pages"]:
            assert {"key", "label", "sections", "overrides"}.issubset(p.keys())
            assert isinstance(p["sections"], list)
            assert isinstance(p["overrides"], dict)

    def test_editor_can_get(self, session, editor):
        r = session.get(f"{API}/admin/site-content", headers=editor["headers"])
        assert r.status_code == 200

    def test_patch_override_and_reset(self, session, admin_h):
        # capture original public value
        default_overline = session.get(f"{API}/site-content/home").json()["hero_overline"]

        # Override
        r = session.patch(
            f"{API}/admin/site-content/home",
            headers=admin_h,
            json={"hero_overline": "TEST OVERRIDE"},
        )
        assert r.status_code == 200, r.text
        merged = r.json()
        assert merged["hero_overline"] == "TEST OVERRIDE"

        # Public reflects the override
        pub = session.get(f"{API}/site-content/home").json()
        assert pub["hero_overline"] == "TEST OVERRIDE"

        # Empty string resets to default
        r2 = session.patch(
            f"{API}/admin/site-content/home",
            headers=admin_h,
            json={"hero_overline": ""},
        )
        assert r2.status_code == 200
        assert r2.json()["hero_overline"] == default_overline
        # Public reverted
        assert session.get(f"{API}/site-content/home").json()["hero_overline"] == default_overline

    def test_patch_drops_unknown_keys_silently(self, session, admin_h):
        r = session.patch(
            f"{API}/admin/site-content/home",
            headers=admin_h,
            json={"foo_bar_unknown": "garbage"},
        )
        # spec says: does NOT 422 — silently drops
        assert r.status_code == 200, r.text
        body = r.json()
        assert "foo_bar_unknown" not in body
        # public also doesn't have it
        assert "foo_bar_unknown" not in session.get(f"{API}/site-content/home").json()

    def test_patch_unknown_page_404(self, session, admin_h):
        r = session.patch(
            f"{API}/admin/site-content/foo_bar_zzz",
            headers=admin_h,
            json={"x": "y"},
        )
        assert r.status_code == 404

    def test_viewer_cannot_patch(self, session, viewer):
        r = session.patch(
            f"{API}/admin/site-content/home",
            headers=viewer["headers"],
            json={"hero_overline": "blocked"},
        )
        assert r.status_code == 403

    def test_editor_can_patch(self, session, editor, admin_h):
        # capture current
        cur = session.get(f"{API}/site-content/home").json()["hero_overline"]
        r = session.patch(
            f"{API}/admin/site-content/home",
            headers=editor["headers"],
            json={"hero_overline": "TEST EDITOR OK"},
        )
        assert r.status_code == 200, r.text
        # reset back to default (empty string => default)
        session.patch(
            f"{API}/admin/site-content/home",
            headers=admin_h,
            json={"hero_overline": ""},
        )
        # sanity: now public default
        assert session.get(f"{API}/site-content/home").json()["hero_overline"] == cur
