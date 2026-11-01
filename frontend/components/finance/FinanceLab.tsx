"use client";

import React from "react";
import { AlertCircle, Calculator, RotateCcw } from "lucide-react";
import { useDeal } from "./useDeal";
import { useFinanceModel } from "./useFinanceModel";
import { ClaimBanner } from "./ClaimBanner";
import { KpiRow } from "./KpiRow";
import { BreakPointCallout } from "./BreakPointCallout";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { SliderPanel } from "./SliderPanel";
import { RunwayChart } from "./RunwayChart";
import { BurnChart } from "./BurnChart";
import { TornadoChart } from "./TornadoChart";
import { FormulaDrawer } from "./FormulaDrawer";

export default function FinanceLab() {
  const { deal, dealId, loading: dealLoading } = useDeal();
  const baseline = deal?.finance ?? null;

  const {
    displayedResult,
    threshold,
    overrides,
    mode,
    pending,
    error,
    setOverride,
    clearOverride,
    resetAll,
    setMode,
    retry,
  } = useFinanceModel({ dealId, baseline });

  // 1. Loading state (skeleton)
  if (dealLoading || !displayedResult) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-10 bg-surface rounded-xl border border-border flex items-center px-4 gap-3">
          <Calculator className="w-5 h-5 text-amber-500 animate-spin" />
          <span className="text-xs text-gray-400 font-mono">
            Finance Investor is calculating model trajectory...
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl border border-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-surface rounded-xl border border-border" />
          <div className="h-96 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  // 2. Missing must-have inputs (series empty)
  const isSeriesEmpty = !displayedResult.series || displayedResult.series.length === 0;

  return (
    <div className="space-y-6">
      {/* Grill Founder Claim Banner */}
      <ClaimBanner deal={deal} setOverride={setOverride} />

      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5 font-mono">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span>Finance Investor Lab</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Deterministic 36-month cash burn trajectory, unit economics model & break-point sensitivity testing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {Object.keys(overrides).length > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-xs font-semibold bg-surface border border-border text-gray-400 hover:text-white hover:border-amber-500/50 hover:bg-surface-elevated transition-all font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Scenarios</span>
            </button>
          )}
          <FormulaDrawer displayedResult={displayedResult} mode={mode} setMode={setMode} />
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 flex items-center justify-between gap-3 text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={retry}
            className="px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 text-xs font-medium text-white transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Row */}
      <KpiRow displayedResult={displayedResult} />

      {/* Breaking CAC Callout */}
      <BreakPointCallout displayedResult={displayedResult} />

      {/* Missing must-have warning if series is empty */}
      {isSeriesEmpty && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 text-amber-200 text-xs space-y-1">
          <p className="font-semibold">Incomplete Financial Inputs</p>
          <p className="text-gray-400">
            One or more required inputs (ARPU, CAC, Cash, Fixed Opex, New Customers) are missing from the deck.
            Please fill in the amber fields in the Assumptions panel below to unlock full simulation trajectory.
          </p>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assumptions Table + Sensitivity Sliders */}
        <div className="lg:col-span-5 space-y-6">
          <SliderPanel
            baseline={baseline}
            displayedResult={displayedResult}
            threshold={threshold}
            overrides={overrides}
            setOverride={setOverride}
            clearOverride={clearOverride}
          />
          <AssumptionsPanel displayedResult={displayedResult} setOverride={setOverride} />
        </div>

        {/* Right Column: Visual Charts */}
        <div className="lg:col-span-7 space-y-6">
          <RunwayChart
            baseline={baseline}
            displayedResult={displayedResult}
            pending={pending}
          />
          <BurnChart displayedResult={displayedResult} pending={pending} />
          <TornadoChart displayedResult={displayedResult} pending={pending} />
        </div>
      </div>
    </div>
  );
}
