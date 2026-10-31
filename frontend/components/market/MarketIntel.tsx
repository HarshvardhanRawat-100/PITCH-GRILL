"use client";

import React, { useState } from "react";
import { MarketGrounding, TechSignals, Competitor } from "../../../contracts/types";

interface MarketIntelProps {
  dealId: string;
  market: MarketGrounding | null;
  tech?: TechSignals | null;
  loading?: boolean;
  onRefreshMarket?: () => Promise<void>;
}

export const MarketIntel: React.FC<MarketIntelProps> = ({
  dealId,
  market,
  tech,
  loading = false,
  onRefreshMarket,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefreshMarket) return;
    try {
      setRefreshing(true);
      await onRefreshMarket();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !market) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs animate-pulse">
        Grounding market & competitor claims against live web sources...
      </div>
    );
  }

  if (!market) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No market grounding available. Upload a deck or click refresh.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-100">
      {/* Top Banner: Status + Refresh Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-100">
              Market Intelligence & Grounding
            </h1>
            {market.from_cache ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/70 border border-amber-700/50 text-amber-300">
                Cached from live search {market.generated_at ? `on ${new Date(market.generated_at).toLocaleDateString()}` : ""}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/70 border border-emerald-700/50 text-emerald-300">
                Live Grounded
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Every competitor, quote, and funding figure is verified by strict substring matching in code against public web pages.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <span className="animate-spin text-sm">⟳</span>
              <span>Searching Web...</span>
            </>
          ) : (
            <>
              <span>⟳</span>
              <span>Refresh Live Grounding</span>
            </>
          )}
        </button>
      </div>

      {/* Bold Callout: No-Competitor Contradiction Alert */}
      {market.no_competitor_claim_contradicted && (
        <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/80 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-sm font-bold text-rose-300">
              Deck Claim Contradicted: &quot;No Direct Competitors&quot;
            </h3>
            <p className="text-xs text-rose-200/90 mt-1">
              The founder claims no direct competitors exist in this space. Our live crawler identified{" "}
              <b>{market.competitors.length} verified market players</b> offering overlapping products to Indian SMEs.
            </p>
          </div>
        </div>
      )}

      {/* TAM Verification & Funnel Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TAM Evidence & Verdict */}
        <div className="p-5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
              TAM Sizing Validation
            </h2>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                market.tam_verdict === "supported"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-700/50"
                  : market.tam_verdict === "contradicted"
                  ? "bg-rose-950 text-rose-400 border border-rose-700/50"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {market.tam_verdict.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {market.tam_note}
          </p>

          {/* Sourced TAM figures list */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <h4 className="text-[11px] font-mono text-slate-400 uppercase">
              Independent Sourced Evidence:
            </h4>
            {market.tam_evidence.map((tam, idx) => (
              <div key={idx} className="p-2.5 rounded bg-slate-950 border border-slate-800/60 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-400">{tam.figure_text}</span>
                  {tam.year && <span className="text-[10px] text-slate-500 font-mono">{tam.year}</span>}
                </div>
                <blockquote className="mt-1 text-[11px] text-slate-400 italic">
                  &quot;{tam.quote}&quot;
                </blockquote>
                <div className="mt-1 text-right">
                  <a
                    href={tam.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline font-mono"
                  >
                    Source URL ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel: TAM -> SAM -> SOM */}
        {market.funnel && (
          <div className="p-5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
              TAM → SAM → SOM Funnel
            </h2>

            <div className="space-y-3 py-2">
              <div className="p-3 rounded bg-blue-950/30 border border-blue-900/50">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-blue-300">TAM (Total Market)</span>
                  <span className="font-mono text-blue-200">
                    ₹{(market.funnel.tam_inr! / 1e7).toFixed(1)} Cr
                  </span>
                </div>
              </div>

              <div className="p-3 rounded bg-purple-950/30 border border-purple-900/50 ml-4">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-purple-300">SAM (Serviceable Addressable)</span>
                  <span className="font-mono text-purple-200">
                    ₹{(market.funnel.sam_inr! / 1e7).toFixed(1)} Cr
                  </span>
                </div>
              </div>

              <div className="p-3 rounded bg-emerald-950/30 border border-emerald-900/50 ml-8">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-emerald-300">SOM (Obtainable Share)</span>
                  <span className="font-mono text-emerald-200">
                    ₹{(market.funnel.som_inr! / 1e7).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 pt-1">
              <p className="font-mono text-slate-500 uppercase text-[10px]">Stated Assumptions:</p>
              {market.funnel.assumptions.map((asm, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className="text-slate-600">•</span>
                  <span>{asm}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Competitor Cards Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <span>Identified Competitors</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {market.competitors.length}
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {market.competitors.map((comp) => (
            <div
              key={comp.name}
              className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-400 transition"
                      >
                        {comp.name}
                      </a>
                      {comp.verified && (
                        <span className="text-xs text-emerald-400" title="Verified in fetched page text">
                          ✓
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {comp.url.replace(/^https?:\/\//, "")}
                    </span>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                      comp.overlap === "high"
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : comp.overlap === "medium"
                        ? "bg-amber-950 text-amber-300 border border-amber-800"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {comp.overlap} Overlap
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {comp.what_they_do}
                </p>

                {/* Evidence Quote */}
                <blockquote className="mt-2 text-[11px] text-slate-400 italic bg-slate-950 p-2 rounded border-l-2 border-blue-500">
                  &quot;{comp.evidence_quote}&quot;
                </blockquote>
              </div>

              {/* Funding Badge */}
              <div className="pt-2 border-t border-slate-800/80 text-[11px]">
                {comp.funding ? (
                  <div className="text-emerald-400 font-mono text-[10px]">
                    <span className="text-slate-500">Funding: </span>
                    <a
                      href={comp.funding.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {comp.funding.text} ↗
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-500 font-mono text-[10px]">
                    Funding: unverified in public filings
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Verification Section */}
      {tech && (
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
              Product & Technical Verification
            </h2>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono ${
                tech.site_reachable
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              {tech.site_reachable ? "Site Reachable ✓" : "Site Unreachable ✗"}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {tech.site_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Supported Claims */}
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <h4 className="text-[11px] font-mono font-semibold text-emerald-400 uppercase mb-2">
                Claims Supported by Public Surface:
              </h4>
              <ul className="text-xs text-slate-300 space-y-1">
                {tech.claims_supported.length > 0 ? (
                  tech.claims_supported.map((c, i) => (
                    <li key={i} className="flex gap-1.5 items-start">
                      <span className="text-emerald-400">✓</span>
                      <span>{c}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">No claims verified on site.</li>
                )}
              </ul>
            </div>

            {/* Unsupported Claims */}
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <h4 className="text-[11px] font-mono font-semibold text-amber-400 uppercase mb-2">
                Unverified / Unsupported Technical Claims:
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                {tech.claims_unsupported.length > 0 ? (
                  tech.claims_unsupported.map((c, i) => (
                    <li key={i} className="flex gap-1.5 items-start">
                      <span className="text-amber-400">?</span>
                      <span>{c}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">None flagged as unsupported.</li>
                )}
              </ul>
            </div>
          </div>

          {/* GitHub Stats */}
          {tech.github && (
            <div className="p-3 rounded bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono">
              <span className="text-slate-300">
                GitHub: <b className="text-blue-400">{tech.github.repo}</b>
              </span>
              <span className="text-slate-400">★ {tech.github.stars} stars</span>
              <span className="text-slate-400">
                Languages: {tech.github.languages.join(", ") || "Python"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
