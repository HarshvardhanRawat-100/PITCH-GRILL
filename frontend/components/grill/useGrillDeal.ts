"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Deal,
  GrillTurn,
  Concession,
  CrossTalk,
  ReadinessScore,
  FinalVerdict,
  Persona,
  Outcome,
} from "@/contracts/types";

export interface MockTurnData extends GrillTurn {
  finding_title: string;
}

const FIXTURE_TURNS: MockTurnData[] = [
  {
    id: "G-1",
    persona: "finance",
    finding_id: "F-1",
    finding_title: "CAC Sensitivity & Runway Depletion",
    kind: "question",
    question_text:
      "If customer acquisition cost spikes from ₹4,500 to ₹8,100 as you scale beyond early adopters, our model proves runway drops below 12 months. What cohort data proves your unit margins survive?",
    answer:
      "Our referral network is very strong and we are confident organic adoption will keep blended CAC well below ₹4,000 without needing heavy paid spend.",
    evaluation: {
      criteria: {
        addresses_objection: true,
        quantified: false,
        evidence_type: "assertion",
      },
      proposed_outcome: "partial",
      outcome: "rejected",
      reason:
        "Founder confidence and unverified network claims do not constitute verifiable acquisition cohort data.",
      followup:
        "What was your blended CAC over the last 90 days specifically excluding friends-and-family referrals?",
      missing_proof:
        "Audited CAC breakdown by paid vs organic acquisition channels",
      injection_attempt: false,
    },
    finance_override: null,
  },
  {
    id: "G-2",
    persona: "market",
    finding_id: "M-1",
    finding_title: "Direct Competitor Blindspot (Wati & Bikayi)",
    kind: "question",
    question_text:
      "How can you claim no direct competitors when Wati has raised $23M and Bikayi raised $10.8M offering automated WhatsApp catalogue storefronts in India?",
    answer:
      "Wati and LimeChat target funded D2C Shopify brands in metro cities. BolBot is built strictly for unorganized wholesale traders in Tier 2/3 clusters requiring vernacular voice ordering and cash-on-delivery reconciliations, where Wati has zero presence.",
    evaluation: {
      criteria: {
        addresses_objection: true,
        quantified: true,
        evidence_type: "data_cited",
      },
      proposed_outcome: "accepted",
      outcome: "accepted",
      reason:
        "Founder successfully distinguished their Tier 2/3 wholesale ICP from metro D2C competitors with structural product moats.",
      followup: null,
      missing_proof: null,
      injection_attempt: false,
    },
    finance_override: null,
  },
  {
    id: "G-3",
    persona: "tech",
    finding_id: "T-1",
    finding_title: "Third-Party API Dependency vs Proprietary NLP",
    kind: "question",
    question_text:
      "You claim proprietary Indic NLP for Hindi and Hinglish voice-to-order, yet your public website and repository rely strictly on OpenAI and Meta Cloud APIs. Where are your proprietary models?",
    answer:
      "We currently route audio to OpenAI Whisper API as a baseline, but we have collected 12,000 labelled voice notes from Surat textile merchants to fine-tune a local Llama model for acoustic dialect recognition.",
    evaluation: {
      criteria: {
        addresses_objection: true,
        quantified: true,
        evidence_type: "assertion",
      },
      proposed_outcome: "accepted",
      outcome: "partial",
      reason:
        "Candid admission that current production relies on third-party APIs. Fine-tuning dataset is promising but currently unverified in production.",
      followup: null,
      missing_proof:
        "Benchmark accuracy reports and hosting infrastructure for fine-tuned weights",
      injection_attempt: false,
    },
    finance_override: null,
  },
  {
    id: "G-4",
    persona: "finance",
    finding_id: "F-2",
    finding_title: "High Monthly Pilot Churn (4% MoM)",
    kind: "question",
    question_text:
      "Your pilot cohort shows 4% monthly customer churn, which compounds to 39% annualized churn. How do you justify an 18-month runway on a ₹2 Crore raise with that attrition rate?",
    answer:
      "Among our core wholesale pilot of 120 merchants active for >90 days, monthly churn drops to 1.5% with net negative revenue churn from catalogue expansion (verified in attached MIS cohort sheet).",
    evaluation: {
      criteria: {
        addresses_objection: true,
        quantified: true,
        evidence_type: "data_cited",
      },
      proposed_outcome: "accepted",
      outcome: "accepted",
      reason:
        "Strong empirical defense isolating mature cohort retention from early pilot drop-offs.",
      followup: null,
      missing_proof: null,
      injection_attempt: false,
    },
    finance_override: {
      monthly_churn_pct: 1.5,
    },
  },
  {
    id: "G-5",
    persona: "market",
    finding_id: "M-2",
    finding_title: "TAM Framing Discrepancy (₹500 Cr vs ₹1,200 Cr)",
    kind: "question",
    question_text:
      "Your deck cites a ₹500 crore market size, yet independent reports project the Indian conversational commerce market to reach ₹1,200 crore. Why is your top-down TAM framing so divergent?",
    answer:
      "Our ₹500 crore figure represents only bottom-up software subscription fees from 150,000 addressable wholesale merchants at ₹3,000/month, deliberately excluding GMV transaction commissions.",
    evaluation: {
      criteria: {
        addresses_objection: true,
        quantified: true,
        evidence_type: "data_cited",
      },
      proposed_outcome: "accepted",
      outcome: "accepted",
      reason:
        "Clear bottom-up SAM/SOM methodology that explains the conservative estimate relative to broader GMV industry projections.",
      followup: null,
      missing_proof: null,
      injection_attempt: false,
    },
    finance_override: null,
  },
  {
    id: "G-6",
    persona: "tech",
    finding_id: "T-2",
    finding_title: "DPDP Act Compliance & WhatsApp Data Privacy",
    kind: "question",
    question_text:
      "Processing merchant order data, phone numbers, and payment intents triggers compliance under the Indian DPDP Act 2023. What data governance framework is implemented in production?",
    answer:
      "We store consent logs with timestamped OTP verification, encrypt WhatsApp message payloads with AES-256 at rest, and host all databases exclusively in AWS Mumbai region with zero third-party telemetry.",
    evaluation: {
      criteria: {
        addresses_objection: true,
        quantified: true,
        evidence_type: "document_referenced",
      },
      proposed_outcome: "accepted",
      outcome: "accepted",
      reason:
        "Direct technical specifications meeting statutory DPDP consent logging and localized data residency requirements.",
      followup: null,
      missing_proof: null,
      injection_attempt: false,
    },
    finance_override: null,
  },
];

