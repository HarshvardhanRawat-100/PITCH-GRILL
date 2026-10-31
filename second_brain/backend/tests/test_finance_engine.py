"""
Tests for the SecondBrain Finance Engine.

Pure, deterministic, no network, no LLM.
All hand-computed arithmetic is shown in comments.
"""
from __future__ import annotations

import copy
import math
import time

import pytest
from app.tools.finance_engine import (
    HORIZON,
    MUST_HAVE,
    compute,
    simulate,
    solve_break_cac,
    tornado,
)

from contracts.schemas import (
    FinanceMetrics,
    FinanceRequest,
    FinanceResult,
    FinancialInputs,
    MonthPoint,
    Sourced,
)


# ── helpers ─────────────────────────────────────────────────────────────────
def _s(v: float, origin: str = "deck") -> Sourced:
    """Shorthand to build a Sourced with a value."""
    return Sourced(value=v, origin=origin)  # type: ignore[arg-type]


def _base_inputs() -> FinancialInputs:
    """Standard test inputs used across most tests.

    arpu 1000, cac 2000, gm 50%, churn 5%, cash 100_000,
    opex 40_000, customers 100, new/month 10, growth 0%.
    """
    return FinancialInputs(
        arpu_monthly=_s(1000),
        cac=_s(2000),
        gross_margin_pct=_s(50),
        monthly_churn_pct=_s(5),
        cash_in_bank=_s(100_000),
        fixed_opex_monthly=_s(40_000),
        current_customers=_s(100),
        new_customers_monthly=_s(10),
        new_customer_growth_pct_monthly=_s(0),
    )


def _no_nan_inf(obj: object) -> bool:
    """Recursively check that no float in a model_dump is NaN or inf."""
    if isinstance(obj, float):
        return math.isfinite(obj)
    if isinstance(obj, dict):
        return all(_no_nan_inf(v) for v in obj.values())
    if isinstance(obj, list):
        return all(_no_nan_inf(v) for v in obj)
    return True  # None, str, int, bool are fine


