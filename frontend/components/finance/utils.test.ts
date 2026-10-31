import { describe, expect, it } from "vitest";
import type { FinanceResult, FinancialInputs } from "@/contracts/types";
import {
  buildCashSeries,
  buildTornadoData,
  dangerFraction,
  describeClaim,
  sliderConfig,
} from "./utils";

describe("sliderConfig", () => {
  it("computes min, max, step for inr", () => {
    const cfg = sliderConfig(2500, "inr");
    expect(cfg.min).toBe(1250);
    expect(cfg.max).toBe(5000);
    expect(cfg.step).toBe(Math.max(1, Math.round(2500 / 200)));
  });

  it("clamps pct kinds to [0, 100]", () => {
    const cfg = sliderConfig(75, "pct");
    expect(cfg.min).toBe(37.5);
    expect(cfg.max).toBe(100);
    expect(cfg.step).toBe(0.1);
  });

  it("handles null/missing base gracefully", () => {
    const cfg = sliderConfig(null, "inr");
    expect(cfg.min).toBe(0);
    expect(cfg.max).toBe(100);
    expect(cfg.step).toBe(1);
  });
});

describe("dangerFraction", () => {
  it("returns null when breakingCac is null or above max", () => {
    expect(dangerFraction(null, 1000, 5000)).toBeNull();
    expect(dangerFraction(6000, 1000, 5000)).toBeNull();
  });

  it("returns 0 when breakingCac is <= min", () => {
    expect(dangerFraction(800, 1000, 5000)).toBe(0);
    expect(dangerFraction(1000, 1000, 5000)).toBe(0);
  });

  it("returns normalized fraction when inside range", () => {
    expect(dangerFraction(3000, 1000, 5000)).toBe(0.5);
  });
});

describe("describeClaim", () => {
  it("computes diff and percentage change vs deck value", () => {
    const deckInputs: Partial<FinancialInputs> = {
      cac: { value: 7000, origin: "deck" },
    };
    const diffs = describeClaim(deckInputs as FinancialInputs, { cac: 4200 });
    expect(diffs).toHaveLength(1);
    expect(diffs[0].key).toBe("cac");
    expect(diffs[0].from).toBe(7000);
    expect(diffs[0].to).toBe(4200);
    expect(diffs[0].pctChange).toBe(-40);
  });

  it("returns null pctChange when deck value is missing", () => {
    const diffs = describeClaim(null, { cac: 4200 });
    expect(diffs).toHaveLength(1);
    expect(diffs[0].from).toBeNull();
    expect(diffs[0].pctChange).toBeNull();
  });
});

describe("buildCashSeries and buildTornadoData", () => {
  it("prepends start cash at x=0", () => {
    const mockRes: Partial<FinanceResult> = {
      inputs: {
        cash_in_bank: { value: 100000, origin: "deck" },
      } as any,
      series: [
        {
          month: 0,
          cash: 90000,
          customers: 10,
          revenue: 1000,
          gross_profit: 500,
          acquisition_spend: 200,
          net_burn: 10000,
        },
      ],
      metrics: { runway_months: 10 } as any,
      tornado: [
        {
          variable: "cac",
          label: "CAC",
          runway_low: 12,
          runway_high: 8,
          delta_months: 4,
        },
      ],
    };

    const cash = buildCashSeries(mockRes as FinanceResult);
    expect(cash).toHaveLength(2);
    expect(cash[0]).toEqual({ x: 0, cash: 100000 });
    expect(cash[1]).toEqual({ x: 1, cash: 90000 });

    const tornado = buildTornadoData(mockRes as FinanceResult);
    expect(tornado).toHaveLength(1);
    expect(tornado[0].low).toBe(2); // 12 - 10
    expect(tornado[0].high).toBe(-2); // 8 - 10
  });
});
