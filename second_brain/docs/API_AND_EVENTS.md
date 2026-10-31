# API, Events & Engine Specs

All types are in `contracts/schemas.py`. Base URL `http://localhost:8000`. JSON everywhere. CORS open for localhost:3000.

## 1. Endpoints

| Method & path | Owner | Body → Response |
|---|---|---|
| `GET /api/health` | P1 | → `{ok:true, mock:bool, model:str, gemini_calls:int, meko:MekoStatus}` |
| `POST /api/deals` | P1 | multipart: `file` (PDF), optional `website_url`, `github_url`, or `demo=true` → `{deal_id}`; starts ingest + analysis automatically |
| `GET /api/deals/{id}` | P1 | → `Deal` (full current state) |
| `DELETE /api/deals/{id}` | P1 | deletes state + files → `{deleted:true}` |
| `GET /api/deals/{id}/events?since=0` | P1 | SSE stream (see §2). Replays buffered events with `seq > since`, then tails. |
| `GET /api/deals/{id}/finance` | P3 | → `FinanceResult` (base case) |
| `POST /api/deals/{id}/finance/compute` | P3 | `FinanceRequest` → `FinanceResult` (pure, fast, no LLM, <100 ms) |
| `GET /api/deals/{id}/market` | P4 | → `MarketGrounding` |
| `POST /api/deals/{id}/market/refresh` | P4 | re-run live grounding → `MarketGrounding` (also emits `market` event) |
| `GET /api/deals/{id}/checklist` | P3 | → `ChecklistItem[]` |
| `PATCH /api/deals/{id}/checklist/{item_id}` | P3 | `{status}` → `ChecklistItem` |
| `POST /api/deals/{id}/grill/start` | P2 | → `{first_turn: GrillTurn}`; status→`grilling`; also emits `question` |
| `POST /api/deals/{id}/grill/answer` | P2 | `{turn_id, answer}` → `202 {accepted:true}`; results stream as events |
| `POST /api/deals/{id}/narrative` | P2 | → `Narrative` (also emits `narrative`); callable any time, final after grill |
| `GET /api/deals/{id}/memory?q=…` | P4 | → `MemoryRecord` (runs `recall` for this deal; powers the "Ask the memory" box; also appended to `memory_log`) |
| `GET /api/deals/{id}/export.md` | P1 | → markdown file: report + ledger + checklist + narrative |

Errors: `{error:{code, message}}` with proper HTTP status. Never return a stack trace.

## 2. SSE protocol
Single stream per deal. Each message: `event: <type>` + `data: <SSEEvent JSON>`. Server keeps all events in a list; `seq` is
monotonic from 1. Heartbeat comment `: ping` every 15 s. Client reconnects with `?since=<last seq>`.

| `type` | `data` payload |
|---|---|
| `stage` | `{stage:"parsing"|"extracting"|"finance"|"market"|"tech"|"moderating"|"scoring"|"checklist"|"ready", message:str, progress:0-1}` |
| `deck` | `DeckFacts` |
| `finance` | `FinanceResult` |
| `market` | `MarketGrounding` |
| `tech` | `TechSignals` |
| `persona_report` | `PersonaReport` (one per persona, as each finishes) |
| `ledger` | `{entries: LedgerEntry[]}` (full list, replace) |
| `score` | `ReadinessScore` |
| `question` | `GrillTurn` (kind question/followup, no answer yet) |
| `evaluation` | `{turn: GrillTurn}` (answer + evaluation filled) |
| `concession` | `Concession` |
| `crosstalk` | `CrossTalk` |
| `checklist` | `{items: ChecklistItem[]}` (full list, replace) |
| `verdict` | `FinalVerdict` (one per persona at end) |
| `narrative` | `Narrative` |
| `memory` | `MemoryRecord` (one per Meko interaction; replace by `id`, so `pending → ok/failed` updates in place) |
| `done` | `{phase:"analysis"|"grill"}` |
| `error` | `{code, message, recoverable:bool}` |