# ═══════════════════════════════════════════════════════════════════════════
# TEST 1 — hand-computed 3 months (hold_growth, growth 0%)
# ═══════════════════════════════════════════════════════════════════════════
class TestHandComputed3Months:
    """Verify the first 3 months against hand-calculated values.

    Inputs: arpu=1000, cac=2000, gm=50%, churn=5%, cash=100000,
            opex=40000, customers=100, new/month=10, growth=0%.

    Month 0:
      customers_0 = 100  (start)
      new_0       = 10 * (1+0)^0 = 10
      churned_0   = 100 * 0.05  = 5
      revenue_0   = 100 * 1000  = 100000
      gp_0        = 100000 * 0.50 = 50000
      acq_0       = 10 * 2000  = 20000
      net_burn_0  = 40000 + 20000 - 50000 = 10000
      cash_1      = 100000 - 10000 = 90000
      customers_1 = 100 + 10 - 5 = 105

    Month 1:
      customers_1 = 105
      new_1       = 10
      churned_1   = 105 * 0.05  = 5.25
      revenue_1   = 105 * 1000  = 105000
      gp_1        = 105000 * 0.50 = 52500
      acq_1       = 10 * 2000  = 20000
      net_burn_1  = 40000 + 20000 - 52500 = 7500
      cash_2      = 90000 - 7500 = 82500
      customers_2 = 105 + 10 - 5.25 = 109.75

    Month 2:
      customers_2 = 109.75
      new_2       = 10
      churned_2   = 109.75 * 0.05 = 5.4875
      revenue_2   = 109.75 * 1000 = 109750
      gp_2        = 109750 * 0.50 = 54875
      acq_2       = 10 * 2000  = 20000
      net_burn_2  = 40000 + 20000 - 54875 = 5125
      cash_3      = 82500 - 5125 = 77375
      customers_3 = 109.75 + 10 - 5.4875 = 114.2625
    """

    @pytest.fixture()
    def result(self) -> tuple[list[MonthPoint], FinanceMetrics]:
        """Simulate the standard inputs in hold_growth mode."""
        return simulate(_base_inputs(), "hold_growth")

    def test_month0(self, result: tuple[list[MonthPoint], FinanceMetrics]) -> None:
        """Verify month 0 values."""
        series, _ = result
        m0 = series[0]
        assert m0.month == 0
        assert m0.customers == pytest.approx(100.0)
        assert m0.revenue == pytest.approx(100_000.0)
        assert m0.gross_profit == pytest.approx(50_000.0)
        assert m0.acquisition_spend == pytest.approx(20_000.0)
        assert m0.net_burn == pytest.approx(10_000.0)
        assert m0.cash == pytest.approx(90_000.0)

    def test_month1(self, result: tuple[list[MonthPoint], FinanceMetrics]) -> None:
        """Verify month 1 values."""
        series, _ = result
        m1 = series[1]
        assert m1.month == 1
        assert m1.customers == pytest.approx(105.0)
        assert m1.revenue == pytest.approx(105_000.0)
        assert m1.gross_profit == pytest.approx(52_500.0)
        assert m1.acquisition_spend == pytest.approx(20_000.0)
        assert m1.net_burn == pytest.approx(7_500.0)
        assert m1.cash == pytest.approx(82_500.0)

    def test_month2(self, result: tuple[list[MonthPoint], FinanceMetrics]) -> None:
        """Verify month 2 values."""
        series, _ = result
        m2 = series[2]
        assert m2.month == 2
        assert m2.customers == pytest.approx(109.75)
        assert m2.revenue == pytest.approx(109_750.0)
        assert m2.gross_profit == pytest.approx(54_875.0)
        assert m2.acquisition_spend == pytest.approx(20_000.0)
        assert m2.net_burn == pytest.approx(5_125.0)
        assert m2.cash == pytest.approx(77_375.0)

    def test_metrics(self, result: tuple[list[MonthPoint], FinanceMetrics]) -> None:
        """Verify aggregate metrics.

        LTV = 1000 * 0.50 / 0.05 = 10000
        LTV:CAC = 10000 / 2000 = 5.0
        payback = 2000 / (1000 * 0.50) = 4.0
        month0_net_burn = 10000

        Breakeven: net_burn decreases each month as customers grow.
        Net burn = 40000 + 20000 - customers_t * 500
        Breakeven when customers_t * 500 >= 60000 → customers_t >= 120
        Month 0: 100, 1: 105, 2: 109.75, 3: 114.2625, 4: 118.549375, 5: 122.6219...
        Month 5: customers ≈ 122.62 → 122.62*500 = 61310 > 60000 → breakeven at t=5

        Runway: cash never hits 0 within 36 months (cash keeps accumulating after breakeven).
        """
        _, metrics = result
        assert metrics.ltv == pytest.approx(10_000.0)
        assert metrics.ltv_cac == pytest.approx(5.0)
        assert metrics.payback_months == pytest.approx(4.0)
        assert metrics.month0_net_burn == pytest.approx(10_000.0)
        assert metrics.breakeven_month == 5
        assert metrics.runway_months is None
        assert metrics.runway_capped is True

    def test_series_length(self, result: tuple[list[MonthPoint], FinanceMetrics]) -> None:
        """Simulation always produces exactly HORIZON points."""
        series, _ = result
        assert len(series) == HORIZON


# ═══════════════════════════════════════════════════════════════════════════
# TEST 2 — low cash → fractional runway
# ═══════════════════════════════════════════════════════════════════════════
class TestLowCashRunway:
    """Same inputs but cash = 15000.

    Month 0: net_burn = 10000, cash_1 = 15000 - 10000 = 5000  (> 0)
    Month 1: net_burn = 7500,  cash_2 = 5000 - 7500 = -2500   (<= 0)

    runway = 1 + cash_1 / net_burn_1 = 1 + 5000/7500 = 1.66667
    """

    def test_fractional_runway(self) -> None:
        """Runway is fractional when cash runs out mid-month."""
        inp = _base_inputs()
        inp.cash_in_bank = _s(15_000)
        _, metrics = simulate(inp, "hold_growth")
        expected = 1.0 + 5_000.0 / 7_500.0  # ≈ 1.6667
        assert metrics.runway_months == pytest.approx(expected, rel=1e-6)
        assert metrics.runway_capped is False


