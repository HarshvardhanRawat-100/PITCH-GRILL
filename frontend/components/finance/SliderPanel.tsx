"use client";

import React, { useState, useEffect } from "react";
import type {
  FinanceResult,
  FinancialInputKey,
  FinancialInputs,
} from "@/contracts/types";
import { RangeSlider } from "./RangeSlider";
import { dangerFraction, sliderConfig } from "./utils";
import { FINANCIAL_FIELD_DEFS } from "./fields";

interface SliderPanelProps {
  baseline: FinanceResult | null;
  displayedResult: FinanceResult | null;
  threshold: FinanceResult | null;
  overrides: Partial<Record<FinancialInputKey, number>>;
  setOverride: (key: FinancialInputKey, val: number) => void;
  clearOverride: (key: FinancialInputKey) => void;
}

const SLIDER_KEYS: FinancialInputKey[] = [
  "cac",
  "monthly_churn_pct",
  "gross_margin_pct",
  "arpu_monthly",
  "new_customers_monthly",
];

export function SliderPanel({
  baseline,
  displayedResult,
  threshold,
  overrides,
  setOverride,
  clearOverride,
}: SliderPanelProps) {
  const currentInputs = displayedResult?.inputs;
  const baselineInputs: FinancialInputs | undefined = baseline?.inputs;

  // 20-second guided "Try it" hint pointing at the CAC slider
  const [showHint, setShowHint] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span>Sensitivity Controls</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Stress-test financial assumptions in real time
          </p>
        </div>
        <span className="text-[10px] text-purple-300 font-mono px-2 py-0.5 rounded bg-purple-950/40 border border-purple-800/40">
          Live Solver
        </span>
      </div>

      {/* Guided 20-second onboarding hint */}
      {showHint && (
        <div
          role="status"
          aria-live="polite"
          className="relative flex items-center justify-between gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 text-purple-200 text-xs shadow-glow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-base select-none">💡</span>
            <div className="leading-snug">
              <strong className="text-white">Stress Test:</strong> Drag the{" "}
              <span className="font-semibold text-purple-300 underline underline-offset-2">CAC slider</span> higher to model ad inflation and watch runway burn into the danger zone.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHint(false)}
            className="text-gray-400 hover:text-white p-1 rounded-md text-xs font-mono transition-colors"
            aria-label="Dismiss guide hint"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {SLIDER_KEYS.map((key) => {
          const def = FINANCIAL_FIELD_DEFS[key];
          const baseVal = baselineInputs?.[key]?.value ?? null;
          const currentVal =
            overrides[key] !== undefined
              ? overrides[key]!
              : currentInputs?.[key]?.value ?? baseVal ?? 0;

          const config = sliderConfig(baseVal, def.unit);

          // Danger fraction for CAC
          let cacDanger: number | null = null;
          if (key === "cac" && threshold?.break_point) {
            cacDanger = dangerFraction(
              threshold.break_point.breaking_cac,
              config.min,
              config.max
            );
          }

          const isDisabled = baseVal === null || baseVal === undefined;

          return (
            <RangeSlider
              key={key}
              id={`slider-${key}`}
              label={def.label}
              unit={def.unit}
              value={currentVal}
              baselineValue={baseVal}
              min={config.min}
              max={config.max}
              step={config.step}
              dangerFraction={cacDanger}
              disabled={isDisabled}
              disabledReason="Input not in deck. Set value in Assumptions panel first."
              onChange={(val) => setOverride(key, val)}
              onReset={() => clearOverride(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
