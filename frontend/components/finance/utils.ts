import type {
  FinanceResult,
  FinancialInputKey,
  FinancialInputs,
} from "@/contracts/types";
import { FINANCIAL_FIELD_DEFS, type UnitType } from "./fields";

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
}

export function sliderConfig(
  base: number | null | undefined,
  kind: UnitType
): SliderConfig {
  if (base === null || base === undefined || !Number.isFinite(base) || base <= 0) {
    if (kind === "pct") return { min: 0, max: 100, step: 0.1 };
    return { min: 0, max: 100, step: 1 };
  }

  let min = 0.5 * base;
  let max = 2.0 * base;

  if (kind === "pct") {
    min = Math.max(0, min);
    max = Math.min(100, max);
  }

  const step =
    kind === "pct"
      ? 0.1
      : kind === "count"
      ? 1
      : Math.max(1, Math.round(base / 200));

  return { min, max, step };
}

export interface CashPoint {
  x: number;
  cash: number;
}

export function buildCashSeries(result: FinanceResult): CashPoint[] {
  const startCash = result.inputs.cash_in_bank?.value ?? 0;
  const points: CashPoint[] = [{ x: 0, cash: startCash }];

  for (const pt of result.series) {
    // pt.cash is END-of-month cash, so month 0 ends at x=1
    points.push({
      x: pt.month + 1,
      cash: pt.cash,
    });
  }

  return points;
}

export interface TornadoDisplayBar {
  variable: string;
  label: string;
  low: number;
  high: number;
  rawLow: number;
  rawHigh: number;
  deltaMonths: number;
}

export function buildTornadoData(result: FinanceResult): TornadoDisplayBar[] {
  const baseRunway = result.metrics.runway_months ?? 36;
  if (!result.tornado) return [];

  return result.tornado.map((bar) => ({
    variable: bar.variable,
    label: bar.label,
    low: Number((bar.runway_low - baseRunway).toFixed(2)),
    high: Number((bar.runway_high - baseRunway).toFixed(2)),
    rawLow: bar.runway_low,
    rawHigh: bar.runway_high,
    deltaMonths: bar.delta_months,
  }));
}

export function dangerFraction(
  breakingCac: number | null | undefined,
  min: number,
  max: number
): number | null {
  if (
    breakingCac === null ||
    breakingCac === undefined ||
    !Number.isFinite(breakingCac) ||
    breakingCac > max
  ) {
    return null;
  }
  if (breakingCac <= min) {
    return 0;
  }
  if (max <= min) {
    return null;
  }
  return (breakingCac - min) / (max - min);
}

export interface ClaimDiff {
  key: FinancialInputKey;
  label: string;
  from: number | null;
  to: number;
  pctChange: number | null;
}

export function describeClaim(
  deckInputs: FinancialInputs | null | undefined,
  financeOverride: Record<string, number> | null | undefined
): ClaimDiff[] {
  if (!financeOverride) return [];

  const diffs: ClaimDiff[] = [];
  for (const [keyStr, toVal] of Object.entries(financeOverride)) {
    const key = keyStr as FinancialInputKey;
    const def = FINANCIAL_FIELD_DEFS[key];
    const fromVal = deckInputs ? deckInputs[key]?.value ?? null : null;

    let pctChange: number | null = null;
    if (fromVal !== null && fromVal > 0) {
      pctChange = Number((((toVal - fromVal) / fromVal) * 100).toFixed(1));
    }

    diffs.push({
      key,
      label: def?.label || key,
      from: fromVal,
      to: toVal,
      pctChange,
    });
  }

  return diffs;
}
