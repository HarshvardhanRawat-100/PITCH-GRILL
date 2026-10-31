"use client";

import { create } from "zustand";
import { api, HealthResponse } from "@/lib/api";
import { DealSSEClient } from "@/lib/sse";
import type {
  Deal,
  SSEEvent,
  PersonaReport,
  Persona,
  DealStatus,
} from "@/contracts/types";

/* ─── Types ─── */
export interface StageInfo {
  stage: string;
  message: string;
  progress: number;
}

export interface DealState {
  /* Core state */
  deal: Deal | null;
  loading: boolean;
  error: string | null;
  connected: boolean;

  /* Stage tracking */
  stageMessage: string;
  stageProgress: number;

  /* Health / system status */
  health: HealthResponse | null;

  /* Actions */
  hydrate: (dealId: string) => Promise<void>;
  applyEvent: (event: SSEEvent) => void;
  connectSSE: (dealId: string) => () => void;
  fetchHealth: () => Promise<void>;
  reset: () => void;
}

/* ─── Idempotent event reducer ─── */
function reduceEvent(deal: Deal, event: SSEEvent): Deal {
  switch (event.type) {
    case "deck":
      return { ...deal, deck: event.data as Deal["deck"] };

    case "finance":
      return { ...deal, finance: event.data as Deal["finance"] };

    case "market":
      return { ...deal, market: event.data as Deal["market"] };

    case "tech":
      return { ...deal, tech: event.data as Deal["tech"] };

    case "persona_report": {
      const rep = event.data as PersonaReport;
      const filtered = deal.reports.filter(
        (r) => r.persona !== rep.persona
      );
      return { ...deal, reports: [...filtered, rep] };
    }

    case "score":
      return { ...deal, score: event.data as Deal["score"] };

    case "ledger": {
      const l = event.data as { entries?: Deal["ledger"] };
      return { ...deal, ledger: l.entries || deal.ledger };
    }

    case "checklist": {
      const c = event.data as { items?: Deal["checklist"] };
      return { ...deal, checklist: c.items || deal.checklist };
    }

    case "question": {
      const q = event.data as Deal["grill_turns"][0];
      const exists = deal.grill_turns.some((t) => t.id === q.id);
      if (exists) return deal;
      return { ...deal, grill_turns: [...deal.grill_turns, q] };
    }

    case "evaluation": {
      const ev = event.data as { turn_id: string; evaluation: any };
      return {
        ...deal,
        grill_turns: deal.grill_turns.map((t) =>
          t.id === ev.turn_id ? { ...t, evaluation: ev.evaluation } : t
        ),
      };
    }

    case "concession": {
      const conc = event.data as Deal["concessions"][0];
      const exists = deal.concessions.some(
        (c) => c.turn_id === conc.turn_id
      );
      if (exists) return deal;
      return { ...deal, concessions: [...deal.concessions, conc] };
    }

    case "crosstalk": {
      const ct = event.data as Deal["crosstalk"][0];
      return { ...deal, crosstalk: [...deal.crosstalk, ct] };
    }

    case "verdict": {
      const v = event.data as Deal["verdicts"][0];
      const filtered = deal.verdicts.filter(
        (vd) => vd.persona !== v.persona
      );
      return { ...deal, verdicts: [...filtered, v] };
    }

    case "narrative":
      return { ...deal, narrative: event.data as Deal["narrative"] };

    case "memory": {
      const mem = event.data as Deal["memory_log"][0];
      const exists = deal.memory_log.some((m) => m.id === mem.id);
      if (exists) return deal;
      return { ...deal, memory_log: [...deal.memory_log, mem] };
    }

    case "done":
      return { ...deal, status: "ready" as DealStatus };

    case "error":
      return { ...deal, status: "error" as DealStatus, error: (event.data as any)?.message || "Pipeline error" };

    default:
      return deal;
  }
}

/* ─── Store ─── */
export const useDealStore = create<DealState>((set, get) => ({
  deal: null,
  loading: true,
  error: null,
  connected: false,
  stageMessage: "Initializing war room...",
  stageProgress: 0.05,
  health: null,

  hydrate: async (dealId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getDeal(dealId);
      set({ deal: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load deal", loading: false });
    }
  },

  applyEvent: (event: SSEEvent) => {
    // Handle stage events separately (they don't modify the deal)
    if (event.type === "stage") {
      const st = event.data as any;
      set({
        stageMessage: st.message || get().stageMessage,
        stageProgress: st.progress ?? get().stageProgress,
      });
      return;
    }

    const { deal } = get();
    if (!deal) return;
    const updated = reduceEvent(deal, event);
    set({ deal: updated });

    // Mark completion
    if (event.type === "done") {
      set({ stageProgress: 1.0, stageMessage: "Analysis complete. Ready for interrogation." });
    }
  },

  connectSSE: (dealId: string) => {
    const sse = new DealSSEClient({
      dealId,
      onEvent: (event: SSEEvent) => {
        get().applyEvent(event);
      },
      onConnect: () => {
        set({ connected: true });
      },
      onError: () => {
        set({ connected: false });
      },
    });

    set({ connected: true });

    return () => {
      sse.disconnect();
      set({ connected: false });
    };
  },

  fetchHealth: async () => {
    try {
      const h = await api.getHealth();
      set({ health: h });
    } catch {
      // silent
    }
  },

  reset: () => {
    set({
      deal: null,
      loading: true,
      error: null,
      connected: false,
      stageMessage: "Initializing war room...",
      stageProgress: 0.05,
      health: null,
    });
  },
}));

/* ─── Selector hooks (documented in shell/README.md) ─── */
const EMPTY_REPORTS: PersonaReport[] = [];

export const useDeal = () => useDealStore((s) => s.deal);
export const useDealLoading = () => useDealStore((s) => s.loading);
export const useDealError = () => useDealStore((s) => s.error);
export const useStageProgress = () => {
  const message = useDealStore((s) => s.stageMessage);
  const progress = useDealStore((s) => s.stageProgress);
  return { message, progress };
};
export const useDealConnected = () => useDealStore((s) => s.connected);
export const useReports = () => useDealStore((s) => s.deal?.reports ?? EMPTY_REPORTS);
export const usePersonaReport = (persona: Persona) =>
  useDealStore((s) => s.deal?.reports.find((r) => r.persona === persona) ?? null);
export const useDealScore = () => useDealStore((s) => s.deal?.score ?? null);
export const useDealDeck = () => useDealStore((s) => s.deal?.deck ?? null);
export const useDealHealth = () => useDealStore((s) => s.health);
