# PITCH-GRILL Integration Issues & Status

This document tracks cross-module coordination items between P1 (Platform), P2 (Agents/Grill), P3 (Finance/Dataroom), and P4 (Market/Memory/Demo).

---

## 1. P4 Handoff Status (Market Grounding, Tech Check, Meko Memory, Demo Decks, Eval)
- All 5 test decks generated and verified under `demo/decks/` (`bolbot_clean.pdf`, `bolbot_ugly_images.pdf`, `bolbot_injection.pdf`, `sparse_early_stage.pdf`, `known_failed_startup.pdf`).
- Full Meko memory subsystem built under `backend/app/memory/` (`base.py`, `local.py`, `meko.py`, `policy.py`, `__init__.py`).
- Automatic local fallback and circuit breaker validated via `scripts/meko_smoke.py`.
- Grounding tools built under `backend/app/tools/` (`market_search.py`, `tech_check.py`).
- Caches generated in `backend/cache/demo/` (`market.json`, `tech.json`, `reports.json`).
- Frontend components ready in `frontend/components/` (`EvidenceLedger.tsx`, `MarketIntel.tsx`, `MekoMemoryPanel.tsx`).
- Demo script (`demo/script.md`), Q&A guide (`demo/qa.md`), and evaluation harness (`scripts/eval_decks.py`) fully verified.
- All unit tests passing green.

---

## 2. Items for P1 (Platform, Ingest, Store, SSE)
1. **Store memory plumbing:**
   - In `backend/app/memory/meko.py`: Memory client includes hooks to call `get_store().append_memory_record(deal_id, record)`. Ensure `store.py` defines `append_memory_record` or appends records to `deal.memory_log`.
2. **SSE memory events:**
   - In `backend/app/memory/meko.py`: Emits `memory` event with `record.model_dump()`.
3. **Delete Deal lifecycle:**
   - `DELETE /api/deals/{id}` in `backend/app/routes/deals.py` must invoke `await get_memory().forget_deal(deal_id)` to ensure all session memories in Meko and local memory are cleared.

---

## 3. Items for P2 (Agents & Grill Room)
1. **Recall in Grill Evaluator:**
   - Evaluator (`backend/app/agents/evaluator.py`) can call:
     ```python
     from app.memory import get_memory
     recalled = await get_memory().recall(deal_id, query=f"{finding.title} {answer[:120]}", k=3)
     ```
     and pass `recalled.hits` into `P-09` context.
2. **Remember Findings & Concessions:**
   - After each Persona report: write each finding using `await get_memory().remember(deal_id, persona, text, "FINDING")`.
   - After each evaluated answer: write `CONCESSION ...` or `OPEN_QUESTION ...`.
3. **Promotion Policy at Grill End:**
   - Use `from app.memory.policy import allowed_by_policy, to_lesson` to guard promotion into Shared Knowledge.
4. **[P2-01] Ensure `clamp_outcome()` is invoked in `agents/evaluator.py`:**
   - Reference: `contracts/schemas.py`
   - Issue: Anti-sycophancy in code, not prompt. If the LLM proposes `outcome="accepted"` but `criteria.evidence_type` is `"none"` or `"assertion"`, code must deterministically downgrade the outcome to `"partial"` with reason `"Clamped: accepted outcome requires data_cited or document_referenced"`.
   - Action: Import `clamp_outcome` from `contracts.schemas` and apply it to every `Evaluation` object before persisting to `deal.grill_turns`.
5. **[P2-02] Shared Memory Recall in Grill Turns:**
   - Evaluator prompts should consume memories written by earlier turns and other personas.
   - Action: In `agents/grill.py` and `agents/evaluator.py`, call `memory.recall(deal_id, query, persona=None, k=3)` and append recalled memory snippets to the evaluation digest.
6. **[P2-03] Accessibility in Grill Room UI:**
   - Founder response textarea must support `Cmd+Enter` (macOS) and `Ctrl+Enter` (Windows/Linux) to submit defense.

---

## 4. Items for P3 (Finance Lab & Data Room)
1. **Knowledge Base Seeding:**
   - For India checklist items, query `await get_memory().kb_search(query)` to find matching guidance in `backend/kb/`.
2. **[P3-01] Strict 36-Month Runway Simulation Cap:**
   - Reference: `contracts/schemas.py` (`FinanceMetrics.runway_capped`)
   - In `tools/finance_engine.py`, cap `runway_months` at `36.0` and set `runway_capped = True` with an explicit assumption note.
3. **[P3-02] Consistent INR Formatting with Lakh / Crore:**
   - Reference: `contracts/schemas.py`, `frontend/lib/format.ts`
   - All financial metrics, sliders, and chart tooltips must use Indian Rupee currency formatting (`₹`, lakh, crore).
4. **[P3-03] India Compliance Checklist Rationale:**
   - Reference: `contracts/schemas.py` (`ChecklistItem.india_specific`)
   - Highlight India-specific checklist items (DPDP, MCA, FEMA 20R, GST) with distinctive badges.

---

## 5. Items for P4 (Market Grounding, Tech Signals & Memory Layer)
1. **[P4-01] Substring Verification for Web Facts:**
   - No competitor funding figure or TAM stat may be shown as `verified` unless the exact quote is verified by code substring check against fetched page text.
2. **[P4-02] Meko Local Fallback Honesty:**
   - When `MEKO_MODE=local` or when requests timeout, calls must return local fallback gracefully without unhandled exceptions.
3. **[P4-03] Cache Pre-warming for Demo Deck:**
   - Ensure `backend/cache/demo/` contains verified market grounding and tech signals for BolBot, loaded whenever `DEMO_MODE=cached`.
