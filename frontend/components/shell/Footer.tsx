"use client";

import React, { useEffect, useState } from "react";
import { api, HealthResponse } from "@/lib/api";

export function Footer() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch((err) => console.warn("Failed to fetch health info:", err));
  }, []);

  const isMekoLive = health?.meko?.mode === "live";

  return (
    <footer className="w-full border-t border-border bg-surface/80 py-4 px-6 text-xs text-gray-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Chips */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800/40 text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Gemini {health?.model || "2.5-flash"} · {health?.gemini_calls ?? 0} calls</span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isMekoLive
                ? "bg-emerald-950/60 border-emerald-800/40 text-emerald-300"
                : "bg-amber-950/60 border-amber-800/40 text-amber-300"
            }`}
            title={health?.meko?.note || "Meko persistent agent memory"}
          >
            <span className={`w-2 h-2 rounded-full ${isMekoLive ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span>
              {isMekoLive ? "Meko live" : "Meko local fallback"} · {health?.meko?.calls_made ?? 0} calls
            </span>
          </div>
        </div>

        {/* Privacy Copy */}
        <p className="text-center text-gray-500 max-w-xl">
          The PDF itself is session-only. Extracted findings and your defenses are kept in Meko memory for this session
          and deleted when you delete the deal. Deck text is sent to Google Gemini to analyse it.
        </p>

        {/* Legal Disclaimer */}
        <div className="text-right text-gray-500">
          <span>Diligence-prep tool · Not legal or investment advice</span>
        </div>
      </div>
    </footer>
  );
}
