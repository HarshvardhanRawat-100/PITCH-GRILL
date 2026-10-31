"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CrossTalk } from "@/contracts/types";
import { PERSONA_META } from "@/contracts/types";
import { EvaluationCard } from "./EvaluationCard";
import { CrossTalkBubble } from "./CrossTalkBubble";
import type { MockTurnData } from "./useGrillDeal";
import { User, ShieldQuestion, Sparkles } from "lucide-react";

interface ChatStreamProps {
  turns: MockTurnData[];
  crosstalk: CrossTalk[];
  isEvaluating: boolean;
  activeTurnIndex: number;
}

export function ChatStream({
  turns,
  crosstalk,
  isEvaluating,
  activeTurnIndex,
}: ChatStreamProps) {
  const streamEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on turns change
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isEvaluating, crosstalk.length]);

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[calc(100vh-320px)] min-h-[460px]">
      {turns.map((turn, index) => {
        const meta = PERSONA_META[turn.persona] || {
          name: turn.persona,
          color: "#9CA3AF",
          emoji: "👤",
        };

        const matchingCrosstalk = crosstalk.find(
          (ct) => ct.after_turn_id === turn.id
        );

        return (
          <div key={turn.id || index} id={`turn-${turn.id}`} className="space-y-4">
            {/* Investor Question Bubble */}
            <div className="flex items-start gap-3 max-w-[90%]">
              {/* Investor Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg border text-base"
                style={{
                  backgroundColor: `${meta.color}15`,
                  borderColor: `${meta.color}40`,
                  boxShadow: `0 0 12px ${meta.color}20`,
                }}
              >
                {meta.emoji}
              </div>

              {/* Question Content */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: meta.color }}
                  >
                    {meta.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-gray-400">
                    Finding {turn.finding_id}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {turn.finding_title}
                  </span>
                </div>

                <div
                  className="rounded-2xl rounded-tl-sm p-4 text-sm text-gray-100 leading-relaxed border shadow-md"
                  style={{
                    backgroundColor: "#151824",
                    borderColor: `${meta.color}25`,
                  }}
                >
                  <p>{turn.question_text}</p>
                </div>
              </div>
            </div>

            {/* Founder Answer Bubble (if submitted) */}
            {turn.answer && (
              <div className="flex items-start justify-end gap-3 pl-8">
                <div className="space-y-1.5 max-w-[85%] text-right">
                  <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                    <span>Founder Defense</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      On Record
                    </span>
                  </div>

                  <div className="rounded-2xl rounded-tr-sm p-4 text-sm text-gray-100 bg-surface-elevated border border-border/80 shadow-md text-left leading-relaxed">
                    <p>{turn.answer}</p>
                  </div>
                </div>

                {/* Founder Avatar */}
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-md">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Evaluation Card (if evaluated) */}
            {turn.evaluation && (
              <div className="pl-6 md:pl-12">
                <EvaluationCard
                  persona={turn.persona}
                  evaluation={turn.evaluation}
                  findingId={turn.finding_id}
                />
              </div>
            )}

            {/* Cross-talk between investors if fired after this turn */}
            {matchingCrosstalk && (
              <CrossTalkBubble crosstalk={matchingCrosstalk} />
            )}
          </div>
        );
      })}

      {/* Evaluating Typing Indicator */}
      {isEvaluating && (
        <div className="flex items-center gap-3 pl-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-xs text-gray-400 animate-pulse">
            <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-surface px-3 py-2 rounded-xl border border-border">
            <span>Evaluating factual validity against evidence clamp</span>
            <span className="flex gap-1 ml-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
            </span>
          </div>
        </div>
      )}

      <div ref={streamEndRef} />
    </div>
  );
}
