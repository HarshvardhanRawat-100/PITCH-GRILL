"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ShieldAlert, Trash2, Printer, Download, Loader2 } from "lucide-react";
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
    <header className="w-full border-b border-border bg-surface/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5 print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Deal Identity */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-bold tracking-tight text-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span>SecondBrain</span>
            <span className="text-xs px-2 py-0.5 rounded bg-red-950/80 border border-red-800/40 text-red-400 uppercase font-mono">
              War Room
            </span>
          </Link>

          {deal && (
            <div className="flex items-center gap-2 pl-4 border-l border-border text-sm">
              <span className="font-semibold text-gray-200">
                {deal.deck?.company_name || "Diligence Run"}
              </span>
              <span className="font-mono text-xs text-gray-500 bg-surface-elevated px-2 py-0.5 rounded border border-border">
                {deal.id}
              </span>
            </div>
          )}
        </div>

        {/* Score Gauge & Actions */}
        {deal && (
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Action buttons: Print & Export */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border hover:border-gray-500 text-xs font-medium text-gray-300 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>

              <button
                onClick={handleExportMarkdown}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border hover:border-gray-500 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">Readiness Score</div>
                <div className="text-xs text-gray-500">
                  Initial: {initialScore.toFixed(0)}
                  {scoreDelta > 0 && <span className="text-emerald-400 font-semibold ml-1">+{scoreDelta.toFixed(0)}</span>}
                </div>
              </div>
              <div
                className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center font-bold font-mono text-base bg-surface-elevated text-emerald-400 shadow-inner"
                title={`Readiness score: ${currentScore.toFixed(0)}/100`}
              >
                {currentScore.toFixed(0)}
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-surface-elevated transition-colors border border-transparent hover:border-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Delete deal & wipe memory"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
