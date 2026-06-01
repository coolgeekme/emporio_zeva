"""
One-off script to generate placeholder product/journal images for the
Not A Salami site via Gemini Nano Banana.

Run from /app/backend:
    python -m scripts.gen_images

Saves PNGs to /app/backend/static/products/. The site references them at
/api/static/products/<filename>.
"""
from __future__ import annotations

import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Ensure backend dir is on path (script run via `python -m scripts.gen_images`).
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

OUT_DIR = BACKEND_DIR / "static" / "products"
OUT_DIR.mkdir(parents=True, exist_ok=True)

API_KEY = os.environ["EMERGENT_LLM_KEY"]
MODEL = "gemini-3.1-flash-image-preview"

SYSTEM = (
    "You are a food photographer for an artisan Sicilian cocoa confection brand "
    "called Not A Salami. Generate one photograph in a slow, editorial style "
    "(think Aesop / Le Labo / Kinfolk). Always: dark moody lighting, shallow "
    "depth of field, warm parchment and ember-red tones, natural wood and linen "
    "surfaces, no faces, no people unless explicitly requested, no text overlays. "
    "Composition leaves quiet negative space at the edges."
)

IMAGES = [
    # filename, prompt
    (
        "classic-cocoa-secondary.png",
        "Macro close-up of a single cut slice of chocolate salami showing rich dark cocoa "
        "interior speckled with chunks of golden biscotti and small dark chocolate chips. "
        "Resting on parchment paper. Side-lit, very shallow depth of field, slice is the only subject.",
    ),
    (
        "pistachio-future-primary.png",
        "A length of artisan chocolate salami wrapped in parchment paper and gold foil "
        "with a small loose twine, partially unwrapped to show a cross-section. The interior "
        "is dark cocoa speckled with bright green chopped Sicilian pistachios. Resting on dark slate "
        "with a few whole pistachio nuts scattered nearby. Moody, editorial, no text.",
    ),
    (
        "mini-future-primary.png",
        "A miniature, palm-sized version of an artisan chocolate salami wrapped in parchment "
        "paper and tied with butcher's twine, sitting beside a small espresso cup on a worn "
        "wooden table. Warm afternoon light, shallow depth of field. The mini-salami is the hero.",
    ),
    (
        "assaggio-future-primary.png",
        "An arrangement of individually wrapped single slices of chocolate salami. Each slice is "
        "wrapped in waxed parchment paper and sealed with a small dark wax dot. Six wrapped slices "
        "lie on a linen napkin on a marble surface, slightly overlapping. Editorial, refined.",
    ),
    (
        "gift-board-future.png",
        "A complete gifting scene: a length of artisan chocolate salami wrapped in parchment and "
        "tied with twine, resting on a small olive-wood serving board next to a folded natural "
        "linen napkin and a wax-sealed letterpress card. Soft side light, warm cream and brown palette.",
    ),
    (
        "journal-sicily.png",
        "A vintage Sicilian kitchen scene: an old wooden rolling pin on a flour-dusted wooden "
        "board, a small glass bowl of dark cocoa powder, scattered biscotti, a length of butcher's "
        "twine, and a yellowed handwritten recipe card. No people. Warm late-afternoon light from "
        "a window at the side.",
    ),
    (
        "journal-gift.png",
        "Close-up of two hands (no faces visible, gentle natural skin tone) tying butcher's twine "
        "around a length of chocolate salami wrapped in parchment paper. A small kraft gift box and "
        "a sprig of dried herb sit just out of focus in the background. Editorial, refined, holiday "
        "gifting mood.",
    ),
    (
        "journal-nostalgia.png",
        "A vintage Italian kitchen still life: a small porcelain saucer holding a single slice of "
        "chocolate salami dusted with powdered sugar, beside a tiny espresso cup, a folded linen "
        "napkin, and the corner of an old worn cookbook. Warm afternoon sunlight slants in from "
        "the left. Quiet, nostalgic, no people.",
    ),
]


async def generate_one(filename: str, prompt: str) -> str:
    out = OUT_DIR / filename
    if out.exists() and out.stat().st_size > 10_000:
        return f"skip (exists): {filename}"
    chat = (
        LlmChat(api_key=API_KEY, session_id=f"img-{filename}", system_message=SYSTEM)
        .with_model("gemini", MODEL)
        .with_params(modalities=["image", "text"])
    )
    msg = UserMessage(text=prompt)
    try:
        _text, images = await chat.send_message_multimodal_response(msg)
    except Exception as exc:  # noqa: BLE001
        return f"FAIL  {filename}: {exc}"
    if not images:
        return f"FAIL  {filename}: no image returned"
    img = images[0]
    raw = base64.b64decode(img["data"])
    out.write_bytes(raw)
    return f"OK    {filename}  ({len(raw)//1024} KB)"


async def main():
    for filename, prompt in IMAGES:
        print(await generate_one(filename, prompt), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
