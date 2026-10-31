<<<<<<< HEAD
# SecondBrain Integration Issues & Status (P4 Handoff)

This file tracks cross-module coordination items between P1, P2, P3, and P4.

---

### P4 Status (Market Grounding, Tech Check, Meko Memory, Demo Decks, Eval): COMPLETE
- All 5 test decks generated and verified under `demo/decks/` (`bolbot_clean.pdf`, `bolbot_ugly_images.pdf`, `bolbot_injection.pdf`, `sparse_early_stage.pdf`, `known_failed_startup.pdf`).
- Full Meko memory subsystem built under `backend/app/memory/` (`base.py`, `local.py`, `meko.py`, `policy.py`, `__init__.py`).
- Automatic local fallback and circuit breaker validated via `scripts/meko_smoke.py`.
- Grounding tools built under `backend/app/tools/` (`market_search.py`, `tech_check.py`).
- Caches generated in `backend/cache/demo/` (`market.json`, `tech.json`, `reports.json`).
- Frontend components ready in `frontend/components/` (`EvidenceLedger.tsx`, `MarketIntel.tsx`, `MekoMemoryPanel.tsx`).
- Demo script (`demo/script.md`), Q&A guide (`demo/qa.md`), and evaluation harness (`scripts/eval_decks.py`) fully verified.
- All 17 unit tests passing green.

---

### Items for P1 (Platform, Ingest, Store, SSE)
1. **Store memory plumbing:**
   - In `backend/app/memory/meko.py` line 118: Memory client includes hooks to call `get_store().append_memory_record(deal_id, record)`. Ensure `store.py` defines `append_memory_record` or appends records to `deal.memory_log`.
2. **SSE memory events:**
   - In `backend/app/memory/meko.py` line 125: Emits `memory` event with `record.model_dump()`.
3. **Delete Deal lifecycle:**
   - `DELETE /api/deals/{id}` in `backend/app/routes/deals.py` must invoke `await get_memory().forget_deal(deal_id)` to ensure all session memories in Meko and local memory are cleared.

---

### Items for P2 (Agents & Grill Room)
1. **Recall in Grill Evaluator:**
   - Evaluator (`backend/app/agents/evaluator.py`) can call:
     ```python
     from backend.app.memory import get_memory
     recalled = await get_memory().recall(deal_id, query=f"{finding.title} {answer[:120]}", k=3)
     ```
     and pass `recalled.hits` into `P-09` context.
2. **Remember Findings & Concessions:**
   - After each Persona report: write each finding using `await get_memory().remember(deal_id, persona, text, "FINDING")`.
   - After each evaluated answer: write `CONCESSION ...` or `OPEN_QUESTION ...`.
3. **Promotion Policy at Grill End:**
   - Use `from backend.app.memory.policy import allowed_by_policy, to_lesson` to guard promotion into Shared Knowledge.

---

### Items for P3 (Finance Lab & Data Room)
1. **Knowledge Base Seeding:**
   - For India checklist items, query `await get_memory().kb_search(query)` to find matching guidance in `backend/kb/`.
=======
# Freeze Audit & Teammate Action Items (ISSUES.md)

Audit conducted at Feature Freeze by P1. Per team guidelines, issues in other teammates' modules are logged here with file and line references instead of modifying external files directly.

---

## 1. P2 — Agents, Grill Room & Evaluation

### [P2-01] Ensure `clamp_outcome()` is invoked in `agents/evaluator.py`
- **Reference**: `contracts/schemas.py:421-442`
- **Issue**: Golden Rule 5 mandates anti-sycophancy in code, not prompt. If the LLM proposes `outcome="accepted"` but `criteria.evidence_type` is `"none"` or `"assertion"`, code must deterministically downgrade the outcome to `"partial"` with reason `"Clamped: accepted outcome requires data_cited or document_referenced"`.
- **Action**: Import `clamp_outcome` from `contracts.schemas` and apply it to every `Evaluation` object before persisting to `deal.grill_turns`.

