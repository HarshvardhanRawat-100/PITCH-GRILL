"use client";

import React, { useState } from "react";
import { Sparkles, X, RotateCcw } from "lucide-react";
import type { Deal, FinancialInputKey } from "@/contracts/types";
import { formatINR, formatSignedPct } from "@/lib/format";
import { describeClaim } from "./utils";

interface ClaimBannerProps {
  deal: Deal | null;
  setOverride: (key: FinancialInputKey, val: number) => void;
}

export function ClaimBanner({ deal, setOverride }: ClaimBannerProps) {
  const [dismissedTurnIds, setDismissedTurnIds] = useState<Set<string>>(new Set());

  // Find the latest grill turn with a non-empty finance_override
  const turns = deal?.grill_turns || [];
  const latestOverrideTurn = [...turns]
    .reverse()
    .find(
      (t) =>
        t.finance_override &&
        Object.keys(t.finance_override).length > 0 &&
        !dismissedTurnIds.has(t.id)
    );

  if (!latestOverrideTurn || !latestOverrideTurn.finance_override) {
    return null;
  }

  const claimDiffs = describeClaim(
    deal?.deck?.financial_inputs,
    latestOverrideTurn.finance_override
  );

  if (claimDiffs.length === 0) return null;

  const handleDismiss = () => {
    setDismissedTurnIds((prev) => new Set(prev).add(latestOverrideTurn.id));
  };

  const handleRevert = () => {
    // Revert local overrides back to the original deck values
    for (const d of claimDiffs) {
      if (d.from !== null) {
        setOverride(d.key, d.from);
      }
    }
    handleDismiss();
  };

  return (
    <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-200 transition-all animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-start sm:items-center gap-3">
        <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" />
        <div className="space-y-1">
          <div className="text-xs sm:text-sm font-semibold text-white">
            Founder claim applied from Grill Room:
          </div>
          <div className="text-xs space-y-0.5">
            {claimDiffs.map((d) => (
              <div key={d.key} className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-emerald-300">{d.label}:</span>
                {d.pctChange !== null && (
                  <span className="font-mono font-bold text-emerald-400">
                    {formatSignedPct(d.pctChange)}
                  </span>
                )}
                {d.from !== null && (
                  <span className="text-gray-400">
                    ({formatINR(d.from)} → {formatINR(d.to)})
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 italic">
            * Revert is a local what-if scenario and does not alter the investor defense record.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={handleRevert}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface border border-emerald-800/80 text-xs font-medium text-emerald-300 hover:text-white hover:bg-emerald-900/50 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Revert (what-if)</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded text-gray-400 hover:text-white transition-colors"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
