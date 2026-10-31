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
      note: m?.runway_capped ? "Survives 36-mo horizon" : undefined,
      tooltip: "Months of operating cash remaining until balance reaches zero under active scenario.",
    },
    {
      label: "LTV",
      value: m?.ltv !== null && m?.ltv !== undefined ? formatINR(m.ltv) : "—",
      color: "text-white",
      tooltip: "Customer Lifetime Value = (ARPU × Gross Margin) / Monthly Churn Rate.",
    },
    {
      label: "LTV : CAC",
      value:
        m?.ltv_cac !== null && m?.ltv_cac !== undefined
          ? formatMultiple(m.ltv_cac)
          : "—",
      color: ltvCacColor,
      tooltip: "Ratio of Customer Lifetime Value to Acquisition Cost (3.0× is a healthy VC benchmark).",
    },
    {
      label: "Payback Period",
      value:
        m?.payback_months !== null && m?.payback_months !== undefined
          ? `${m.payback_months.toFixed(1)} mo`
          : "—",
      color: "text-white",
      tooltip: "Months required to recover customer acquisition spend from gross profit contribution.",
    },
    {
      label: "Breakeven",
      value: breakevenDisplay,
      color: "text-white",
      tooltip: "First calendar month where gross profit exceeds total fixed and variable acquisition burn.",
    },
    {
      label: "Month-0 Net Burn",
      value: month0Display,
      color: "text-white",
      tooltip: "Initial net monthly cash burn rate calculated as Operating Expenses minus Gross Profit.",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <div
          key={i}
          title={c.tooltip}
          aria-label={`${c.label}: ${c.value}. ${c.tooltip}`}
          className="bg-surface rounded-xl p-3.5 border border-border flex flex-col justify-between hover:border-gray-700 transition-colors cursor-help"
        >
          <div className="text-[11px] font-medium text-gray-400">{c.label}</div>
          <div className={`text-base sm:text-lg font-bold font-mono mt-1 ${c.color}`}>
            {c.value}
          </div>
          {c.note && (
            <div className="text-[9px] text-emerald-400/80 mt-1 font-mono">
              {c.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
