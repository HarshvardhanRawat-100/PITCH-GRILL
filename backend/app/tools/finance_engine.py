"""
SecondBrain Finance Engine — PURE, deterministic monthly projection model.

No LLM, no network, no file I/O, no randomness, no global state.
All numbers are INR (rupees). Percent fields are 0-100.

Conventions:
  - HORIZON = 36 months. Month index t = 0..35.
  - MonthPoint.month  = t
  - MonthPoint.customers = customers at START of month t
  - MonthPoint.cash      = cash at END of month t  (= cash_{t+1} in the spec)
  - The simulation always runs all 36 months. Cash may go negative.
"""
from __future__ import annotations

import copy
import math
from typing import Literal

from contracts.schemas import (
    BreakPoint,
    FinanceMetrics,
    FinanceRequest,
    FinanceResult,
    FinancialInputs,
    MonthPoint,
    Sourced,
    TornadoBar,
)

# ── defaults ────────────────────────────────────────────────────────────────
HORIZON = 36

ASSUMED_DEFAULTS: dict[str, float] = {
    "gross_margin_pct": 60.0,
    "monthly_churn_pct": 5.0,
    "new_customer_growth_pct_monthly": 0.0,
    "current_customers": 0.0,
}

MUST_HAVE: list[str] = [
    "arpu_monthly",
    "cac",
    "cash_in_bank",
    "fixed_opex_monthly",
    "new_customers_monthly",
]

# Human-readable labels for tornado variables
_TORNADO_LABELS: dict[str, str] = {
    "cac": "Customer Acquisition Cost (CAC)",
    "monthly_churn_pct": "Monthly Churn %",
    "gross_margin_pct": "Gross Margin %",
    "arpu_monthly": "Monthly ARPU",
    "fixed_opex_monthly": "Fixed Monthly Opex",
    "new_customers_monthly": "New Customers / Month",
}

# Percent-type fields (clamped to [0, 100])
_PCT_FIELDS: set[str] = {"gross_margin_pct", "monthly_churn_pct", "new_customer_growth_pct_monthly"}


# ── helpers ─────────────────────────────────────────────────────────────────
def _is_finite(v: float | None) -> bool:
    """Return True if *v* is a real, finite number."""
    if v is None:
        return False
    try:
        return math.isfinite(float(v))
    except (TypeError, ValueError):
        return False


def _clamp_pct(v: float) -> float:
    """Clamp a percentage value to [0, 100]."""
    return max(0.0, min(100.0, v))


def _val(s: Sourced) -> float | None:
    """Extract a finite numeric value from a Sourced, or None."""
    if s.value is None:
        return None
    if not _is_finite(s.value):
        return None
    return float(s.value)


def _get_input(inputs: FinancialInputs, field: str) -> float | None:
    """Get the effective numeric value for a field, or None if missing/non-finite."""
    sourced: Sourced = getattr(inputs, field)
    return _val(sourced)


def _set_input(
    inputs: FinancialInputs,
    field: str,
    value: float,
    origin: Literal["deck", "assumed", "founder"] = "assumed",
) -> None:
    """Set a FinancialInputs field to a Sourced with given value and origin."""
    setattr(inputs, field, Sourced(value=value, origin=origin))


