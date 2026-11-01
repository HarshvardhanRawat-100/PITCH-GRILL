"use client";

import React, { useState } from "react";
import { Download, Check } from "lucide-react";
import type { ChecklistItem } from "@/contracts/types";

interface ExportCsvButtonProps {
  items: ChecklistItem[];
  companyName?: string;
}

export function ExportCsvButton({ items, companyName = "Startup" }: ExportCsvButtonProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleExport = () => {
    if (!items.length) return;

    const headers = [
      "ID",
      "Title",
      "Priority",
      "Owner",
      "Status",
      "India Specific",
      "Linked Finding",
      "Why Investors Request",
    ];

    const rows = items.map((i) => [
      `"${i.id}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.priority}"`,
      `"${i.owner}"`,
      `"${i.status}"`,
      `"${i.india_specific ? "Yes" : "No"}"`,
      `"${i.finding_id || "None"}"`,
      `"${i.why.replace(/"/g, '""')}"`,
    ]);

    const disclaimer = [
      "",
      '"DISCLAIMER: Documents investors typically request — not legal advice."',
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(",")), ...disclaimer].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_data_room_checklist.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!items.length}
      className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-surface border border-border text-gray-200 hover:text-white hover:bg-surface-elevated text-xs font-semibold font-mono transition-colors disabled:opacity-50"
      title="Download due diligence checklist formatted as CSV spreadsheet"
    >
      {downloaded ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">Exported</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 text-gray-400" />
          <span>Export CSV</span>
        </>
      )}
    </button>
  );
}