### [P2-02] Shared Memory Recall in Grill Turns
- **Reference**: `docs/ROADMAP.md:28-29` (M4, M5)
- **Issue**: Evaluator prompts should consume memories written by earlier turns and other personas (e.g. Finance findings recalled during Tech questions).
- **Action**: In `agents/grill.py` and `agents/evaluator.py`, call `memory.recall(deal_id, query, persona=None, k=3)` and append recalled memory snippets to the evaluation digest.

### [P2-03] Accessibility in Grill Room UI
- **Reference**: `frontend/components/grill/`
- **Issue**: Founder response textarea must support `Cmd+Enter` (macOS) and `Ctrl+Enter` (Windows/Linux) to submit the defense without requiring a mouse click.
- **Action**: Add `onKeyDown` handler checking `(e.metaKey || e.ctrlKey) && e.key === 'Enter'` to trigger answer submission.

---

## 2. P3 — Finance Lab & Data Room Checklist

### [P3-01] Strict 36-Month Runway Simulation Cap
- **Reference**: `contracts/schemas.py:165-185` (`FinanceMetrics.runway_capped`)
- **Issue**: If cash burn is zero or negative (profitable), the runway must not display infinite or unconstrained numbers on screen.
- **Action**: In `tools/finance_engine.py`, cap `runway_months` at `36.0` and set `runway_capped = True` with an explicit assumption note.

### [P3-02] Consistent INR Formatting with Lakh / Crore
- **Reference**: `contracts/schemas.py:3-4`, `frontend/lib/format.ts`
- **Issue**: All financial metrics, sliders, and chart tooltips must use Indian Rupee currency formatting (`₹`, lakh, crore) rather than USD or raw unformatted millions.
- **Action**: In `frontend/components/finance/`, format currency using `formatINR()`:
  - `< ₹1 Lakh`: `₹XX,XXX`
  - `≥ ₹1 Lakh and < ₹1 Crore`: `₹X.XX L`
  - `≥ ₹1 Crore`: `₹X.XX Cr`

### [P3-03] India Compliance Checklist Rationale
- **Reference**: `contracts/schemas.py:218-228` (`ChecklistItem.india_specific`)
- **Issue**: India diligence items (DPDP compliance, MCA filings, FEMA 20R, GST reconciliation) must clearly highlight `india_specific: true` in the UI to stand out to judges.
- **Action**: In `frontend/components/dataroom/`, render a tricolor or "India Specific" badge on items flagged with `india_specific: true`.

---

## 3. P4 — Market Grounding, Tech Signals & Memory Layer

### [P4-01] Substring Verification for Web Facts
- **Reference**: `CLAUDE.md:28-30` (Golden Rule 3)
- **Issue**: No competitor funding figure or TAM stat may be shown as `verified` unless the exact quote is verified by code substring check against the fetched page text.
- **Action**: In `tools/market_search.py`, verify `evidence_quote.lower() in page_text.lower()`. If absent, mark `status="unverified"`.

### [P4-02] Meko Local Fallback Honesty
- **Reference**: `CLAUDE.md:41-43` (Golden Rule 11), `backend/app/memory/`
- **Issue**: When `MEKO_MODE=local` or when MCP network requests timeout (> 8s), calls must not raise unhandled exceptions or block the UI pipeline.
- **Action**: Return `MemoryRecord(source="local_fallback", status="ok")` and ensure `Deal.meko.mode` reports `"local"` honestly with tooltip note.

### [P4-03] Cache Pre-warming for Demo Deck
- **Reference**: `docs/ROADMAP.md:77` (Prompt 4.5)
- **Issue**: Cold start on pitch stage cannot depend on Tavily network latency or rate limits.
- **Action**: Ensure `backend/cache/demo/` contains verified market grounding and tech signals for BolBot, loaded whenever `DEMO_MODE=cached`.
>>>>>>> 49c1725ccbcbdec3c47693004819de9702a425b3
