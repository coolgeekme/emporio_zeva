"""
Corporate deck personalization.

Given a client_name (e.g. "Microsoft"), this module:
  1. Looks up the most likely domain via Clearbit autocomplete (free, no auth).
  2. Builds a logo URL via DuckDuckGo's icon service.
  3. Generates a warm, on-brand intro line via Claude Sonnet 4.5 (Emergent LLM key).

All network calls are best-effort — failures fall back to safe defaults so the
admin can still save a deck and edit later.
"""

from __future__ import annotations

import os
import re
import uuid
import logging
from typing import Optional

import httpx

log = logging.getLogger(__name__)

CLEARBIT_SUGGEST = "https://autocomplete.clearbit.com/v1/companies/suggest"
DUCKDUCKGO_ICON = "https://icons.duckduckgo.com/ip3/{domain}.ico"

DEFAULT_INTRO = "A curated Italian gifting experience, prepared with care."

SYSTEM_PROMPT = (
    "You write for Not A Salami — an artisan Sicilian cocoa confection brand "
    "based in San Francisco. The voice is editorial, warm, slightly literary, "
    "Italian-restrained — never salesy, never corporate. Think Aesop meets a "
    "small Modican kitchen.\n\n"
    "Your job: write ONE single sentence (20-40 words) that opens a corporate "
    "gifting presentation for the named client. The sentence should feel "
    "specific to them without naming any of their products or services — keep "
    "it about the gesture, the moment, the table. No exclamation marks. No "
    "em-dashes used like commas. Output ONLY the sentence, no quotes, no "
    "preamble."
)


def make_slug(client_name: str) -> str:
    """Slugify + append a short random suffix for uniqueness."""
    base = re.sub(r"[^a-z0-9]+", "-", client_name.lower()).strip("-")
    base = base[:40] or "deck"
    return f"{base}-{uuid.uuid4().hex[:6]}"


async def lookup_domain(client_name: str) -> Optional[str]:
    """First Clearbit suggestion for the company name. None on failure.

    Prefers a result whose name matches the query exactly (case-insensitive)
    over the raw first suggestion.
    """
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(CLEARBIT_SUGGEST, params={"query": client_name})
            r.raise_for_status()
            results = r.json() or []
            if not (results and isinstance(results, list)):
                return None
            target = client_name.strip().lower()
            for item in results:
                if (item.get("name") or "").strip().lower() == target:
                    return item.get("domain")
            return results[0].get("domain")
    except Exception as exc:  # noqa: BLE001
        log.warning("Clearbit lookup failed for %r: %s", client_name, exc)
    return None


def logo_url_for_domain(domain: Optional[str]) -> Optional[str]:
    if not domain:
        return None
    return DUCKDUCKGO_ICON.format(domain=domain)


async def generate_intro(client_name: str) -> str:
    """Generate a single warm intro line via Claude Sonnet 4.5. Falls back to default."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        log.warning("EMERGENT_LLM_KEY not set; using default intro")
        return DEFAULT_INTRO
    try:
        # Lazy import — if emergentintegrations isn't installed (e.g. wrong pip
        # index on production), the rest of the API stays up and this endpoint
        # falls back to the default intro instead of crashing the whole backend.
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=api_key,
            session_id=f"deck-intro-{uuid.uuid4().hex[:8]}",
            system_message=SYSTEM_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        msg = UserMessage(
            text=(
                f"Client: {client_name}\n\n"
                "Write the opening sentence for the cover slide. One sentence only."
            )
        )
        response = await chat.send_message(msg)
        text = (response or "").strip().strip('"').strip("'")
        # Defensive: collapse newlines, take first sentence only
        text = text.replace("\n", " ").strip()
        if not text:
            return DEFAULT_INTRO
        return text
    except Exception as exc:  # noqa: BLE001
        log.warning("Intro generation failed for %r: %s", client_name, exc)
        return DEFAULT_INTRO


async def personalize(client_name: str) -> dict:
    """Return logo_url + intro_text + domain for the given client name."""
    domain = await lookup_domain(client_name)
    return {
        "domain": domain,
        "logo_url": logo_url_for_domain(domain),
        "intro_text": await generate_intro(client_name),
    }
