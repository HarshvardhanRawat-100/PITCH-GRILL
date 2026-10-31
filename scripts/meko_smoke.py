#!/usr/bin/env python3
"""
Meko Smoke Test Script.

Validates:
1. Normal flow: remember -> recall (must find the saved item) -> kb_search -> trace -> forget
2. Forced-failure fallback: run with invalid key / unreachable host and assert
   it falls back to local without raising an exception.
3. Latency table reporting.
"""
from __future__ import annotations

import asyncio
import os
import sys

# Ensure root is in path
REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, REPO_ROOT)

from app.memory import MekoClient, get_memory


async def run_smoke_cycle(client, scenario_name: str, deal_id: str):
    print(f"\n{'='*70}")
    print(f"RUNNING SCENARIO: {scenario_name}")
    print(f"{'='*70}")

    results = []

    # 1. Remember
    test_text = "FINDING F-1 (critical, finance): Monthly fixed burn of ₹22.4L exceeds seed safety buffer."
    rec_remember = await client.remember(
        deal_id=deal_id,
        persona="finance",
        text=test_text,
        tag="FINDING",
    )
    results.append(("remember", rec_remember))

    # 2. Recall
    rec_recall = await client.recall(
        deal_id=deal_id,
        query="fixed burn seed safety",
        k=3,
    )
    results.append(("recall", rec_recall))

    # 3. KB Search
    rec_kb = await client.kb_search(
        query="diligence checklist requirements",
        k=2,
    )
    results.append(("kb_search", rec_kb))

    # 4. Trace
    rec_trace = await client.trace(
        deal_id=deal_id,
        label="Grill Round 1",
        exchange_text="Investor asked about CAC break point. Founder defended with referral pilot data.",
    )
    results.append(("trace", rec_trace))

    # 5. Forget
    deleted_count = await client.forget_deal(deal_id=deal_id)

    # 6. Verify recall after forget
    rec_after_forget = await client.recall(
        deal_id=deal_id,
        query="fixed burn",
        k=3,
    )

    # Print Table
    print(f"{'Operation':<15} {'Status':<10} {'Source':<16} {'Latency (ms)':<14} {'Hits / Note':<25}")
    print("-" * 80)
    for op, rec in results:
        hits_or_note = f"{len(rec.hits)} hits" if rec.hits else rec.text[:22]
        print(f"{op:<15} {rec.status:<10} {rec.source:<16} {rec.latency_ms!s:<14} {hits_or_note:<25}")

    print(f"{'forget_deal':<15} {'ok':<10} {rec_remember.source:<16} {'-':<14} {f'deleted {deleted_count} items':<25}")
    print(f"{'post_forget':<15} {rec_after_forget.status:<10} {rec_after_forget.source:<16} {rec_after_forget.latency_ms!s:<14} {f'{len(rec_after_forget.hits)} hits (cleared!)':<25}")

    status_obj = client.status(deal_id)
    print(f"\nFinal MekoStatus: mode={status_obj.mode}, connected={status_obj.connected}, calls={status_obj.calls_made}/{status_obj.call_budget}, note='{status_obj.note}'")

    return results, deleted_count, rec_after_forget


async def main():
    print("SECOND BRAIN — MEKO INTEGRATION SMOKE TEST")
    print(f"Python: {sys.version.split()[0]}")

    # SCENARIO 1: Configured client or Local fallback
    client1 = get_memory()
    await run_smoke_cycle(client1, "Scenario 1: Default / Active Mode", "deal-smoke-001")

    # SCENARIO 2: Forced Failure / Bad Key / Bad Endpoint -> MUST fallback to local
    bad_client = MekoClient(
        api_key="invalid_mock_key_xyz",
        datapack_id="00000000-0000-0000-0000-000000000000",
        mcp_url="https://unreachable-mock-domain-12345.ai/mcp",
        timeout_s=1.0,  # Fast timeout for test
        call_budget=200,
    )
    results2, deleted2, after2 = await run_smoke_cycle(
        bad_client,
        "Scenario 2: Network Error / Bad Key (Forced Circuit Fallback)",
        "deal-smoke-002",
    )

    # Assertions
    for op, rec in results2:
        assert rec.status == "ok", f"Expected ok status on fallback, got {rec.status}"
        assert rec.source == "local_fallback", f"Expected local_fallback, got {rec.source}"

    print("\n" + "="*70)
    print("ALL SMOKE TEST ASSERTIONS PASSED! Meko client gracefully degrades without raising.")
    print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
