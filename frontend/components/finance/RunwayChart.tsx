"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { FinanceResult } from "@/contracts/types";
import { formatINR, formatMonths } from "@/lib/format";
import { buildCashSeries } from "./utils";

interface RunwayChartProps {
  baseline: FinanceResult | null;
  displayedResult: FinanceResult | null;
  pending?: boolean;
}

export function RunwayChart({
  baseline,
  displayedResult,
  pending = false,
}: RunwayChartProps) {
  const currentSeries = useMemo(
    () => (displayedResult ? buildCashSeries(displayedResult) : []),
    [displayedResult]
  );

  const baselineSeries = useMemo(
    () => (baseline ? buildCashSeries(baseline) : []),
    [baseline]
  );

  const isScenario = baseline && displayedResult && baseline !== displayedResult;

  // Merge series for combined visualization
  const chartData = useMemo(() => {
    return currentSeries.map((pt, i) => ({
      x: pt.x,
      scenarioCash: pt.cash,
      baselineCash: baselineSeries[i]?.cash ?? pt.cash,
    }));
  }, [currentSeries, baselineSeries]);

  const runwayMonths = displayedResult?.metrics.runway_months;
  const isCapped = displayedResult?.metrics.runway_capped;

  const startCash = chartData[0]?.scenarioCash ?? 0;
  const currentCash = chartData[chartData.length - 1]?.scenarioCash ?? 0;

  return (
    <div className="bg-surface rounded-[18px] p-5 border border-border space-y-4 shadow-sm">
      {/* Top Header with Big Price & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider font-mono">
            Cash Balance Trajectory
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatINR(startCash)}
            </span>
            <span className="text-xs text-gray-400 font-mono">starting capital</span>
            {isScenario && (
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30 text-amber-300">
                Active Scenario
              </span>
            )}
          </div>
        </div>

        {/* Legend & Filter Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 bg-surface-elevated px-3 py-1.5 rounded-[8px] border border-border">
            {isScenario && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-gray-500 inline-block" />
                <span>Baseline</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-emerald-400 font-bold">Scenario</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: 15, bottom: 20 }}>
            <defs>
              <linearGradient id="cashGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2337" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, 36]}
              ticks={[0, 6, 12, 18, 24, 30, 36]}
              stroke="#4B5563"
              fontSize={11}
              tickLine={false}
              label={{
                value: "Horizon (Months from today)",
                position: "insideBottom",
                offset: -12,
                fill: "#6B7280",
                fontSize: 10,
              }}
            />
            <YAxis
              stroke="#4B5563"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => formatINR(v)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-[#121522] border border-border p-3 rounded-[10px] shadow-sm text-xs font-mono space-y-1">
                    <p className="text-gray-400 font-sans text-[11px]">Month {d.x}</p>
                    <p className="text-emerald-400 font-bold text-sm">
                      Cash: {formatINR(d.scenarioCash)}
                    </p>
                    {isScenario && (
                      <p className="text-gray-400 text-[11px]">
                        Base: {formatINR(d.baselineCash)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#EF4444" strokeWidth={1.5} />

            {/* Vertical runway marker */}
            {!isCapped && runwayMonths !== null && runwayMonths !== undefined && (
              <ReferenceLine
                x={runwayMonths}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                label={{
                  value: `${formatMonths(runwayMonths)} Runway`,
                  position: "top",
                  fill: "#F59E0B",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            )}

            {/* Dashed baseline line */}
            {isScenario && (
              <Line
                type="monotone"
                dataKey="baselineCash"
                stroke="#6B7280"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={!pending}
              />
            )}

            {/* Main scenario line */}
            <Line
              type="monotone"
              dataKey="scenarioCash"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={!pending}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
