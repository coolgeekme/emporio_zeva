"""Backend API tests for Emporio Zeva Deck builder endpoints.

Covers:
  - /api/admin/decks/preview (auth)
  - /api/admin/decks/regenerate-intro (auth)
  - /api/admin/decks (POST/GET) (auth)
  - /api/admin/decks/{id} (PATCH/DELETE) (auth)
  - /api/decks/{slug} (PUBLIC) — view_count increment & 404
"""
import os
import re
import time
import pytest
import requests

def _load_backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Fall back to frontend/.env (the source of truth in this repo)
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "zeva-admin-2026"

CREATED_DECK_IDS: list[str] = []


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# Module-scope cleanup of any decks created during this run
@pytest.fixture(scope="module", autouse=True)
def _cleanup_decks(session, admin_token):
    yield
    headers = {"Authorization": f"Bearer {admin_token}"}
    for did in CREATED_DECK_IDS:
        try:
            session.delete(f"{API}/admin/decks/{did}", headers=headers)
        except Exception:
            pass


# ---------- Auth guards ----------
class TestDeckAuthGuards:
    def test_preview_requires_auth(self, session):
        r = session.post(f"{API}/admin/decks/preview", json={"client_name": "TEST"})
        assert r.status_code in (401, 403)

    def test_regenerate_requires_auth(self, session):
        r = session.post(
            f"{API}/admin/decks/regenerate-intro", json={"client_name": "TEST"}
        )
        assert r.status_code in (401, 403)

    def test_list_requires_auth(self, session):
        r = session.get(f"{API}/admin/decks")
        assert r.status_code in (401, 403)

    def test_create_requires_auth(self, session):
        r = session.post(f"{API}/admin/decks", json={"client_name": "TEST"})
        assert r.status_code in (401, 403)

    def test_patch_requires_auth(self, session):
        r = session.patch(f"{API}/admin/decks/some-id", json={"client_name": "x"})
        assert r.status_code in (401, 403)

    def test_delete_requires_auth(self, session):
        r = session.delete(f"{API}/admin/decks/some-id")
        assert r.status_code in (401, 403)


