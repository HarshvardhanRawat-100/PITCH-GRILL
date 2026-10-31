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
  Cell,
  ReferenceLine,
} from "recharts";
import type { FinanceResult } from "@/contracts/types";
import { formatINR } from "@/lib/format";

interface BurnChartProps {
  displayedResult: FinanceResult | null;
  pending?: boolean;
}

export function BurnChart({ displayedResult, pending = false }: BurnChartProps) {
  const data = useMemo(() => {
    if (!displayedResult?.series) return [];
    return displayedResult.series.map((pt) => ({
      month: pt.month,
      netBurn: pt.net_burn,
    }));
  }, [displayedResult]);

  return (
    <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Monthly Net Cash Burn
        </h4>
        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block" />
            <span>Net Burn</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" />
            <span>Net Surplus</span>
          </div>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 15, left: 15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#25293C" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              ticks={[0, 6, 12, 18, 24, 30, 35]}
              tickFormatter={(m) => `M${m}`}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => formatINR(v)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const isBurning = d.netBurn > 0;
                return (
                  <div className="bg-surface-elevated border border-border p-2 rounded shadow-lg text-xs font-mono space-y-1">
                    <p className="text-gray-400 font-sans">Month {d.month}</p>
                    <p
                      className={`font-semibold ${
                        isBurning ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {isBurning ? "Burn: " : "Surplus: "}
                      {formatINR(Math.abs(d.netBurn))}
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#4B5563" />
            <Bar dataKey="netBurn" radius={[2, 2, 0, 0]} isAnimationActive={!pending}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.netBurn > 0 ? "#F59E0B" : "#10B981"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
