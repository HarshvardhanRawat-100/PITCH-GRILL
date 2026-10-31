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
