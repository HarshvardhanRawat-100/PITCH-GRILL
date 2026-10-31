"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Sparkles, CornerDownLeft } from "lucide-react";

interface AnswerBoxProps {
  onSubmit: (answer: string) => void;
  isEvaluating: boolean;
  disabled?: boolean;
  suggestedAnswer?: string;
}

const MAX_CHARS = 1500;
const ENABLE_VOICE_INPUT = false; // Feature flag: default OFF

export function AnswerBox({
  onSubmit,
  isEvaluating,
  disabled = false,
  suggestedAnswer,
}: AnswerBoxProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto focus when not disabled
  useEffect(() => {
    if (!disabled && !isEvaluating) {
      textareaRef.current?.focus();
    }
  }, [disabled, isEvaluating]);

  const handleSubmit = () => {
    if (disabled || isEvaluating) return;
    onSubmit(text);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (((e.metaKey || e.ctrlKey) && e.key === "Enter") || (e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFillSuggested = () => {
    if (suggestedAnswer) {
      setText(suggestedAnswer);
    }
  };

  return (
    <div className="relative rounded-2xl bg-surface border border-border p-3.5 shadow-xl transition-all focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/20">
      {/* Quick suggest pill for fast demo replay */}
      {suggestedAnswer && !text && (
        <div className="mb-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleFillSuggested}
            disabled={disabled || isEvaluating}
            className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/20"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Use audited pilot defense (Demo snippet)</span>
          </button>
          <span className="text-[10px] text-gray-500">Press Enter to submit</span>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        disabled={disabled || isEvaluating}
        placeholder={
          disabled
            ? "Interrogation complete. Review final verdicts."
            : isEvaluating
            ? "Investor committee is evaluating your defense..."
            : "Defend your position with verifiable figures, unit cohort data, or DPDP compliance... (Enter to submit, Shift+Enter for newline)"
        }
        rows={3}
        className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
      />

      {/* Footer controls: Mic flag, Character counter, Send button */}
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ENABLE_VOICE_INPUT ? (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded bg-surface-elevated border border-border transition-colors"
            >
              <Mic className="w-3.5 h-3.5 text-red-400" />
              <span>Record Voice</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 text-[11px] text-gray-500 px-2 py-1 rounded bg-surface/80 border border-border/40 cursor-not-allowed select-none"
              title="Voice input flag is disabled (default OFF)"
            >
              <MicOff className="w-3 h-3 text-gray-600" />
              <span>Voice (Flag Off)</span>
            </div>
          )}

          <span className="text-[11px] text-gray-500 font-mono">
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || isEvaluating || (!text.trim() && !suggestedAnswer)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:bg-surface-elevated disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            {isEvaluating ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>Submit Defense</span>
                <CornerDownLeft className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
