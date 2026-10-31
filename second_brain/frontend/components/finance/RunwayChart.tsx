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

  return (
    <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Cash Balance Trajectory (36 Months)
        </h4>
        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400">
          {isScenario && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 border-t border-dashed border-gray-500 inline-block" />
              <span>Baseline</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500 inline-block" />
            <span>Scenario</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: 15, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#25293C" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, 36]}
              ticks={[0, 6, 12, 18, 24, 30, 36]}
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              label={{
                value: "Months from today",
                position: "insideBottom",
                offset: -12,
                fill: "#9CA3AF",
                fontSize: 10,
              }}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => formatINR(v)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-surface-elevated border border-border p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                    <p className="text-gray-400 font-sans">Month {d.x}</p>
                    <p className="text-amber-400 font-semibold">
                      Cash: {formatINR(d.scenarioCash)}
                    </p>
                    {isScenario && (
                      <p className="text-gray-400">
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
                  value: formatMonths(runwayMonths),
                  position: "top",
                  fill: "#F59E0B",
                  fontSize: 11,
                  fontWeight: 600,
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
              stroke="#F59E0B"
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