def _runway_from_series(series: list[MonthPoint], horizon: int) -> tuple[float | None, bool]:
    """Compute runway_months from a series.

    Returns (runway_months, runway_capped).
    """
    for pt in series:
        t = pt.month
        if pt.cash <= 0:
            # cash_{t+1} <= 0
            # Find cash_t (= cash at end of previous month = start-of-month-t cash balance)
            if t == 0:
                # cash_0 is the initial cash_in_bank; cash at end of month 0 is already <= 0
                # runway = t = 0 because cash_t (start cash) might still be > 0
                # Per spec: "first t where cash_{t+1} <= 0 gives t + cash_t / net_burn_t"
                # cash_t here is the starting cash_in_bank
                # But if cash_t <= 0 already, runway = t
                if t == 0:
                    # cash_t is the initial cash_in_bank; we need to check if it's > 0
                    # Actually cash_{t+1} = cash_t - net_burn_t, and we stored cash_{t+1} as pt.cash
                    # The "cash_t" for the fractional formula is the cash at the START of the burn period
                    # For t=0, cash_t = cash_in_bank (the initial value)
                    # We need the previous cash. For t=0, previous cash = cash_in_bank = pt.cash + pt.net_burn
                    prev_cash = pt.cash + pt.net_burn  # cash_t = cash_{t+1} + net_burn_t
                    if prev_cash <= 0:
                        return float(t), False
                    if pt.net_burn > 0:
                        return t + prev_cash / pt.net_burn, False
                    # net_burn <= 0 but cash still went to 0 — shouldn't happen normally
                    return float(t), False
            else:
                prev_cash = series[t - 1].cash  # cash at end of month t-1 = cash_t
                if prev_cash <= 0:
                    return float(t), False
                if pt.net_burn > 0:
                    return t + prev_cash / pt.net_burn, False
                return float(t), False
    # Never ran out within horizon
    if horizon <= 0:
        return None, True
    return None, True


def _formulas() -> list[str]:
    """Return human-readable strings for every equation in the spec."""
    return [
        "customers_{t} = customers at start of month t",
        "new_t (hold_growth) = new_customers_monthly × (1 + growth%/100)^t",
        "new_t (hold_spend) = new_customers_monthly × (1 + growth%/100)^t × base_cac / cac",
        "churned_t = customers_t × churn%/100",
        "customers_{t+1} = customers_t + new_t − churned_t",
        "revenue_t = customers_t × arpu_monthly",
        "gross_profit_t = revenue_t × gross_margin%/100",
        "acquisition_spend_t = new_t × cac",
        "net_burn_t = fixed_opex + acquisition_spend_t − gross_profit_t  (positive = burning)",
        "cash_{t+1} = cash_t − net_burn_t",
        (
            "runway_months = first t where cash_{t+1} ≤ 0 → t + cash_t / net_burn_t  (fractional); "
            "if never within horizon → None (capped, UI shows '36+')"
        ),
        "breakeven_month = first t where net_burn_t ≤ 0, else None",
        "LTV = arpu × gross_margin%/100 / (churn%/100)  (None if churn = 0 or arpu×gm ≤ 0)",
        "LTV:CAC = LTV / CAC  (None if LTV is None or CAC ≤ 0)",
        "payback_months = CAC / (arpu × gross_margin%/100)  (None if arpu×gm ≤ 0)",
        "month0_net_burn = net_burn at t=0",
        (
            "Break point: bisection on CAC in [base_cac, 20×base_cac] for runway == target  "
            "(60 iterations; runway is monotone non-increasing in CAC)"
        ),
        "pct_increase = (breaking_cac / base_cac − 1) × 100",
        (
            "Tornado: vary each variable ±20% (clamp pct vars to 0–100), "
            "compute runway (capped at 36), delta = |high − low|; sort descending"
        ),
    ]


