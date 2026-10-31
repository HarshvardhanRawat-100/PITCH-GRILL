"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDealStore, useDeal, useStageProgress, useReports, usePersonaReport } from "@/lib/store";
import { Header } from "@/components/shell/Header";
import { Footer } from "@/components/shell/Footer";
import { ReportView } from "@/components/report/ReportView";
import type { Persona, PersonaReport as PersonaReportType } from "@/contracts/types";
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
      className="relative bg-surface rounded-xl border border-border overflow-hidden transition-all duration-500 hover:shadow-lg group"
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

  const { hydrate, connectSSE, reset } = useDealStore();
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
  }, [dealId, hydrate, connectSSE, reset]);

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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActive
                    ? "bg-surface-elevated text-white border border-border shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-surface/50"
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
            <TabPlaceholder
              title="Finance Lab (P3 Module)"
              icon={<DollarSign className="w-10 h-10 text-amber-500/50" />}
              owner="P3"
              description="36-month deterministic cash burn simulation, CAC break-point solver, and interactive sensitivity sliders mounted by P3."
            />
          )}

          {activeTab === "market" && (
            <TabPlaceholder
              title="Market Intel & Tech Signals (P4 Module)"
              icon={<TrendingUp className="w-10 h-10 text-blue-500/50" />}
              owner="P4"
              description="Tavily live competitor grounding with verified substring citations, TAM validation, and GitHub code audits mounted by P4."
            />
          )}

          {activeTab === "grill" && (
            <TabPlaceholder
              title="Grill Room (P2 Module)"
              icon={<MessageSquareWarning className="w-10 h-10 text-red-500/50" />}
              owner="P2"
              description="Interactive hostile investor interrogation loop backed by deterministic anti-sycophancy clamp in code and Meko shared recall."
            />
          )}

          {activeTab === "dataroom" && (
            <TabPlaceholder
              title="Data Room Checklist (P3 Module)"
              icon={<CheckSquare className="w-10 h-10 text-emerald-500/50" />}
              owner="P3"
              description="Actionable India-specific diligence checklist (DPDP, GST, MCA, FEMA) dynamically prioritized from investor red flags."
            />
          )}

          {activeTab === "final" && (
            <TabPlaceholder
              title="Final Verdict & Narrative (P2 Module)"
              icon={<Award className="w-10 h-10 text-purple-500/50" />}
              owner="P2"
              description="Investment Committee verdicts (Invest / Pass / Need More Data) and refined pitch narrative synthesized from verified defenses."
            />
          )}
        </div>
      </main>
    </div>
  );
}
