"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import { formatINR, formatPct, formatSignedPct } from "@/lib/format";
import type { UnitType } from "./fields";

interface RangeSliderProps {
  id: string;
  label: string;
  unit: UnitType;
  value: number;
  baselineValue: number | null | undefined;
  min: number;
  max: number;
  step: number;
  dangerFraction?: number | null;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (val: number) => void;
  onReset: () => void;
}

export function RangeSlider({
  id,
  label,
  unit,
  value,
  baselineValue,
  min,
  max,
  step,
  dangerFraction,
  disabled,
  disabledReason,
  onChange,
  onReset,
}: RangeSliderProps) {
  const isOverridden =
    baselineValue !== null &&
    baselineValue !== undefined &&
    Math.abs(value - baselineValue) > 1e-4;

  const pctDiff =
    baselineValue !== null && baselineValue !== undefined && baselineValue > 0
      ? ((value - baselineValue) / baselineValue) * 100
      : null;

  const displayVal =
    unit === "inr"
      ? formatINR(value)
      : unit === "pct"
      ? formatPct(value, 1)
      : value.toLocaleString("en-IN");

  const valueText = `${label}: ${displayVal}${
    pctDiff !== null ? ` (${formatSignedPct(pctDiff)})` : ""
  }`;

  // Build danger zone background gradient if present
  let trackBackground = "linear-gradient(to right, #374151 0%, #374151 100%)";
  if (
    !disabled &&
    dangerFraction !== null &&
    dangerFraction !== undefined &&
    dangerFraction >= 0 &&
    dangerFraction <= 1
  ) {
    const dangerPct = (dangerFraction * 100).toFixed(1);
    trackBackground = `linear-gradient(to right, #374151 0%, #374151 ${dangerPct}%, rgba(239, 68, 68, 0.4) ${dangerPct}%, rgba(239, 68, 68, 0.4) 100%)`;
  }

  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-surface border border-border">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-medium text-gray-300">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {isOverridden && (
            <button
              type="button"
              onClick={onReset}
              title="Reset to baseline"
              className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <span className="font-mono font-semibold text-white">
            {disabled ? "—" : displayVal}
          </span>
          {pctDiff !== null && isOverridden && (
            <span
              className={`font-mono text-[10px] px-1 py-0.2 rounded font-semibold ${
                pctDiff > 0
                  ? "bg-amber-950/60 text-amber-400"
                  : "bg-emerald-950/60 text-emerald-400"
              }`}
            >
              {formatSignedPct(pctDiff)}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-center">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={disabled ? min : value}
          disabled={disabled}
          aria-valuetext={valueText}
          aria-disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ background: trackBackground }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {disabled && disabledReason && (
        <p className="text-[10px] text-amber-400/80 italic">{disabledReason}</p>
      )}
      {!disabled && dangerFraction !== null && dangerFraction !== undefined && (
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>Safe zone</span>
          <span className="text-red-400/80 font-medium">Danger zone (Runway &lt; 12 mo)</span>
        </div>
      )}
    </div>
  );
}
