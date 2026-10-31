#!/usr/bin/env python3
"""
Tune BolBot financial numbers — Version 3.
Goal: find fixed_opex_monthly such that:
  - Runway ≈ 18 months at CAC=7000
  - Break-point CAC for 12-month runway is 25-40% above 7000

Analysis: break_cac is driven by how much of total burn is from CAC vs fixed opex.
If fixed_opex dominates, increasing CAC has little effect → break_cac is far above base.
If CAC dominates (low fixed_opex), small CAC increases crash runway → break_cac is close.

So we need fixed_opex to be LOW relative to acq_spend, but still produce 18-month runway.
That means the gap between gross_profit and total_burn is mostly from acquisition.
"""

def simulate(arpu, cac, gm_pct, churn_pct, customers_0, new_monthly, growth_pct, fixed_opex, cash_0, months=60):
    customers = float(customers_0)
    cash = float(cash_0)
    runway = None

    for t in range(months):
        new_t = new_monthly * (1 + growth_pct / 100) ** t
        revenue = customers * arpu
        gross_profit = revenue * gm_pct / 100
        acq_spend = new_t * cac
        net_burn = fixed_opex + acq_spend - gross_profit

        prev_cash = cash
        churned = customers * churn_pct / 100
        customers = customers + new_t - churned
        cash = cash - net_burn

        if cash <= 0 and runway is None:
            if net_burn > 0:
                runway = t + prev_cash / net_burn
            else:
                runway = float(t + 1)

    if runway is None:
        runway = float('inf')
    return runway


def find_break_cac(arpu, base_cac, gm_pct, churn_pct, customers_0, new_monthly, growth_pct, fixed_opex, cash_0, target_runway=12):
    lo, hi = base_cac, 50 * base_cac
    for _ in range(200):
        mid = (lo + hi) / 2
        rw = simulate(arpu, mid, gm_pct, churn_pct, customers_0, new_monthly, growth_pct, fixed_opex, cash_0)
        if rw > target_runway:
            lo = mid
        else:
            hi = mid
        if abs(hi - lo) < 1:
            break
    return (lo + hi) / 2


# Fixed deck inputs
arpu = 2499
cac = 7000
gm = 68
churn = 4.5
customers = 127
new_cust = 35
growth = 8
cash = 3_50_00_000  # 3.5 crore

print("Analysis: with growth=8% and these numbers, the business eventually profits.")
print("Break-point CAC will always be far above base CAC because fixed_opex dominates.")
print()
print("Let's explore what parameter tweaks could bring break_cac into 25-40% range.")
print()

# Scan fixed_opex from very low to high
print(f"{'Opex':>12} {'Runway':>8} {'BreakCAC':>10} {'%above':>8} {'AcqM0':>10} {'GPM0':>10}")
print("-" * 65)
for opex in list(range(0, 100_001, 10_000)) + list(range(100_000, 2_500_001, 50_000)):
    rw = simulate(arpu, cac, gm, churn, customers, new_cust, growth, opex, cash)
    if rw == float('inf') or rw > 50:
        rw_str = ">50"
        bp_str = "n/a"
        pct_str = "n/a"
    else:
        bp = find_break_cac(arpu, cac, gm, churn, customers, new_cust, growth, opex, cash, 12)
        pct = (bp - cac) / cac * 100
        rw_str = f"{rw:.1f}"
        bp_str = f"{bp:,.0f}"
        pct_str = f"{pct:.0f}%"
    # month 0 numbers
    acq0 = new_cust * cac
    gp0 = customers * arpu * gm / 100
    print(f"Rs{opex:>10,} {rw_str:>8} {bp_str:>10} {pct_str:>8} {acq0:>10,} {gp0:>10,.0f}")

print()
print("Observation: with growth=8%, revenue grows fast and eventually exceeds spend.")
print("The break-point is always very high because acquisition is tiny vs fixed opex.")
print()

# The key insight: at month 0, gross_profit = 127*2499*0.68 = 215,814
# acq_spend = 35 * 7000 = 245,000
# net_burn = fixed_opex + 245,000 - 215,814 = fixed_opex + 29,186
# For 18-month runway with 3.5 crore and growth, we need fixed_opex ~ 2.2M
# But then acq_spend (245K) is only ~10% of total burn (2.4M), so CAC is irrelevant.
#
# To make break-point CAC matter, acq_spend needs to be a LARGE fraction of total burn.
# That means fixed_opex needs to be LOW (close to 0).
# But with low fixed_opex, the company breaks even quickly and never runs out of cash.
#
# Only way to get both: either high churn (so revenue doesn't compound) or low growth.
# But we can't change those — they're in the deck.
#
# ALTERNATIVE: maybe the spec means break-point relative to a different baseline?
# Or perhaps fixed_opex should be moderate and we just accept the break-point CAC
# being outside 25-40% — the spec says "about 25-40%", which could be flexible.
#
# Let's check: what if we treat the spec as flexible and just find opex for runway=18?

