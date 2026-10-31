"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ShieldAlert, Trash2, ArrowLeft } from "lucide-react";
import type { Deal } from "@/contracts/types";

interface HeaderProps {
  deal?: Deal | null;
}

export function Header({ deal }: HeaderProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!deal) return;
    if (confirm("Delete this diligence deal, all uploaded files, and Meko session memory?")) {
      try {
        await api.deleteDeal(deal.id);
        router.push("/");
      } catch (err) {
        alert("Failed to delete deal");
      }
    }
  };

  const initialScore = deal?.score?.initial ?? 50;
  const currentScore = deal?.score?.current ?? initialScore;
  const scoreDelta = currentScore - initialScore;

  return (
    <header className="w-full border-b border-border bg-surface/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Deal Identity */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white font-bold tracking-tight text-lg hover:opacity-90">
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">Readiness Score</div>
                <div className="text-xs text-gray-500">
                  Initial: {initialScore.toFixed(0)}
                  {scoreDelta > 0 && <span className="text-emerald-400 font-semibold ml-1">+{scoreDelta.toFixed(0)}</span>}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center font-bold font-mono text-base bg-surface-elevated text-emerald-400 shadow-inner">
                {currentScore.toFixed(0)}
              </div>
            </div>

            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-surface-elevated transition-colors border border-transparent hover:border-red-900/40"
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
