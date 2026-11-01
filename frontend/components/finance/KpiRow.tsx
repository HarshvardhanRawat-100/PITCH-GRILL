"use client";

import React from "react";
import type { FinanceResult } from "@/contracts/types";
import { formatINR, formatMonths, formatMultiple } from "@/lib/format";

interface KpiRowProps {
  displayedResult: FinanceResult | null;
}

export function KpiRow({ displayedResult }: KpiRowProps) {
  const m = displayedResult?.metrics;

  // LTV:CAC color coding
  let ltvCacColor = "text-gray-300";
  if (m?.ltv_cac !== null && m?.ltv_cac !== undefined) {
    if (m.ltv_cac < 1.0) ltvCacColor = "text-red-400";
    else if (m.ltv_cac < 3.0) ltvCacColor = "text-amber-400";
    else ltvCacColor = "text-emerald-400";
  }

  // Runway display
  const runwayDisplay = formatMonths(m?.runway_months, m?.runway_capped);

  // Breakeven display
  let breakevenDisplay = "—";
  if (m) {
    breakevenDisplay =
      m.breakeven_month !== null && m.breakeven_month !== undefined
        ? `Month ${m.breakeven_month}`
        : "Not within 36 mo";
  }

  // Month-0 net burn display
  let month0Display = "—";
  if (m && m.month0_net_burn !== undefined) {
    if (m.month0_net_burn <= 0) {
      month0Display = `${formatINR(Math.abs(m.month0_net_burn))} /mo surplus`;
    } else {
      month0Display = `${formatINR(m.month0_net_burn)} /mo burn`;
    }
  }

  const cards = [
    {
      label: "Runway",
      value: runwayDisplay,
      color: "text-white",
      trend: m?.runway_capped ? "Survives 36M" : m?.runway_months && m.runway_months >= 18 ? "Optimal" : "At Risk",
      trendColor: m?.runway_months && m.runway_months >= 18 ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" : "text-amber-400 bg-amber-950/40 border-amber-800/40",
      icon: "📅",
      tooltip: "Months of operating cash remaining until balance reaches zero under active scenario.",
    },
    {
      label: "LTV",
      value: m?.ltv !== null && m?.ltv !== undefined ? formatINR(m.ltv) : "—",
      color: "text-white",
      trend: "Unit Rev",
      trendColor: "text-amber-300 bg-amber-950/40 border-amber-800/40",
      icon: "💵",
      tooltip: "Customer Lifetime Value = (ARPU × Gross Margin) / Monthly Churn Rate.",
    },
    {
      label: "LTV : CAC",
      value:
        m?.ltv_cac !== null && m?.ltv_cac !== undefined
          ? formatMultiple(m.ltv_cac)
          : "—",
      color: ltvCacColor,
      trend: m?.ltv_cac && m.ltv_cac >= 3.0 ? "≥ 3.0× VC Tier" : "Underwater",
      trendColor: m?.ltv_cac && m.ltv_cac >= 3.0 ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" : "text-red-400 bg-red-950/40 border-red-800/40",
      icon: "⚡",
      tooltip: "Ratio of Customer Lifetime Value to Acquisition Cost (3.0× is a healthy VC benchmark).",
    },
    {
      label: "Payback Period",
      value:
        m?.payback_months !== null && m?.payback_months !== undefined
          ? `${m.payback_months.toFixed(1)} mo`
          : "—",
      color: "text-white",
      trend: m?.payback_months && m.payback_months <= 12 ? "Healthy" : "Long",
      trendColor: m?.payback_months && m.payback_months <= 12 ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" : "text-amber-400 bg-amber-950/40 border-amber-800/40",
      icon: "⏱️",
      tooltip: "Months required to recover customer acquisition spend from gross profit contribution.",
    },
    {
      label: "Breakeven",
      value: breakevenDisplay,
      color: "text-white",
      trend: "Timeline",
      trendColor: "text-blue-400 bg-blue-950/40 border-blue-800/40",
      icon: "🎯",
      tooltip: "First calendar month where gross profit exceeds total fixed and variable acquisition burn.",
    },
    {
      label: "Month-0 Net Burn",
      value: month0Display,
      color: "text-white",
      trend: m && m.month0_net_burn !== undefined && m.month0_net_burn <= 0 ? "Surplus" : "Cash Out",
      trendColor: m && m.month0_net_burn !== undefined && m.month0_net_burn <= 0 ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" : "text-amber-400 bg-amber-950/40 border-amber-800/40",
      icon: "🔥",
      tooltip: "Initial net monthly cash burn rate calculated as Operating Expenses minus Gross Profit.",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((c, i) => (
        <div
          key={i}
          title={c.tooltip}
          aria-label={`${c.label}: ${c.value}. ${c.tooltip}`}
          className="bg-surface rounded-[14px] p-4 border border-border flex flex-col justify-between hover:border-amber-500/40 hover:shadow-sm transition-all cursor-help group"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm p-1 rounded-[6px] bg-amber-500/10 border border-amber-500/20">{c.icon}</span>
            <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-[6px] border ${c.trendColor}`}>
              {c.trend}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{c.label}</div>
            <div className={`text-base sm:text-lg font-bold font-mono tracking-tight mt-0.5 ${c.color}`}>
              {c.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
