"use client";

import React, { useEffect, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import type { FinanceResult } from "@/contracts/types";

interface FormulaDrawerProps {
  displayedResult: FinanceResult | null;
  mode: "hold_growth" | "hold_spend";
  setMode: (m: "hold_growth" | "hold_spend") => void;
}

export function FormulaDrawer({
  displayedResult,
  mode,
  setMode,
}: FormulaDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const formulas = displayedResult?.formulas || [];
  const assumptions = displayedResult?.assumptions_used || [];

  // Close on Escape & return focus to trigger button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-xs font-semibold bg-surface-elevated border border-amber-500/30 text-amber-300 hover:text-white hover:border-amber-500 shadow-sm transition-all font-mono"
      >
        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
        <span>Deterministic Equations</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md transition-opacity"
          onClick={handleClose}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="How the finance model works"
            className="w-full max-w-lg h-full bg-[#0E111C] border-l border-border p-6 shadow-2xl overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-glow-sm" />
                <span>Deterministic Math Engine</span>
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Toggle Explainer */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
                Acquisition Scaling Mode
              </h4>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-[12px] bg-surface border border-border">
                <button
                  type="button"
                  onClick={() => setMode("hold_growth")}
                  className={`py-2 px-3 rounded-[8px] text-xs font-bold transition-all font-mono ${
                    mode === "hold_growth"
                      ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Hold Growth
                </button>
                <button
                  type="button"
                  onClick={() => setMode("hold_spend")}
                  className={`py-2 px-3 rounded-[8px] text-xs font-bold transition-all font-mono ${
                    mode === "hold_spend"
                      ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Hold Spend
                </button>
              </div>

              <div className="space-y-2 text-xs text-gray-400">
                <p>
                  <strong className="text-gray-200">Hold Growth:</strong> New
                  customers per month stay as planned, so a higher CAC costs
                  more cash.
                </p>
                <p>
                  <strong className="text-gray-200">Hold Spend:</strong> The
                  acquisition budget stays fixed at the baseline CAC, so a
                  higher CAC buys fewer customers.
                </p>
              </div>
            </div>

            {/* Formulas */}
            {formulas.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Engine Governing Equations
                </h4>
                <div className="space-y-1.5 p-3 rounded-lg bg-black/40 border border-border/80 font-mono text-[11px] text-amber-300/90 leading-relaxed overflow-x-auto">
                  {formulas.map((f, i) => (
                    <div key={i} className="py-0.5 whitespace-pre-wrap">
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assumptions used */}
            {assumptions.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Assumptions & Override Log
                </h4>
                <ul className="space-y-1 text-xs text-gray-400 list-disc list-inside">
                  {assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
