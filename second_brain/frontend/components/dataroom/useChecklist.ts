"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DealSSEClient } from "@/lib/sse";
import type { ChecklistItem, SSEEvent } from "@/contracts/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UseChecklistResult {
  checklist: ChecklistItem[];
  loading: boolean;
  error: string | null;
  recentlyUpdatedId: string | null;
  updateStatus: (itemId: string, newStatus: "todo" | "addressed" | "uploaded") => Promise<void>;
  refresh: () => Promise<void>;
}

export function useChecklist(initialDealId?: string): UseChecklistResult {
  const params = useParams();
  const dealId = initialDealId || (params?.id as string) || "";

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchChecklist = useCallback(async () => {
    if (!dealId) return;
    try {
      const url = `${API_BASE}/api/deals/${encodeURIComponent(dealId)}/checklist`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch checklist: ${res.statusText}`);
      }
      const data = (await res.json()) as ChecklistItem[];
      setChecklist(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load checklist";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Subscribe to SSE checklist events for real-time live synchronization
  useEffect(() => {
    if (!dealId) return;

    const sse = new DealSSEClient({
      dealId,
      onEvent: (event: SSEEvent) => {
        if (event.type === "checklist") {
          const items = (event.data as { items?: ChecklistItem[] })?.items;
          if (items && Array.isArray(items)) {
            setChecklist((prev) => {
              // Detect newly addressed or modified items for animation
              for (const newItem of items) {
                const oldItem = prev.find((p) => p.id === newItem.id);
                if (oldItem && oldItem.status !== newItem.status) {
                  setRecentlyUpdatedId(newItem.id);
                  if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
                  highlightTimeoutRef.current = setTimeout(() => {
                    setRecentlyUpdatedId(null);
                  }, 2500);
                  break;
                }
              }
              return items;
            });
          }
        }
      },
    });

    return () => {
      sse.disconnect();
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [dealId]);

  const updateStatus = useCallback(
    async (itemId: string, newStatus: "todo" | "addressed" | "uploaded") => {
      if (!dealId) return;
      // Optimistic update
      setChecklist((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
      );
      setRecentlyUpdatedId(itemId);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => setRecentlyUpdatedId(null), 2500);

      try {
        const url = `${API_BASE}/api/deals/${encodeURIComponent(dealId)}/checklist/${encodeURIComponent(itemId)}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          throw new Error(`Failed to update checklist item: ${res.statusText}`);
        }
        const updated = (await res.json()) as ChecklistItem;
        setChecklist((prev) =>
          prev.map((item) => (item.id === itemId ? updated : item))
        );
      } catch (err: unknown) {
        // Revert on error
        fetchChecklist();
        const msg = err instanceof Error ? err.message : "Update failed";
        setError(msg);
      }
    },
    [dealId, fetchChecklist]
  );

  return {
    checklist,
    loading,
    error,
    recentlyUpdatedId,
    updateStatus,
    refresh: fetchChecklist,
  };
}
