"use client";

import React from "react";
import type { Deal, Finding, Persona } from "@/contracts/types";
import { AlertTriangle, ExternalLink, Calculator, Sparkles, BookOpen } from "lucide-react";

interface ReportViewProps {
  deal: Deal;
  onJumpToGrill?: (findingId: string) => void;
}

const PERSONA_COLORS: Record<Persona, { border: string; bg: string; text: string }> = {
  finance: { border: "border-amber-500/40", bg: "bg-amber-950/20", text: "text-amber-400" },
  market: { border: "border-blue-500/40", bg: "bg-blue-950/20", text: "text-blue-400" },
  tech: { border: "border-purple-500/40", bg: "bg-purple-950/20", text: "text-purple-400" },
};

export function ReportView({ deal, onJumpToGrill }: ReportViewProps) {
  const allFindings = deal.reports.flatMap((r) => r.findings);
  const criticalIssues = allFindings.filter((f) => f.severity === "critical").slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Top 3 Critical Issues Banner */}
      {criticalIssues.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm tracking-wide uppercase">
            <AlertTriangle className="w-4 h-4" />
            <span>Top Critical Red Flags</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {criticalIssues.map((issue) => (
              <div key={issue.id} className="bg-surface rounded-lg p-3.5 border border-border/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-red-400 font-semibold">{issue.id}</span>
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-mono">
                    {issue.severity}
                  </span>
                </div>
                <div className="text-xs font-semibold text-gray-200 line-clamp-2">{issue.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports per Persona */}
      <div className="space-y-6">
        {deal.reports.map((report) => {
          const style = PERSONA_COLORS[report.persona] || PERSONA_COLORS.finance;

          return (
            <div key={report.persona} className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className={`p-4 border-b border-border flex items-center justify-between ${style.bg}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${style.bg} border ${style.border}`} />
                  <h3 className="font-bold text-base capitalize text-white">
                    {report.persona} Investor Diligence
                  </h3>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {report.findings.length} findings
                </span>
              </div>

              <div className="p-4 bg-surface-elevated/40 border-b border-border text-xs text-gray-300 italic">
                &ldquo;{report.headline}&rdquo;
              </div>

              <div className="p-4 space-y-4">
                {report.findings.map((f: Finding) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-lg bg-surface-elevated border border-border space-y-3 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-400">{f.id}</span>
                        <h4 className="text-sm font-semibold text-white">{f.title}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          f.severity === "critical"
                            ? "bg-red-950 text-red-400 border border-red-800/40"
                            : f.severity === "major"
                            ? "bg-amber-950 text-amber-400 border border-amber-800/40"
                            : "bg-blue-950 text-blue-400 border border-blue-800/40"
                        }`}
                      >
                        {f.severity}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">{f.detail}</p>

                    {/* Sources & Question */}
                    <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {f.sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface border border-border text-gray-400 font-mono"
                          >
                            {s.type === "web" ? (
                              <ExternalLink className="w-3 h-3 text-blue-400" />
                            ) : s.type === "calc" ? (
                              <Calculator className="w-3 h-3 text-amber-400" />
                            ) : (
                              <BookOpen className="w-3 h-3 text-purple-400" />
                            )}
                            <span>{s.ref}</span>
                          </span>
                        ))}
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-gray-500 italic">
                          Q: &ldquo;{f.question.slice(0, 65)}...&rdquo;
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
