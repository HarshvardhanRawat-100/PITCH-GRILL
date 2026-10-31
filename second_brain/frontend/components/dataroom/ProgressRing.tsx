"use client";

import React from "react";

interface ProgressRingProps {
  addressed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({
  addressed,
  total,
  size = 72,
  strokeWidth = 6,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? Math.min(100, Math.round((addressed / total) * 100)) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-4 bg-surface-elevated/70 border border-border rounded-xl px-4 py-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-surface"
            fill="transparent"
          />
          {/* Active progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-emerald-500 transition-all duration-700 ease-out"
            fill="transparent"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-xs font-bold font-mono text-white">{percentage}%</span>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Diligence Clearance
        </div>
        <div className="text-base font-bold text-gray-100 flex items-baseline gap-1.5 mt-0.5">
          <span className="text-emerald-400 font-mono text-lg">{addressed}</span>
          <span className="text-gray-500 font-mono text-sm">/ {total} addressed</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {total - addressed === 0
            ? "All diligence items cleared"
            : `${total - addressed} items pending resolution`}
        </p>
      </div>
    </div>
  );
}