# ── core simulation ────────────────────────────────────────────────────────
def simulate(
    inputs: FinancialInputs,
    mode: Literal["hold_growth", "hold_spend"],
    horizon: int = HORIZON,
    *,
    base_cac: float | None = None,
) -> tuple[list[MonthPoint], FinanceMetrics]:
    """Run the monthly projection model for *horizon* months.

    Args:
        inputs: Financial inputs (all Sourced values must be populated with finite floats).
        mode: ``"hold_growth"`` keeps customer acquisition count constant (or growing),
              ``"hold_spend"`` keeps acquisition *budget* constant at ``base_cac``.
        horizon: Number of months to simulate (default 36).
        base_cac: The CAC **before** overrides, used only in ``hold_spend`` mode to fix
                  the acquisition budget.  Defaults to the CAC in *inputs*.

    Returns:
        A tuple of ``(series, metrics)`` where *series* is one ``MonthPoint`` per month
        and *metrics* summarises the projection.
    """
    # Extract scalar values
    arpu: float = _val(inputs.arpu_monthly) or 0.0
    cac: float = _val(inputs.cac) or 0.0
    gm: float = _clamp_pct(_val(inputs.gross_margin_pct) or 0.0)
    churn: float = _clamp_pct(_val(inputs.monthly_churn_pct) or 0.0)
    cash: float = _val(inputs.cash_in_bank) or 0.0
    opex: float = _val(inputs.fixed_opex_monthly) or 0.0
    customers: float = _val(inputs.current_customers) or 0.0
    new_cust: float = _val(inputs.new_customers_monthly) or 0.0
    growth: float = _clamp_pct(_val(inputs.new_customer_growth_pct_monthly) or 0.0)

    if base_cac is None:
        base_cac = cac

    series: list[MonthPoint] = []
    breakeven_month: int | None = None

    for t in range(horizon):
        # new customers this month
        growth_factor: float = (1.0 + growth / 100.0) ** t
        if mode == "hold_spend":
            # Budget is fixed at new_customers_monthly * base_cac
            # new_t = new_customers_monthly * growth_factor * base_cac / cac
            if cac > 0:
                new_t: float = new_cust * growth_factor * base_cac / cac
            else:
                new_t = 0.0
        else:
            # hold_growth
            new_t = new_cust * growth_factor

        churned_t: float = customers * churn / 100.0
        revenue_t: float = customers * arpu
        gross_profit_t: float = revenue_t * gm / 100.0
        acq_spend_t: float = new_t * cac
        net_burn_t: float = opex + acq_spend_t - gross_profit_t
        next_cash: float = cash - net_burn_t

        if breakeven_month is None and net_burn_t <= 0:
            breakeven_month = t

        series.append(
            MonthPoint(
                month=t,
                customers=customers,
                revenue=revenue_t,
                gross_profit=gross_profit_t,
                acquisition_spend=acq_spend_t,
                net_burn=net_burn_t,
                cash=next_cash,
            )
        )

        # Advance state
        customers = customers + new_t - churned_t
        cash = next_cash

    # ── metrics ──
    runway_months, runway_capped = _runway_from_series(series, horizon)

    # LTV / LTV:CAC / payback
    arpu_gm: float = arpu * gm / 100.0
    ltv: float | None = None
    ltv_cac: float | None = None
    payback: float | None = None

    if churn > 0 and arpu_gm > 0:
        ltv = arpu_gm / (churn / 100.0)
    if ltv is not None and cac > 0:
        ltv_cac = ltv / cac
    if arpu_gm > 0:
        payback = cac / arpu_gm

    month0_net_burn: float = series[0].net_burn if series else 0.0

    metrics = FinanceMetrics(
        ltv=ltv,
        ltv_cac=ltv_cac,
        payback_months=payback,
        runway_months=runway_months,
        runway_capped=runway_capped,
        breakeven_month=breakeven_month,
        month0_net_burn=month0_net_burn,
    )
    return series, metrics


# ── break-even CAC bisection ───────────────────────────────────────────────
def _runway_for_cac(
    inputs: FinancialInputs,
    mode: Literal["hold_growth", "hold_spend"],
    cac_val: float,
    horizon: int,
    budget_base_cac: float | None,
) -> float:
    """Compute effective runway for a given CAC value, capped at *horizon*."""
    inp = copy.deepcopy(inputs)
    _set_input(inp, "cac", cac_val)
    bc: float | None = budget_base_cac if mode == "hold_spend" else None
    _, m = simulate(inp, mode, horizon, base_cac=bc)
    if m.runway_months is None:
        return float(horizon)
    return m.runway_months


