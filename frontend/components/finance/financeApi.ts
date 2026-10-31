import type { FinanceRequest, FinanceResult } from "@/contracts/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export class FinanceApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, detail: ApiErrorDetail) {
    super(detail.message || `API Error [${status}]`);
    this.name = "FinanceApiError";
    this.status = status;
    this.code = detail.code || "unknown_error";
  }
}

export async function computeFinance(
  dealId: string,
  req: FinanceRequest,
  signal?: AbortSignal
): Promise<FinanceResult> {
  const url = `${API_BASE}/api/deals/${encodeURIComponent(dealId)}/finance/compute`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok) {
    let errorDetail: ApiErrorDetail = {
      code: "http_error",
      message: res.statusText,
    };
    try {
      const json = await res.json();
      if (json.error) {
        errorDetail = json.error;
      } else if (json.detail?.error) {
        errorDetail = json.detail.error;
      }
    } catch {
      // ignore
    }
    throw new FinanceApiError(res.status, errorDetail);
  }

  return (await res.json()) as FinanceResult;
}
