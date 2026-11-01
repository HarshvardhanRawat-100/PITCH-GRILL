"use client";

import React from "react";
import { useGrillDeal } from "./useGrillDeal";
import { ChatStream } from "./ChatStream";
import { AnswerBox } from "./AnswerBox";
import { PERSONA_META } from "@/contracts/types";
import { Flame, Award, RotateCcw } from "lucide-react";

interface GrillRoomProps {
  dealId?: string;
  onFinish?: () => void;
}

export function GrillRoom({ dealId, onFinish }: GrillRoomProps) {
  const {
    turns,
    crosstalk,
    score,
    scoreDelta,
    currentTurn,
    activeTurnIndex,
    isEvaluating,
    isComplete,
    submitAnswer,
    resetDemo,
  } = useGrillDeal();

  const activePersonaMeta = currentTurn ? PERSONA_META[currentTurn.persona] : null;

  return (
    <div className="space-y-6">
      {/* Grill Header / Status Bar */}
      <div className="bg-surface rounded-[18px] border border-border p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-base font-mono">Investor Grill Room</h2>
              <span className="px-2 py-0.5 rounded-[6px] text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                Turn {Math.min(activeTurnIndex + 1, 6)} of 6
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Hostile panel interrogation with anti-sycophancy clamping & Meko recall
            </p>
          </div>
        </div>

        {/* Readiness Score Badge */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-gray-400">Readiness Score</span>
            <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5 justify-end">
              <span>{Math.round(score.current)}</span>
              <span className="text-xs text-gray-500">/ 100</span>
              {scoreDelta > 0 && (
                <span className="text-xs text-emerald-400 font-bold animate-bounce">
                  +{scoreDelta}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={resetDemo}
            title="Restart Grill Room"
            className="p-2 rounded-[8px] border border-border bg-surface-elevated text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="bg-surface rounded-[18px] border border-border p-4">
        <ChatStream
          turns={turns}
          crosstalk={crosstalk}
          isEvaluating={isEvaluating}
          activeTurnIndex={activeTurnIndex}
        />
      </div>

      {/* Answer Input or Complete Callout */}
      {!isComplete ? (
        <div className="space-y-2">
          {activePersonaMeta && (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
              <span>Active question from</span>
              <span className="font-semibold" style={{ color: activePersonaMeta.color }}>
                {activePersonaMeta.name}
              </span>
              <span>({currentTurn?.persona})</span>
            </div>
          )}
          <AnswerBox
            onSubmit={submitAnswer}
            isEvaluating={isEvaluating}
            suggestedAnswer={currentTurn?.answer ?? undefined}
          />
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Grill Room Completed</h3>
          <p className="text-sm text-gray-300 max-w-lg mx-auto">
            All 6 adversarial turns have been evaluated. Review the updated Readiness Score,
            Evidence Ledger, and Final Investment Committee Verdicts.
          </p>
        </div>
      )}
    </div>
  );
}

export default GrillRoom;
