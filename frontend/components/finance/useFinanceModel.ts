"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FinanceRequest,
  FinanceResult,
  FinancialInputKey,
} from "@/contracts/types";
import { computeFinance } from "./financeApi";

export interface UseFinanceModelProps {
  dealId: string;
  baseline: FinanceResult | null;
}

export interface UseFinanceModelResult {
  baseline: FinanceResult | null;
  displayedResult: FinanceResult | null;
  threshold: FinanceResult | null;
  overrides: Partial<Record<FinancialInputKey, number>>;
  mode: "hold_growth" | "hold_spend";
  pending: boolean;
  error: string | null;
  setOverride: (key: FinancialInputKey, val: number) => void;
  clearOverride: (key: FinancialInputKey) => void;
  resetAll: () => void;
  setMode: (m: "hold_growth" | "hold_spend") => void;
  retry: () => void;
}

export function useFinanceModel({
  dealId,
  baseline,
}: UseFinanceModelProps): UseFinanceModelResult {
  const [overrides, setOverrides] = useState<
    Partial<Record<FinancialInputKey, number>>
  >({});
  const [mode, setMode] = useState<"hold_growth" | "hold_spend">(
    baseline?.mode || "hold_growth"
  );
  const [scenario, setScenario] = useState<FinanceResult | null>(null);
  const [threshold, setThreshold] = useState<FinanceResult | null>(baseline);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevBaselineRef = useRef<FinanceResult | null>(baseline);
  const abortControllerRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  // Clear local overrides when server pushes an updated baseline (e.g. after grill turn)
  useEffect(() => {
    if (baseline && baseline !== prevBaselineRef.current) {
      prevBaselineRef.current = baseline;
      setOverrides({});
      setScenario(null);
      setThreshold(baseline);
      setMode(baseline.mode || "hold_growth");
    }
  }, [baseline]);

  const hasLocalChanges =
    Object.keys(overrides).length > 0 || (baseline && mode !== baseline.mode);

  const triggerCompute = useCallback(() => {
    if (!dealId || !baseline) return;

    if (!hasLocalChanges) {
      setScenario(null);
      setThreshold(baseline);
      setPending(false);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    const currentSeq = ++seqRef.current;
    setPending(true);

    const targetRunway = baseline.break_point?.target_runway_months ?? 12;
    const req: FinanceRequest = {
      overrides: overrides as Record<string, number>,
      mode,
      target_runway_months: targetRunway,
    };

    const hasCacOverride = overrides.cac !== undefined;

    const mainPromise = computeFinance(dealId, req, ac.signal);
    const thresholdPromise = hasCacOverride
      ? computeFinance(
          dealId,
          {
            ...req,
            overrides: Object.fromEntries(
              Object.entries(overrides).filter(([k]) => k !== "cac")
            ) as Record<string, number>,
          },
          ac.signal
        )
      : Promise.resolve(null);

    Promise.all([mainPromise, thresholdPromise])
      .then(([mainRes, threshRes]) => {
        if (currentSeq !== seqRef.current) return;
        setScenario(mainRes);
        setThreshold(threshRes || mainRes);
        setError(null);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        if (currentSeq !== seqRef.current) return;
        const msg = err instanceof Error ? err.message : "Computation failed";
        setError(msg);
      })
      .finally(() => {
        if (currentSeq === seqRef.current) {
          setPending(false);
        }
      });
  }, [dealId, baseline, hasLocalChanges, overrides, mode]);

  // Debounced live recompute (150ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerCompute();
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [triggerCompute]);

  const setOverride = useCallback((key: FinancialInputKey, val: number) => {
    setOverrides((prev) => ({ ...prev, [key]: val }));
  }, []);

  const clearOverride = useCallback((key: FinancialInputKey) => {
    setOverrides((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, []);

  const resetAll = useCallback(() => {
    setOverrides({});
    if (baseline) {
      setMode(baseline.mode);
    }
    setScenario(null);
    setThreshold(baseline);
  }, [baseline]);

  return {
    baseline,
    displayedResult: scenario ?? baseline,
    threshold: threshold ?? baseline,
    overrides,
    mode,
    pending,
    error,
    setOverride,
    clearOverride,
    resetAll,
    setMode,
    retry: triggerCompute,
  };
}
