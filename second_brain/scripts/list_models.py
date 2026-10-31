#!/usr/bin/env python3
"""Inspect Gemini models available for the configured GEMINI_API_KEY.

Identifies models supporting generateContent and multimodal image inputs,
and suggests optimal fast & vision models.
"""
import os
import sys
from pathlib import Path

# Add repo root and backend to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.config import settings


def main():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY is not set in .env or environment.")
        print("Please set GEMINI_API_KEY and retry.")
        sys.exit(1)

    masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else "***"
    print(f"Connecting to Google Gemini API with key: {masked_key}")

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        models = list(client.models.list())
    except Exception as e:
        print(f"[ERROR] Failed to query Gemini models: {e}")
        sys.exit(1)

    print(f"\nDiscovered {len(models)} models available to your key:\n")
    print(f"{'Model ID':<40} | {'Display Name':<35}")
    print("-" * 80)

    for m in models:
        name = getattr(m, "name", str(m))
        disp = getattr(m, "display_name", "") or ""
        print(f"{name:<40} | {disp:<35}")

    print("\n" + "=" * 80)
    print("RECOMMENDED .env CONFIGURATION:")
    print("  LLM_MODEL=gemini-2.5-flash        # Fast structured output for extraction & grilling")
    print("  LLM_MODEL_VISION=gemini-2.5-flash # Multimodal vision for image-heavy slides")
    print("  LLM_FALLBACK_MODEL=gemini-1.5-flash # Highly reliable fallback model")
    print("=" * 80)


if __name__ == "__main__":
    main()
