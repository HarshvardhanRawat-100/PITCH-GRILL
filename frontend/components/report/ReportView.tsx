"use client";

import React from "react";
import type { Deal, Finding, Persona, SourceRef, Status } from "@/contracts/types";
import {
  AlertTriangle,
  ExternalLink,
  Calculator,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Brain,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Database,
  Flame,
} from "lucide-react";

interface ReportViewProps {
  deal: Deal;
  onJumpToGrill?: (findingId: string) => void;
}

const PERSONA_STYLES: Record<Persona, { border: string; bg: string; text: string; name: string; emoji: string }> = {
  finance: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
    text: "text-amber-400",
    name: "Finance Investor",
    emoji: "💰",
  },
  market: {
    border: "border-blue-500/40",
    bg: "bg-blue-950/20",
    text: "text-blue-400",
    name: "Market Investor",
    emoji: "📈",
  },
  tech: {
    border: "border-purple-500/40",
    bg: "bg-purple-950/20",
    text: "text-purple-400",
    name: "Technical Investor",
    emoji: "🛠️",
  },
};

const STATUS_CHIPS: Record<Status, { label: string; className: string; icon: React.ReactNode }> = {
  verified: {
    label: "Verified",
    className: "bg-emerald-950/70 border-emerald-800/50 text-emerald-300",
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  },
  contradicted: {
    label: "Contradicted",
    className: "bg-red-950/70 border-red-800/50 text-red-300",
    icon: <XCircle className="w-3 h-3 text-red-400" />,
  },
  unverified: {
    label: "Unverified",
    className: "bg-amber-950/70 border-amber-800/50 text-amber-300",
    icon: <HelpCircle className="w-3 h-3 text-amber-400" />,
  },
  assumed: {
    label: "Assumed",
    className: "bg-purple-950/70 border-purple-800/50 text-purple-300",
    icon: <Brain className="w-3 h-3 text-purple-400" />,
  },
};

