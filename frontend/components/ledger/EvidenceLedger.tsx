"use client";

import React, { useState, useMemo } from "react";
import { LedgerEntry, Status, Persona } from "../../../contracts/types";

interface EvidenceLedgerProps {
  entries: LedgerEntry[];
  loading?: boolean;
  error?: string | null;
  onSelectFinding?: (findingId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  verified: {
    label: "Verified",
    icon: "✓",
    bg: "bg-emerald-950/60",
    text: "text-emerald-400",
    border: "border-emerald-600/40",
  },
  contradicted: {
    label: "Contradicted",
    icon: "✗",
    bg: "bg-rose-950/60",
    text: "text-rose-400",
    border: "border-rose-600/40",
  },
  unverified: {
    label: "Unverified",
    icon: "?",
    bg: "bg-slate-900/60",
    text: "text-slate-400",
    border: "border-slate-700/40",
  },
  assumed: {
    label: "Assumed",
    icon: "~",
    bg: "bg-amber-950/60",
    text: "text-amber-400",
    border: "border-amber-600/40",
  },
};

const PERSONA_COLORS: Record<Persona, string> = {
  finance: "#F59E0B",
  market: "#3B82F6",
  tech: "#A855F7",
};

export const EvidenceLedger: React.FC<EvidenceLedgerProps> = ({
  entries = [],
  loading = false,
  error = null,
  onSelectFinding,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [personaFilter, setPersonaFilter] = useState<string>("all");

  // Summary counts
  const counts = useMemo(() => {
    const total = entries.length;
    const verified = entries.filter((e) => e.status === "verified").length;
    const contradicted = entries.filter((e) => e.status === "contradicted").length;
    const unverified = entries.filter((e) => e.status === "unverified").length;
    const assumed = entries.filter((e) => e.status === "assumed").length;
    return { total, verified, contradicted, unverified, assumed };
  }, [entries]);

  // Filtered rows
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchSearch =
        search === "" ||
        entry.claim_text.toLowerCase().includes(search.toLowerCase()) ||
        entry.source.ref.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" || entry.status === statusFilter;

      const matchPersona =
        personaFilter === "all" || entry.persona === personaFilter;

      return matchSearch && matchStatus && matchPersona;
    });
  }, [entries, search, statusFilter, personaFilter]);

  if (collapsed) {
    return (
      <div className="w-12 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-4 cursor-pointer hover:bg-slate-900 transition-colors"
        onClick={onToggleCollapse}
        title="Open Evidence Ledger"
      >
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
          Evidence Ledger ({counts.total})
        </span>
        <div className="mt-4 flex flex-col gap-2 text-xs">
          <span className="text-emerald-400">✓ {counts.verified}</span>
          <span className="text-rose-400">✗ {counts.contradicted}</span>
          <span className="text-slate-400">? {counts.unverified}</span>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 md:w-96 bg-slate-950 border-r border-slate-800 flex flex-col h-full text-slate-100 select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-2">
            <span>Evidence Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded-[6px] bg-slate-800 text-slate-400 font-mono">
              {counts.total}
            </span>
          </h2>
          <div className="text-[11px] text-slate-400 font-mono mt-1 flex gap-2">
            <span className="text-emerald-400 font-medium">
              {counts.verified} verified
            </span>
            <span>·</span>
            <span className="text-rose-400 font-medium">
              {counts.contradicted} contradicted
            </span>
            <span>·</span>
            <span className="text-slate-400">{counts.unverified} unverified</span>
          </div>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded-[6px] bg-slate-800 hover:bg-slate-700 transition"
            title="Collapse Panel"
          >
            ←
          </button>
        )}
      </div>

      {/* Controls: Search and Filters */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/30 flex flex-col gap-2 text-xs">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search claims or sources..."
          className="w-full bg-slate-900 border border-slate-800 rounded-[6px] px-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {["all", "verified", "contradicted", "unverified", "assumed"].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded-[6px] capitalize font-mono text-[10px] transition ${
                  statusFilter === st
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Content Table / List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
        {loading && (
          <div className="p-6 text-center text-xs text-slate-500 animate-pulse font-mono">
            Grounding claims against web sources & engine...
          </div>
        )}

        {error && (
          <div className="p-4 m-2 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
            Error loading ledger: {error}
          </div>
        )}

        {!loading && !error && filteredEntries.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No claims match filter.
          </div>
        )}

        {!loading &&
          filteredEntries.map((entry) => {
            const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.unverified;
            const personaColor = entry.persona
              ? PERSONA_COLORS[entry.persona]
              : "#9CA3AF";

            return (
              <div
                key={entry.id}
                onClick={() => entry.finding_id && onSelectFinding?.(entry.finding_id)}
                className={`p-2.5 hover:bg-slate-900/80 transition-colors cursor-pointer rounded my-0.5 border border-transparent hover:border-slate-800 ${
                  entry.finding_id ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Top Row: Status badge + source chip + confidence */}
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded border font-mono font-medium flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </span>

                  {/* Source chip */}
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] bg-slate-800/80 px-1.5 py-0.5 rounded">
                    {entry.source.type === "deck" && `Deck ${entry.source.ref}`}
                    {entry.source.type === "web" && (
                      <a
                        href={entry.source.ref}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-400 hover:underline"
                      >
                        Web: {entry.source.ref.replace(/^https?:\/\//, "").slice(0, 18)}...
                      </a>
                    )}
                    {entry.source.type === "calc" && "Engine Math"}
                    {entry.source.type === "inference" && "Model Inference"}
                    {entry.source.type === "cache" && "Cached Grounding"}
                    {entry.source.type === "kb" && `KB: ${entry.source.ref}`}
                  </span>
                </div>

                {/* Claim Text */}
                <p className="text-xs text-slate-200 leading-snug line-clamp-2">
                  {entry.claim_text}
                </p>

                {/* Verbatim Quote if available */}
                {entry.source.quote && (
                  <blockquote className="mt-1 text-[11px] text-slate-400 border-l border-slate-700 pl-1.5 italic font-mono line-clamp-1">
                    &quot;{entry.source.quote}&quot;
                  </blockquote>
                )}

                {/* Footer: Persona dot + Confidence bar */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    {entry.persona && (
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: personaColor }}
                        title={`Assigned to ${entry.persona} investor`}
                      />
                    )}
                    <span className="capitalize">{entry.persona || "General"}</span>
                  </div>

                  {/* Confidence mini bar */}
                  <div className="flex items-center gap-1">
                    <span>Conf:</span>
                    <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          entry.confidence >= 0.7
                            ? "bg-emerald-500"
                            : entry.confidence >= 0.4
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.round(entry.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono">{Math.round(entry.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </aside>
  );
};
