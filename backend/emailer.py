"""Resend-backed transactional email helpers.

All public sender functions:
  * fail silently (form submissions must never break if email is down)
  * run the sync Resend SDK off the event loop via ``asyncio.to_thread``
  * honour the ``RESEND_ENABLED`` env flag (set to "false" to pause every flow)

Two top-level helpers per flow — one for the internal notification (to Eva /
ops inbox), one for the customer auto-reply. Both are best-effort.
"""
from __future__ import annotations

import asyncio
import logging
import os
from html import escape
from typing import Optional

import resend

logger = logging.getLogger(__name__)

# Sender / recipient defaults from .env. Read lazily so tests can monkeypatch.
def _from() -> str:
    return os.environ.get("RESEND_FROM", "onboarding@resend.dev")


def _notify_to() -> str:
    return os.environ.get("RESEND_NOTIFY_TO", "")


def _legacy_notify_list() -> list[str]:
    """Fallback used only when a caller doesn't pass explicit recipients."""
    raw = _notify_to()
    return [e.strip() for e in raw.split(",") if e.strip()]


def _enabled() -> bool:
    return os.environ.get("RESEND_ENABLED", "true").lower() == "true"


def _client_configured() -> bool:
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        return False
    # The Resend SDK stores its key on the module; set it on every call so
    # tests / config reloads work without restart.
    resend.api_key = key
    return True


# ---------- Brand styling ----------
_BRAND_WRAPPER = """\
<div style="background:#F4EBE2;padding:32px 16px;font-family:Georgia,serif;color:#2A1F1D;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;padding:40px 36px;border:1px solid #E6D8C9;">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:0.18em;font-size:11px;color:#5C4E4A;text-transform:uppercase;">Not&nbsp;A&nbsp;Salami&nbsp;&middot;&nbsp;Emporio&nbsp;Zeva</div>
    <div style="height:1px;background:#C05A3A;width:48px;margin:18px 0 28px;"></div>
    {body}
    <div style="height:1px;background:#E6D8C9;margin:32px 0 18px;"></div>
    <div style="font-size:12px;color:#5C4E4A;line-height:1.6;">
      Eva &middot; Not A Salami<br/>
      <a href="https://notasalami.com" style="color:#C05A3A;text-decoration:none;">notasalami.com</a>
    </div>
  </div>
</div>"""


def _wrap(body_html: str) -> str:
    return _BRAND_WRAPPER.format(body=body_html)


# ---------- Low-level send ----------
async def send(
    to: str | list[str],
    subject: str,
    html: str,
    *,
    reply_to: Optional[str] = None,
    text: Optional[str] = None,
) -> Optional[str]:
    """Fire-and-forget email send. Returns the Resend email id on success, None
    on failure (failures are logged, never raised)."""
    if not _enabled():
        logger.info("Resend disabled via RESEND_ENABLED=false; skipping send to %s", to)
        return None
    if not _client_configured():
        logger.warning("RESEND_API_KEY not set; skipping email to %s", to)
        return None
    if not to:
        return None

    params: dict = {
        "from": _from(),
        "to": [to] if isinstance(to, str) else list(to),
        "subject": subject,
        "html": html,
    }
    if text:
        params["text"] = text
    if reply_to:
        params["reply_to"] = reply_to

    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info("Resend OK -> %s (id=%s, subject=%r)", to, email_id, subject)
        return email_id
    except Exception as exc:  # noqa: BLE001
        logger.error("Resend FAILED -> %s subject=%r: %s", to, subject, exc)
        return None


