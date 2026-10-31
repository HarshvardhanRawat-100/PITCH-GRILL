"use client";

import React from "react";
import { AlertOctagon, CheckCircle2, AlertTriangle } from "lucide-react";
import type { FinanceResult } from "@/contracts/types";
import { formatINR, formatSignedPct } from "@/lib/format";

interface BreakPointCalloutProps {
  displayedResult: FinanceResult | null;
}

export function BreakPointCallout({ displayedResult }: BreakPointCalloutProps) {
  if (!displayedResult?.break_point) return null;

  const bp = displayedResult.break_point;
  const target = bp.target_runway_months || 12;
  const metrics = displayedResult.metrics;
  const currentRunway = metrics?.runway_months;
  const isCapped = metrics?.runway_capped;

  const isBelowTargetNow =
    !isCapped && currentRunway !== null && currentRunway !== undefined && currentRunway < target;

  let message = "";
  let tone: "danger" | "warning" | "safe" = "safe";

  if (bp.already_below_target) {
    message = `Runway is already below ${target} months at the current CAC.`;
    tone = "danger";
  } else if (bp.breaking_cac !== null && bp.breaking_cac !== undefined) {
    const formattedCac = formatINR(bp.breaking_cac);
    const formattedPct =
      bp.pct_increase !== null && bp.pct_increase !== undefined
        ? ` (${formatSignedPct(bp.pct_increase, 1)})`
        : "";
    message = `Your plan breaks at CAC ${formattedCac}${formattedPct} — runway falls below ${target} months.`;
    tone = "warning";
  } else {
    message = `No break point up to 20× CAC.`;
    tone = "safe";
  }

  const containerStyle =
    tone === "danger"
      ? "bg-red-950/30 border-red-800/60 text-red-200"
      : tone === "warning"
      ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
      : "bg-emerald-950/20 border-emerald-800/50 text-emerald-200";

  const Icon =
    tone === "danger"
      ? AlertOctagon
      : tone === "warning"
      ? AlertTriangle
      : CheckCircle2;

  const iconColor =
    tone === "danger"
      ? "text-red-400"
      : tone === "warning"
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${containerStyle}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <div className="text-xs sm:text-sm font-medium">{message}</div>
      </div>

      {isBelowTargetNow && (
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white shadow-sm animate-pulse">
          <AlertOctagon className="w-3.5 h-3.5" />
          Runway below {target} months at your slider settings
        </span>
      )}
    </div>
  );
}
