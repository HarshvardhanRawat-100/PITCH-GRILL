"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { FinanceResult } from "@/contracts/types";
import { buildTornadoData } from "./utils";
import { formatMonths } from "@/lib/format";

interface TornadoChartProps {
  displayedResult: FinanceResult | null;
  pending?: boolean;
}

export function TornadoChart({
  displayedResult,
  pending = false,
}: TornadoChartProps) {
  const data = useMemo(
    () => (displayedResult ? buildTornadoData(displayedResult) : []),
    [displayedResult]
  );

  const baseRunway = displayedResult?.metrics.runway_months ?? 36;

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border text-center space-y-2">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Sensitivity Analysis (Tornado)
        </h4>
        <p className="text-xs text-gray-500">
          Tornado analysis unavailable until all required deck inputs are provided.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Sensitivity Analysis (±20% Variable Swing)
        </h4>
        <span className="text-[10px] font-mono text-gray-400">
          Sorted by impact on runway
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 30, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#25293C" horizontal={false} />
            <XAxis
              type="number"
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v} mo`}
            />
            <YAxis
              dataKey="label"
              type="category"
              stroke="#9CA3AF"
              fontSize={10}
              tickLine={false}
              width={75}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-surface-elevated border border-border p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                    <p className="font-semibold text-white font-sans">{d.label}</p>
                    <p className="text-gray-300">
                      −20% → <span className="text-amber-400 font-bold">{formatMonths(d.rawLow)}</span>
                    </p>
                    <p className="text-gray-300">
                      +20% → <span className="text-emerald-400 font-bold">{formatMonths(d.rawHigh)}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 pt-1 border-t border-border">
                      Impact Delta: {d.deltaMonths.toFixed(1)} mo
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              x={0}
              stroke="#F59E0B"
              label={{
                value: `Base: ${baseRunway.toFixed(1)} mo`,
                position: "insideTopLeft",
                fill: "#F59E0B",
                fontSize: 10,
              }}
            />
            <Bar
              dataKey="low"
              fill="#EF4444"
              radius={[3, 0, 0, 3]}
              isAnimationActive={!pending}
            />
            <Bar
              dataKey="high"
              fill="#10B981"
              radius={[0, 3, 3, 0]}
              isAnimationActive={!pending}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
