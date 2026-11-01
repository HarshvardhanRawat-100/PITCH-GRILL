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
    <header className="w-full border-b border-border bg-[#0B0D14]/95 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Deal Identity */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white font-bold tracking-tight text-lg hover:opacity-95 focus:outline-none rounded transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 via-violet-600 to-indigo-500 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-all">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white">PITCH-GRILL</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-purple-300 uppercase font-semibold">
                War Room
              </span>
            </div>
          </Link>

          {deal && (
            <div className="flex items-center gap-3 pl-4 border-l border-border text-sm">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-elevated border border-border/60 hover:border-border"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Link>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center text-amber-300 font-bold text-xs shadow-sm">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border hover:border-gray-600 text-xs font-medium text-gray-300 hover:text-white transition-all shadow-xs"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>

                <button
                  onClick={handleExportMarkdown}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border hover:border-gray-600 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50 shadow-xs"
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
              <div className="flex items-center gap-2.5 bg-surface-elevated border border-border px-3 py-1.5 rounded-xl">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Readiness</div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {scoreDelta > 0 && <span className="text-emerald-400 font-bold">+{scoreDelta.toFixed(0)}</span>}
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-lg border border-purple-500/40 flex items-center justify-center font-bold font-mono text-sm bg-purple-950/40 text-purple-300 shadow-glow-sm"
                  title={`Readiness score: ${currentScore.toFixed(0)}/100`}
                >
                  {currentScore.toFixed(0)}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-400 rounded-xl hover:bg-surface-elevated transition-colors border border-transparent hover:border-red-900/40"
                title="Delete deal & wipe memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : null}

          {/* New Deal Glowing Action Button */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 shadow-glow transition-all active:scale-95"
          >
            <span>+ New Deal</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