def solve_break_cac(
    inputs: FinancialInputs,
    mode: Literal["hold_growth", "hold_spend"],
    target_runway: int,
    *,
    budget_base_cac: float | None = None,
) -> BreakPoint:
    """Find the CAC at which runway drops to *target_runway* months via bisection.

    Uses 60 iterations of bisection on CAC in ``[effective_cac, 20×effective_cac]``.
    Capped runway (never runs out) counts as ``horizon`` (36).

    Args:
        inputs: Financial inputs (all required fields populated).
        mode: Simulation mode.
        target_runway: Target runway in months.
        budget_base_cac: In ``hold_spend`` mode, the fixed budget base CAC.

    Returns:
        A ``BreakPoint`` describing where CAC breaks the runway target.
    """
    effective_cac = _val(inputs.cac)
    if effective_cac is None or effective_cac <= 0:
        return BreakPoint(
            target_runway_months=target_runway,
            base_cac=effective_cac,
        )

    lo = effective_cac
    hi = effective_cac * 20.0

    # Check if runway at base CAC is already below target
    r_lo = _runway_for_cac(inputs, mode, lo, HORIZON, budget_base_cac)
    if r_lo < target_runway:
        return BreakPoint(
            target_runway_months=target_runway,
            base_cac=effective_cac,
            already_below_target=True,
        )

    # Check if runway at 20x still >= target (no break)
    r_hi = _runway_for_cac(inputs, mode, hi, HORIZON, budget_base_cac)
    if r_hi >= target_runway:
        return BreakPoint(
            target_runway_months=target_runway,
            base_cac=effective_cac,
        )

    # Bisection: runway is monotone non-increasing in CAC
    # lo has runway >= target, hi has runway < target
    for _ in range(60):
        mid = (lo + hi) / 2.0
        r_mid = _runway_for_cac(inputs, mode, mid, HORIZON, budget_base_cac)
        if r_mid >= target_runway:
            lo = mid
        else:
            hi = mid

    breaking_cac = (lo + hi) / 2.0
    pct_increase = (breaking_cac / effective_cac - 1.0) * 100.0

    return BreakPoint(
        target_runway_months=target_runway,
        base_cac=effective_cac,
        breaking_cac=breaking_cac,
        pct_increase=pct_increase,
    )


# ── tornado chart ───────────────────────────────────────────────────────────
def tornado(
    inputs: FinancialInputs,
    mode: Literal["hold_growth", "hold_spend"],
) -> list[TornadoBar]:
    """Sensitivity analysis: vary each key variable ±20 % and measure runway impact.

    Variables: ``cac, monthly_churn_pct, gross_margin_pct, arpu_monthly,
    fixed_opex_monthly, new_customers_monthly``.

    Percent fields are clamped to ``[0, 100]``.  Runway is capped at 36.
    Results sorted by ``delta_months`` descending.
    """
    variables = [
        "cac",
        "monthly_churn_pct",
        "gross_margin_pct",
        "arpu_monthly",
        "fixed_opex_monthly",
        "new_customers_monthly",
    ]
    bars: list[TornadoBar] = []

    for var in variables:
        base_val = _get_input(inputs, var)
        if base_val is None:
            base_val = 0.0

        lo_val = base_val * 0.8
        hi_val = base_val * 1.2

        # Clamp percent fields
        if var in _PCT_FIELDS:
            lo_val = _clamp_pct(lo_val)
            hi_val = _clamp_pct(hi_val)

        # Compute runway at low value
        inp_lo = copy.deepcopy(inputs)
        _set_input(inp_lo, var, lo_val)
        _, m_lo = simulate(inp_lo, mode)
        r_lo = m_lo.runway_months if m_lo.runway_months is not None else float(HORIZON)

        # Compute runway at high value
        inp_hi = copy.deepcopy(inputs)
        _set_input(inp_hi, var, hi_val)
        _, m_hi = simulate(inp_hi, mode)
        r_hi = m_hi.runway_months if m_hi.runway_months is not None else float(HORIZON)

        delta = abs(r_hi - r_lo)

        bars.append(
            TornadoBar(
                variable=var,
                label=_TORNADO_LABELS.get(var, var),
                runway_low=r_lo,
                runway_high=r_hi,
                delta_months=delta,
            )
        )

    bars.sort(key=lambda b: b.delta_months, reverse=True)
    return bars