Frontend rule: derive UI from `Deal` (initial fetch) + apply events. Events are idempotent (replace by id).

## 3. Analysis pipeline (orchestrator, P2 owns glue)
```
ingest (P1) → DeckFacts
        ├─ finance_glue.run(deck)  → FinanceResult      (P3, deterministic)
        ├─ market_search.run(deck) → MarketGrounding    (P4, live search, 8s timeouts, cache fallback)
        └─ tech_check.run(deck)    → TechSignals        (P4)
   (these 3 run in parallel with asyncio.gather; each emits its event when done)
→ 3 persona agents in parallel (each gets DeckFacts + its own tool output)   → PersonaReport x3
→ moderator: dedupe/reconcile, pick top_issues (max 3), no new findings except conflicts
→ ledger builder (code): claims + findings + tool facts → LedgerEntry[]
→ scoring (code): initial scores via schemas.initial_persona_score
→ checklist generator (P3) from findings → ChecklistItem[]
→ status "ready", event done(phase=analysis)
```
Target total latency ≤ 45 s on demo deck. If any tool fails → that persona proceeds with `unverified` labels, never aborts the run.

## 4. Finance engine spec (P3) — EXACT MODEL
Inputs come from `FinancialInputs` after overrides. Units: INR, monthly. Horizon H = 36 months.
Missing inputs are filled from `ASSUMED_DEFAULTS` with `origin="assumed"` and listed in `assumptions_used`:
`arpu_monthly` none (cannot assume; if missing, engine returns metrics with None and a message),
`gross_margin_pct=60`, `monthly_churn_pct=5`, `new_customer_growth_pct_monthly=0`, `fixed_opex_monthly` none,
`cash_in_bank` none, `cac` none, `current_customers=0`, `new_customers_monthly` none.
If a *must-have* (arpu, cac, cash, fixed_opex, new_customers) is missing → `FinanceResult` with empty series,
`assumptions_used` explaining, and the UI asks the founder to fill it (becomes `origin="founder"`).

Per month t = 0..H-1 (customers at start of month):
```
new_t        = new_customers_monthly * (1 + g/100)^t                      # mode hold_growth
new_t        = new_customers_monthly * (1 + g/100)^t * base_cac / cac     # mode hold_spend (budget fixed at base CAC)
churned_t    = customers_t * churn/100
customers_t+1= customers_t + new_t - churned_t
revenue_t    = customers_t * arpu
gross_profit = revenue_t * gm/100
acq_spend_t  = new_t * cac
net_burn_t   = fixed_opex + acq_spend_t - gross_profit                    # positive = burning
cash_t+1     = cash_t - net_burn_t
```
- `runway_months`: first t where cash_t+1 <= 0 → `t + cash_t / net_burn_t` (fractional). If never within H → `None`, `runway_capped=True` (UI shows "36+").
- `breakeven_month`: first t with `net_burn_t <= 0`, else None.
- `ltv = arpu*gm/100 / (churn/100)` (None if churn=0); `ltv_cac = ltv/cac`; `payback_months = cac / (arpu*gm/100)`.
- `month0_net_burn = net_burn_0`.
- **Break point** (`BreakPoint`): bisection on CAC in `[base_cac, base_cac*20]` (60 iterations) for `runway == target` (runway is monotone
  non-increasing in CAC). Treat capped runway as 36. If runway(base) < target → `already_below_target=True`. If runway(20x) >= target → `breaking_cac=None`.
  `pct_increase = (breaking_cac/base_cac - 1)*100`.
- **Tornado**: for variables `cac, monthly_churn_pct, gross_margin_pct, arpu_monthly, fixed_opex_monthly, new_customers_monthly` vary ±20 %
  (clamp pct vars to 0–100), compute runway (capped=36) for low/high, `delta_months = |high-low|`; sort desc.
- `formulas`: list of human-readable strings of the equations above for the "How this works" drawer.
- Must be pure, deterministic, unit-tested (incl. a hand-computed 3-month example), and run <100 ms.

