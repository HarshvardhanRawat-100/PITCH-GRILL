"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DealSSEClient } from "@/lib/sse";
import { Header } from "@/components/shell/Header";
import { ReportView } from "@/components/report/ReportView";
import type { Deal, SSEEvent } from "@/contracts/types";
import {
  FileText,
  DollarSign,
  TrendingUp,
  MessageSquareWarning,
  CheckSquare,
  Award,
  Loader2,
  RefreshCw,
} from "lucide-react";

type TabKey = "report" | "finance" | "market" | "grill" | "dataroom" | "final";

export default function DealPage() {
  const params = useParams();
  const dealId = params?.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("report");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageMessage, setStageMessage] = useState<string>("Initializing war room...");
  const [stageProgress, setStageProgress] = useState<number>(0.05);

  // Hydrate Deal and establish SSE stream
  useEffect(() => {
    if (!dealId) return;

    // 1. Initial fetch
    api.getDeal(dealId)
      .then((data) => {
        setDeal(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // 2. Connect to SSE
    const sse = new DealSSEClient({
      dealId,
      onEvent: (event: SSEEvent) => {
        console.log("SSE Event Received:", event.type, event.data);

        if (event.type === "stage") {
          const st = event.data as any;
          if (st.message) setStageMessage(st.message);
          if (st.progress !== undefined) setStageProgress(st.progress);
        } else if (event.type === "deck") {
          setDeal((prev) => (prev ? { ...prev, deck: event.data as any } : prev));
        } else if (event.type === "finance") {
          setDeal((prev) => (prev ? { ...prev, finance: event.data as any } : prev));
        } else if (event.type === "market") {
          setDeal((prev) => (prev ? { ...prev, market: event.data as any } : prev));
        } else if (event.type === "tech") {
          setDeal((prev) => (prev ? { ...prev, tech: event.data as any } : prev));
        } else if (event.type === "persona_report") {
          const rep = event.data as any;
          setDeal((prev) => {
            if (!prev) return prev;
            const updated = prev.reports.filter((r) => r.persona !== rep.persona);
            return { ...prev, reports: [...updated, rep] };
          });
        } else if (event.type === "score") {
          setDeal((prev) => (prev ? { ...prev, score: event.data as any } : prev));
        } else if (event.type === "ledger") {
          const l = event.data as any;
          setDeal((prev) => (prev ? { ...prev, ledger: l.entries } : prev));
        } else if (event.type === "checklist") {
          const c = event.data as any;
          setDeal((prev) => (prev ? { ...prev, checklist: c.items } : prev));
        } else if (event.type === "done") {
          setStageProgress(1.0);
          setStageMessage("Analysis complete. Ready for interrogation.");
        }
      },
      onError: (err) => {
        console.warn("SSE reconnecting...", err);
      },
    });

    return () => {
      sse.disconnect();
    };
  }, [dealId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-400">Loading due diligence record...</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-red-400">Failed to load deal</h2>
          <p className="text-sm text-gray-400 mt-2">{error || "Deal not found"}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; owner: string }[] = [
    { key: "report", label: "Report", icon: <FileText className="w-4 h-4" />, owner: "P1" },
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
                className="h-full bg-blue-500 transition-all duration-300"
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-surface-elevated text-white border border-border shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-surface/50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.owner !== "P1" && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-gray-500">
                    {tab.owner}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === "report" && <ReportView deal={deal} />}

          {activeTab === "finance" && (
            <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <DollarSign className="w-10 h-10 text-amber-500/50 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-200">Finance Lab (P3 Module)</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                36-month deterministic cash burn simulation, CAC break-point solver, and interactive sensitivity sliders
                mounted by P3.
              </p>
            </div>
          )}

          {activeTab === "market" && (
            <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <TrendingUp className="w-10 h-10 text-blue-500/50 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-200">Market Intel & Tech Signals (P4 Module)</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Tavily live competitor grounding with verified substring citations, TAM validation, and GitHub code
                audits mounted by P4.
              </p>
            </div>
          )}

          {activeTab === "grill" && (
            <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <MessageSquareWarning className="w-10 h-10 text-red-500/50 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-200">Grill Room (P2 Module)</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Interactive hostile investor interrogation loop backed by deterministic anti-sycophancy clamp in code
                and Meko shared recall.
              </p>
            </div>
          )}

          {activeTab === "dataroom" && (
            <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <CheckSquare className="w-10 h-10 text-emerald-500/50 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-200">Data Room Checklist (P3 Module)</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Actionable India-specific diligence checklist (DPDP, GST, MCA, FEMA) dynamically prioritized from
                investor red flags.
              </p>
            </div>
          )}

          {activeTab === "final" && (
            <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <Award className="w-10 h-10 text-purple-500/50 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-200">Final Verdict & Narrative (P2 Module)</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Investment Committee verdicts (Invest / Pass / Need More Data) and refined pitch narrative synthesized
                from verified defenses.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