function renderSourceChip(source: SourceRef, idx: number) {
  const isWeb = source.type === "web";
  const isUrl = source.ref.startsWith("http://") || source.ref.startsWith("https://");

  let icon = <BookOpen className="w-3 h-3 text-purple-400" />;
  if (isWeb) icon = <ExternalLink className="w-3 h-3 text-blue-400" />;
  else if (source.type === "calc") icon = <Calculator className="w-3 h-3 text-amber-400" />;
  else if (source.type === "inference") icon = <Brain className="w-3 h-3 text-gray-400" />;
  else if (source.type === "kb") icon = <Database className="w-3 h-3 text-emerald-400" />;

  const content = (
    <span
      key={idx}
      title={source.quote ? `Quote: "${source.quote}"` : undefined}
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface border border-border text-gray-300 font-mono transition-colors ${
        isWeb && isUrl ? "hover:border-blue-500 hover:text-blue-300" : ""
      }`}
    >
      {icon}
      <span className="truncate max-w-[200px]">{source.ref}</span>
    </span>
  );

  if (isWeb && isUrl) {
    return (
      <a
        key={idx}
        href={source.ref}
        target="_blank"
        rel="noopener noreferrer"
        className="focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
      >
        {content}
      </a>
    );
  }

  return content;
}

export function ReportView({ deal, onJumpToGrill }: ReportViewProps) {
  const allFindings = deal.reports.flatMap((r) => r.findings);
  const criticalIssues = allFindings.filter((f) => f.severity === "critical").slice(0, 3);
  const missingDataItems = deal.deck?.missing_data ?? [];

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Top 3 Critical Issues Banner */}
      {criticalIssues.length > 0 && (
        <section
          aria-label="Critical Issues Banner"
          className="bg-red-950/30 border border-red-800/60 rounded-xl p-5 space-y-3.5 print:bg-white print:border-red-600 print:text-black"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Top Critical Red Flags (Fatal Diligence Flaws)</span>
            </div>
            <span className="text-[11px] font-mono text-red-400/80">
              Must be defended in the Grill Room
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {criticalIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-surface rounded-lg p-3.5 border border-border/80 flex flex-col justify-between gap-2.5 hover:border-red-800/50 transition-colors print:bg-gray-50 print:border-gray-300"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-red-400 font-bold">{issue.id}</span>
                    <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-red-950/80 border border-red-800/60 text-red-300 font-mono font-semibold">
                      {issue.persona}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-gray-200 line-clamp-2 print:text-black">
                    {issue.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                  <span className="text-gray-400 font-mono capitalize">
                    {issue.status}
                  </span>
                  {onJumpToGrill && (
                    <button
                      onClick={() => onJumpToGrill(issue.id)}
                      className="text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1 hover:underline print:hidden"
                    >
                      <span>Defend</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Missing-Data Checklist Banner */}
      {missingDataItems.length > 0 && (
        <section
          aria-label="Missing Data Checklist"
          className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-5 space-y-3 print:bg-white print:border-amber-600 print:text-black"
        >
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Missing Data Checklist (Investor Gap Analysis)</span>
          </div>
          <p className="text-xs text-gray-400 print:text-gray-700">
            Critical diligence disclosures expected by institutional investors that were absent or flagged in the deck:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {missingDataItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-gray-300 bg-surface/80 p-2.5 rounded-lg border border-border/60 print:bg-gray-50 print:text-black"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span className="leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reports per Persona */}
      <div className="space-y-6 print:space-y-4">
        {deal.reports.map((report) => {
          const style = PERSONA_STYLES[report.persona] || PERSONA_STYLES.finance;

          return (
            <section
              key={report.persona}
              className="bg-surface rounded-xl border border-border overflow-hidden print:bg-white print:border-gray-400 print:text-black"
            >
              {/* Persona Section Header */}
              <div className={`p-4 border-b border-border flex items-center justify-between ${style.bg} print:bg-gray-100`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{style.emoji}</span>
                  <div>
                    <h3 className="font-bold text-base text-white print:text-black">
                      {style.name} Red-Team Report
                    </h3>
                    <p className="text-xs text-gray-400 capitalize print:text-gray-600">
                      Objective {report.persona} diligence audit
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-mono px-2.5 py-1 rounded bg-surface-elevated border border-border print:bg-white">
                  {report.findings.length} findings
                </span>
              </div>

              {/* Persona Headline */}
              <div className="p-4 bg-surface-elevated/40 border-b border-border text-xs text-gray-300 italic print:bg-gray-50 print:text-gray-800">
                &ldquo;{report.headline}&rdquo;
              </div>

              {/* Findings Cards List */}
              <div className="p-4 space-y-4">
                {report.findings.map((f: Finding) => {
                  const statusMeta = STATUS_CHIPS[f.status] || STATUS_CHIPS.unverified;

                  return (
                    <article
                      key={f.id}
                      className="p-4 rounded-lg bg-surface-elevated border border-border space-y-3.5 hover:border-gray-600 transition-colors print:bg-white print:border-gray-300"
                    >
                      {/* Finding Title & Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-gray-400 bg-surface px-1.5 py-0.5 rounded border border-border print:text-gray-700">
                            {f.id}
                          </span>
                          <h4 className="text-sm font-semibold text-white print:text-black">
                            {f.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Severity Chip */}
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                              f.severity === "critical"
                                ? "bg-red-950 text-red-400 border-red-800/50"
                                : f.severity === "major"
                                ? "bg-amber-950 text-amber-400 border-amber-800/50"
                                : "bg-blue-950 text-blue-400 border-blue-800/50"
                            }`}
                          >
                            {f.severity}
                          </span>

                          {/* Status Chip */}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${statusMeta.className}`}
                          >
                            {statusMeta.icon}
                            <span>{statusMeta.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Detail Text */}
                      <p className="text-xs text-gray-300 leading-relaxed print:text-gray-800">
                        {f.detail}
                      </p>

                      {/* Missing Proof Warning if present */}
                      {f.missing_proof && (
                        <div className="bg-red-950/20 border border-red-800/30 rounded p-2.5 text-[11px] text-red-300 flex items-start gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Missing Proof:</strong> {f.missing_proof}
                          </span>
                        </div>
                      )}

                      {/* Sources and Action Footer */}
                      <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                        {/* Sources */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-gray-500 font-mono">Sources:</span>
                          {f.sources.length > 0 ? (
                            f.sources.map((s, idx) => renderSourceChip(s, idx))
                          ) : (
                            <span className="text-[11px] text-gray-500 italic">None cited</span>
                          )}
                        </div>

                        {/* Jump to Grill Button */}
                        {onJumpToGrill && (
                          <button
                            onClick={() => onJumpToGrill(f.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-red-500/60 text-xs font-medium text-gray-200 hover:text-white transition-all shadow-sm print:hidden group"
                          >
                            <Flame className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                            <span>Jump to Grill</span>
                          </button>
                        )}
                      </div>

                      {/* Key Diligence Question */}
                      <div className="bg-surface/60 rounded p-2 text-[11px] text-gray-400 border border-border/40 italic print:bg-gray-50 print:text-gray-700">
                        <strong className="text-gray-300 not-italic mr-1">Interrogation Question:</strong>
                        &ldquo;{f.question}&rdquo;
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