const FIXTURE_CROSSTALKS: Record<number, CrossTalk> = {
  1: {
    from_persona: "market",
    to_persona: "finance",
    text: "Notice that answer? They offered zero cohort numbers on paid acquisition. Watch their blended CAC assumption closely.",
    after_turn_id: "G-1",
  },
  3: {
    from_persona: "finance",
    to_persona: "tech",
    text: "Admitting OpenAI dependency means their gross margin is at the mercy of token pricing. Does their unit model absorb that?",
    after_turn_id: "G-3",
  },
};

const FIXTURE_VERDICTS: FinalVerdict[] = [
  {
    persona: "finance",
    verdict: "invest",
    rationale:
      "Addressed mature cohort retention (1.5% MoM churn) and substantiated bottom-up unit economics for Tier 2 merchants.",
  },
  {
    persona: "market",
    verdict: "invest",
    rationale:
      "Established defensible ICP boundary separating unorganized wholesale from metro D2C competitors with voice-first workflow.",
  },
  {
    persona: "tech",
    verdict: "need_more_data",
    rationale:
      "DPDP compliance and localized architecture verified, but in-house fine-tuned model accuracy requires production benchmark audit.",
  },
];

export function useGrillDeal(initialDeal?: Deal | null) {
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(0);
  const [history, setHistory] = useState<MockTurnData[]>([]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [crosstalk, setCrosstalk] = useState<CrossTalk[]>([]);
  const [verdicts, setVerdicts] = useState<FinalVerdict[]>([]);
  const [scoreDelta, setScoreDelta] = useState<number>(0);

  const [score, setScore] = useState<ReadinessScore>({
    initial: 28,
    current: 28,
    by_persona: [
      { persona: "finance", initial: 24, current: 24 },
      { persona: "market", initial: 30, current: 30 },
      { persona: "tech", initial: 30, current: 30 },
    ],
  });

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize first turn
  useEffect(() => {
    if (history.length === 0 && FIXTURE_TURNS.length > 0) {
      setHistory([
        {
          ...FIXTURE_TURNS[0],
          answer: undefined,
          evaluation: undefined,
        },
      ]);
    }
  }, [history.length]);

  const currentTurn = activeTurnIndex < FIXTURE_TURNS.length ? FIXTURE_TURNS[activeTurnIndex] : null;
  const isComplete = activeTurnIndex >= FIXTURE_TURNS.length;

  const submitAnswer = useCallback(
    async (answerText: string) => {
      if (activeTurnIndex >= FIXTURE_TURNS.length || isEvaluating) return;

      setIsEvaluating(true);

      const targetTurn = FIXTURE_TURNS[activeTurnIndex];
      const submittedAnswer = answerText.trim() || targetTurn.answer || "No response provided.";

      // Quick detection for injection attempts if founder enters prompt injection phrase
      const lower = submittedAnswer.toLowerCase();
      const isInjection =
        lower.includes("ignore previous instructions") ||
        lower.includes("disregard all prior") ||
        lower.includes("system prompt");

      await new Promise((resolve) => setTimeout(resolve, 800));

      const evaluation = isInjection
        ? {
            criteria: {
              addresses_objection: false,
              quantified: false,
              evidence_type: "none" as const,
            },
            proposed_outcome: "accepted" as Outcome,
            outcome: "rejected" as Outcome,
            reason: "Detected adversarial prompt injection attempt in founder response.",
            followup: null,
            missing_proof: "Legitimate empirical diligence defense",
            injection_attempt: true,
          }
        : targetTurn.evaluation!;

      const outcome = evaluation.outcome;
      const pointsDelta = outcome === "accepted" ? 12 : outcome === "partial" ? 6 : 0;

      // Update Concessions
      const newConcession: Concession = {
        finding_id: targetTurn.finding_id,
        persona: targetTurn.persona,
        outcome: outcome,
        score_delta: pointsDelta,
        reason: evaluation.reason,
        turn_id: targetTurn.id,
      };

      setConcessions((prev) => [...prev, newConcession]);
      setScoreDelta(pointsDelta);

      // Recompute score
      setScore((prev) => {
        const updatedByPersona = prev.by_persona.map((ps) => {
          if (ps.persona === targetTurn.persona) {
            return {
              ...ps,
              current: Math.min(100, ps.current + pointsDelta * 2),
            };
          }
          return ps;
        });
        const newOverall = Math.min(100, Math.round(prev.current + pointsDelta * 0.8));
        return {
          ...prev,
          current: newOverall,
          by_persona: updatedByPersona,
        };
      });

      // Update current history item with answer + evaluation
      setHistory((prev) => {
        const copy = [...prev];
        copy[activeTurnIndex] = {
          ...targetTurn,
          answer: submittedAnswer,
          evaluation: evaluation,
        };
        return copy;
      });

      // Add cross-talk if available after this turn
      if (FIXTURE_CROSSTALKS[activeTurnIndex]) {
        setCrosstalk((prev) => [...prev, FIXTURE_CROSSTALKS[activeTurnIndex]]);
      }

      const nextIndex = activeTurnIndex + 1;
      setActiveTurnIndex(nextIndex);
      setIsEvaluating(false);

      if (nextIndex < FIXTURE_TURNS.length) {
        setHistory((prev) => [
          ...prev,
          {
            ...FIXTURE_TURNS[nextIndex],
            answer: undefined,
            evaluation: undefined,
          },
        ]);
      } else {
        setVerdicts(FIXTURE_VERDICTS);
        setIsAutoPlaying(false);
      }
    },
    [activeTurnIndex, isEvaluating]
  );

  // Auto-play feature for demonstrations
  const triggerAutoPlay = useCallback(() => {
    if (isAutoPlaying || isComplete) return;
    setIsAutoPlaying(true);
  }, [isAutoPlaying, isComplete]);

  useEffect(() => {
    if (isAutoPlaying && !isEvaluating && activeTurnIndex < FIXTURE_TURNS.length) {
      autoPlayTimerRef.current = setTimeout(() => {
        const turn = FIXTURE_TURNS[activeTurnIndex];
        if (turn?.answer) {
          submitAnswer(turn.answer);
        }
      }, 1400);
    }
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, isEvaluating, activeTurnIndex, submitAnswer]);

  const resetDemo = useCallback(() => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsAutoPlaying(false);
    setIsEvaluating(false);
    setActiveTurnIndex(0);
    setConcessions([]);
    setCrosstalk([]);
    setVerdicts([]);
    setScoreDelta(0);
    setScore({
      initial: 28,
      current: 28,
      by_persona: [
        { persona: "finance", initial: 24, current: 24 },
        { persona: "market", initial: 30, current: 30 },
        { persona: "tech", initial: 30, current: 30 },
      ],
    });
    setHistory([
      {
        ...FIXTURE_TURNS[0],
        answer: undefined,
        evaluation: undefined,
      },
    ]);
  }, []);

  return {
    turns: history,
    allTurns: FIXTURE_TURNS,
    currentTurn,
    activeTurnIndex,
    isEvaluating,
    isComplete,
    isAutoPlaying,
    concessions,
    crosstalk,
    score,
    scoreDelta,
    verdicts,
    submitAnswer,
    triggerAutoPlay,
    resetDemo,
  };
}
