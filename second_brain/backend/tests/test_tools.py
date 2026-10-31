"""
Tests for Market Grounding and Tech Check Tools (P4).
"""
from __future__ import annotations

import asyncio
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, REPO_ROOT)

from contracts.schemas import Competitor, DeckFacts, Funding, TamEvidence
from backend.app.tools.market_search import (
    compute_tam_verdict,
    verify_competitor,
    verify_tam_evidence,
    run as run_market_search,
)
from backend.app.tools.tech_check import run as run_tech_check, _is_safe_url


class TestMarketVerification(unittest.TestCase):
    def setUp(self):
        self.page_text = (
            "Wati is an official WhatsApp Business Solution Provider helping "
            "SMEs automate conversational sales and support across Asia. "
            "Wati raised $23 million in Series B funding led by Tiger Global."
        )

    def test_verify_competitor_success(self):
        comp = Competitor(
            name="Wati",
            url="https://wati.io",
            what_they_do="WhatsApp CRM for SMEs",
            overlap="high",
            funding=Funding(
                text="Wati raised $23 million in Series B funding led by Tiger Global",
                source_url="https://inc42.com",
            ),
            evidence_quote="Wati is an official WhatsApp Business Solution Provider",
            verified=False,
        )
        ok, verified_funding = verify_competitor(comp, self.page_text)
        self.assertTrue(ok)
        self.assertIsNotNone(verified_funding)

    def test_verify_competitor_rejects_fabricated_quote(self):
        comp = Competitor(
            name="Wati",
            url="https://wati.io",
            what_they_do="WhatsApp CRM",
            overlap="high",
            evidence_quote="Fabricated claim that never appeared anywhere on this page",
            verified=False,
        )
        ok, _ = verify_competitor(comp, self.page_text)
        self.assertFalse(ok, "Fabricated quote must be rejected by substring verification")

    def test_funding_dropped_when_not_in_page(self):
        comp = Competitor(
            name="Wati",
            url="https://wati.io",
            what_they_do="WhatsApp CRM",
            overlap="high",
            funding=Funding(
                text="Invented funding text of $500M from SoftBank",
                source_url="https://fake.url",
            ),
            evidence_quote="helping SMEs automate conversational sales",
            verified=False,
        )
        ok, verified_funding = verify_competitor(comp, self.page_text)
        self.assertTrue(ok)
        self.assertIsNone(verified_funding, "Invented funding must be dropped to None")

    def test_tam_verdict_supported_within_range(self):
        evidence = [
            TamEvidence(
                figure_text="400 Cr",
                figure_inr=4000000000.0,
                source_url="https://inc42.com",
                quote="400 Cr market",
            ),
            TamEvidence(
                figure_text="600 Cr",
                figure_inr=6000000000.0,
                source_url="https://entrackr.com",
                quote="600 Cr market",
            ),
        ]
        # Deck claim is 500 Cr (median is 500 Cr, ratio = 1.0)
        verdict, note = compute_tam_verdict(5000000000.0, evidence)
        self.assertEqual(verdict, "supported")

    def test_tam_verdict_contradicted_too_high(self):
        evidence = [
            TamEvidence(
                figure_text="100 Cr",
                figure_inr=1000000000.0,
                source_url="https://inc42.com",
                quote="100 Cr market",
            )
        ]
        # Deck claim 500 Cr is 5x the 100 Cr median -> contradicted
        verdict, note = compute_tam_verdict(5000000000.0, evidence)
        self.assertEqual(verdict, "contradicted")
        self.assertIn(">2x", note)


class TestTechCheck(unittest.IsolatedAsyncioTestCase):
    async def test_missing_urls_flags_unreachable(self):
        deck = DeckFacts(
            company_name="GhostStartup",
            website_url=None,
            github_url=None,
            tech_claims=["Proprietary quantum blockchain"],
        )
        signals = await run_tech_check(deck)
        self.assertFalse(signals.site_reachable)
        self.assertIn("No product URL provided", signals.notes[0])
        self.assertEqual(signals.claims_unsupported, ["Proprietary quantum blockchain"])

    async def test_ssrf_blocked_url(self):
        self.assertFalse(_is_safe_url("http://localhost:8080/admin"))
        self.assertFalse(_is_safe_url("http://127.0.0.1:3000/secret"))
        self.assertFalse(_is_safe_url("http://169.254.169.254/latest/meta-data"))
        self.assertTrue(_is_safe_url("https://bolbot.in"))
        self.assertTrue(_is_safe_url("https://github.com/bolbot-ai/bolbot-core"))


if __name__ == "__main__":
    unittest.main()
