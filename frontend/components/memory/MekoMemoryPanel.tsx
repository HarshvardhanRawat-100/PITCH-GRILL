"use client";

import React, { useState } from "react";
import { MemoryRecord, MekoStatus, Persona } from "../../../contracts/types";

interface MekoMemoryPanelProps {
  dealId: string;
  records: MemoryRecord[];
  status?: MekoStatus | null;
  onSearchQuery?: (q: string) => Promise<MemoryRecord | null>;
  lastTurnId?: string | null;
}

const KIND_ICONS: Record<string, { icon: string; label: string }> = {
  memory_add: { icon: "📥", label: "Write" },
  memory_recall: { icon: "🔍", label: "Recall" },
  kb_search: { icon: "📚", label: "KB Search" },
  trace: { icon: "⏱️", label: "Trace" },
  promote: { icon: "🌟", label: "Promote" },
  forget: { icon: "🗑️", label: "Forget" },
};

const PERSONA_COLORS: Record<Persona, string> = {
  finance: "#F59E0B",
  market: "#3B82F6",
  tech: "#A855F7",
};

export const MekoMemoryPanel: React.FC<MekoMemoryPanelProps> = ({
  dealId,
  records = [],
  status,
  onSearchQuery,
  lastTurnId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MemoryRecord | null>(null);
  const [expandedHits, setExpandedHits] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedHits((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAskMemory = async (queryText: string) => {
    if (!queryText.trim() || !onSearchQuery) return;
    try {
      setSearching(true);
      const res = await onSearchQuery(queryText);
      setSearchResult(res);
    } finally {
      setSearching(false);
    }
  };

  // Newest first
  const sortedRecords = [...records].reverse();

  // Find last promoted lesson for the Shared Knowledge mini-section (Prompt 4.8)
  const lastPromoted = records.filter((r) => r.kind === "promote").slice(-1)[0];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      {/* Header with Meko Status & Hub Link */}
      <div className="p-4 rounded-[14px] bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold flex items-center gap-2 font-mono">
              <span>Yugabyte Meko Shared Deal Memory</span>
              <span className="text-xs px-2 py-0.5 rounded-[6px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Sponsor Track
              </span>
            </h1>

            {status?.mode === "live" ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                Live MCP Connected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950 text-amber-400 border border-amber-800">
                Local Fallback Active
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1 font-mono">
            Calls: <b>{status?.calls_made || 0}</b> / {status?.call_budget || 200} budget ·{" "}
            {status?.note || "Shared agent memory across Finance, Market & Tech personas"}
          </p>
        </div>

        {status?.mode === "live" && (
          <a
            href="https://cloud.mekodata.ai"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-[8px] text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 font-mono shadow-sm"
          >
            <span>Open Trace in Meko Observe</span>
            <span>↗</span>
          </a>
        )}
      </div>

      {/* Ask The Memory Search Box (Prompt 4.8) */}
      <div className="p-4 rounded-[14px] bg-slate-900/80 border border-slate-800 space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
          Ask The Deal Memory
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAskMemory(searchQuery)}
            placeholder="Search recalled findings, concessions, or decisions across investors..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-[8px] px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            onClick={() => handleAskMemory(searchQuery)}
            disabled={searching}
            className="px-4 py-1.5 rounded-[8px] text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 transition font-mono shadow-sm"
          >
            {searching ? "Recalling..." : "Ask"}
          </button>
        </div>

        {/* Demo Preset Chip */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Demo Preset:</span>
          <button
            onClick={() => {
              setSearchQuery("What did the founder concede about CAC?");
              handleAskMemory("What did the founder concede about CAC?");
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-mono transition"
          >
            &quot;What did the founder concede about CAC?&quot;
          </button>
        </div>

        {/* Search Result Box if available */}
        {searchResult && (
          <div className="mt-3 p-3 rounded bg-slate-950 border border-purple-900/60 text-xs space-y-2">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Recalled Memory Result ({searchResult.latency_ms || 12} ms)</span>
              <span
                className={`px-1.5 py-0.2 rounded ${
                  searchResult.source === "meko_live"
                    ? "text-emerald-400 bg-emerald-950"
                    : "text-amber-400 bg-amber-950"
                }`}
              >
                {searchResult.source}
              </span>
            </div>
            {searchResult.hits.length > 0 ? (
              <div className="space-y-1.5">
                {searchResult.hits.map((hit, i) => (
                  <div key={i} className="p-2 rounded bg-slate-900 text-slate-200 border-l-2 border-purple-500">
                    {hit}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">No direct semantic matches found for query.</p>
            )}
          </div>
        )}
      </div>

      {/* Shared Knowledge Mini-Section (Proof of promote -> read round-trip) */}
      {lastPromoted && (
        <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <span>🌟</span>
              <span>Shared Knowledge (Promoted Lesson)</span>
            </span>
            <span className="text-[10px] text-slate-400">Gated by policy.py (Zero PII / No company names)</span>
          </div>
          <p className="text-xs text-slate-200 bg-slate-950/80 p-2.5 rounded font-mono border border-slate-800">
            {lastPromoted.text}
          </p>
        </div>
      )}

      {/* Live Memory Stream Feed */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
          <span>Live Deal Audit Trail & Memory Feed</span>
          <span className="text-xs text-slate-400 font-normal">
            {records.length} interactions logged
          </span>
        </h2>

        {records.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded bg-slate-900 border border-slate-800">
            Meko memory stores findings, defenses, and concessions across investor agents so reasoning is shared and auditable.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedRecords.map((rec) => {
              const kindMeta = KIND_ICONS[rec.kind] || { icon: "📝", label: rec.kind };
              const personaColor = rec.persona ? PERSONA_COLORS[rec.persona] : "#9CA3AF";
              const isRecentTurn = lastTurnId && rec.text.includes(lastTurnId);

              return (
                <div
                  key={rec.id}
                  className={`p-3 rounded-lg bg-slate-900 border transition-all ${
                    isRecentTurn
                      ? "border-purple-500 shadow-lg shadow-purple-950/30"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{kindMeta.icon}</span>
                      <span className="font-mono font-medium text-slate-300">
                        {kindMeta.label}
                      </span>
                      {rec.persona && (
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: personaColor }}
                          title={rec.persona}
                        />
                      )}
                      <span className="font-mono text-[10px] text-slate-500">{rec.id}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      {rec.latency_ms !== null && rec.latency_ms !== undefined && (
                        <span className="text-slate-400">{rec.latency_ms} ms</span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          rec.source === "meko_live"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                            : "bg-amber-950 text-amber-400 border border-amber-800/60"
                        }`}
                      >
                        {rec.source === "meko_live" ? "Live" : "Local Fallback"}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          rec.status === "ok"
                            ? "text-slate-400"
                            : rec.status === "pending"
                            ? "text-blue-400 animate-pulse"
                            : "text-rose-400"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </div>

                  {/* Main Memory Text */}
                  <p className="text-xs text-slate-200 leading-snug">{rec.text}</p>

                  {/* Expandable Hits for Recall or KB searches */}
                  {rec.hits && rec.hits.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => toggleExpand(rec.id)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1"
                      >
                        <span>{expandedHits[rec.id] ? "▾ Hide" : "▸ Show"} {rec.hits.length} Recalled Hits</span>
                      </button>
                      {expandedHits[rec.id] && (
                        <div className="mt-1.5 space-y-1 pl-2 border-l border-purple-800/60 text-[11px] text-slate-300 font-mono">
                          {rec.hits.map((h, idx) => (
                            <div key={idx} className="bg-slate-950 p-1.5 rounded">
                              {h}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
