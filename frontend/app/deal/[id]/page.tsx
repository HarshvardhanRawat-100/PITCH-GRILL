"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDealStore, useDeal, useStageProgress, useReports, usePersonaReport } from "@/lib/store";
import { Header } from "@/components/shell/Header";
import { Footer } from "@/components/shell/Footer";
import { ReportView } from "@/components/report/ReportView";
import FinanceLab from "@/components/finance/FinanceLab";
import DataRoom from "@/components/dataroom/DataRoom";
import { MarketIntel } from "@/components/market/MarketIntel";
import { EvidenceLedger } from "@/components/ledger/EvidenceLedger";
import { MekoMemoryPanel } from "@/components/memory/MekoMemoryPanel";
import { GrillRoom } from "@/components/grill/GrillRoom";
import type { Persona, PersonaReport as PersonaReportType, Verdict } from "@/contracts/types";
import { PERSONA_META } from "@/contracts/types";
import {
  FileText,
  DollarSign,
  TrendingUp,
  MessageSquareWarning,
  CheckSquare,
  Award,
  Loader2,
  RefreshCw,
  Search,
  Calculator,
  Code2,
  AlertCircle,
  Download,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";

type TabKey = "report" | "finance" | "market" | "grill" | "dataroom" | "final";

/* ─── War Room Investor Card ─── */
interface InvestorCardProps {
  persona: Persona;
  report: PersonaReportType | null;
  stageProgress: number;
}

const PERSONA_ACTIVITY: Record<Persona, { icon: React.ReactNode; activity: string }> = {
  finance: { icon: <Calculator className="w-5 h-5" />, activity: "Calculating unit economics…" },
  market: { icon: <Search className="w-5 h-5" />, activity: "Searching the web…" },
  tech: { icon: <Code2 className="w-5 h-5" />, activity: "Inspecting the product…" },
};

function InvestorCard({ persona, report, stageProgress }: InvestorCardProps) {
  const meta = PERSONA_META[persona];
  const activity = PERSONA_ACTIVITY[persona];
  const isAnalyzing = !report && stageProgress < 1.0;
  const isEmpty = !report && stageProgress >= 1.0;

  return (
    <div
      className="relative bg-surface rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:border-purple-500/40 hover:shadow-glow-sm group"
      style={{ borderColor: report ? meta.color + "40" : undefined }}
    >
      {/* Persona Header */}
      <div
        className="px-5 py-4 flex items-center gap-3 border-b border-border"
        style={{ background: `linear-gradient(135deg, ${meta.color}08, ${meta.color}15)` }}
      >
        <span className="text-2xl">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm">{meta.name}</h3>
          <p className="text-xs text-gray-400 capitalize">{persona} perspective</p>
        </div>
        {report && (
          <span className="text-xs font-mono px-2 py-1 rounded-full border border-border bg-surface-elevated text-gray-300">
            {report.findings.length} findings
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 min-h-[160px] flex flex-col justify-center">
        {isAnalyzing && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in">
            {/* Pulsing analysis indicator */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center animate-pulse"
              style={{ background: meta.color + "20", color: meta.color }}
            >
              {activity.icon}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-300">{activity.activity}</p>
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: meta.color, animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: meta.color, animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: meta.color, animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="text-center text-gray-500 text-sm">
            <p>No report generated yet.</p>
          </div>
        )}

        {report && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            {/* Headline */}
            <p className="text-sm text-gray-300 italic leading-relaxed line-clamp-3">
              &ldquo;{report.headline}&rdquo;
            </p>

            {/* Severity breakdown */}
            <div className="flex items-center gap-2 flex-wrap">
              {["critical", "major", "minor"].map((sev) => {
                const count = report.findings.filter((f) => f.severity === sev).length;
                if (count === 0) return null;
                const sevColors: Record<string, string> = {
                  critical: "bg-red-950 text-red-400 border-red-800/40",
                  major: "bg-amber-950 text-amber-400 border-amber-800/40",
                  minor: "bg-blue-950 text-blue-400 border-blue-800/40",
                };
                return (
                  <span
                    key={sev}
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${sevColors[sev]}`}
                  >
                    {count} {sev}
                  </span>
                );
              })}
            </div>

            {/* Top finding preview */}
            {report.findings[0] && (
              <div className="bg-surface-elevated rounded-lg p-3 border border-border/60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] text-gray-500">{report.findings[0].id}</span>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      report.findings[0].severity === "critical"
                        ? "bg-red-950 text-red-400"
                        : report.findings[0].severity === "major"
                        ? "bg-amber-950 text-amber-400"
                        : "bg-blue-950 text-blue-400"
                    }`}
                  >
                    {report.findings[0].severity}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-200 line-clamp-1">
                  {report.findings[0].title}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Placeholder for teammate tabs ─── */
function TabPlaceholder({ title, icon, owner, description }: {
  title: string;
  icon: React.ReactNode;
  owner: string;
  description: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center space-y-3">
      <div className="mx-auto w-10 h-10 opacity-50">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated border border-border text-gray-500">
        {owner}
      </span>
      <p className="text-xs text-gray-500 max-w-md mx-auto">{description}</p>
    </div>
  );
}

/* ─── Skeleton loader ─── */
function DealSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-surface rounded-xl border border-border p-4 space-y-2">
        <div className="h-3 w-48 bg-surface-elevated rounded" />
        <div className="h-1.5 w-full bg-surface-elevated rounded-full" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 w-28 bg-surface-elevated rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-elevated" />
              <div className="space-y-1">
                <div className="h-3 w-24 bg-surface-elevated rounded" />
                <div className="h-2 w-16 bg-surface-elevated rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-surface-elevated rounded" />
              <div className="h-2 w-3/4 bg-surface-elevated rounded" />
              <div className="h-2 w-1/2 bg-surface-elevated rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Deal Page ─── */
export default function DealPage() {
  const params = useParams();
  const dealId = params?.id as string;

  const hydrate = useDealStore((s) => s.hydrate);
  const connectSSE = useDealStore((s) => s.connectSSE);
  const reset = useDealStore((s) => s.reset);
  const deal = useDeal();
  const { message: stageMessage, progress: stageProgress } = useStageProgress();
  const loading = useDealStore((s) => s.loading);
  const error = useDealStore((s) => s.error);

  const financeReport = usePersonaReport("finance");
  const marketReport = usePersonaReport("market");
  const techReport = usePersonaReport("tech");

  const [activeTab, setActiveTab] = useState<TabKey>("report");

  // Hydrate + SSE on mount
  useEffect(() => {
    if (!dealId) return;
    reset();
    hydrate(dealId);
    const disconnect = connectSSE(dealId);
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          <DealSkeleton />
        </main>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500/60 mb-4" />
          <h2 className="text-xl font-bold text-red-400">Failed to load deal</h2>
          <p className="text-sm text-gray-400 mt-2">{error || "Deal not found"}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; owner: string }[] = [
    { key: "report", label: "War Room", icon: <FileText className="w-4 h-4" />, owner: "P1" },
    { key: "finance", label: "Finance Lab", icon: <DollarSign className="w-4 h-4" />, owner: "P3" },
    { key: "market", label: "Market Intel", icon: <TrendingUp className="w-4 h-4" />, owner: "P4" },
    { key: "grill", label: "Grill Room", icon: <MessageSquareWarning className="w-4 h-4 text-red-400" />, owner: "P2" },
    { key: "dataroom", label: "Data Room", icon: <CheckSquare className="w-4 h-4" />, owner: "P3" },
    { key: "final", label: "Final Verdict", icon: <Award className="w-4 h-4" />, owner: "P2" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header deal={deal} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Stage Progress Bar */}
        {stageProgress < 1.0 && (
          <div className="bg-surface rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-400 font-medium flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{stageMessage}</span>
              </span>
              <span className="font-mono text-gray-400">{(stageProgress * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700 ease-out rounded-full"
                style={{ width: `${Math.max(5, stageProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap focus:outline-none ${
                  isActive
                    ? "bg-surface-elevated text-white border border-purple-500/40 shadow-glow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-surface/50 border border-transparent"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.owner !== "P1" && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-gray-500">
                    {tab.owner}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === "report" && (
            <div className="space-y-8">
              {/* War Room: 3 Investor Cards */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Investor War Room — Live Analysis
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InvestorCard persona="finance" report={financeReport} stageProgress={stageProgress} />
                  <InvestorCard persona="market" report={marketReport} stageProgress={stageProgress} />
                  <InvestorCard persona="tech" report={techReport} stageProgress={stageProgress} />
                </div>
              </div>

              {/* Detailed Report View (only shows when reports exist) */}
              {deal.reports.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
                    Detailed Findings
                  </h2>
                  <ReportView
                    deal={deal}
                    onJumpToGrill={(findingId) => {
                      setActiveTab("grill");
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-6">
              <FinanceLab />
            </div>
          )}

          {activeTab === "market" && (
            <div className="space-y-6">
              <MarketIntel
                dealId={deal.id}
                market={deal.market ?? null}
                tech={deal.tech}
                loading={!deal.market && stageProgress < 1.0}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EvidenceLedger entries={deal.ledger} />
                <MekoMemoryPanel dealId={deal.id} records={deal.memory_log} status={deal.meko} />
              </div>
            </div>
          )}

          {activeTab === "grill" && (
            <div className="space-y-6">
              <GrillRoom dealId={deal.id} onFinish={() => setActiveTab("final")} />
            </div>
          )}

          {activeTab === "dataroom" && (
            <div className="space-y-6">
              <DataRoom dealId={deal.id} companyName={deal.deck?.company_name || "BolBot"} />
            </div>
          )}

          {activeTab === "final" && (
            <FinalVerdictSection deal={deal} />
          )}
        </div>
      </main>
    </div>
  );
}

function FinalVerdictSection({ deal }: { deal: ReturnType<typeof useDeal> }) {
  if (!deal) return null;

  const verdicts = deal.verdicts || [];
  const score = deal.score;
  const narrative = deal.narrative;

  const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; icon: React.ReactNode; bg: string; border: string }> = {
    invest: {
      label: "INVEST",
      color: "text-emerald-400",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      bg: "bg-emerald-950/40",
      border: "border-emerald-600/40",
    },
    pass: {
      label: "PASS",
      color: "text-rose-400",
      icon: <XCircle className="w-5 h-5 text-rose-400" />,
      bg: "bg-rose-950/40",
      border: "border-rose-600/40",
    },
    need_more_data: {
      label: "NEED MORE DATA",
      color: "text-amber-400",
      icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
      bg: "bg-amber-950/40",
      border: "border-amber-600/40",
    },
  };

  const downloadExport = () => {
    window.open(`/api/deals/${deal.id}/export.md`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Readiness Score and Export Button */}
      <div className="bg-surface rounded-xl border border-border p-6 flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="text-lg font-bold text-white">Investment Committee Final Verdict</h2>
          </div>
          <p className="text-xs text-gray-400">
            Synthesized across Finance, Market, and Technical personas post-grill evaluation
          </p>
        </div>

        <div className="flex items-center gap-4">
          {score && (
            <div className="bg-surface-elevated border border-border px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] font-mono text-gray-400 block uppercase">Readiness</span>
              <span className="text-xl font-bold font-mono text-white">
                {Math.round(score.current)} <span className="text-xs text-gray-500">/ 100</span>
              </span>
            </div>
          )}

          <button
            onClick={downloadExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white rounded-xl text-xs font-bold shadow-glow hover:shadow-glow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Diligence (.md)</span>
          </button>
        </div>
      </div>

      {/* 3 Investor Verdict Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["finance", "market", "tech"] as Persona[]).map((p) => {
          const meta = PERSONA_META[p];
          const verdictObj = verdicts.find((v) => v.persona === p);
          const verdictKey = verdictObj?.verdict || "need_more_data";
          const cfg = VERDICT_CONFIG[verdictKey];
          const personaScore = score?.by_persona?.find((s) => s.persona === p);

          return (
            <div
              key={p}
              className={`rounded-xl border p-5 space-y-4 ${cfg.bg} ${cfg.border}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{meta.name}</h3>
                    <span className="text-[10px] text-gray-400 capitalize">{p} Investor</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/80 border border-border">
                  {cfg.icon}
                  <span className={`text-xs font-mono font-bold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-300 leading-relaxed border-t border-border/40 pt-3">
                <p className="italic">
                  {verdictObj?.rationale || `Awaiting final interrogation turn from ${meta.name}...`}
                </p>
              </div>

              {personaScore && (
                <div className="text-[11px] font-mono text-gray-400 pt-1 flex items-center justify-between">
                  <span>Score:</span>
                  <span className="font-bold text-white">{Math.round(personaScore.current)} / 100</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pitch Narrative Refinement */}
      {narrative && (
        <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Refined Pitch Narrative</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-surface-elevated/50 p-4 rounded-xl border border-border/60 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Positioning</span>
              <p className="text-gray-200 font-medium">{narrative.positioning}</p>
            </div>
            <div className="bg-surface-elevated/50 p-4 rounded-xl border border-border/60 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">One Liner</span>
              <p className="text-gray-200 font-medium">{narrative.one_liner}</p>
            </div>
            <div className="bg-surface-elevated/50 p-4 rounded-xl border border-border/60 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">TAM Reframe</span>
              <p className="text-gray-300">{narrative.tam_reframe}</p>
            </div>
            <div className="bg-surface-elevated/50 p-4 rounded-xl border border-border/60 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Narrative Synthesis</span>
              <p className="text-gray-300 whitespace-pre-wrap">{narrative.narrative_md}</p>
            </div>
          </div>
          {narrative.changes && narrative.changes.length > 0 && (
            <div className="border-t border-border pt-3">
              <span className="text-[10px] font-mono text-gray-400 uppercase block mb-2">
                Concessions Incorporated into Pitch Deck:
              </span>
              <ul className="space-y-1 text-xs text-gray-300">
                {narrative.changes.map((ch, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>{ch}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
