"""Backend tests for Emporio Zeva — products, inquiries, newsletter."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://zeva-refresh.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_SLUGS = ["not-a-salami-classic", "not-a-salami-gift-board", "not-a-salami-pistachio"]
PRODUCT_FIELDS = [
    "id", "slug", "name", "tagline", "price", "weight",
    "description", "long_description", "ingredients", "pairings",
    "serving", "images", "badge", "available",
]


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
class TestHealth:
    def test_api_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data


# ---------- Products ----------
class TestProducts:
    def test_list_products(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 3
        slugs = sorted([p["slug"] for p in data])
        assert slugs == sorted(EXPECTED_SLUGS)
        for p in data:
            for f in PRODUCT_FIELDS:
                assert f in p, f"Missing field {f} in product {p.get('slug')}"
            assert "_id" not in p
            assert isinstance(p["ingredients"], list)
            assert isinstance(p["pairings"], list)
            assert isinstance(p["serving"], list)
            assert isinstance(p["images"], list)
            assert len(p["images"]) >= 1
            assert isinstance(p["available"], bool)

    @pytest.mark.parametrize("slug", EXPECTED_SLUGS)
    def test_get_product_by_slug(self, session, slug):
        r = session.get(f"{API}/products/{slug}")
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == slug
        assert "_id" not in data
        for f in PRODUCT_FIELDS:
            assert f in data

    def test_get_product_unknown_slug_404(self, session):
        r = session.get(f"{API}/products/nonexistent-xyz")
        assert r.status_code == 404

    def test_pistachio_available_false(self, session):
        r = session.get(f"{API}/products/not-a-salami-pistachio")
        assert r.status_code == 200
        assert r.json()["available"] is False


# ---------- Inquiries ----------
class TestInquiries:
    def test_create_inquiry(self, session):
        unique = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_{unique}",
            "email": f"test_{unique}@example.com",
            "phone": "+1 415 555 0100",
            "subject": "Product inquiry",
            "message": "Please send to my table for 8.",
            "product_slug": "not-a-salami-classic",
        }
        r = session.post(f"{API}/inquiries", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["product_slug"] == "not-a-salami-classic"
        assert "id" in data and isinstance(data["id"], str)
        assert "created_at" in data
        assert "_id" not in data

        # Verify persisted via GET list
        rl = session.get(f"{API}/inquiries")
        assert rl.status_code == 200
        ids = [i["id"] for i in rl.json()]
        assert data["id"] in ids

    def test_create_inquiry_minimal_fields(self, session):
        unique = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_{unique}",
            "email": f"min_{unique}@example.com",
            "message": "Hello",
        }
        r = session.post(f"{API}/inquiries", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["subject"] == "General Inquiry"  # default
        assert data["phone"] == ""

    def test_create_inquiry_invalid_email_422(self, session):
        payload = {"name": "X", "email": "not-an-email", "message": "Hi"}
        r = session.post(f"{API}/inquiries", json=payload)
        assert r.status_code == 422

    def test_list_inquiries_no_id_leak(self, session):
        r = session.get(f"{API}/inquiries")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for item in data:
            assert "_id" not in item


# ---------- Newsletter ----------
class TestNewsletter:
    def test_subscribe_and_idempotent(self, session):
        email = f"test_news_{uuid.uuid4().hex[:8]}@example.com"
        r1 = session.post(f"{API}/newsletter", json={"email": email})
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["email"] == email
        assert "id" in d1
        assert "_id" not in d1

        # Resubmit same email — should return existing record (same id)
        r2 = session.post(f"{API}/newsletter", json={"email": email})
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["email"] == email
        assert d2["id"] == d1["id"], "Newsletter is not idempotent — id changed"
        assert "_id" not in d2

    def test_subscribe_invalid_email_422(self, session):
        r = session.post(f"{API}/newsletter", json={"email": "bogus"})
        assert r.status_code == 422

    def test_list_newsletter(self, session):
        r = session.get(f"{API}/newsletter")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for entry in data:
            assert "_id" not in entry
            assert "email" in entry