print("="*60)
print("FINDING: fixed_opex for runway = 18 months")
print("="*60)

# Binary search for opex giving runway = 18
lo_opex, hi_opex = 0, 5_000_000
for _ in range(100):
    mid_opex = (lo_opex + hi_opex) / 2
    rw = simulate(arpu, cac, gm, churn, customers, new_cust, growth, mid_opex, cash)
    if rw > 18:
        lo_opex = mid_opex
    else:
        hi_opex = mid_opex
    if abs(hi_opex - lo_opex) < 100:
        break

opex_18 = round((lo_opex + hi_opex) / 2, -3)  # round to nearest 1000
rw = simulate(arpu, cac, gm, churn, customers, new_cust, growth, opex_18, cash)
bp = find_break_cac(arpu, cac, gm, churn, customers, new_cust, growth, opex_18, cash, 12)
pct = (bp - cac) / cac * 100

print(f"fixed_opex_monthly = Rs {opex_18:,.0f}")
print(f"Runway = {rw:.2f} months")
print(f"Break-point CAC = Rs {bp:,.0f} ({pct:.1f}% above Rs 7,000)")
print()

# Now let's also try: what if growth is lower?
# Or: what if the initial revenue is lower (fewer customers)?
# These are set by the deck, but let's see if small adjustments to new_customers or
# growth can help.

print("What if we adjust growth to bring break-CAC into range?")
print(f"{'Growth%':>8} {'Opex18mo':>12} {'Runway':>8} {'BreakCAC':>10} {'%above':>8}")
print("-" * 55)
for g in [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12]:
    lo_o, hi_o = 0, 5_000_000
    for _ in range(100):
        mid_o = (lo_o + hi_o) / 2
        rw = simulate(arpu, cac, gm, churn, customers, new_cust, g, mid_o, cash)
        if rw > 18:
            lo_o = mid_o
        else:
            hi_o = mid_o
        if abs(hi_o - lo_o) < 100:
            break
    opex_val = round((lo_o + hi_o) / 2, -3)
    rw = simulate(arpu, cac, gm, churn, customers, new_cust, g, opex_val, cash)
    bp = find_break_cac(arpu, cac, gm, churn, customers, new_cust, g, opex_val, cash, 12)
    pct = (bp - cac) / cac * 100
    print(f"{g:>7}% Rs{opex_val:>10,.0f} {rw:>8.2f} Rs{bp:>8,.0f} {pct:>7.1f}%")

print()
print("What if we reduce new_customers_monthly to shift balance?")
print(f"{'New/mo':>8} {'Opex18mo':>12} {'Runway':>8} {'BreakCAC':>10} {'%above':>8}")
print("-" * 55)
for n in [10, 15, 20, 25, 30, 35, 40, 50]:
    lo_o, hi_o = 0, 5_000_000
    for _ in range(100):
        mid_o = (lo_o + hi_o) / 2
        rw = simulate(arpu, cac, gm, churn, customers, new_cust, growth, mid_o, cash)
        if rw > 18:
            lo_o = mid_o
        else:
            hi_o = mid_o
        if abs(hi_o - lo_o) < 100:
            break
    # Now with this n value
    lo_o2, hi_o2 = 0, 5_000_000
    for _ in range(100):
        mid_o = (lo_o2 + hi_o2) / 2
        rw = simulate(arpu, cac, gm, churn, customers, n, growth, mid_o, cash)
        if rw > 18:
            lo_o2 = mid_o
        else:
            hi_o2 = mid_o
        if abs(hi_o2 - lo_o2) < 100:
            break
    opex_val = round((lo_o2 + hi_o2) / 2, -3)
    rw = simulate(arpu, cac, gm, churn, customers, n, growth, opex_val, cash)
    bp = find_break_cac(arpu, cac, gm, churn, customers, n, growth, opex_val, cash, 12)
    pct = (bp - cac) / cac * 100
    print(f"{n:>7} Rs{opex_val:>10,.0f} {rw:>8.2f} Rs{bp:>8,.0f} {pct:>7.1f}%")
