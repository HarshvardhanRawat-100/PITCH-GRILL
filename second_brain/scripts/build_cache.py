#!/usr/bin/env python3
"""
Cache Builder Script (P4).

Generates or refreshes backend/cache/demo/market.json and tech.json
from live search / verified ground truth for the BolBot demo deck.
Supports --all flag for end-to-end caching.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, REPO_ROOT)

from contracts.schemas import DeckFacts
from backend.app.tools.market_search import run as run_market_search, CACHE_PATH as MARKET_CACHE_PATH
from backend.app.tools.tech_check import run as run_tech_check, CACHE_PATH as TECH_CACHE_PATH


def get_bolbot_demo_deck() -> DeckFacts:
    """Return the canonical DeckFacts for BolBot."""
    return DeckFacts(
        company_name="BolBot",
        one_liner="WhatsApp AI Sales Assistant for Indian SMEs",
        sector="SaaS / AI / SME Tech",
        stage="Seed",
        website_url="https://bolbot.in",
        github_url="https://github.com/bolbot-ai/bolbot-core",
        tam_claim_text="₹500 crore market for SME Conversational Commerce in India",
        tam_claim_inr=5000000000.0,
        no_competitor_claim=True,
        stated_competitors=["Wati", "Interakt", "ManyChat"],
        tech_claims=[
            "WhatsApp Business Meta Cloud API integration",
            "Razorpay UPI automated payment link generation",
            "Vernacular Hindi and English conversational understanding",
            "Proprietary 8B SLM training dataset",
        ],
    )


async def build_cache(include_all: bool = False):
    print("=" * 65)
    print("BUILDING DEMO CACHE (SecondBrain P4)")
    print("=" * 65)

    deck = get_bolbot_demo_deck()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Market Grounding Cache
    print("Running market grounding for BolBot...")
    market_result = await run_market_search(deck)
    market_dict = market_result.model_dump()
    market_dict["from_cache"] = True
    market_dict["generated_at"] = now_iso

    os.makedirs(os.path.dirname(MARKET_CACHE_PATH), exist_ok=True)
    with open(MARKET_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(market_dict, f, indent=2)
    print(f"[OK] Written {MARKET_CACHE_PATH} ({len(market_result.competitors)} competitors, TAM: {market_result.tam_verdict})")

    # 2. Tech Check Cache
    print("Running tech check for BolBot...")
    tech_result = await run_tech_check(deck)
    tech_dict = tech_result.model_dump()
    tech_dict["from_cache"] = True

    with open(TECH_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(tech_dict, f, indent=2)
    print(f"[OK] Written {TECH_CACHE_PATH} (Site reachable: {tech_result.site_reachable}, Supported: {len(tech_result.claims_supported)})")

    # 3. If --all flag passed (Prompt 4.5)
    if include_all:
        reports_cache_path = os.path.join(os.path.dirname(MARKET_CACHE_PATH), "reports.json")
        sample_reports = {
            "demo_deck_sha256": "bolbot_clean_canonical_sha256",
            "generated_at": now_iso,
            "cached_run": True,
            "reports": [
                {
                    "persona": "finance",
                    "headline": "18-month runway claim is fragile without customer cohort retention verification.",
                    "findings": [],
                },
                {
                    "persona": "market",
                    "headline": "Zero-competitor claim is directly contradicted by 3 funded WhatsApp SaaS platforms in India.",
                    "findings": [],
                },
                {
                    "persona": "tech",
                    "headline": "Product relies heavily on Meta Cloud API without multi-BSP redundancy or documented SLM weights.",
                    "findings": [],
                },
            ],
        }
        with open(reports_cache_path, "w", encoding="utf-8") as f:
            json.dump(sample_reports, f, indent=2)
        print(f"[OK] Written {reports_cache_path} (--all persona reports fallback)")

    print("\n[OK] Demo cache generation complete!")


def main():
    parser = argparse.ArgumentParser(description="Build SecondBrain demo caches")
    parser.add_argument("--all", action="store_true", help="Generate all caches including persona reports")
    args = parser.parse_args()

    asyncio.run(build_cache(include_all=args.all))


if __name__ == "__main__":
    main()
