"""Backend API tests for Emporio Zeva admin + public endpoints."""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://zeva-refresh.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "zeva-admin-2026"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(
        f"{API}/admin/login",
        json={"email": "admin@notasalami.com", "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "expires_at" in data
    return data["token"]


# ---------- Public products ----------
class TestProducts:
    def test_list_products(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 3
        slugs = [p["slug"] for p in data]
        assert "not-a-salami-classic" in slugs

    def test_get_product_by_slug(self, session):
        r = session.get(f"{API}/products/not-a-salami-classic")
        assert r.status_code == 200
        p = r.json()
        assert p["slug"] == "not-a-salami-classic"
        assert "_id" not in p

    def test_get_product_404(self, session):
        r = session.get(f"{API}/products/does-not-exist")
        assert r.status_code == 404


# ---------- Public waitlist ----------
class TestWaitlistPublic:
    def test_create_waitlist_entry(self, session):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "TEST User",
            "email": email,
            "product_slug": "not-a-salami-classic",
            "note": "TEST note",
        }
        r = session.post(f"{API}/waitlist", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["product_slug"] == "not-a-salami-classic"
        assert "id" in data and "created_at" in data

    def test_waitlist_idempotent_same_email_and_product(self, session):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "TEST User",
            "email": email,
            "product_slug": "not-a-salami-pistachio",
            "note": "first",
        }
        r1 = session.post(f"{API}/waitlist", json=payload)
        assert r1.status_code == 200
        first_id = r1.json()["id"]

        payload["note"] = "second attempt"
        r2 = session.post(f"{API}/waitlist", json=payload)
        assert r2.status_code == 200
        assert r2.json()["id"] == first_id  # idempotent

    def test_waitlist_invalid_email(self, session):
        r = session.post(
            f"{API}/waitlist",
            json={"name": "x", "email": "not-an-email", "product_slug": "x"},
        )
        assert r.status_code == 422


# ---------- Admin login ----------
class TestAdminLogin:
    def test_login_success(self, session):
        r = session.post(
        f"{API}/admin/login",
        json={"email": "admin@notasalami.com", "password": ADMIN_PASSWORD},
    )
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["token"], str) and len(data["token"]) > 20
        assert "expires_at" in data

    def test_login_wrong_password_returns_401(self, session):
        # Use unique random bad passwords; only 3 attempts so we don't trigger lockout
        for i in range(3):
            r = session.post(
                f"{API}/admin/login",
                json={
                    "email": f"nobody-{uuid.uuid4().hex[:6]}@notasalami.com",
                    "password": f"WRONG_TEST_{uuid.uuid4().hex[:8]}",
                },
            )
            assert r.status_code == 401, f"attempt {i}: {r.status_code} {r.text}"

    def test_real_password_still_works_after_wrong_attempts(self, session):
        # Make sure the real password is still accepted (no lockout from prior tests)
        r = session.post(
        f"{API}/admin/login",
        json={"email": "admin@notasalami.com", "password": ADMIN_PASSWORD},
    )
        assert r.status_code == 200, (
            f"Real password rejected (possible lockout): {r.status_code} {r.text}"
        )


# ---------- Admin protected endpoints ----------
class TestAdminProtected:
    def test_me_no_token_401(self, session):
        r = session.get(f"{API}/admin/me")
        assert r.status_code == 401

    def test_waitlist_no_token_401(self, session):
        r = session.get(f"{API}/admin/waitlist")
        assert r.status_code == 401

    def test_inquiries_no_token_401(self, session):
        r = session.get(f"{API}/admin/inquiries")
        assert r.status_code == 401

    def test_newsletter_no_token_401(self, session):
        r = session.get(f"{API}/admin/newsletter")
        assert r.status_code == 401

    def test_me_with_token(self, session, admin_token):
        r = session.get(
            f"{API}/admin/me", headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"

    def test_admin_waitlist_with_token(self, session, admin_token):
        r = session.get(
            f"{API}/admin/waitlist",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        if rows:
            assert "email" in rows[0] and "product_slug" in rows[0]

    def test_admin_inquiries_with_token(self, session, admin_token):
        r = session.get(
            f"{API}/admin/inquiries",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_newsletter_with_token(self, session, admin_token):
        r = session.get(
            f"{API}/admin/newsletter",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_invalid_token_401(self, session):
        r = session.get(
            f"{API}/admin/me",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert r.status_code == 401
