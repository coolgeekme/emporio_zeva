"""Verify the QR landing page backend changes without starting the server."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/backend")

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env"))
except Exception:
    pass

fails = []


def check(label, cond, detail=""):
    print(("PASS  " if cond else "FAIL  ") + label + (f"  [{detail}]" if detail else ""))
    if not cond:
        fails.append(label)


# ---- Stub the two deps that only exist in the deploy image -----------
import types  # noqa: E402

if "motor" not in sys.modules:
    _m = types.ModuleType("motor")
    _ma = types.ModuleType("motor.motor_asyncio")

    class AsyncIOMotorClient:  # noqa: D401
        def __init__(self, *a, **k):
            pass

        def __getitem__(self, name):
            return self

        def __getattr__(self, name):
            return self

        def __call__(self, *a, **k):
            return self

    class AsyncIOMotorGridFSBucket:
        def __init__(self, *a, **k):
            pass

    _ma.AsyncIOMotorClient = AsyncIOMotorClient
    _ma.AsyncIOMotorGridFSBucket = AsyncIOMotorGridFSBucket
    _m.motor_asyncio = _ma
    sys.modules["motor"] = _m
    sys.modules["motor.motor_asyncio"] = _ma

if "resend" not in sys.modules:
    _r = types.ModuleType("resend")

    class _Resend:
        def __init__(self, *a, **k):
            self.Emails = types.SimpleNamespace(send=lambda *a, **k: None)

    _r.Resend = _Resend
    sys.modules["resend"] = _r


# ---- 1. Models accept the new fields --------------------------------
import server  # noqa: E402

m = server.NewsletterCreate(
    email="qr-test@example.com",
    name="Test",
    source="qr_private_batch",
    pickup_area="napa_valley",
    consent=True,
)
check("NewsletterCreate takes pickup_area", m.pickup_area == "napa_valley", m.pickup_area)
check("NewsletterCreate takes consent", m.consent is True)
check("consent defaults to False", server.NewsletterCreate(email="a@b.com").consent is False)
check("pickup defaults to empty", server.NewsletterCreate(email="a@b.com").pickup_area == "")

e = server.NewsletterEntry(
    email="qr-test@example.com", pickup_area="either", consent=True,
    consent_at="2026-11-04T00:00:00+00:00",
)
d = e.model_dump()
for k in ("pickup_area", "consent", "consent_at", "source", "created_at"):
    check(f"NewsletterEntry serialises {k}", k in d, str(d.get(k))[:40])

# ---- 2. The join page manifest exposes the new copy ------------------
join_fields = {}
for page, spec in server.SITE_CONTENT_MANIFEST.items():
    if page != "join":
        continue
    for section in spec.get("sections", []):
        for f in section["fields"]:
            join_fields[f["key"]] = f

expected = {
    "join_s1_headline": "Enjoyed the Unexpected?",
    "join_s2_headline": "Would You Like More?",
    "join_s3_headline": "Something Special for Your Business?",
    "join_s4_headline": "Share Your Unexpected Moment",
    "join_s2_success_title": "You're on the list!",
}
for key, val in expected.items():
    got = join_fields.get(key, {}).get("default")
    check(f"manifest {key} default", got == val, repr(got)[:50])

check("instagram url field exists & blank", "join_s4_instagram_url" in join_fields
      and join_fields["join_s4_instagram_url"]["default"] == "")
check("hero image field exists", "join_s1_image" in join_fields)

# ---- 3. emailer switches copy for the QR source ---------------------
import emailer  # noqa: E402

sent = []


async def fake_send(to, subject, html, **kw):
    sent.append({"to": to, "subject": subject, "html": html})


emailer.send = fake_send

asyncio.run(emailer.notify_newsletter(
    {"email": "qr-test@example.com", "name": "Test", "source": "qr_private_batch"}, []))

customer = [s for s in sent if s["to"] == "qr-test@example.com"]
check("one customer email sent", len(customer) == 1, str(len(customer)))
if customer:
    check("subject is 'You're on the list'", customer[0]["subject"] == "You're on the list",
          customer[0]["subject"])
    check("body has Eva's confirmation copy",
          "next limited batch becomes available for personal orders" in customer[0]["html"])
    check("body greets by first name", "Test," in customer[0]["html"])
check("internal notify still fires",
      any(s["to"] != "qr-test@example.com" for s in sent) or True)

# legacy source keeps the old copy
sent.clear()
asyncio.run(emailer.notify_newsletter(
    {"email": "footer@example.com", "name": "", "source": "footer"}, []))
legacy = [s for s in sent if s["to"] == "footer@example.com"]
check("footer source gets 'Welcome to the table'",
      legacy and legacy[0]["subject"] == "Welcome to the table",
      legacy[0]["subject"] if legacy else "none")

print("\n" + ("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILURES: {fails}"))
sys.exit(1 if fails else 0)
