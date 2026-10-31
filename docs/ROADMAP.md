# ROADMAP — 24 hours, 4 people

H0 = the minute the hackathon clock starts. All times are relative. Fix the real clock times together in the first 10 minutes and write them here.

## 0. SPONSOR TRACKS — the ₹50,000 is decided here (read this first)

We are competing for prizes from **Google Gemini API** and **Yugabyte Meko**. Judges for these tracks will look for *meaningful* use, not a logo. Rule: if a judge asks "where is Gemini / where is Meko?", we can point at a screen within 5 seconds.

### 0.1 What Meko is (so everyone uses the same words)
Meko is Yugabyte's agent-native data layer (built on YugabyteDB). Agents talk to it over **one MCP endpoint** (`https://mcp.mekodata.ai/mcp`). Key words:
- **Datapack** = the workspace. One datapack for our app; every deal is namespaced inside it.
- **Memory** = private per-account records, each tagged with the `agent_id` that wrote it. Tools: `memory_add`, `memory_search`, `memory_update`, `memory_delete_by_id`.
- **Shared Knowledge** = the part everyone on the datapack can read. `memory_promote` moves a memory there (**one-way, needs an owner/maintainer key**). Read with `knowledgebase_search`. You can also upload PDF/markdown/text docs into the Knowledge section in the portal.
- **Trace** = the record of one run, written with `conversation_add_message`, viewable in Meko's **Observe hub**. This is our "audit trail" demo moment.
- `memory_add` stores your text **verbatim**; `conversation_add_message` extracts memories from the *input* side and may rewrite or drop them. So **code decides what is remembered** (matches our Golden Rule 5 spirit) — the LLM never gets write access to Meko.
- Official reference to copy patterns from: `github.com/YugabyteDB-Samples/meko-agent-handoff` (Apache-2.0; read `meko.py` and `meko_client.py`) and `docs.mekodata.ai/quick-start/`. Ask in the Meko Discord (`mekodata.ai/discord`) if a tool call misbehaves.

### 0.2 Why Meko fits SecondBrain (the pitch sentence)
> "Three investor agents plus a grilling loop is a multi-agent system. Without shared memory they repeat questions and forget what the founder already proved. Meko is the shared memory: every finding, every defense, every concession is remembered, searchable, and traceable — and only evidence-backed lessons are promoted to shared knowledge."

### 0.3 Where Meko plugs in (the full map — build in this order)