# ═══════════════════════════════════════════════════════════════════════════
# TEST 3 — runway is monotone non-increasing in CAC
# ═══════════════════════════════════════════════════════════════════════════
class TestRunwayMonotone:
    """Sweep CAC from 0.5x to 3x base and verify runway never increases."""

    def test_monotone_non_increasing(self) -> None:
        """Runway should decrease (or stay same) as CAC increases."""
        inp = _base_inputs()
        inp.cash_in_bank = _s(50_000)  # Use lower cash to ensure non-trivial runway
        multipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0]
        runways: list[float] = []
        for mult in multipliers:
            test_inp = copy.deepcopy(inp)
            test_inp.cac = _s(2000 * mult)
            _, m = simulate(test_inp, "hold_growth")
            r = m.runway_months if m.runway_months is not None else float(HORIZON)
            runways.append(r)
        for i in range(len(runways) - 1):
            assert runways[i] >= runways[i + 1] - 1e-9, (
                f"Runway not monotone: CAC mult {multipliers[i]} gave {runways[i]}, "
                f"but {multipliers[i + 1]} gave {runways[i + 1]}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# TEST 4 — bisection correctness
# ═══════════════════════════════════════════════════════════════════════════
class TestBisection:
    """Test that bisection finds the correct breaking CAC."""

    def test_breaking_cac_bounds(self) -> None:
        """With a scenario where runway(base) > 12 and runway(20x) < 12,
        the breaking CAC should be such that runway(breaking_cac - small) >= 12
        and runway(breaking_cac + small) <= 12 (within float tolerance).
        """
        inp = _base_inputs()
        inp.cash_in_bank = _s(200_000)  # Enough to survive > 12 months at base CAC

        bp = solve_break_cac(inp, "hold_growth", 12)

        # Verify we got a result
        assert bp.breaking_cac is not None
        assert bp.pct_increase is not None
        assert bp.already_below_target is False
        assert bp.base_cac == pytest.approx(2000.0)

        # Verify pct_increase is consistent
        expected_pct = (bp.breaking_cac / 2000.0 - 1.0) * 100.0
        assert bp.pct_increase == pytest.approx(expected_pct, rel=1e-6)

        # Verify runway just around the breaking point
        delta = 1.0  # ₹1 tolerance
        inp_lo = copy.deepcopy(inp)
        inp_lo.cac = _s(bp.breaking_cac - delta)
        _, m_lo = simulate(inp_lo, "hold_growth")
        r_lo = m_lo.runway_months if m_lo.runway_months is not None else float(HORIZON)

        inp_hi = copy.deepcopy(inp)
        inp_hi.cac = _s(bp.breaking_cac + delta)
        _, m_hi = simulate(inp_hi, "hold_growth")
        r_hi = m_hi.runway_months if m_hi.runway_months is not None else float(HORIZON)

        assert r_lo >= 12.0 - 0.5  # within float tolerance
        assert r_hi <= 12.0 + 0.5


# ═══════════════════════════════════════════════════════════════════════════
# TEST 5 — already-below and no-break cases
# ═══════════════════════════════════════════════════════════════════════════
class TestBisectionEdgeCases:
    """Test bisection edge cases."""

    def test_already_below_target(self) -> None:
        """When runway at base CAC is already below target, flag it."""
        inp = _base_inputs()
        inp.cash_in_bank = _s(5_000)  # Very little cash → short runway
        bp = solve_break_cac(inp, "hold_growth", 12)
        assert bp.already_below_target is True
        assert bp.breaking_cac is None
        assert bp.pct_increase is None

    def test_no_break_up_to_20x(self) -> None:
        """When runway stays above target even at 20x CAC."""
        inp = _base_inputs()
        inp.cash_in_bank = _s(10_000_000)  # Massive cash
        inp.fixed_opex_monthly = _s(1_000)  # Very low opex
        bp = solve_break_cac(inp, "hold_growth", 6)
        # With huge cash and tiny opex, even 20x CAC shouldn't break 6 months
        assert bp.already_below_target is False
        assert bp.breaking_cac is None
        assert bp.pct_increase is None


# ═══════════════════════════════════════════════════════════════════════════
# TEST 6 — hold_spend vs hold_growth modes
# ═══════════════════════════════════════════════════════════════════════════
class TestModes:
    """Test both simulation modes and growth."""

    def test_hold_spend_fixed_budget(self) -> None:
        """In hold_spend mode, acquisition_spend at month 0 equals
        new_customers_monthly * base_cac regardless of actual CAC.
        """
        inp = _base_inputs()
        base_cac = 2000.0

        # With higher CAC but hold_spend, budget = 10 * 2000 = 20000
        inp.cac = _s(4000)
        series_hs, _ = simulate(inp, "hold_spend", base_cac=base_cac)
        # new_0 = 10 * 1.0 * 2000 / 4000 = 5
        # acq_spend = 5 * 4000 = 20000
        assert series_hs[0].acquisition_spend == pytest.approx(20_000.0)

        # With even higher CAC
        inp.cac = _s(8000)
        series_hs2, _ = simulate(inp, "hold_spend", base_cac=base_cac)
        # new_0 = 10 * 1.0 * 2000 / 8000 = 2.5
        # acq_spend = 2.5 * 8000 = 20000
        assert series_hs2[0].acquisition_spend == pytest.approx(20_000.0)

    def test_hold_growth_scales_with_cac(self) -> None:
        """In hold_growth mode, acquisition_spend scales linearly with CAC."""
        inp = _base_inputs()
        series1, _ = simulate(inp, "hold_growth")

        inp2 = copy.deepcopy(inp)
        inp2.cac = _s(4000)
        series2, _ = simulate(inp2, "hold_growth")

        # acq_spend should double when CAC doubles (same new customers)
        assert series2[0].acquisition_spend == pytest.approx(
            series1[0].acquisition_spend * 2.0
        )

    def test_modes_equal_when_cac_matches_base(self) -> None:
        """Both modes produce identical results when cac == base_cac."""
        inp = _base_inputs()
        series_hg, _m_hg = simulate(inp, "hold_growth")
        series_hs, _m_hs = simulate(inp, "hold_spend", base_cac=2000.0)

        for a, b in zip(series_hg, series_hs):
            assert a.customers == pytest.approx(b.customers)
            assert a.revenue == pytest.approx(b.revenue)
            assert a.acquisition_spend == pytest.approx(b.acquisition_spend)
            assert a.net_burn == pytest.approx(b.net_burn)
            assert a.cash == pytest.approx(b.cash)

    def test_growth_rate(self) -> None:
        """new_t = n * (1 + g/100)^t with g > 0."""
        inp = _base_inputs()
        inp.new_customer_growth_pct_monthly = _s(10)  # 10% monthly growth in new customers
        series, _ = simulate(inp, "hold_growth")

        # Month 0: new = 10 * 1.1^0 = 10 → acq = 10*2000 = 20000
        assert series[0].acquisition_spend == pytest.approx(20_000.0)
        # Month 1: new = 10 * 1.1^1 = 11 → acq = 11*2000 = 22000
        assert series[1].acquisition_spend == pytest.approx(22_000.0)
        # Month 2: new = 10 * 1.1^2 = 12.1 → acq = 12.1*2000 = 24200
        assert series[2].acquisition_spend == pytest.approx(24_200.0)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 7 — zero churn
# ═══════════════════════════════════════════════════════════════════════════
class TestZeroChurn:
    """When churn = 0, LTV and LTV:CAC should be None, no exception."""

    def test_zero_churn_metrics(self) -> None:
        """Zero churn yields None for LTV and LTV:CAC."""
        inp = _base_inputs()
        inp.monthly_churn_pct = _s(0)
        _, metrics = simulate(inp, "hold_growth")
        assert metrics.ltv is None
        assert metrics.ltv_cac is None
        # payback should still be valid
        # payback = 2000 / (1000 * 0.50) = 4.0
        assert metrics.payback_months == pytest.approx(4.0)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 8 — missing inputs
# ═══════════════════════════════════════════════════════════════════════════
class TestMissingInputs:
    """Each MUST_HAVE missing individually, and all missing."""

    def test_each_must_have_missing(self) -> None:
        """Each must-have missing in turn produces empty series and explanation."""
        for field in MUST_HAVE:
            inp = _base_inputs()
            setattr(inp, field, Sourced())  # value=None
            result = compute(inp, FinanceRequest())
            assert result.series == [], f"Expected empty series when {field} missing"
            assert result.tornado == [], f"Expected empty tornado when {field} missing"
            # Check assumptions mention the missing field
            mentions = [a for a in result.assumptions_used if field in a]
            assert len(mentions) > 0, f"Expected {field} mentioned in assumptions"

    def test_all_missing(self) -> None:
        """All must-haves missing at once."""
        inp = FinancialInputs()
        result = compute(inp, FinanceRequest())
        assert result.series == []
        assert result.tornado == []
        for field in MUST_HAVE:
            mentions = [a for a in result.assumptions_used if field in a]
            assert len(mentions) > 0, f"Expected {field} mentioned in assumptions"

    def test_no_exception(self) -> None:
        """Missing inputs should never raise."""
        inp = FinancialInputs()
        # This must not raise
        result = compute(inp, FinanceRequest())
        assert isinstance(result, FinanceResult)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 9 — tornado
# ═══════════════════════════════════════════════════════════════════════════
class TestTornado:
    """Tornado sensitivity analysis tests."""

    def test_tornado_bar_count(self) -> None:
        """Tornado should produce exactly 6 bars."""
        inp = _base_inputs()
        bars = tornado(inp, "hold_growth")
        assert len(bars) == 6

    def test_tornado_sorted_desc(self) -> None:
        """Bars should be sorted by delta_months descending."""
        inp = _base_inputs()
        bars = tornado(inp, "hold_growth")
        for i in range(len(bars) - 1):
            assert bars[i].delta_months >= bars[i + 1].delta_months

    def test_tornado_pct_clamp(self) -> None:
        """Percent variables are clamped when varied ±20%.
        E.g., churn 90% → +20% = 108 → clamped to 100.
        """
        inp = _base_inputs()
        inp.monthly_churn_pct = _s(90)  # +20% = 108 → clamped to 100
        bars = tornado(inp, "hold_growth")

        # Find the churn bar
        churn_bar = next(b for b in bars if b.variable == "monthly_churn_pct")
        # The high side should use churn=100 (clamped), low side uses 72
        # Both should produce finite runway values capped at 36
        assert churn_bar.runway_low <= 36.0
        assert churn_bar.runway_high <= 36.0
        assert churn_bar.delta_months >= 0

    def test_tornado_runway_capped_at_36(self) -> None:
        """Runway values in tornado should never exceed 36."""
        inp = _base_inputs()
        bars = tornado(inp, "hold_growth")
        for bar in bars:
            assert bar.runway_low <= 36.0
            assert bar.runway_high <= 36.0


# ═══════════════════════════════════════════════════════════════════════════
# TEST 10 — overrides and defaults
# ═══════════════════════════════════════════════════════════════════════════
class TestOverridesAndDefaults:
    """Test override application, default filling, and immutability."""

    def test_override_sets_founder_origin(self) -> None:
        """Overridden fields get origin='founder'."""
        inp = _base_inputs()
        req = FinanceRequest(overrides={"cac": 3000.0})
        result = compute(inp, req)
        assert result.inputs.cac.value == pytest.approx(3000.0)
        assert result.inputs.cac.origin == "founder"

    def test_unknown_key_ignored(self) -> None:
        """Unknown override keys are silently ignored."""
        inp = _base_inputs()
        req = FinanceRequest(overrides={"bogus_field": 999.0, "cac": 3000.0})
        result = compute(inp, req)
        # cac applied, bogus ignored
        assert result.inputs.cac.value == pytest.approx(3000.0)

    def test_nan_override_ignored(self) -> None:
        """NaN override values are silently ignored."""
        inp = _base_inputs()
        original_cac = inp.cac.value
        req = FinanceRequest(overrides={"cac": float("nan")})
        result = compute(inp, req)
        assert result.inputs.cac.value == pytest.approx(original_cac)  # type: ignore[arg-type]

    def test_inf_override_ignored(self) -> None:
        """Inf override values are silently ignored."""
        inp = _base_inputs()
        original_cac = inp.cac.value
        req = FinanceRequest(overrides={"cac": float("inf")})
        result = compute(inp, req)
        assert result.inputs.cac.value == pytest.approx(original_cac)  # type: ignore[arg-type]

    def test_defaults_filled_with_assumed_origin(self) -> None:
        """Missing non-must-have fields are filled from ASSUMED_DEFAULTS."""
        inp = _base_inputs()
        inp.gross_margin_pct = Sourced()  # clear it
        req = FinanceRequest()
        result = compute(inp, req)
        assert result.inputs.gross_margin_pct.value == pytest.approx(60.0)
        assert result.inputs.gross_margin_pct.origin == "assumed"
        # Check assumptions_used mentions it
        assert any("gross_margin_pct" in a and "assumed" in a for a in result.assumptions_used)

    def test_input_not_mutated(self) -> None:
        """The original FinancialInputs object must not be mutated."""
        inp = _base_inputs()
        original_cac = inp.cac.value
        req = FinanceRequest(overrides={"cac": 5000.0})
        compute(inp, req)
        assert inp.cac.value == original_cac

    def test_override_listed_in_assumptions(self) -> None:
        """Overrides are listed in assumptions_used."""
        inp = _base_inputs()
        req = FinanceRequest(overrides={"cac": 3000.0})
        result = compute(inp, req)
        assert any("cac" in a and "overridden by founder" in a for a in result.assumptions_used)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 11 — no NaN/inf anywhere
# ═══════════════════════════════════════════════════════════════════════════
class TestNoNanInf:
    """No NaN or inf should appear in any model_dump of results."""

    def test_normal_case(self) -> None:
        """Normal inputs produce no NaN/inf."""
        inp = _base_inputs()
        result = compute(inp, FinanceRequest())
        assert _no_nan_inf(result.model_dump())

    def test_zero_cash(self) -> None:
        """Zero cash produces no NaN/inf."""
        inp = _base_inputs()
        inp.cash_in_bank = _s(0)
        result = compute(inp, FinanceRequest())
        assert _no_nan_inf(result.model_dump())

    def test_cac_zero(self) -> None:
        """CAC=0 produces no NaN/inf (edge: division by zero guards)."""
        inp = _base_inputs()
        inp.cac = _s(0)
        result = compute(inp, FinanceRequest())
        assert _no_nan_inf(result.model_dump())

    def test_churn_100(self) -> None:
        """Churn=100% produces no NaN/inf."""
        inp = _base_inputs()
        inp.monthly_churn_pct = _s(100)
        result = compute(inp, FinanceRequest())
        assert _no_nan_inf(result.model_dump())

    def test_missing_inputs_no_nan(self) -> None:
        """Missing inputs produce no NaN/inf."""
        result = compute(FinancialInputs(), FinanceRequest())
        assert _no_nan_inf(result.model_dump())


# ═══════════════════════════════════════════════════════════════════════════
# TEST 12 — determinism and performance
# ═══════════════════════════════════════════════════════════════════════════
class TestDeterminismAndPerformance:
    """Two identical calls must produce identical results, and compute < 100 ms."""

    def test_determinism(self) -> None:
        """Two calls with the same inputs produce byte-identical results."""
        inp = _base_inputs()
        req = FinanceRequest()
        r1 = compute(inp, req)
        r2 = compute(inp, req)
        assert r1.model_dump() == r2.model_dump()

    def test_performance(self) -> None:
        """compute() should run in < 100 ms (best of 5)."""
        inp = _base_inputs()
        req = FinanceRequest()
        times: list[float] = []
        for _ in range(5):
            start = time.perf_counter()
            compute(inp, req)
            elapsed = (time.perf_counter() - start) * 1000  # ms
            times.append(elapsed)
        best = min(times)
        assert best < 100, f"compute() took {best:.1f} ms (best of 5), expected < 100 ms"

    def test_formulas_always_populated(self) -> None:
        """Formulas list is always populated, even with missing inputs."""
        result = compute(FinancialInputs(), FinanceRequest())
        assert len(result.formulas) > 0
