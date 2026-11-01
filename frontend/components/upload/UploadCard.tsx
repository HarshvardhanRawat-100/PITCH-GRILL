"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UploadCloud, FileText, Globe, Github, Sparkles, Loader2, AlertCircle, ShieldAlert } from "lucide-react";

export function UploadCard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSubmit = async (demo: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createDeal({
        file: demo ? null : file,
        websiteUrl: websiteUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        demo,
      });
      router.push(`/deal/${res.deal_id}`);
    } catch (err: any) {
      setError(err.message || "Failed to initiate diligence run");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Hostile AI Due Diligence Simulation</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl font-mono">
          Face three hostile investors before the real ones do.
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base">
          Upload your startup pitch deck. Three AI investors—Finance, Market, and Technical—tear it apart
          with deterministic math and live web verification.
        </p>
      </div>

      {/* Main Upload Box */}
      <div className="efferd-panel rounded-[20px] border border-white/[0.08] hover:border-amber-500/30 p-8 shadow-2xl transition-all space-y-6 relative">
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-[10px] bg-red-950/40 border border-red-800/50 text-red-300 text-sm font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload pitch deck PDF"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("file-upload")?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.[0]) {
              setFile(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed rounded-[16px] p-8 text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            isDragOver
              ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
              : file
              ? "border-emerald-500/60 bg-emerald-950/10 shadow-glow-green"
              : "border-border hover:border-amber-500/50 bg-surface-elevated/40 hover:bg-surface-elevated/60"
          }`}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }}
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-10 h-10 text-emerald-400" />
              <div className="font-semibold text-gray-200">{file.name}</div>
              <div className="text-xs text-gray-400">
                {(file.size / (1024 * 1024)).toFixed(2)} MB · Click or drag to replace
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[12px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-1">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="font-medium text-gray-200">Drop pitch deck PDF here</div>
              <div className="text-xs text-gray-500">Max 20 MB · Up to 40 slides · Confidential session</div>
            </div>
          )}
        </div>

        {/* Optional Context Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Website URL (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://yourstartup.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-surface-elevated/80 border border-white/[0.08] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 font-mono transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5 font-mono">
              <Github className="w-3.5 h-3.5 text-purple-400" />
              <span>GitHub Repo (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://github.com/org/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-surface-elevated/80 border border-white/[0.08] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 font-mono transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={!file || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[10px] bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-slate-950 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-[0.98] font-mono"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            <span>Enter Diligence War Room</span>
          </button>

          <button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-[10px] bg-surface border border-white/[0.08] hover:border-amber-500/40 hover:bg-surface-elevated text-sm font-medium text-gray-300 hover:text-white transition-all active:scale-[0.98] font-mono shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Try Demo Deck (BolBot)</span>
          </button>
        </div>

        {/* Privacy Copy */}
        <p className="text-center text-xs text-gray-500 pt-2 border-t border-border/50">
          The PDF itself is session-only. Extracted findings and your defenses are kept in Meko memory for this session and deleted when you delete the deal. Deck text is sent to Google Gemini to analyse it.
        </p>
      </div>
    </div>
  );
}