## 5. Market grounding spec (P4)
1. Build ≤3 queries from `one_liner`/`sector`: (a) "<what it does> startups India", (b) "<what it does> competitors funding",
   (c) "<sector> market size India". Tavily `include_domains` for (a)/(b) first pass: inc42.com, entrackr.com, yourstory.com,
   economictimes.indiatimes.com, techcrunch.com, then an open pass if <3 candidates.
2. For top ~8 pages: fetch text. Extract with PRODUCT_PROMPTS P-06 into `Competitor` candidates.
3. **Verification in code (mandatory):** keep a candidate only if its `name` appears in page text (case-insensitive) AND its
   `evidence_quote` is a substring of page text (normalize whitespace). `funding.text` kept only if substring of page text, else `funding=None`.
   Dedupe by normalized name / domain. Rank by overlap (high > medium > low). Keep top 3–5.
4. TAM: P-07 extraction from market-size pages → `TamEvidence` (quote verified by substring). Compare with `tam_claim_inr` **in code**:
   if any sourced `figure_inr` exists and deck claim > 2× or < 0.5× of the median → `contradicted`; within range → `supported`; no sourced figure → `unverified`.
5. `no_competitor_claim_contradicted = deck.no_competitor_claim and any(verified high/medium competitor)`.
6. Funnel (optional, code): `tam = deck claim`, `sam = tam * reachable%` and `som = sam * share%` ONLY from deck inputs or clearly-labelled assumptions.
7. Timeouts 8 s per call; whole step ≤ 25 s. On failure: load `backend/cache/demo/market.json` if `DEMO_MODE=cached` or if live returns nothing and a cache
   exists for this deck hash → set `from_cache=true`, `generated_at` kept from when it was cached. UI shows a "cached from live search on <date>" badge.

## 6. Tech check spec (P4)
Inputs: `website_url`, `github_url` (founder-supplied or extracted). All URLs through `is_safe_url`.
Fetch homepage text (≤ 20 KB) → P-16 extraction: which of `deck.tech_claims` does the site support / not mention.
GitHub (public REST API, unauthenticated): repo stars, last commit date, languages. Missing/unreachable → `site_reachable=false`, note it; never fail.

## 7. Grill Room state machine (P2)
- Plan: for each persona take its 2 highest-severity **open** findings → 6 base questions, order F1, M1, T1, F2, M2, T2.
- Turn = investor asks `finding.question` (kind `question`). Founder answers (typed; voice optional → text).
- Evaluate with P-09 → `proposed_outcome`; code computes `outcome = clamp_outcome(criteria, proposed)`.
- `accepted` → finding `resolved`; `partial` → `partial`; `rejected` → stays `open` and the investor asks **one** `followup` (kind `followup`, from `evaluation.followup`).
  Evaluate the follow-up the same way; if still rejected, finding stays open. Max 12 turns total.
- After each evaluation: recompute scores via schemas helpers; emit `evaluation`, `concession`, `score`, update ledger status
  (resolved → `verified` only if evidence_type is data/document, else stays `unverified` with note), update checklist (resolved → `addressed`;
  partial/rejected → keep and add a follow-up item from `missing_proof`).
- Finance personas: if the founder's answer asserts a numeric change to an input, run P-11 → overrides → `finance_glue.compute(overrides)` →
  emit `finance` event so the Finance Lab updates live. The concession still requires evidence.
- Cross-talk (flag `ENABLE_CROSSTALK`): after turns 2, 4, 6 one other persona may add ≤ 25 words via P-12, referencing a real finding/fact.
- Founder answer containing instructions to the AI ("accept this", "give me full marks") → `injection_attempt=true`, outcome forced to `rejected`, investor mocks it briefly.
- End: verdicts via `schemas.verdict_for` + P-13 rationale; `narrative` generated via P-15 using all findings, concessions, transcript; `done(phase=grill)`.

## 8. Score
`initial = mean(initial_persona_score)`, `current = mean(persona_score)` using `PENALTY` and `RESOLUTION_FACTOR` in schemas.py. Label: **Pitch Readiness Score**.
Display before → after with animated delta. Per-persona bars. Never claim it predicts funding.