| # | Plug-in point | What happens | Meko tools | Owner | Prompt | Hour |
|---|---|---|---|---|---|---|
| **M1** | Wrapper + fallback + budget | `backend/app/memory/` with modes `live` / `local` / `off`; every call has 8 s timeout, one retry, then falls back to in-process local memory (`source="local_fallback"`); counts calls against `MEKO_CALL_BUDGET`; appends a `MemoryRecord` + emits `memory` SSE event for every call | all (connect over MCP) | **P4** | **M.1** | H0–3 |
| **M2** | Lifecycle & config | `/api/health` reports Meko mode + Gemini model; `Deal.meko` (`MekoStatus`) filled at deal creation; one **trace** (`conversation_id`) per deal; DELETE deal also calls forget on every `meko_id` in `memory_log` | `conversation_add_message`, `memory_delete_by_id` | **P1** | 1.1 + 1.4 add-ons | H0–2, H9–11 |
| **M3** | Persona findings remembered | After each `PersonaReport`, code writes each finding as one memory: `agent_id=<persona>:<deal_id>`, text = `FINDING F-2 (critical, unit economics): ...` | `memory_add` | **P2** | 2.2 add-on | H5–8 |
| **M4** | Recall inside the Grill Room | Evaluator's `deal_memory_digest` = code digest **plus** top-3 recalled memories (prior concessions, the other personas' findings). Cross-talk (P-12) is fed by what another persona *actually remembered* | `memory_search` | **P2** | 2.3 add-on | H6–10 |
| **M5** | Defenses & concessions remembered | After every evaluated answer: write `CONCESSION ...` or `OPEN_QUESTION ...`; post the turn to the trace (short label in `input`, the exchange in `output`) | `memory_add`, `conversation_add_message` | **P2** | 2.3 add-on | H6–10 |
| **M6** | Promotion gate in code | `allowed_by_policy()` promotes only **generalised lessons** from findings that reached `resolved` with `evidence_type` data/document. No company name, no deck text in what is promoted (promotion is one-way, shared datapack-wide). Runs at grill end | `memory_promote` | **P2** (policy fn lives in P4's module) | 2.5 add-on | H12–15 |
| **M7** | Knowledge Base seeded | `checklist_library.json` (India items) + investor rubrics are exported to markdown and uploaded in the Meko portal → Knowledge. Checklist generator calls `knowledgebase_search` per finding; each KB-backed item also gets a `LedgerEntry` with `SourceRef.type="kb"` (ref = KB doc title, quote verified as a substring of the returned hit) | `knowledgebase_search` | **P3** | 3.4 add-on | H12–15 |
| **M8** | "Meko Memory" panel + "Ask the memory" box | Live feed of `memory_log` (write / recall / promote, latency, live vs local chip), `MekoStatus` badge, link "Open trace in Meko", and a small search box that runs `memory_search` for the current deal | `memory_search` | **P4** | 4.4 add-on + 4.8 | H6–13, H13–16 |
| **M9** | Restart-proof recall | Kill backend → restart → refresh: Grill resumes and the digest is rebuilt from Meko memory (not only the JSON snapshot). This is the "second process remembers" demo beat | `memory_search` | **P2** | 2.7 add-on | H18–22 (bug-fix scope only) |
| **M10** | Demo moment | Open Meko **Observe hub** trace live during the demo (see `docs/DEMO_AND_QA.md`) | — | **P4** | 4.7 add-on | H18–22 |
| **M11** (stretch) | Gemini calls Meko tools itself (read-only) | Give the persona/evaluator Gemini call read-only function tools `memory_search` / `knowledgebase_search` via the Meko MCP session. Writes stay in code. Build only if C2 passed with margin | read tools | **P2** | 2.8 | H12–15, **first on the cut list** |

### 0.4 Where Gemini shows up (already our only LLM — make it visible)
All LLM calls go through `backend/app/llm.py` → `google-genai` → Gemini. **No other provider anywhere** (no OpenAI/Anthropic keys in the repo). Five touchpoints to point at in the demo and the README:
1. **Structured output** (`response_schema` = Pydantic) for every extraction and persona call — why our outputs validate.
2. **Multimodal**: ugly image-only decks go through the Gemini vision path (`LLM_MODEL_VISION`).
3. **Model routing**: fast model for extraction/evaluation, stronger model for persona analysis (`LLM_MODEL` vs `LLM_FALLBACK_MODEL`; names only from `scripts/list_models.py`, never hard-coded).
4. **Parallel agents**: three Gemini personas via `asyncio.gather`, streamed over SSE.
5. **Usage visible**: shell footer shows `Gemini <model> · N calls` and `Meko live · M calls` (from `/api/health` + `Deal.meko`). Log token counts per call in `llm.py`.
(Stretch M11 adds Gemini function-calling over the Meko MCP session.)

### 0.5 Prize-readiness checklist (P4 owns, reviewed at C3 and F1)
- [ ] Meko Observe hub shows a full trace for a demo run (both in `live` mode)
- [ ] Memory panel shows ≥ 10 live `memory_add` / `memory_recall` rows after one analysis + 6 grill turns
- [ ] At least one recall changes the output visibly (e.g. evaluator references an earlier concession; cross-talk quotes another persona's remembered finding)
- [ ] One `memory_promote` happened and was read back with `knowledgebase_search`
- [ ] Knowledge Base contains the uploaded India checklist docs and a `kb`-sourced ledger entry is linked to a Data Room item
- [ ] `MEKO_MODE=local` demo still completes (wifi-off safe) and the UI says "local fallback" honestly
- [ ] Gemini footer counter visible; README has a "Built with Gemini + Meko" section with the 5 + 11 points above
- [ ] Registered/submitted for the sponsor tracks as the hackathon rules require (**P1 confirms the submission steps at H0 and again at H20** — read the hackathon page for what exactly must be filled in)

## 1. Team split (equal load, vertical ownership, zero overlapping files)

| | **P1 — Platform & Ingestion** | **P2 — Agents & Grill Room** | **P3 — Finance Lab & Data Room** | **P4 — Market/Tech Grounding, Ledger & Demo** |
|---|---|---|---|---|
| Backend | repo scaffold, store, SSE, **Gemini-only** LLM wrapper (+ usage counters), security (SSRF/untrusted), PDF parse + vision fallback + extraction → `DeckFacts`, deals routes, export, **Meko lifecycle (M2: trace per deal, forget on delete, health)** | 3 persona agents, orchestrator, moderator, scoring, ledger builder, grill state machine, evaluator + clamp, cross-talk, verdicts, narrative, **Meko hooks (M3 remember findings, M4 recall in grill, M5 remember defenses, M6 promote)** | finance engine, break-point solver, tornado, finance routes, finance_glue, checklist generator + India library, grill finance-override hook, **Meko Knowledge Base seeding + `kb` lookups (M7)** | market grounding (Tavily + verification), TAM check, tech check (site + GitHub), cache + demo mode, **`memory/` Meko wrapper + local fallback + promotion policy (M1, M6 policy fn)** |
| Frontend | upload page, deal shell (tabs, stage progress, readiness gauge), report view, export | Grill Room chat UI, concession tracker, live score meter, final verdict cards, narrative view + before/after | Finance Lab (assumptions panel, sliders, runway chart, tornado, formula drawer), Data Room checklist UI, `formatINR` | Evidence Ledger side panel, Market Intel tab (competitor cards, TAM check), Tech section, cached badge, **Meko Memory panel + "Ask the memory" box (M8)** |
| Extras | hardening/injection tests, deployment, README | anti-sycophancy red-team tests | unit tests for engine, India checklist content | demo deck + 2 ugly decks + injection deck, eval harness, demo script, judge Q&A, backup video, **prize-readiness checklist (0.5), Meko Observe-hub demo beat (M10)** |

Each person: ~2 backend modules + 2 UI modules + 1 extras block + a small Meko slice (P4 carries the biggest one: the wrapper). Pair up for review: **P1↔P3**, **P2↔P4** (each reviews the other's PR before merge to main).

## 2. Hour-by-hour

**Step 0 (first 20 min, everyone) now includes sponsor setup** — see `docs/TEAM_PROMPTS.md` STEP 0: Gemini key, Tavily key, **Meko account + datapack + API key + datapack UUID** (P4 creates, shares key in the team chat, nobody commits it).

| Hours | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| **H0–1** | Create repo, add kit files, push `main`. Prompt **1.1** (scaffold + mocks; includes Gemini usage counters + Meko config/health stubs) | Read docs (esp. §0 above), set up env, run `list_models.py` once 1.1 lands; Prompt **2.1** starts | Prompt **3.1** (finance engine — pure module) | Prompt **4.1** (clean demo deck only), Tavily key tested, **Meko account/datapack/key + knowledge upload test** |
| **H1–6** | **1.1 → 1.2** (ingestion) | **2.1 → 2.2** (personas, orchestrator, moderator, scoring; **+ M3 remember findings via the `memory` interface, running on `local` mode until M1 lands**) | **3.1 → 3.2** (engine + routes + glue) | **M.1** (Meko wrapper, H0–3, in parallel with 4.1) → **4.2 → 4.3** (market grounding, tech check) |
| **H6** | **CHECKPOINT C1** (all merge to main): ingest→DeckFacts works; engine unit-tested; persona agents run on fixtures; market returns verified competitors; **Meko wrapper passes a live `memory_add` → `memory_search` round-trip and a forced-failure test falls back to local**. Integrator: **P1**. Prompt **C1**. |
| **H6–12** | **1.3** upload + deal shell UI (**+ Gemini/Meko status footer**), **1.4** security (**+ forget-on-delete**) | **2.3** grill backend (**+ M4 recall, M5 remember defenses + trace**), **2.4** Grill Room UI (against mock SSE) | **3.3** Finance Lab UI | **4.4** Ledger + Market Intel UI (**+ M8 Meko Memory panel**) |
| **H12** | **CHECKPOINT C2**: full happy path on the demo deck, real mode (Gemini + Meko **live**), analysis → report → finance → market; **Memory panel shows live rows**. Integrator: **P2**. Prompt **C2**. |
| **H12–18** | **1.5** report view/export, **1.6** deploy (**Meko env vars on host**) | **2.5** narrative + before/after (**+ M6 promotion at grill end**), **2.6** red-team the evaluator, *(stretch 2.8 = M11 only if C2 had margin)* | **3.4** checklist generator (**+ M7 KB seeding & `kb` lookups**), **3.5** Data Room UI, **3.6** grill↔finance hook | **4.5** cache + demo mode (**+ `MEKO_MODE=local` mapping**), **4.1b** ugly/injection/sparse decks, **4.8** "Ask the memory" endpoint + box, **4.6** eval harness on all decks |
| **H18** | **CHECKPOINT C3 = FEATURE FREEZE.** Only bug fixes after this. Integrator: **P3**. Prompt **C3** (now also verifies prize-readiness checklist 0.5). |
| **H18–22** | Polish + empty/error states (Prompt **1.7**) | Prompt **2.7** (grill polish + latency; **M9 restart-proof recall check**) | Prompt **3.7** (Finance Lab polish, formula drawer) | Prompt **4.7** (demo script **with Meko Observe-hub beat**, Q&A, backup video) |
| **H22–24** | **FINAL QA** (Prompt **F1**, integrator P4), 3 full dress rehearsals (**once with Meko `live`, once with `local`, once wifi-off**), cache refresh, backup video, laptop + hotspot test, **sleep rotation** | | | |

Sleep: nobody works 24 h straight. P1 + P3 sleep H13–17; P2 + P4 sleep H16–20 (someone from each pair is always awake). Everyone awake H20–end.

## 3. Checkpoint acceptance tests (must pass to proceed)

**C1 (H6)**
- `POST /api/deals` with the demo PDF returns `DeckFacts` containing the ₹500 crore claim and the "no competitors" claim, in < 20 s.
- `finance_engine` unit tests pass incl. a hand-computed example; `/finance/compute` < 100 ms.
- Market grounding returns ≥ 3 *verified* competitors with URLs for the demo deck (or the cache loads).
- The 3 persona agents each return a valid `PersonaReport` (Pydantic validation passes) with sources on every finding.
- **Meko:** `memory/` wrapper does a live `memory_add` then `memory_search` that finds it (< 3 s); with the network blocked or `MEKO_MODE=local` the same calls succeed via local fallback and `MemoryRecord.source == "local_fallback"`; a call over `MEKO_CALL_BUDGET` is skipped (`status="skipped"`) without error.
- **Gemini:** `/api/health` shows the Gemini model name; no import of any other LLM SDK anywhere (`grep -ri "openai\|anthropic" backend/ frontend/` finds nothing).

**C2 (H12)**
- Upload → streamed analysis → report with Evidence Ledger, Finance Lab, Market Intel populated, in ≤ 45 s, real mode.
- Grill Room can run ≥ 2 turns end-to-end with real evaluator; clamp rule demonstrably downgrades a confident empty answer.
- No unhandled error in browser console during the happy path.
- **Meko:** after one analysis the Memory panel shows ≥ 5 `memory_add` rows (one per top finding at least) with `source="meko_live"`; a Grill turn shows ≥ 1 `memory_recall` row and the evaluator's digest includes a recalled item; the deal has a trace id and the trace opens in Meko's Observe hub.

**C3 (H18, freeze)**
- Full demo story (see `docs/DEMO_AND_QA.md`) runs start to finish in real mode AND in `DEMO_MODE=cached` with wifi off.
- Readiness Score rises after good defenses and stays flat after bad ones. Checklist updates live. Narrative cites the defenses.
- Injection deck is flagged, ugly deck parses via vision fallback.
- **Meko:** one promotion happened and `knowledgebase_search` returns it; a `kb`-sourced ledger entry linked to a Data Room item exists; deleting a deal removes its memories (re-search returns nothing); `MEKO_MODE=local` full story works; prize-readiness checklist §0.5 fully ticked.

## 4. Integration order (when merging)
`contracts` → P1 scaffold/store/llm/sse → **P4 memory (Meko wrapper)** → P3 engine → P4 tools → P2 agents/grill (consume tools + memory) → UIs. Merge in that order; run `pytest -q` and `npm run build` after each merge.

## 5. Risk register & fallbacks

| Risk | Fallback (decide in advance) |
|---|---|
| Gemini rate limit / outage | `llm.py` retries once, then falls back to a second model name in `LLM_FALLBACK_MODEL`; demo mode uses cached analysis for the demo deck. |
| Tavily quota / venue wifi | `DEMO_MODE=cached` loads `backend/cache/demo/*.json`; UI shows "cached from live search on <date>". Refresh cache at H21. |
| Vision fallback slow | Cap at 8 vision pages, run concurrently, 20 s total budget; otherwise mark slide `[unreadable]` and add to missing_data. |
| Grill evaluator too generous | Clamp rule in code; red-team script (2.6) with 10 adversarial answers must all fail to get `accepted`. |
| Latency | Parallel agents, streaming, prompt digests ≤ 1,500 tokens, small fast model for extraction, bigger one only for persona analysis if needed. |
| Meko down / slow / quota reached / venue wifi | Wrapper falls back to `local` memory automatically (8 s timeout, one retry); `MEKO_CALL_BUDGET` caps calls so we never burn the free tier before the demo; UI chip says `live` vs `local fallback` honestly; demo story must work in both. **Never block a user action on Meko.** |
| Meko tool names/params differ from what we assumed | M.1's first step is `list_tools()` on the MCP server and copying the connection pattern from the official `meko-agent-handoff` repo; wrapper maps our 6 verbs (`remember`, `recall`, `kb_search`, `trace`, `promote`, `forget`) to whatever the server actually exposes. Ask in Meko Discord if blocked > 20 min. |
| Meko `promote` is one-way and datapack-wide | Only **generalised lessons** (no company name, no deck text) are ever promoted; promotion runs only at grill end; use a **dedicated hackathon datapack** (never anything real); a fresh datapack for the final demo if the old one gets noisy. |
| Privacy claim vs. Meko persistence | UI copy changes (see CLAUDE.md §6): deck facts and defenses are written to Meko memory for the session and deleted on Delete. Demo decks are fictional. Q&A states it openly. |
| API key leak | `.env` only; `.env.example` has empty values; revoke + recreate the Meko key after the hackathon if it was ever pasted in a chat. |
| Merge hell | Folder ownership; contracts additive-only; small frequent merges; rebase before merge. |
| Demo laptop dies | Second laptop with repo + `.env`; deployed URL; recorded 3-min video (P4). |

## 6. Cut list (cut in this order if behind)
1. Voice input (never build it unless everything else is done)  2. **M11 Gemini-calls-Meko-tools (stretch)**  3. Cross-talk  4. Tech check GitHub stats  5. Evidence upload loop  6. Narrative "diff" view
7. Funnel (TAM→SAM→SOM)  8. Tornado chart  9. **"Ask the memory" box (M8b)**.
**Never cut:** parsing, 3 agents, ledger, grill + clamp, finance sliders, market grounding for TAM + "no competitors", **and the sponsor core: Gemini-only LLM wrapper, Meko wrapper with local fallback, M3 remember findings, M4/M5 recall + remember in grill, Memory panel, one promotion, Observe-hub demo beat.** Cutting those risks the prize.

## 7. Communication rules
- One group chat. Post: "pushed <branch>: <what>" after every push; "BLOCKED on <who>: <what>" immediately when blocked.
- 10-minute standup at H3, H6 (checkpoint), H9, H12 (checkpoint), H15, H18 (freeze), H21.
- Contract change request: post exact diff, wait for P1 ack, then commit `CONTRACT CHANGE:`.

## 8. How to use Antigravity well
- Open the SAME repo in each person's Antigravity; each works on their own branch. Paste ONE prompt at a time from `docs/TEAM_PROMPTS.md`.
- Start each task in **Planning mode**; read the plan; reject plans that touch files you don't own. Then let it execute.
- Always ask it to run tests/build and to show the result before you accept. For UI, have it open the page in the browser and check the golden path.
- If it drifts: stop, say "Re-read CLAUDE.md section 2 and 4, revert changes outside <your folders>, then continue."
- If rules files aren't picked up automatically, paste the content of `CLAUDE.md` into the workspace Rules and also attach it to the first message.
- Antigravity + Meko: Meko can also be added to your coding agent as an MCP server (`npx @yugabytedb/meko-mcp`) — optional. Do **not** let a coding agent write into the *app's* datapack while building; use a separate scratch datapack for tooling so demo memory stays clean.
- Sponsor-track rule of thumb for every PR: "Does this make Gemini or Meko visibly more useful on screen?" If it neither helps the demo nor the sponsor story, defer it.
