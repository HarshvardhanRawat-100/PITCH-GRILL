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
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Sensitivity Sliders
        </h4>
        <span className="text-[11px] text-gray-500 font-mono">
          Interactive Scenario
        </span>
      </div>

      {/* Guided 20-second onboarding hint */}
      {showHint && (
        <div
          role="status"
          aria-live="polite"
          className="relative flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="text-base select-none">💡</span>
            <div className="leading-snug">
              <strong className="text-white">Try it:</strong> Drag the{" "}
              <span className="font-semibold text-amber-300 underline underline-offset-2">CAC slider</span> higher to test ad cost inflation and watch the cash runway cross into the red danger zone.
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
