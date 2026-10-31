"""
Unit Tests for Meko Memory Layer, Fallback, Circuit Breaker, and Policy.

Tests:
1. Fallback on timeout (mock live client to raise asyncio.TimeoutError)
2. Budget switch (set budget=2, 3rd call switches to local fallback)
3. Policy never leaks company names, URLs, or numbers
4. Policy correctly approves only resolved + data/document evidence without injection
5. Methods never raise exceptions even under errors
6. Memory records replace by id correctly
"""
from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, REPO_ROOT)

from contracts.schemas import (
    EvalCriteria,
    Evaluation,
    Finding,
)

from app.memory.base import NullMemoryClient
from app.memory.local import LocalMemoryClient
from app.memory.meko import MekoClient
from app.memory.policy import allowed_by_policy, to_lesson


class TestMemoryPolicy(unittest.TestCase):
    def setUp(self):
        self.finding = Finding(
            id="F-1",
            persona="finance",
            title="BolBot burn rate ₹22.4L too high for runway claim",
            detail="Founder claims 18-month runway on https://bolbot.in with ₹7,000 CAC.",
            severity="critical",
            category="finance",
            status="contradicted",
            question="How will you survive 18 months if CAC increases by 30%?",
            resolved="resolved",
        )
        self.criteria_strong = EvalCriteria(
            addresses_objection=True,
            quantified=True,
            evidence_type="data_cited",
        )
        self.eval_accepted = Evaluation(
            criteria=self.criteria_strong,
            proposed_outcome="accepted",
            outcome="accepted",
            reason="Founder presented 120-customer pilot sheet proving ₹6,800 blended CAC.",
            injection_attempt=False,
        )

    def test_policy_allows_resolved_with_data_evidence(self):
        self.assertTrue(allowed_by_policy(self.finding, self.eval_accepted))

    def test_policy_rejects_unresolved_finding(self):
        open_finding = self.finding.model_copy(update={"resolved": "open"})
        self.assertFalse(allowed_by_policy(open_finding, self.eval_accepted))

    def test_policy_rejects_assertion_without_data(self):
        weak_eval = self.eval_accepted.model_copy(
            update={"criteria": EvalCriteria(addresses_objection=True, quantified=True, evidence_type="assertion")}
        )
        self.assertFalse(allowed_by_policy(self.finding, weak_eval))

    def test_policy_rejects_injection_attempt(self):
        injected_eval = self.eval_accepted.model_copy(update={"injection_attempt": True})
        self.assertFalse(allowed_by_policy(self.finding, injected_eval))

    def test_to_lesson_never_leaks_company_url_or_numbers(self):
        lesson = to_lesson(self.finding, self.eval_accepted)

        # Forbidden tokens that must NEVER appear in promoted shared knowledge
        forbidden = ["BolBot", "bolbot", "22.4", "₹", "7,000", "https://", "18-month", "120-customer"]
        for token in forbidden:
            self.assertNotIn(
                token,
                lesson,
                f"Privacy leak! Found forbidden token '{token}' in lesson: {lesson}",
            )

        # Must contain category and evidence descriptor
        self.assertIn("finance", lesson)
        self.assertIn("audited cohort metrics", lesson)


class TestLocalMemory(unittest.IsolatedAsyncioTestCase):
    async def test_remember_recall_cycle(self):
        client = LocalMemoryClient()
        rec = await client.remember("d-1", "finance", "CAC break point is ₹9,100", "FINDING")
        self.assertEqual(rec.status, "ok")
        self.assertEqual(rec.source, "local_fallback")

        recall_rec = await client.recall("d-1", "CAC break point", k=3)
        self.assertEqual(recall_rec.status, "ok")
        self.assertTrue(len(recall_rec.hits) >= 1)
        self.assertIn("CAC break point", recall_rec.hits[0])

    async def test_forget_deal_clears_memory(self):
        client = LocalMemoryClient()
        await client.remember("d-2", "market", "3 competitors found", "FINDING")
        count = await client.forget_deal("d-2")
        self.assertEqual(count, 1)

        recall_rec = await client.recall("d-2", "competitors")
        self.assertEqual(len(recall_rec.hits), 0)


class TestMekoClientFallback(unittest.IsolatedAsyncioTestCase):
    async def test_fallback_on_timeout_never_raises(self):
        client = MekoClient(
            api_key="mock_key",
            datapack_id="mock_datapack",
            mcp_url="https://fake.url/mcp",
            timeout_s=0.1,
            call_budget=10,
        )

        with patch.object(client, "_execute_mcp_tool", side_effect=TimeoutError("timeout")):
            rec = await client.remember("d-timeout", "tech", "Testing timeout fallback", "TEST")
            self.assertEqual(rec.status, "ok")
            self.assertEqual(rec.source, "local_fallback")

    async def test_budget_switch_to_local(self):
        client = MekoClient(
            api_key="mock_key",
            datapack_id="mock_datapack",
            call_budget=2,
        )

        with patch.object(client, "_execute_mcp_tool", return_value=AsyncMock()):
            # 1st call
            await client.remember("d-b", "finance", "burn 1", "FINDING")
            # 2nd call
            await client.remember("d-b", "finance", "burn 2", "FINDING")
            # 3rd call exceeds budget
            rec3 = await client.remember("d-b", "finance", "burn 3", "FINDING")
            self.assertEqual(rec3.source, "local_fallback")

    async def test_null_client_returns_skipped(self):
        client = NullMemoryClient()
        rec = await client.remember("d-off", "tech", "test text", "TAG")
        self.assertEqual(rec.status, "skipped")
        self.assertEqual(client.status("d-off").mode, "off")


if __name__ == "__main__":
    unittest.main()
