"use client";

import React from "react";
import type { Evaluation, Persona } from "@/contracts/types";
import { PERSONA_META } from "@/contracts/types";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Scale,
  FileCheck2,
  Info,
} from "lucide-react";

interface EvaluationCardProps {
  persona: Persona;
  evaluation: Evaluation;
  findingId?: string;
}

export function EvaluationCard({ persona, evaluation }: EvaluationCardProps) {
  const meta = PERSONA_META[persona] || {
    name: "Investor",
    color: "#9CA3AF",
    emoji: "👤",
  };

  const isDowngraded =
    evaluation.proposed_outcome &&
    evaluation.proposed_outcome !== evaluation.outcome;

  const outcomeColors = {
    accepted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    partial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    rejected: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const outcomeLabels = {
    accepted: "Accepted (+12 pts)",
    partial: "Partial (+6 pts)",
    rejected: "Rejected (+0 pts)",
  };

  const evidenceLabels = {
    none: "None",
    assertion: "Assertion",
    data_cited: "Data Cited",
    document_referenced: "Document Referenced",
  };

  return (
    <div
      className="mt-3 rounded-xl border p-4 transition-all duration-200"
      style={{
        backgroundColor: "#161926",
        borderColor: "#25293C",
        borderLeft: `4px solid ${meta.color}`,
      }}
    >
      {/* Header with Investor badge & Outcome badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.emoji}</span>
          <span className="text-xs font-semibold text-gray-200">
            {meta.name} Evaluation
          </span>
          {evaluation.injection_attempt && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[11px] font-mono text-rose-300">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Nice try
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              outcomeColors[evaluation.outcome]
            }`}
          >
            {evaluation.outcome === "accepted" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : evaluation.outcome === "partial" ? (
              <Scale className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            {outcomeLabels[evaluation.outcome]}
          </span>
        </div>
      </div>

      {/* Downgraded Alert Banner if clamp adjusted proposal */}
      {isDowngraded && !evaluation.injection_attempt && (
        <div className="mt-3 flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">
              Downgraded: confidence is not evidence.
            </span>{" "}
            <span className="text-gray-300">
              The model proposed {evaluation.proposed_outcome?.toUpperCase()}, but the
              strict factual clamp enforced {evaluation.outcome.toUpperCase()} because
              assertions without auditable backing cannot grant full concession.
            </span>
          </div>
        </div>
      )}

      {/* Criteria Chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
            evaluation.criteria.addresses_objection
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-300 border-rose-500/20"
          }`}
        >
          {evaluation.criteria.addresses_objection ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
          Addresses Objection
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
            evaluation.criteria.quantified
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              : "bg-gray-500/10 text-gray-400 border-gray-600/30"
          }`}
        >
          {evaluation.criteria.quantified ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
          Quantified Metrics
        </span>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
          <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
          Evidence: {evidenceLabels[evaluation.criteria.evidence_type] || evaluation.criteria.evidence_type}
        </span>
      </div>

      {/* Investor Reason */}
      <div className="mt-3 text-xs leading-relaxed text-gray-300 bg-surface/60 p-2.5 rounded-lg border border-border/50">
        <span className="font-semibold text-gray-200">Investor Verdict: </span>
        <span>{evaluation.reason}</span>
      </div>

      {/* Followup Question if any */}
      {evaluation.followup && (
        <div className="mt-2.5 text-xs text-amber-300/90 flex items-start gap-1.5 p-2 rounded bg-amber-500/5 border border-amber-500/20">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-amber-400">Follow-up: </span>
            {evaluation.followup}
          </div>
        </div>
      )}

      {/* Missing proof required for resolution */}
      {evaluation.missing_proof && (
        <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
          <span className="text-gray-500 font-mono">Proof required:</span>
          <span className="text-gray-300 italic">{evaluation.missing_proof}</span>
        </div>
      )}
    </div>
  );
}
