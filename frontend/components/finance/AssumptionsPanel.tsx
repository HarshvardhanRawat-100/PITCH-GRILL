"use client";

import React, { useState } from "react";
import type { FinanceResult, FinancialInputKey } from "@/contracts/types";
import { formatINR, formatPct } from "@/lib/format";
import { FINANCIAL_FIELD_DEFS, ORDERED_FINANCIAL_KEYS } from "./fields";

interface AssumptionsPanelProps {
  displayedResult: FinanceResult | null;
  setOverride: (key: FinancialInputKey, val: number) => void;
}

export function AssumptionsPanel({
  displayedResult,
  setOverride,
}: AssumptionsPanelProps) {
  const [editingKey, setEditingKey] = useState<FinancialInputKey | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [errorMap, setErrorMap] = useState<Partial<Record<FinancialInputKey, string>>>({});

  const inputs = displayedResult?.inputs;

  const handleStartEdit = (key: FinancialInputKey, currentVal: number | null | undefined) => {
    setEditingKey(key);
    setDraftValue(currentVal !== null && currentVal !== undefined ? currentVal.toString() : "");
    setErrorMap((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleCommit = (key: FinancialInputKey) => {
    const trimmed = draftValue.trim();
    if (!trimmed) {
      setEditingKey(null);
      return;
    }

    const num = parseFloat(trimmed);
    const def = FINANCIAL_FIELD_DEFS[key];
    const validationErr = def.validate(num);

    if (validationErr) {
      setErrorMap((prev) => ({ ...prev, [key]: validationErr }));
      return; // Do NOT apply invalid input
    }

    setOverride(key, num);
    setErrorMap((prev) => ({ ...prev, [key]: undefined }));
    setEditingKey(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: FinancialInputKey) => {
    if (e.key === "Enter") {
      handleCommit(key);
    } else if (e.key === "Escape") {
      setEditingKey(null);
      setErrorMap((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  return (
    <div className="bg-surface rounded-[18px] border border-border p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span>Financial Assumptions Ledger</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Verified deck facts vs. heuristic model assumptions
          </p>
        </div>
        <span className="text-[10px] text-amber-300 font-mono px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30">
          Click value to override
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-[#0E111C]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-elevated text-gray-400 font-mono text-[11px]">
              <th className="py-3 px-3.5 font-semibold">Field ↑↓</th>
              <th className="py-3 px-3.5 font-semibold">Value ↑↓</th>
              <th className="py-3 px-3.5 font-semibold">Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {ORDERED_FINANCIAL_KEYS.map((key) => {
              const def = FINANCIAL_FIELD_DEFS[key];
              const sourced = inputs?.[key];
              const val = sourced?.value ?? null;
              const origin = sourced?.origin || "assumed";
              const slide = sourced?.slide;
              const isAssumed = origin === "assumed" || val === null;
              const isEditing = editingKey === key;
              const error = errorMap[key];

              let badgeText = "Assumed";
              let badgeColor = "bg-amber-950/60 text-amber-300 border-amber-800/50 shadow-xs rounded-[6px]";

              if (origin === "deck") {
                badgeText = slide ? `Deck (Slide ${slide})` : "Deck Verified";
                badgeColor = "bg-blue-950/60 text-blue-300 border-blue-800/50 shadow-xs rounded-[6px]";
              } else if (origin === "founder") {
                badgeText = "Founder Claim";
                badgeColor = "bg-emerald-950/60 text-emerald-300 border-emerald-800/50 shadow-xs rounded-[6px]";
              }

              const formattedVal =
                val === null
                  ? "—"
                  : def.unit === "inr"
                  ? formatINR(val)
                  : def.unit === "pct"
                  ? formatPct(val, 1)
                  : val.toLocaleString("en-IN");

              return (
                <tr
                  key={key}
                  className={`transition-colors hover:bg-surface-elevated/70 ${
                    isAssumed ? "bg-amber-950/5" : ""
                  }`}
                >
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-gray-200">{def.label}</div>
                    {isAssumed && val === null && (
                      <div className="text-[10px] text-amber-400 font-medium">Input required</div>
                    )}
                  </td>
                  <td className="py-3 px-3.5 font-mono">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={() => handleCommit(key)}
                          onKeyDown={(e) => handleKeyDown(e, key)}
                          autoFocus
                          className="w-28 px-2 py-1 rounded-[6px] bg-surface-elevated border border-amber-500 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        {error && <p className="text-[10px] text-red-400">{error}</p>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(key, val)}
                        className="text-left font-bold text-white hover:text-purple-300 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 -mx-1"
                      >
                        {formattedVal}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${badgeColor}`}
                    >
                      {badgeText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
