"use client";

import React from "react";
import { CheckCircle2, Clock, UploadCloud, Flag, User, Building, Scale, Laptop } from "lucide-react";
import type { ChecklistItem } from "@/contracts/types";

interface ChecklistRowProps {
  item: ChecklistItem;
  isHighlighted?: boolean;
  onStatusChange: (itemId: string, newStatus: "todo" | "addressed" | "uploaded") => void;
  onSelectFinding?: (findingId: string) => void;
}

export function ChecklistRow({
  item,
  isHighlighted = false,
  onStatusChange,
  onSelectFinding,
}: ChecklistRowProps) {
  const getOwnerIcon = (owner: string) => {
    switch (owner) {
      case "legal":
        return <Scale className="w-3 h-3 text-purple-400" />;
      case "finance":
        return <Building className="w-3 h-3 text-amber-400" />;
      case "tech":
        return <Laptop className="w-3 h-3 text-blue-400" />;
      default:
        return <User className="w-3 h-3 text-emerald-400" />;
    }
  };

  const isAddressed = item.status === "addressed";
  const isUploaded = item.status === "uploaded";

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-500 ${
        isHighlighted
          ? "bg-emerald-950/30 border-emerald-500/80 ring-2 ring-emerald-500/30 scale-[1.01]"
          : isAddressed
          ? "bg-surface/40 border-border/60 opacity-80"
          : "bg-surface border-border hover:border-gray-700"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left Section: Title & Details */}
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* ID Chip */}
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-elevated border border-border text-gray-400 font-semibold">
              {item.id}
            </span>

            {/* India Badge */}
            {item.india_specific && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300">
                <span>🇮🇳</span>
                <span>India Statutory</span>
              </span>
            )}

            {/* Owner Chip */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded bg-surface-elevated border border-border text-gray-300 capitalize">
              {getOwnerIcon(item.owner)}
              <span>{item.owner}</span>
            </span>

            {/* Linked Finding Chip */}
            {item.finding_id && (
              <button
                type="button"
                onClick={() => onSelectFinding?.(item.finding_id!)}
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer"
                title={`Triggered by investor finding ${item.finding_id}`}
              >
                <Flag className="w-2.5 h-2.5 text-rose-400" />
                <span>Finding {item.finding_id}</span>
              </button>
            )}
          </div>

          <h4
            className={`text-sm font-semibold tracking-tight ${
              isAddressed ? "line-through text-gray-400" : "text-gray-100"
            }`}
          >
            {item.title}
          </h4>

          <div className="text-xs text-gray-400 leading-relaxed bg-surface-elevated/40 rounded-lg p-2.5 border border-border/50">
            <span className="font-semibold text-gray-300 mr-1.5">Why Investors Ask:</span>
            <span>{item.why}</span>
          </div>
        </div>

        {/* Right Section: Status Toggle Buttons */}
        <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
          <div className="inline-flex p-1 rounded-lg bg-surface-elevated border border-border text-xs">
            <button
              type="button"
              onClick={() => onStatusChange(item.id, "todo")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${
                item.status === "todo"
                  ? "bg-surface text-gray-200 border border-border shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Clock className="w-3 h-3 text-gray-400" />
              <span>To-Do</span>
            </button>

            <button
              type="button"
              onClick={() => onStatusChange(item.id, "uploaded")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${
                isUploaded
                  ? "bg-blue-950/80 text-blue-300 border border-blue-700/50 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <UploadCloud className="w-3 h-3 text-blue-400" />
              <span>Uploaded</span>
            </button>

            <button
              type="button"
              onClick={() => onStatusChange(item.id, "addressed")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${
                isAddressed
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Addressed</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-gray-500">
            {isAddressed ? "Resolved in grill" : isUploaded ? "In data room" : "Action required"}
          </span>
        </div>
      </div>
    </div>
  );
}
