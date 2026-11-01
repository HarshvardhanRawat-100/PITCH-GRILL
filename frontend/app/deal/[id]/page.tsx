"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDealStore, useDeal, useStageProgress, useReports, usePersonaReport } from "@/lib/store";
import { api } from "@/lib/api";
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
  ShieldAlert,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
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
  const router = useRouter();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      <div className="min-h-screen flex flex-col bg-[#090B10]">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          <DealSkeleton />
        </main>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen flex flex-col bg-[#090B10]">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500/60 mb-4" />
          <h2 className="text-xl font-bold text-red-400 font-mono">Failed to load deal</h2>
          <p className="text-sm text-gray-400 mt-2 font-mono">{error || "Deal not found"}</p>
        </div>
      </div>
    );
  }

  // Count findings & metrics
  const totalFindings = deal.reports.reduce((acc, r) => acc + (r.findings?.length || 0), 0);
  const initialScore = deal?.score?.initial ?? 50;
  const currentScore = deal?.score?.current ?? initialScore;
  const scoreDelta = currentScore - initialScore;

  const handleDelete = async () => {
    if (confirm("Delete this diligence deal, all uploaded files, and Meko session memory?")) {
      try {
        await api.deleteDeal(deal.id);
        router.push("/");
      } catch {
        alert("Failed to delete deal");
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const md = await api.getExportMarkdown(deal.id);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const company = (deal.deck?.company_name || deal.id).replace(/[^a-zA-Z0-9_-]/g, "_");
      link.href = url;
      link.download = `${company}_due_diligence_report.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export markdown report");
    } finally {
      setExporting(false);
    }
  };

  const navGroups: {
    title: string;
    items: {
      key: TabKey;
      label: string;
      icon: React.ReactNode;
      badge?: string | number;
      badgeVariant?: string;
    }[];
  }[] = [
    {
      title: "DILIGENCE INTELLIGENCE",
      items: [
        {
          key: "report",
          label: "War Room",
          icon: <FileText className="w-4 h-4" />,
          badge: totalFindings > 0 ? totalFindings : undefined,
          badgeVariant: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        },
        {
          key: "finance",
          label: "Finance Lab",
          icon: <DollarSign className="w-4 h-4 text-amber-400" />,
          badge: "Sim",
          badgeVariant: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        },
        {
          key: "market",
          label: "Market Intel",
          icon: <TrendingUp className="w-4 h-4 text-blue-400" />,
          badge: "Live",
          badgeVariant: "bg-blue-500/10 text-blue-300 border-blue-500/20",
        },
        {
          key: "grill",
          label: "Grill Room",
          icon: <MessageSquareWarning className="w-4 h-4 text-rose-400" />,
          badge: "Defense",
          badgeVariant: "bg-rose-950/60 text-rose-300 border-rose-800/40",
        },
      ],
    },
    {
      title: "EVIDENCE & AUDIT",
      items: [
        {
          key: "dataroom",
          label: "Data Room",
          icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
          badge: "Checklist",
          badgeVariant: "bg-purple-950/50 text-purple-300 border-purple-800/30",
        },
        {
          key: "final",
          label: "Final Verdict",
          icon: <Award className="w-4 h-4 text-amber-400" />,
          badge: deal.verdicts?.length ? "Ready" : undefined,
          badgeVariant: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        },
      ],
    },
  ];

  const activeTabLabel =
    navGroups
      .flatMap((g) => g.items)
      .find((i) => i.key === activeTab)?.label || "War Room";

  return (
    <div className="min-h-screen flex bg-[#090B10] text-gray-100 font-sans">
      {/* ─── Efferd-Style Collapsible Left Sidebar ─── */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-[#0C0E15]/95 backdrop-blur-md transition-all duration-300 shrink-0 sticky top-0 h-screen z-40 select-none ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="h-16 border-b border-border px-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 text-white font-bold tracking-tight hover:opacity-95 transition-all overflow-hidden"
          >
            <div className="w-9 h-9 rounded-[10px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold tracking-tight text-white font-mono text-sm">PITCH-GRILL</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400/80 uppercase font-semibold mt-0.5">
                  War Room AI
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-[8px] text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-gray-400 hover:text-amber-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-gray-400 hover:text-amber-400" />
            )}
          </button>
        </div>

        {/* Current Deal Target Card */}
        <div className="p-3 border-b border-border/60">
          {!sidebarCollapsed ? (
            <div className="bg-surface rounded-[12px] p-2.5 border border-border/80 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                ⚡
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-200 truncate">
                  {deal.deck?.company_name || "Diligence Target"}
                </div>
                <div className="text-[10px] font-mono text-gray-500 truncate">
                  ID: {deal.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="w-10 h-10 mx-auto rounded-[10px] bg-surface border border-border/80 flex items-center justify-center text-amber-400 text-xs font-bold"
              title={`${deal.deck?.company_name || "Diligence Target"} (${deal.id.slice(0, 8)})`}
            >
              ⚡
            </div>
          )}
        </div>

        {/* Navigation Group Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveTab(item.key)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-xs font-medium tracking-tight transition-all duration-150 text-left ${
                        isActive
                          ? "bg-amber-500/15 border border-amber-500/35 text-white shadow-[0_0_12px_rgba(245,158,11,0.1)] font-semibold"
                          : "text-gray-400 hover:text-gray-200 hover:bg-surface border border-transparent"
                      }`}
                    >
                      <div className={`shrink-0 ${isActive ? "text-amber-400" : "text-gray-400"}`}>
                        {item.icon}
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-[6px] border ${
                                item.badgeVariant || "bg-surface border-border text-gray-400"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* System & Memory Telemetry Card */}
        <div className="p-3 border-t border-border bg-[#0A0C12]/80 space-y-2">
          {!sidebarCollapsed ? (
            <div className="space-y-1.5 text-[11px] font-mono text-gray-400">
              <div className="flex items-center justify-between px-2 py-1 rounded-[8px] bg-surface/60 border border-border/50">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Gemini 2.5</span>
                </span>
                <span className="text-[10px] text-emerald-400">Ready</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded-[8px] bg-surface/60 border border-border/50">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      deal.meko?.mode === "live" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span>Meko Memory</span>
                </span>
                <span
                  className={`text-[10px] ${
                    deal.meko?.mode === "live" ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {deal.meko?.mode === "live" ? "Live" : "Local"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Gemini 2.5 Live" />
              <span
                className={`w-2 h-2 rounded-full ${deal.meko?.mode === "live" ? "bg-emerald-400" : "bg-amber-400"}`}
                title={`Meko: ${deal.meko?.mode || "local"}`}
              />
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Content Canvas Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / Breadcrumb & Action Bar */}
        <header className="h-16 border-b border-border bg-[#090B10]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 print:hidden">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 md:hidden rounded-[8px] text-gray-400 hover:text-white bg-surface border border-border"
              title="Toggle sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <Link href="/" className="hover:text-amber-400 transition-colors">
                Deals
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-gray-200 font-bold max-w-[140px] sm:max-w-xs truncate">
                {deal.deck?.company_name || "Diligence Target"}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-amber-400 font-bold px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30">
                {activeTabLabel}
              </span>
            </div>
          </div>

          {/* Quick Search & Top Actions */}
          <div className="flex items-center gap-3">
            {/* Command search box preview */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-surface-elevated/70 border border-border/80 text-xs text-gray-400 font-mono">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <span>Search findings & metrics...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-gray-400">
                ⌘K
              </kbd>
            </div>

            {/* Print / Export Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface border border-border hover:border-gray-500 text-xs font-mono text-gray-300 hover:text-white transition-all shadow-xs"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={handleExportMarkdown}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface border border-border hover:border-gray-500 text-xs font-mono text-gray-300 hover:text-white transition-all disabled:opacity-50 shadow-xs"
                title="Download full Markdown diligence report"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline">Export .md</span>
              </button>
            </div>

            {/* Readiness Score Chip */}
            <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-[10px]">
              <div className="text-right hidden sm:block">
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-mono">Readiness</div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {scoreDelta > 0 && <span className="text-emerald-400 font-bold">+{scoreDelta.toFixed(0)}</span>}
                </div>
              </div>
              <div
                className="w-8 h-8 rounded-[8px] border border-amber-500/40 flex items-center justify-center font-bold font-mono text-sm bg-amber-500/10 text-amber-300"
                title={`Pitch Readiness Score: ${currentScore.toFixed(0)} / 100`}
              >
                {currentScore.toFixed(0)}
              </div>
            </div>

            {/* Delete Deal Button */}
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-400 rounded-[10px] hover:bg-surface transition-colors border border-transparent hover:border-red-900/40"
              title="Delete deal & wipe session memory"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* + New Deal Action */}
            <Link
              href="/"
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-[10px] text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all font-mono"
            >
              <span>+ New</span>
            </Link>
          </div>
        </header>

        {/* Mobile Horizontal Tabs Bar (when sidebar is hidden on small screens) */}
        <div className="md:hidden flex items-center gap-2 border-b border-border bg-[#0A0C12] p-3 overflow-x-auto">
          {navGroups
            .flatMap((g) => g.items)
            .map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium whitespace-nowrap border ${
                    isActive
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-surface border-border text-gray-400"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Stage Progress Bar */}
          {stageProgress < 1.0 && (
            <div className="bg-surface rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-blue-400 font-medium flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{stageMessage}</span>
                </span>
                <span className="text-gray-400">{(stageProgress * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700 ease-out rounded-[4px]"
                  style={{ width: `${Math.max(5, stageProgress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Active Tab View */}
          <div>
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
        <Footer />
      </div>
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
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-[10px] text-xs font-bold shadow-[0_0_18px_rgba(245,158,11,0.25)] transition-all font-mono"
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