# ---------- Flow: Corporate Inquiry ----------
async def notify_inquiry(inquiry: dict, notify_emails: Optional[list[str]] = None) -> None:
    name = escape(inquiry.get("name") or "Friend")
    email = inquiry.get("email") or ""
    phone = escape(inquiry.get("phone") or "—")
    subject_line = escape(inquiry.get("subject") or "General Inquiry")
    message = escape(inquiry.get("message") or "").replace("\n", "<br/>")
    product_slug = escape(inquiry.get("product_slug") or "—")
    kind = inquiry.get("kind") or "general"
    company = escape(inquiry.get("company") or "")
    preferred_date = escape(inquiry.get("preferred_date") or "")
    location = escape(inquiry.get("location") or "")
    num_guests = escape(inquiry.get("num_guests") or "")
    occasion = escape(inquiry.get("occasion") or "")
    special = escape(inquiry.get("special_requirements") or "").replace("\n", "<br/>")

    extra_rows = ""
    if kind != "general":
        extra_rows += f'<tr><td style="padding:6px 0;color:#5C4E4A;">Request</td><td style="padding:6px 0;">{kind.replace("_", " ").title()}</td></tr>'
    if company:
        extra_rows += f'<tr><td style="padding:6px 0;color:#5C4E4A;">Company</td><td style="padding:6px 0;">{company}</td></tr>'
    if preferred_date:
        extra_rows += f'<tr><td style="padding:6px 0;color:#5C4E4A;">Preferred date</td><td style="padding:6px 0;">{preferred_date}</td></tr>'
    if location:
        extra_rows += f'<tr><td style="padding:6px 0;color:#5C4E4A;">Location</td><td style="padding:6px 0;">{location}</td></tr>'
    if num_guests:
        extra_rows += f'<tr><td style="padding:6px 0;color:#5C4E4A;">Guests</td><td style="padding:6px 0;">{num_guests}</td></tr>'
    if occasion:
        extra_rows += f'<tr><td style="padding:6px 0;color:#5C4E4A;">Occasion</td><td style="padding:6px 0;">{occasion}</td></tr>'

    # Internal notification
    internal_body = f"""
      <div style="font-family:Georgia,serif;font-size:22px;color:#2A1F1D;margin-bottom:12px;">New inquiry from {name}</div>
      <table style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#2A1F1D;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#5C4E4A;width:120px;">Email</td><td style="padding:6px 0;"><a href="mailto:{escape(email)}" style="color:#C05A3A;">{escape(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#5C4E4A;">Phone</td><td style="padding:6px 0;">{phone}</td></tr>
        <tr><td style="padding:6px 0;color:#5C4E4A;">Subject</td><td style="padding:6px 0;">{subject_line}</td></tr>
        <tr><td style="padding:6px 0;color:#5C4E4A;">Product</td><td style="padding:6px 0;">{product_slug}</td></tr>
        {extra_rows}
      </table>
      {f'<div style="font-family:Georgia,serif;font-size:14px;color:#2A1F1D;margin-top:20px;line-height:1.7;border-left:2px solid #C05A3A;padding:4px 0 4px 14px;">{message}</div>' if message else ""}
      {f'<div style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C4E4A;margin-top:14px;line-height:1.6;border-left:2px solid #B9935A;padding:4px 0 4px 14px;">Special requirements: {special}</div>' if special else ""}"""

    notify_list = notify_emails if notify_emails is not None else _legacy_notify_list()
    if notify_list:
        await send(
            notify_list,
            f"New inquiry · {name}",
            _wrap(internal_body),
            reply_to=email or None,
        )

    # Customer auto-reply
    if email:
        customer_body = f"""
          <div style="font-family:Georgia,serif;font-size:24px;color:#2A1F1D;margin-bottom:12px;">Thank you, {name}.</div>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0 0 14px;">
            Your note has reached me. I read every inquiry personally and will reply within a day or two — sometimes sooner if you've caught me between batches.
          </p>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0 0 14px;">
            For your reference, here's what you sent:
          </p>
          <div style="font-family:Georgia,serif;font-size:14px;color:#5C4E4A;font-style:italic;line-height:1.7;border-left:2px solid #C05A3A;padding:4px 0 4px 14px;margin:0 0 18px;">
            {message}
          </div>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0;">
            A presto,<br/><span style="font-style:italic;">Eva</span>
          </p>"""
        await send(
            email,
            "Your note reached Eva",
            _wrap(customer_body),
            reply_to=(notify_list[0] if notify_list else None),
        )


# ---------- Flow: Waitlist ----------
async def notify_waitlist(entry: dict, notify_emails: Optional[list[str]] = None) -> None:
    name = escape(entry.get("name") or "Friend")
    email = entry.get("email") or ""
    product = escape(entry.get("product_slug") or "—")
    note = escape(entry.get("note") or "").replace("\n", "<br/>")

    internal_body = f"""
      <div style="font-family:Georgia,serif;font-size:22px;color:#2A1F1D;margin-bottom:12px;">New waitlist signup</div>
      <table style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#2A1F1D;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#5C4E4A;width:120px;">Name</td><td style="padding:6px 0;">{name}</td></tr>
        <tr><td style="padding:6px 0;color:#5C4E4A;">Email</td><td style="padding:6px 0;"><a href="mailto:{escape(email)}" style="color:#C05A3A;">{escape(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#5C4E4A;">Product</td><td style="padding:6px 0;">{product}</td></tr>
      </table>
      {f'<div style="font-family:Georgia,serif;font-size:14px;color:#2A1F1D;margin-top:20px;line-height:1.7;border-left:2px solid #C05A3A;padding:4px 0 4px 14px;">{note}</div>' if note else ''}"""
    notify_list = notify_emails if notify_emails is not None else _legacy_notify_list()
    if notify_list:
        await send(
            notify_list,
            f"New waitlist · {name} · {product}",
            _wrap(internal_body),
            reply_to=email or None,
        )

    if email:
        customer_body = f"""
          <div style="font-family:Georgia,serif;font-size:24px;color:#2A1F1D;margin-bottom:12px;">You're on the list, {name}.</div>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0 0 14px;">
            Thank you for the patience. The first run is small and made by hand — I'll write the moment your reservation is ready, with a private link before anyone else.
          </p>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0;">
            With care,<br/><span style="font-style:italic;">Eva</span>
          </p>"""
        await send(
            email,
            "Your spot is held",
            _wrap(customer_body),
            reply_to=(notify_list[0] if notify_list else None),
        )