# ── top-level compute (called by routes) ────────────────────────────────────
def compute(
    inputs: FinancialInputs,
    request: FinanceRequest,
) -> FinanceResult:
    """Run the full finance engine: simulate → break-point → tornado.

    Does NOT mutate *inputs* — works on deep copies.

    - Applies ``request.overrides`` (only valid ``FinancialInputs`` fields,
      ignoring unknown keys and non-finite values).
    - Fills missing non-must-have fields from ``ASSUMED_DEFAULTS``.
    - If any must-have field is still missing, returns a partial result
      listing what the founder must supply.  No exceptions raised.
    """
    # Work on a deep copy so caller's object is never mutated
    inp = copy.deepcopy(inputs)
    assumptions: list[str] = []

    # ── apply overrides ──
    valid_fields = set(FinancialInputs.model_fields.keys())
    for key, val in request.overrides.items():
        if key not in valid_fields:
            continue
        if not _is_finite(val):
            continue
        old = _get_input(inp, key)
        # Clamp percent fields
        new_val = float(val)
        if key in _PCT_FIELDS:
            new_val = _clamp_pct(new_val)
        _set_input(inp, key, new_val, "founder")
        assumptions.append(f"{key} overridden by founder: {old} -> {new_val}")

    # ── fill defaults ──
    for field, default_val in ASSUMED_DEFAULTS.items():
        current = _get_input(inp, field)
        if current is None:
            if field in _PCT_FIELDS:
                default_val = _clamp_pct(default_val)
            _set_input(inp, field, default_val, "assumed")
            assumptions.append(f"{field} assumed {default_val} (not in deck)")

    # ── check must-haves ──
    missing: list[str] = []
    for field in MUST_HAVE:
        if _get_input(inp, field) is None:
            missing.append(field)

    formulas = _formulas()

    if missing:
        for m in missing:
            assumptions.append(f"{m} is missing — the founder must supply it")
        return FinanceResult(
            inputs=inp,
            mode=request.mode,
            horizon_months=HORIZON,
            metrics=FinanceMetrics(),
            series=[],
            break_point=BreakPoint(target_runway_months=request.target_runway_months),
            tornado=[],
            assumptions_used=assumptions,
            formulas=formulas,
        )

    # ── determine base_cac for hold_spend ──
    # base_cac = the CAC BEFORE overrides are applied (the deck/assumed CAC).
    # If that is missing, use the effective (post-override) CAC.
    original_cac = _val(inputs.cac)  # from the un-mutated original
    effective_cac = _get_input(inp, "cac")
    if "cac" in request.overrides and _is_finite(request.overrides.get("cac")):
        # CAC was overridden; base_cac = original (pre-override) CAC
        sim_base_cac: float | None = original_cac if original_cac is not None else effective_cac
    else:
        sim_base_cac = effective_cac

    # ── simulate ──
    series, metrics = simulate(inp, request.mode, HORIZON, base_cac=sim_base_cac)

    # ── break-point ──
    # For break-point bisection in hold_spend, budget_base_cac stays FIXED
    # while cac varies.
    bp = solve_break_cac(
        inp,
        request.mode,
        request.target_runway_months,
        budget_base_cac=sim_base_cac if request.mode == "hold_spend" else None,
    )

    # ── tornado ──
    torn = tornado(inp, request.mode)

    return FinanceResult(
        inputs=inp,
        mode=request.mode,
        horizon_months=HORIZON,
        metrics=metrics,
        series=series,
        break_point=bp,
        tornado=torn,
        assumptions_used=assumptions,
        formulas=formulas,
    )
