#!/usr/bin/env python3
"""
Tune Demo — run the finance engine on a DeckFacts JSON and print key results.

Usage:
    python scripts/tune_demo.py path/to/deck_facts.json

Adds repo root and backend/ to sys.path itself.
This is for P4 to tune the DEMO DECK; never tune the engine.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# ── fix sys.path ────────────────────────────────────────────────────────────
_repo_root = str(Path(__file__).resolve().parent.parent)
_backend = str(Path(_repo_root) / "backend")
for p in (_repo_root, _backend):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.tools.finance_engine import compute

from contracts.schemas import DeckFacts, FinanceRequest


def main() -> None:
    """Load a DeckFacts JSON, run compute(), and print key results."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/tune_demo.py <path/to/deck_facts.json>")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)

    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    deck = DeckFacts.model_validate(raw)
    inputs = deck.financial_inputs

    # Default request: hold_growth, target 12 months
    req = FinanceRequest(mode="hold_growth", target_runway_months=12)
    result = compute(inputs, req)

    # ── print results ──
    print("=" * 60)
    print(f"  Company: {deck.company_name}")
    print(f"  Sector:  {deck.sector}")
    print("=" * 60)

    # Assumptions used
    if result.assumptions_used:
        print("\nAssumptions:")
        for a in result.assumptions_used:
            print(f"  • {a}")

    # Check if inputs were missing
    if not result.series:
        print("\n⚠  Missing required inputs — cannot simulate.")
        print("   The founder must supply:")
        for a in result.assumptions_used:
            if "missing" in a.lower() or "must supply" in a.lower():
                print(f"     • {a}")
        sys.exit(0)

    # Base runway
    if result.metrics.runway_capped:
        print("\nBase runway: 36+ mo")
    elif result.metrics.runway_months is not None:
        print(f"\nBase runway: {result.metrics.runway_months:.1f} mo")
    else:
        print("\nBase runway: N/A")

    # Breaking CAC
    bp = result.break_point
    if bp.already_below_target:
        print(f"Already below {bp.target_runway_months}-month target at deck CAC.")
    elif bp.breaking_cac is not None:
        print(f"Breaking CAC: Rs. {bp.breaking_cac:,.0f}")
        print(f"  = {bp.pct_increase:+.1f}% over deck CAC (Rs. {bp.base_cac:,.0f})")
    else:
        print(f"No break up to 20x CAC (runway stays above {bp.target_runway_months} mo).")

    # Key metrics
    m = result.metrics
    print(f"\nLTV: {f'Rs. {m.ltv:,.0f}' if m.ltv is not None else 'N/A'}")
    print(f"LTV:CAC: {f'{m.ltv_cac:.1f}' if m.ltv_cac is not None else 'N/A'}")
    print(f"Payback: {f'{m.payback_months:.1f} mo' if m.payback_months is not None else 'N/A'}")
    print(
        f"Breakeven: "
        f"{f'month {m.breakeven_month}' if m.breakeven_month is not None else 'never (within 36 mo)'}"
    )

    print("=" * 60)


if __name__ == "__main__":
    main()
