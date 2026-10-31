"use client";

import React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { ChecklistItem } from "@/contracts/types";
import { ChecklistRow } from "./ChecklistRow";

interface PriorityGroupProps {
  priority: "P0" | "P1" | "P2";
  items: ChecklistItem[];
  recentlyUpdatedId?: string | null;
  onStatusChange: (itemId: string, newStatus: "todo" | "addressed" | "uploaded") => void;
  onSelectFinding?: (findingId: string) => void;
}

export function PriorityGroup({
  priority,
  items,
  recentlyUpdatedId,
  onStatusChange,
  onSelectFinding,
}: PriorityGroupProps) {
  if (!items.length) return null;

  const getPriorityMeta = () => {
    switch (priority) {
      case "P0":
        return {
          title: "P0 — Deal-Breakers & Statutory Pre-Conditions",
          description: "Must be cleared before issuing term sheets; blocks closing if unresolved.",
          badgeBg: "bg-rose-950/40 text-rose-300 border-rose-800/50",
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
        };
      case "P1":
        return {
          title: "P1 — Condition Precedents (CPs)",
          description: "Required prior to fund disbursement and shareholder agreement execution.",
          badgeBg: "bg-amber-950/40 text-amber-300 border-amber-800/50",
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case "P2":
        return {
          title: "P2 — Post-Closing Governance & Operational Good-to-Haves",
          description: "Recommended operational and corporate hygiene items.",
          badgeBg: "bg-blue-950/40 text-blue-300 border-blue-800/50",
          icon: <Info className="w-4 h-4 text-blue-400" />,
        };
    }
  };

  const meta = getPriorityMeta();
  const addressedCount = items.filter((i) => i.status === "addressed").length;

  return (
    <section className="space-y-3">
      {/* Group Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-surface border border-border">{meta.icon}</div>
          <h3 className="text-sm font-semibold text-gray-200">{meta.title}</h3>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${meta.badgeBg}`}>
            {addressedCount}/{items.length} cleared
          </span>
        </div>
        <p className="text-xs text-gray-400">{meta.description}</p>
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            isHighlighted={item.id === recentlyUpdatedId}
            onStatusChange={onStatusChange}
            onSelectFinding={onSelectFinding}
          />
        ))}
      </div>
    </section>
  );
}
