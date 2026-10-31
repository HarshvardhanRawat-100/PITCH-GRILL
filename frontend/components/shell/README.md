# Shell Components — Hook Reference

## Zustand Deal Store (`frontend/lib/store.ts`)

Central state store for deal data, powered by [Zustand](https://github.com/pmndrs/zustand).

### How it works

1. **Hydration**: `useDealStore().hydrate(dealId)` fetches the full deal from `GET /api/deals/{id}`.
2. **SSE Stream**: `useDealStore().connectSSE(dealId)` opens a real-time event stream and applies every event **idempotently** via `applyEvent()`. Events are de-duplicated by id/persona before merging into state.
3. **Selector hooks**: Use these in any component — they trigger re-render only when the selected slice changes.

### Available Selector Hooks

| Hook | Return type | Description |
|------|-------------|-------------|
| `useDeal()` | `Deal \| null` | Full deal object |
| `useDealLoading()` | `boolean` | Whether initial hydration is in progress |
| `useDealError()` | `string \| null` | Error message from hydration |
| `useStageProgress()` | `{ message: string; progress: number }` | Current pipeline stage info |
| `useDealConnected()` | `boolean` | Whether SSE is connected |
| `useReports()` | `PersonaReport[]` | All persona reports |
| `usePersonaReport(persona)` | `PersonaReport \| null` | Report for a specific persona |
| `useDealScore()` | `ReadinessScore \| null` | Current readiness score |
| `useDealDeck()` | `DeckFacts \| null` | Extracted deck facts |
| `useDealHealth()` | `HealthResponse \| null` | System health (Gemini + Meko status) |

### Usage Example (for P2/P3/P4 teammates)

```tsx
"use client";
import { useDeal, useDealScore, usePersonaReport } from "@/lib/store";

export function MyComponent() {
  const deal = useDeal();
  const score = useDealScore();
  const financeReport = usePersonaReport("finance");

  if (!deal) return <div>Loading...</div>;

  return (
    <div>
      <h1>{deal.deck?.company_name}</h1>
      <p>Score: {score?.current}</p>
      <p>Finance findings: {financeReport?.findings.length ?? 0}</p>
    </div>
  );
}
```

### SSE Event Types Handled

All 18 event types from `contracts/types.ts` are handled idempotently:
`stage`, `deck`, `finance`, `market`, `tech`, `persona_report`, `ledger`, `score`, `question`, `evaluation`, `concession`, `crosstalk`, `checklist`, `verdict`, `narrative`, `memory`, `done`, `error`

## Components

- **`Header.tsx`** — Persistent top bar with brand, company name, readiness score gauge, and delete button.
- **`Footer.tsx`** — Gemini + Meko status chips, Meko-aware privacy copy, legal disclaimer.
