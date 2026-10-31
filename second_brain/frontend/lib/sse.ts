import type { SSEEvent } from "@/contracts/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SSEClientOptions {
  dealId: string;
  since?: number;
  onEvent: (event: SSEEvent) => void;
  onError?: (err: Event) => void;
  onConnect?: () => void;
}

export class DealSSEClient {
  private dealId: string;
  private lastSeq: number;
  private onEvent: (event: SSEEvent) => void;
  private onError?: (err: Event) => void;
  private onConnect?: () => void;
  private eventSource: EventSource | null = null;
  private isDestroyed = false;
  private reconnectTimeout: any = null;

  constructor(options: SSEClientOptions) {
    this.dealId = options.dealId;
    this.lastSeq = options.since || 0;
    this.onEvent = options.onEvent;
    this.onError = options.onError;
    this.onConnect = options.onConnect;

    this.connect();
  }

  private connect() {
    if (this.isDestroyed) return;

    const url = `${API_BASE}/api/deals/${this.dealId}/events?since=${this.lastSeq}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.onConnect?.();
    };

    this.eventSource.onerror = (err) => {
      this.onError?.(err);
      this.eventSource?.close();

      // Attempt reconnection after 3s
      if (!this.isDestroyed) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
      }
    };

    // Generic event handler for SSE stream
    const handleMessage = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as SSEEvent;
        if (parsed.seq > this.lastSeq) {
          this.lastSeq = parsed.seq;
        }
        this.onEvent(parsed);
      } catch (err) {
        console.warn("Failed to parse SSE event data:", err);
      }
    };

    // Listen for custom event types defined in contracts
    const eventTypes = [
      "stage", "deck", "finance", "market", "tech", "persona_report",
      "ledger", "score", "question", "evaluation", "concession",
      "crosstalk", "checklist", "verdict", "narrative", "memory", "done", "error"
    ];

    for (const type of eventTypes) {
      this.eventSource.addEventListener(type, handleMessage);
    }
    this.eventSource.onmessage = handleMessage;
  }

  public disconnect() {
    this.isDestroyed = true;
    clearTimeout(this.reconnectTimeout);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