# ---------- Flow: Newsletter ----------
async def notify_newsletter(entry: dict, notify_emails: Optional[list[str]] = None) -> None:
    email = entry.get("email") or ""

    internal_body = f"""
      <div style="font-family:Georgia,serif;font-size:22px;color:#2A1F1D;margin-bottom:12px;">New newsletter subscriber</div>
      <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#2A1F1D;margin:0;">
        <a href="mailto:{escape(email)}" style="color:#C05A3A;">{escape(email)}</a>
      </p>"""
    notify_list = notify_emails if notify_emails is not None else _legacy_notify_list()
    if notify_list:
        await send(notify_list, "New newsletter subscriber", _wrap(internal_body))

    if email:
        customer_body = """
          <div style="font-family:Georgia,serif;font-size:24px;color:#2A1F1D;margin-bottom:12px;">Welcome to the table.</div>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0 0 14px;">
            Slow notes from my kitchen — new flavor drops, dinner pairings, and a quiet head-start on holiday gift boxes. Sent rarely. Written by hand.
          </p>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0;">
            A presto,<br/><span style="font-style:italic;">Eva</span>
          </p>"""
        await send(
            email,
            "Welcome to the table",
            _wrap(customer_body),
            reply_to=(notify_list[0] if notify_list else None),
        )


# ---------- Flow: Admin invitation ----------
async def notify_invite(invitee: dict, temp_password: str) -> None:
    """Send a brand-styled invite with a temporary password.

    ``invitee`` is a plain dict — not a Pydantic model — so this stays
    decoupled from the User schema and easy to unit-test.
    """
    name = escape(invitee.get("name") or invitee.get("email") or "Friend")
    email = invitee.get("email") or ""
    role = escape(invitee.get("role") or "viewer")
    inviter = escape(invitee.get("inviter_name") or "Eva")
    # The user lands on /admin/login on the marketing site.
    login_url = os.environ.get("ADMIN_LOGIN_URL", "https://notasalami.com/admin")

    if not email:
        return

    body = f"""
      <div style="font-family:Georgia,serif;font-size:24px;color:#2A1F1D;margin-bottom:12px;">You've been invited, {name}.</div>
      <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0 0 14px;">
        {inviter} has added you to the Not&nbsp;A&nbsp;Salami admin as <strong>{role}</strong>.
      </p>
      <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#2A1F1D;margin:0 0 8px;">
        Sign in with your email and the temporary password below — you'll be asked to set your own password the first time you log in.
      </p>
      <table style="margin:18px 0 24px;border-collapse:collapse;width:100%;background:#F5EFE2;border:1px solid #DFD7CA;">
        <tr>
          <td style="padding:14px 18px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5C4E4A;width:120px;">Email</td>
          <td style="padding:14px 18px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#2A1F1D;">{escape(email)}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5C4E4A;border-top:1px solid #DFD7CA;">Temporary</td>
          <td style="padding:14px 18px;font-family:'SF Mono','Menlo','Consolas',monospace;font-size:16px;color:#C05A3A;border-top:1px solid #DFD7CA;letter-spacing:0.04em;">{escape(temp_password)}</td>
        </tr>
      </table>
      <p style="margin:0 0 22px;">
        <a href="{escape(login_url)}" style="display:inline-block;background:#2A1F1D;color:#FBF7EE;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;padding:14px 22px;">Sign in to the admin</a>
      </p>
      <p style="font-family:Georgia,serif;font-size:13px;line-height:1.7;color:#5C4E4A;margin:0;">
        If you didn't expect this invite, simply ignore the message and let {inviter} know.
      </p>"""
    notify_to = _notify_to()
    await send(
        email,
        "Welcome to the Not A Salami admin",
        _wrap(body),
        reply_to=notify_to or None,
    )
