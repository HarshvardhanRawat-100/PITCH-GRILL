import type { Deal, MekoStatus } from "@/contracts/types";

export interface HealthResponse {
  ok: boolean;
  mock: boolean;
  model: string;
  gemini_calls: number;
  meko: MekoStatus;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);

  if (!res.ok) {
    let errDetail = res.statusText;
    try {
      const json = await res.json();
      if (json.detail?.error?.message) {
        errDetail = json.detail.error.message;
      } else if (json.error?.message) {
        errDetail = json.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`API Error [${res.status}]: ${errDetail}`);
  }

  return res.json();
}

export const api = {
  getHealth: async (): Promise<HealthResponse> => {
    return request<HealthResponse>("/api/health");
  },

  createDeal: async (params: {
    file?: File | null;
    websiteUrl?: string;
    githubUrl?: string;
    demo?: boolean;
  }): Promise<{ deal_id: string }> => {
    const formData = new FormData();
    if (params.file) {
      formData.append("file", params.file);
    }
    if (params.websiteUrl) {
      formData.append("website_url", params.websiteUrl);
    }
    if (params.githubUrl) {
      formData.append("github_url", params.githubUrl);
    }

    const query = params.demo ? "?demo=true" : "";
    return request<{ deal_id: string }>(`/api/deals${query}`, {
      method: "POST",
      body: formData,
    });
  },

  getDeal: async (dealId: string): Promise<Deal> => {
    return request<Deal>(`/api/deals/${dealId}`);
  },

  deleteDeal: async (dealId: string): Promise<{ deleted: boolean }> => {
    return request<{ deleted: boolean }>(`/api/deals/${dealId}`, {
      method: "DELETE",
    });
  },

  getExportMarkdown: async (dealId: string): Promise<string> => {
    const res = await fetch(`${API_BASE}/api/deals/${dealId}/export.md`);
    if (!res.ok) throw new Error("Failed to export markdown report");
    return res.text();
  },
};
