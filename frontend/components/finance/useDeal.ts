"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DealSSEClient } from "@/lib/sse";
import type { Deal, SSEEvent } from "@/contracts/types";

export interface UseDealResult {
  deal: Deal | null;
  dealId: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDeal(): UseDealResult {
  const params = useParams();
  const dealId = (params?.id as string) || "";

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeal = useCallback(async () => {
    if (!dealId) return;
    try {
      const data = await api.getDeal(dealId);
      setDeal(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load deal";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    fetchDeal();

    // Connect to SSE stream for live updates
    const sse = new DealSSEClient({
      dealId,
      onEvent: (event: SSEEvent) => {
        if (event.type === "finance") {
          setDeal((prev) => (prev ? { ...prev, finance: event.data as any } : prev));
        } else if (event.type === "deck") {
          setDeal((prev) => (prev ? { ...prev, deck: event.data as any } : prev));
        } else if (event.type === "evaluation") {
          const evalData = event.data as any;
          if (evalData?.turn) {
            setDeal((prev) => {
              if (!prev) return prev;
              const turns = [...(prev.grill_turns || [])];
              const idx = turns.findIndex((t) => t.id === evalData.turn.id);
              if (idx >= 0) {
                turns[idx] = evalData.turn;
              } else {
                turns.push(evalData.turn);
              }
              return { ...prev, grill_turns: turns };
            });
          }
        }
      },
    });

    return () => {
      sse.disconnect();
    };
  }, [dealId, fetchDeal]);

  return {
    deal,
    dealId,
    loading,
    error,
    refresh: fetchDeal,
  };
}
