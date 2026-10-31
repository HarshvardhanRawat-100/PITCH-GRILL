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
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Model Assumptions & Provenance
        </h4>
        <span className="text-[11px] text-gray-500 font-mono">
          Click value to edit
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-elevated text-gray-400 font-mono text-[11px]">
              <th className="py-2.5 px-3 font-medium">Input Field</th>
              <th className="py-2.5 px-3 font-medium">Value</th>
              <th className="py-2.5 px-3 font-medium">Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
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
              let badgeColor = "bg-amber-950/80 text-amber-400 border-amber-800/60";

              if (origin === "deck") {
                badgeText = slide ? `Deck Slide ${slide}` : "Deck";
                badgeColor = "bg-blue-950/80 text-blue-400 border-blue-800/60";
              } else if (origin === "founder") {
                badgeText = "Founder Claim";
                badgeColor = "bg-emerald-950/80 text-emerald-400 border-emerald-800/60";
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
                  className={`transition-colors ${
                    isAssumed ? "bg-amber-950/10 hover:bg-amber-950/20" : "hover:bg-surface-elevated/50"
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-gray-300">{def.label}</div>
                    {isAssumed && val === null && (
                      <div className="text-[10px] text-amber-400 font-medium">Fill this in</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={() => handleCommit(key)}
                          onKeyDown={(e) => handleKeyDown(e, key)}
                          autoFocus
                          className="w-28 px-2 py-0.5 rounded bg-surface-elevated border border-amber-500 text-white font-mono text-xs focus:outline-none"
                        />
                        {error && <p className="text-[10px] text-red-400">{error}</p>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(key, val)}
                        className="text-left font-semibold text-white hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1 -mx-1"
                      >
                        {formattedVal}
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeColor}`}
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
