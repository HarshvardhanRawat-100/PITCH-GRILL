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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hostile AI Due Diligence Simulation</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Face three hostile investors before the real ones do.
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base">
          Upload your startup pitch deck. Three AI investors—Finance, Market, and Technical—tear it apart
          with deterministic math and live web verification.
        </p>
      </div>

      {/* Main Upload Box */}
      <div className="bg-surface rounded-2xl border border-border p-8 shadow-2xl space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
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
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-blue-500 bg-blue-950/20"
              : file
              ? "border-emerald-500/60 bg-emerald-950/10"
              : "border-border hover:border-gray-500 bg-surface-elevated/40"
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
              <UploadCloud className="w-10 h-10 text-gray-400" />
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
              className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-purple-400" />
              <span>GitHub Repo (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://github.com/org/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={!file || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm text-white transition-all shadow-lg shadow-blue-900/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            <span>Enter Diligence War Room</span>
          </button>

          <button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-sm font-medium text-gray-300 hover:text-white transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Use Demo Deck (BolBot)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
