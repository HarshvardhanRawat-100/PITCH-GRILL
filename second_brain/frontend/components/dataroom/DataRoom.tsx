"use client";

import React, { useState, useMemo } from "react";
import { CheckSquare, ShieldCheck, Filter, AlertCircle, RefreshCw } from "lucide-react";
import { useChecklist } from "./useChecklist";
import { ProgressRing } from "./ProgressRing";
import { ExportCsvButton } from "./ExportCsvButton";
import { PriorityGroup } from "./PriorityGroup";

type FilterTab = "all" | "p0" | "pending" | "addressed";

interface DataRoomProps {
  dealId?: string;
  companyName?: string;
  onSelectFinding?: (findingId: string) => void;
}

export default function DataRoom({ dealId, companyName = "Startup", onSelectFinding }: DataRoomProps) {
  const { checklist, loading, error, recentlyUpdatedId, updateStatus, refresh } = useChecklist(dealId);
  const [filter, setFilter] = useState<FilterTab>("all");

  const addressedCount = useMemo(
    () => checklist.filter((i) => i.status === "addressed").length,
    [checklist]
  );

  const filteredItems = useMemo(() => {
    switch (filter) {
      case "p0":
        return checklist.filter((i) => i.priority === "P0");
      case "pending":
        return checklist.filter((i) => i.status !== "addressed");
      case "addressed":
        return checklist.filter((i) => i.status === "addressed");
      default:
        return checklist;
    }
  }, [checklist, filter]);

  const p0Items = useMemo(() => filteredItems.filter((i) => i.priority === "P0"), [filteredItems]);
  const p1Items = useMemo(() => filteredItems.filter((i) => i.priority === "P1"), [filteredItems]);
  const p2Items = useMemo(() => filteredItems.filter((i) => i.priority === "P2"), [filteredItems]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-20 bg-surface rounded-xl border border-border flex items-center justify-between px-6" />
        <div className="h-32 bg-surface rounded-xl border border-border" />
        <div className="h-32 bg-surface rounded-xl border border-border" />
      </div>
    );
  }

  if (error && !checklist.length) {
    return (
      <div className="bg-surface rounded-xl border border-rose-900/50 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-base font-semibold text-gray-200">Failed to load Data Room</h3>
        <p className="text-xs text-gray-400">{error}</p>
        <button
          onClick={() => refresh()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated text-xs text-gray-200 hover:text-white"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                <CheckSquare className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-gray-100 tracking-tight">
                India Diligence Data Room
              </h2>
            </div>
            <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
              Dynamically synthesized diligence checklist tracking statutory Indian compliance,
              cross-border FEMA mandates, and proof required to address investor red flags.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ProgressRing addressed={addressedCount} total={checklist.length} />
            <ExportCsvButton items={checklist} companyName={companyName} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-500 ml-1" />
          <span className="text-xs text-gray-400 font-medium mr-2">Filter:</span>
          {(
            [
              { id: "all", label: `All Items (${checklist.length})` },
              { id: "p0", label: "P0 Critical" },
              { id: "pending", label: "Pending" },
              { id: "addressed", label: `Cleared (${addressedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.id
                  ? "bg-surface-elevated text-white border border-border shadow-xs"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-gray-400 hidden sm:inline">
          Auto-synchronized with Grill Room findings
        </span>
      </div>

      {/* Priority Groups */}
      <div className="space-y-6">
        <PriorityGroup
          priority="P0"
          items={p0Items}
          recentlyUpdatedId={recentlyUpdatedId}
          onStatusChange={updateStatus}
          onSelectFinding={onSelectFinding}
        />
        <PriorityGroup
          priority="P1"
          items={p1Items}
          recentlyUpdatedId={recentlyUpdatedId}
          onStatusChange={updateStatus}
          onSelectFinding={onSelectFinding}
        />
        <PriorityGroup
          priority="P2"
          items={p2Items}
          recentlyUpdatedId={recentlyUpdatedId}
          onStatusChange={updateStatus}
          onSelectFinding={onSelectFinding}
        />
      </div>

      {/* Mandatory Regulatory / Statutory Disclaimer */}
      <div className="rounded-xl bg-surface/60 border border-border/80 p-4 flex items-center gap-3 text-xs text-gray-400">
        <ShieldCheck className="w-5 h-5 text-gray-500 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-gray-300">Statutory Disclaimer:</strong> Documents investors
          typically request during institutional seed / Series A due diligence in India — not legal
          advice. Verify statutory filings with certified legal counsel and chartered accountants.
        </p>
      </div>
    </div>
  );
}