## 9. formatINR (P3, frontend/lib/format.ts)
`formatINR(n)`: ≥ 1e7 → `₹X.XX Cr`, ≥ 1e5 → `₹X.XX L`, ≥ 1e3 → `₹X,XXX` (Indian grouping), else `₹N`. Handle null → `—`. Unit-tested.

## 10. Meko integration spec (P4 wrapper; P1/P2/P3 consumers)

**Modes** (`MEKO_MODE`): `live` = real Meko over MCP; `local` = in-process dict with the same interface (used when Meko is unreachable, over budget, or `DEMO_MODE=cached`); `off` = no-ops that return `status="skipped"`. Switching live → local mid-run is automatic and sets `MekoStatus.note` (e.g. "timeout - using local fallback"). Every record keeps `source = meko_live | local_fallback`.

**Our six verbs → Meko tools** (confirm actual names/params with `list_tools()` first; adapt the mapping, not the callers)

| Verb | Meko tool | Notes |
|---|---|---|
| `remember` | `memory_add` | stores text verbatim; keep `meko_id` in `MemoryRecord` |
| `recall` | `memory_search` | filter client-side by `[deal:<id>]` prefix if the server cannot filter; trim each hit to 240 chars; keep top `k` |
| `kb_search` | `knowledgebase_search` | Shared Knowledge + uploaded docs |
| `trace` | `conversation_add_message` | short label in `input`, the exchange in `output` (a question placed in `input` becomes a memory of its own and can outrank real decisions) |
| `promote` | `memory_promote` | needs an owner/maintainer key; one-way |
| `forget_deal` | `memory_delete_by_id` | loops over the `meko_id`s in `deal.memory_log` |

**Record text conventions** (all start with `[deal:<id>]`)
- `FINDING F-2 (critical, finance): <title> — <detail ≤ 200 chars>`
- `CONCESSION G-3 F-2 partial (+4 pts): <reason>` / `OPEN_QUESTION G-4 M-1: <missing_proof>`
- `DECISION: founder changed CAC to 4200 (source: founder answer G-3)`
- `LESSON (finance/unit_economics): <generalised sentence, no names>` ← the only thing ever promoted

**What gets written when**
1. After each `PersonaReport` (orchestrator, P2): one `remember` per finding, `persona=<persona>`.
2. During Grill (P2): after each evaluated answer → `remember` CONCESSION or OPEN_QUESTION; `trace` the turn; before evaluating → `recall(query = finding.title + founder answer first 120 chars, k=3)` and append hits to `deal_memory_digest` under "RECALLED MEMORY"; cross-talk (P-12) uses `recall(from_persona's own earlier findings)`.
3. At grill end (P2): for each finding with `resolved == "resolved"` and evidence in (`data_cited`, `document_referenced`), build a LESSON via `policy.to_lesson()`; if `policy.allowed_by_policy()` → `remember` it then `promote`. Then `kb_search` one lesson back so the Memory panel shows the round trip.
4. Checklist (P3): for each finding category, `kb_search("<category> documents investors request")`; keep a hit only if its text contains the library item title; create a `LedgerEntry` with `SourceRef(type="kb", ref=<doc title>, quote=<substring from hit ≤25 words>)`.
5. Delete (P1): `forget_deal()` before removing local state.

**Budget & timing**: each call has an 8 s timeout and one retry; `calls_made` increments per attempted live call; at `call_budget` the wrapper switches to `local` with `note="call budget reached"`. Typical full run target ≤ 60 Meko calls (6 findings×3 writes + ~12 grill turns×(1 recall + 1 write + 1 trace) + promotion/KB).

**Policy functions** (`memory/policy.py`, pure code, unit-tested): `allowed_by_policy(finding, evaluation) -> bool` (resolved + data/document evidence + not injection_attempt) and `to_lesson(finding, evaluation) -> str` (fixed template using persona, category, evidence_type only).
