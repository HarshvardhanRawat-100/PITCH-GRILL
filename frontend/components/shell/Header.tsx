"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ShieldAlert, Trash2, Printer, Download, Loader2, ChevronLeft } from "lucide-react";
import type { Deal } from "@/contracts/types";

interface HeaderProps {
  deal?: Deal | null;
}

export function Header({ deal }: HeaderProps) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const handleDelete = async () => {
    if (!deal) return;
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
    if (!deal) return;
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

  const initialScore = deal?.score?.initial ?? 50;
  const currentScore = deal?.score?.current ?? initialScore;
  const scoreDelta = currentScore - initialScore;

  return (
    <header className="w-full border-b border-border bg-[#090B10]/95 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Deal Identity */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white font-bold tracking-tight text-lg hover:opacity-95 focus:outline-none rounded-[10px] transition-all group"
          >
            <div className="w-8 h-8 rounded-[10px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] group-hover:shadow-[0_0_18px_rgba(245,158,11,0.35)] transition-all">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white font-mono">PITCH-GRILL</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30 text-amber-300 uppercase font-semibold">
                War Room
              </span>
            </div>
          </Link>

          {deal && (
            <div className="flex items-center gap-3 pl-4 border-l border-border text-sm">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-[8px] hover:bg-surface-elevated border border-border/60 hover:border-border"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Link>
              <div className="w-8 h-8 rounded-[10px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs shadow-sm">
                ⚡
              </div>
              <div>
                <div className="font-bold text-gray-100 text-sm leading-tight">
                  {deal.deck?.company_name || "Diligence Target"}
                </div>
                <div className="font-mono text-[11px] text-gray-400">
                  {deal.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {deal ? (
            <>
              {/* Action buttons: Print & Export */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface-elevated border border-border hover:border-gray-600 text-xs font-medium text-gray-300 hover:text-white transition-all shadow-xs"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>

                <button
                  onClick={handleExportMarkdown}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface-elevated border border-border hover:border-gray-600 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50 shadow-xs"
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

              {/* Score Gauge */}
              <div className="flex items-center gap-2.5 bg-surface-elevated border border-border px-3 py-1.5 rounded-[10px]">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Readiness</div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {scoreDelta > 0 && <span className="text-emerald-400 font-bold">+{scoreDelta.toFixed(0)}</span>}
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-[8px] border border-amber-500/40 flex items-center justify-center font-bold font-mono text-sm bg-amber-500/10 text-amber-300"
                  title={`Readiness score: ${currentScore.toFixed(0)}/100`}
                >
                  {currentScore.toFixed(0)}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-400 rounded-[10px] hover:bg-surface-elevated transition-colors border border-transparent hover:border-red-900/40"
                title="Delete deal & wipe memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : null}

          {/* New Deal Tactical Action Button */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.25)] transition-all active:scale-95 font-mono"
          >
            <span>+ New Deal</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
