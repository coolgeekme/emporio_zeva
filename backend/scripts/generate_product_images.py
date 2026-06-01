"""
One-off generator for product imagery variants.

Uses Gemini Nano Banana (via Emergent LLM key) and an existing reference shot
(Salami_board.JPG) to produce on-brand variants for:
  - Pistacchio di Bronte (chocolate salami with Sicilian pistachio inclusions)
  - Il Mini (a pocket-size version of the same product)

Saved to /app/backend/static/products/ and served at /api/static/products/<file>.
"""

import asyncio
import base64
import os
import sys
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

REFERENCE_URL = (
    "https://customer-assets.emergentagent.com/job_zeva-refresh/artifacts/"
    "zg1blozr_Salami_board.JPG"
)

OUT_DIR = Path(__file__).resolve().parent.parent / "static" / "products"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Each entry: (filename, prompt)
VARIANTS = [
    (
        "pistacchio-di-bronte-hero.png",
        (
            "Editorial food photography, same composition and lighting as the reference: "
            "a sliced log of artisan Sicilian chocolate salami on a rustic light wooden board, "
            "soft natural side-light, distressed pale wooden background, shallow depth of field. "
            "Variation: the interior shows vivid Sicilian pistachio (Pistacchio di Bronte) — "
            "bright emerald-green pistachio pieces clearly visible throughout the dark cocoa matrix, "
            "alongside the usual biscotti shards. Dust the exterior lightly with powdered sugar. "
            "Scatter a few whole peeled pistachios in the foreground for context. "
            "Warm, luxurious, artisan mood. No text or watermarks. 4:3 aspect."
        ),
    ),
    (
        "pistacchio-di-bronte-slice.png",
        (
            "Editorial food photography matching the reference lighting and palette: "
            "an overhead-three-quarter shot of three thick slices of Sicilian chocolate salami "
            "fanned on parchment paper. Interior is studded with vivid green Pistacchio di Bronte "
            "and biscotti shards. Small ceramic bowl of whole pistachios beside the slices. "
            "Warm side-light, soft shadows, rustic linen napkin. No text, no logos. 4:3 aspect."
        ),
    ),
    (
        "il-mini-hero.png",
        (
            "Editorial food photography, same lighting and palette as the reference image: "
            "a small pocket-size version of the chocolate salami log, roughly 4 inches long, "
            "wrapped at one end in parchment paper and tied with natural twine. "
            "Resting on a rustic light wooden board next to an espresso cup for scale, "
            "with two thin slices fanned out showing the dense cocoa-biscotti interior. "
            "Soft natural side-light, distressed pale wooden background, shallow depth of field, "
            "warm artisan mood. No text or watermarks. 4:3 aspect."
        ),
    ),
    (
        "il-mini-detail.png",
        (
            "Editorial food photography matching reference palette: close-up of a single "
            "miniature chocolate salami (about 4 inches long), partially sliced into "
            "five small rounds revealing a dense cocoa interior with biscotti and "
            "dark chocolate chips. Wrapped in parchment and tied with twine at one end. "
            "Rustic wooden board, scattered cocoa dust, soft warm side-light. No text. 4:3 aspect."
        ),
    ),
]


async def main():
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        print("FATAL: EMERGENT_LLM_KEY not set", file=sys.stderr)
        sys.exit(1)

    # Fetch reference image once and base64-encode
    print(f"Fetching reference: {REFERENCE_URL}")
    with urllib.request.urlopen(REFERENCE_URL, timeout=60) as r:
        ref_bytes = r.read()
    ref_b64 = base64.b64encode(ref_bytes).decode("utf-8")
    print(f"Reference loaded ({len(ref_bytes)/1024:.0f} KB)")

    for filename, prompt in VARIANTS:
        target = OUT_DIR / filename
        if target.exists():
            print(f"SKIP {filename} (already exists)")
            continue
        print(f"Generating {filename} ...")
        # Fresh chat instance per generation
        chat = (
            LlmChat(
                api_key=api_key,
                session_id=f"img-{filename}",
                system_message="You are an expert editorial food photographer.",
            )
            .with_model("gemini", "gemini-3.1-flash-image-preview")
            .with_params(modalities=["image", "text"])
        )
        msg = UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)])
        try:
            _text, images = await chat.send_message_multimodal_response(msg)
        except Exception as e:
            print(f"  FAILED: {e}")
            continue
        if not images:
            print(f"  NO IMAGE returned for {filename}")
            continue
        out_bytes = base64.b64decode(images[0]["data"])
        target.write_bytes(out_bytes)
        print(f"  wrote {target} ({len(out_bytes)/1024:.0f} KB)")


if __name__ == "__main__":
    asyncio.run(main())