# ---------- Preview ----------
class TestPreview:
    def test_preview_empty_returns_422(self, session, auth_headers):
        r = session.post(
            f"{API}/admin/decks/preview", json={"client_name": "   "}, headers=auth_headers
        )
        assert r.status_code == 422

    def test_preview_missing_field_returns_422(self, session, auth_headers):
        r = session.post(f"{API}/admin/decks/preview", json={}, headers=auth_headers)
        assert r.status_code == 422

    def test_preview_returns_personalization_without_saving(
        self, session, auth_headers
    ):
        r = session.post(
            f"{API}/admin/decks/preview",
            json={"client_name": "TEST Patagonia Co"},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["client_name"] == "TEST Patagonia Co"
        # domain and logo_url may be None for niche names; ensure keys exist
        assert "domain" in data
        assert "logo_url" in data
        assert "intro_text" in data
        assert isinstance(data["intro_text"], str)
        assert len(data["intro_text"]) > 0

        # Verify it was NOT persisted — list decks and ensure no slug for this name
        list_r = session.get(f"{API}/admin/decks", headers=auth_headers)
        assert list_r.status_code == 200
        for d in list_r.json():
            assert d["client_name"] != "TEST Patagonia Co", (
                "Preview should not persist a deck"
            )


# ---------- Regenerate intro ----------
class TestRegenerateIntro:
    def test_regenerate_empty_returns_422(self, session, auth_headers):
        r = session.post(
            f"{API}/admin/decks/regenerate-intro",
            json={"client_name": "  "},
            headers=auth_headers,
        )
        assert r.status_code == 422

    def test_regenerate_returns_intro_text(self, session, auth_headers):
        r = session.post(
            f"{API}/admin/decks/regenerate-intro",
            json={"client_name": "TEST Acme"},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "intro_text" in data
        assert isinstance(data["intro_text"], str)
        assert len(data["intro_text"]) > 0


# ---------- Create / List / Patch / Delete / Public ----------
class TestDeckLifecycle:
    def test_create_deck_with_slug_format(self, session, auth_headers):
        r = session.post(
            f"{API}/admin/decks",
            json={"client_name": "TEST Patagonia"},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"]
        assert d["client_name"] == "TEST Patagonia"
        assert d["view_count"] == 0
        assert "created_at" in d
        # Slug format: <slugified-name>-<6hex>
        assert re.match(r"^test-patagonia-[0-9a-f]{6}$", d["slug"]), d["slug"]
        CREATED_DECK_IDS.append(d["id"])

    def test_create_empty_name_returns_422(self, session, auth_headers):
        r = session.post(
            f"{API}/admin/decks", json={"client_name": "  "}, headers=auth_headers
        )
        assert r.status_code == 422

    def test_list_decks_sorted_newest_first(self, session, auth_headers):
        # Create a 2nd deck to verify ordering
        r1 = session.post(
            f"{API}/admin/decks",
            json={"client_name": "TEST Younger Co"},
            headers=auth_headers,
        )
        assert r1.status_code == 200
        younger_id = r1.json()["id"]
        CREATED_DECK_IDS.append(younger_id)

        lr = session.get(f"{API}/admin/decks", headers=auth_headers)
        assert lr.status_code == 200
        decks = lr.json()
        assert isinstance(decks, list)
        assert len(decks) >= 2
        # Verify ISO ordering (descending)
        created_dates = [d["created_at"] for d in decks]
        assert created_dates == sorted(created_dates, reverse=True), (
            f"List not sorted desc by created_at: {created_dates[:3]}"
        )
        # _id should not leak
        for d in decks:
            assert "_id" not in d

    def test_patch_deck_updates_fields(self, session, auth_headers):
        assert CREATED_DECK_IDS, "Need at least one deck"
        did = CREATED_DECK_IDS[0]
        payload = {
            "client_name": "TEST Patagonia Updated",
            "intro_text": "Updated intro line for tests.",
            "logo_url": "https://example.com/logo.png",
        }
        r = session.patch(
            f"{API}/admin/decks/{did}", json=payload, headers=auth_headers
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["client_name"] == payload["client_name"]
        assert d["intro_text"] == payload["intro_text"]
        assert d["logo_url"] == payload["logo_url"]

        # Verify persistence via list
        lr = session.get(f"{API}/admin/decks", headers=auth_headers)
        match = next((x for x in lr.json() if x["id"] == did), None)
        assert match is not None
        assert match["client_name"] == "TEST Patagonia Updated"
        assert match["intro_text"] == "Updated intro line for tests."

    def test_patch_empty_payload_returns_422(self, session, auth_headers):
        assert CREATED_DECK_IDS
        did = CREATED_DECK_IDS[0]
        r = session.patch(f"{API}/admin/decks/{did}", json={}, headers=auth_headers)
        assert r.status_code == 422

    def test_patch_unknown_id_returns_404(self, session, auth_headers):
        r = session.patch(
            f"{API}/admin/decks/does-not-exist-id",
            json={"client_name": "x"},
            headers=auth_headers,
        )
        assert r.status_code == 404

    def test_public_get_increments_view_count(self, session, auth_headers):
        assert CREATED_DECK_IDS
        # Fetch current slug + view count from admin list
        lr = session.get(f"{API}/admin/decks", headers=auth_headers)
        deck = next(x for x in lr.json() if x["id"] == CREATED_DECK_IDS[0])
        slug = deck["slug"]
        before = deck["view_count"]

        # Public GET — no auth header
        public = requests.Session()
        r1 = public.get(f"{API}/decks/{slug}")
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["slug"] == slug
        assert d1["view_count"] == before + 1
        assert d1["last_viewed_at"] is not None
        assert "_id" not in d1

        # Hit again — count should go up by 1
        r2 = public.get(f"{API}/decks/{slug}")
        assert r2.status_code == 200
        assert r2.json()["view_count"] == before + 2

    def test_public_get_unknown_slug_404(self, session):
        r = requests.get(f"{API}/decks/unknown-slug-xyz-123-zzz")
        assert r.status_code == 404

    def test_delete_unknown_id_returns_404(self, session, auth_headers):
        r = session.delete(
            f"{API}/admin/decks/does-not-exist-id", headers=auth_headers
        )
        assert r.status_code == 404

    def test_delete_deck_and_verify_removal(self, session, auth_headers):
        assert CREATED_DECK_IDS
        did = CREATED_DECK_IDS.pop()  # remove from cleanup queue
        # Get slug first
        lr = session.get(f"{API}/admin/decks", headers=auth_headers)
        deck = next((x for x in lr.json() if x["id"] == did), None)
        assert deck is not None
        slug = deck["slug"]

        r = session.delete(f"{API}/admin/decks/{did}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == {"deleted": True}

        # Verify gone via public GET
        pg = requests.get(f"{API}/decks/{slug}")
        assert pg.status_code == 404
