"use client";

import React from "react";
import type { CrossTalk } from "@/contracts/types";
import { PERSONA_META } from "@/contracts/types";
import { ArrowRight, MessageSquareDashed } from "lucide-react";

interface CrossTalkBubbleProps {
  crosstalk: CrossTalk;
}

export function CrossTalkBubble({ crosstalk }: CrossTalkBubbleProps) {
  const fromMeta = PERSONA_META[crosstalk.from_persona] || {
    name: crosstalk.from_persona,
    color: "#3B82F6",
    emoji: "👤",
  };
  const toMeta = PERSONA_META[crosstalk.to_persona] || {
    name: crosstalk.to_persona,
    color: "#F59E0B",
    emoji: "👤",
  };

  return (
    <div className="my-4 mx-2 md:mx-6">
      <div
        className="rounded-xl p-3 border border-dashed transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, rgba(26, 29, 43, 0.9) 0%, rgba(18, 20, 29, 0.8) 100%)",
          borderColor: "rgba(156, 163, 175, 0.3)",
        }}
      >
        <div className="flex items-center gap-2 mb-1.5 text-xs font-mono">
          <MessageSquareDashed className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-400">Inter-Investor Sidebar:</span>
          <span
            className="font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]"
            style={{ color: fromMeta.color }}
          >
            {fromMeta.emoji} {fromMeta.name}
          </span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span
            className="font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]"
            style={{ color: toMeta.color }}
          >
            {toMeta.emoji} {toMeta.name}
          </span>
        </div>

        <p className="text-xs italic text-gray-300 pl-5 border-l-2 border-gray-600/60 py-0.5">
          &ldquo;{crosstalk.text}&rdquo;
        </p>
      </div>
    </div>
  );
}
