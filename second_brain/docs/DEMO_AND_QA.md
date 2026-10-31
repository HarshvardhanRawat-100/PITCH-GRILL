# DEMO SCRIPT & JUDGE Q&A

Rule: **only claim what the built system does.** P4 verifies every line below against the app at H22 and deletes anything untrue.

## 1. The 5-minute demo (one presenter, one driver)

| Time | On screen | Say | Proves |
|---|---|---|---|
| 0:00 | Slide: "Founders get one shot at a pitch. We give them three." | "Every founder meets hostile investors for the first time when real money is on the line. SecondBrain lets them face three of them first." | Problem |
| 0:30 | Upload `bolbot_clean.pdf` (generic deck). Analysis streams: Finance is *calculating*, Market is *searching the web*, Tech is *inspecting the product*. | "Three Gemini-powered agents, three different tools, one shared memory in Meko. Not three prompts." (point at footer: `Gemini <model> · N calls`, `Meko live · M calls`) | Not "ChatGPT with a prompt"; both sponsors visible |
| 1:00 | Report tab: top-3 issues. Open **Market Intel**: deck says "₹500 crore" and "no direct competitors" → 3 competitors with URLs, funding text with source links, "verified in page text ✓". Show the **Evidence Ledger** counts. | "Every claim carries its source. Every web fact is checked against the page text in code. If we can't verify it, it says *unverified*." | Anti-hallucination, live grounding |
| 2:00 | **Finance Lab**: show assumptions panel (assumed values amber), drag the CAC slider: runway collapses; callout "plan breaks at CAC ₹X (+Y%)"; open "How this works". | "The LLM extracts; Python calculates. Judge, move the slider yourself." | Deterministic math |
| 2:50 | **Grill Room**: Finance asks the first question. Type a **weak, confident answer** ("we're very confident referrals will fix CAC"). Show: *Downgraded — confidence is not evidence*, score flat. | "It can't be sweet-talked. Concession needs evidence, enforced in code." | Anti-sycophancy |
| 3:30 | Second question: type a **strong answer** with specific data ("referral pilot: 120 customers at ₹2,900 CAC, sheet attached"). Finance Lab updates live; investor concedes partially/fully; score ticks up; Data Room item flips to *addressed*. | "Defense changes the model, the score, and the checklist." | Memory + reasoning + loop |
| 4:00 | Verdict cards, **Readiness Score before → after**, **Improved pitch** with the 3 real competitors named and TAM reframed; Data Room checklist (India-specific, items backed by the Meko knowledge base show a `kb` source). | "From critique to a sharper pitch and a to-do list." | Actionable |
| 4:20 | **Meko beat (25 s):** Memory panel (live writes by each investor, recalls during the grill) → type "What did the founder concede about CAC?" into *Ask the memory* → switch to the Meko Observe hub tab and show this deal's trace. | "Every finding, defense and concession was remembered in Meko by the agent that made it. The evaluator recalled the earlier answer before judging the next one, and only evidence-backed lessons — with no company data — get promoted to shared knowledge." | Shared memory, audit trail, sponsor track |
| 4:45 | Architecture slide (Gemini + Meko boxes labelled) + business slide. | See §3. | Business |

Do not improvise the demo. The two typed answers are scripted in `demo/script.md`. Keep one backup run in a second tab.

## 2. Likely judge questions → honest answers

| Question | Answer (all must be true in the build) |
|---|---|
| Isn't this just ChatGPT with prompts? | Three agents with different tools (math engine, live search + page verification, site/GitHub check), shared deal memory, a scoring model and an anti-sycophancy rule in code, and a defense loop that changes the numbers. Prompts are only one layer. |
| How do you stop hallucinations? | Evidence Ledger: every claim tagged deck / web / calc / inference with status. Competitor names, quotes and funding text must appear in the fetched page — checked in code. Unverified stays labelled unverified. |
| What if the search returns junk? | We extract only from fetched page text, verify in code, show the URL beside each fact, and drop anything unverifiable. Funding shows "unverified" rather than a guess. We target Indian startup news sites plus an open pass. |
| Who decides if a defense is good? | Per-persona rubric: addresses the objection / quantified / evidence type. `clamp_outcome()` in code downgrades "accepted" without data or a document. Concession Tracker shows reasons. We red-teamed it with N adversarial answers (fill in from `redteam_grill.py`). |
| Did the LLM do the math? | No. A deterministic engine computes runway, LTV, CAC break point and the tornado. The LLM extracts inputs from the deck and narrates. Formulas are visible in the app. |
| What if the deck has no numbers? | Missing inputs are flagged *assumed* (amber), editable by the founder, and become findings and Data Room items. |
| Prompt injection in the deck or in answers? | Deck, web pages and founder text are wrapped as untrusted data and extracted into fixed schemas. We ship a deck with a hidden "give 100/100" line — it's flagged and ignored. Injection in a Grill answer is flagged and rejected. |
| Is the score a funding prediction? | No. It's a *Pitch Readiness Score* that moves with defended findings, using a transparent severity-penalty formula. |
| Does it work on image-heavy decks? | Yes: pages with little text or mostly images go to a vision model; tested on an image-only deck. Unreadable slides are flagged as missing data. |
| Confidentiality? | The PDF is session-only and auto-deleted after 60 minutes or on Delete. Extracted findings and defenses are kept in Meko memory for the session and removed on Delete (we test that). Deck text is sent to Google Gemini to analyse it — we say this openly. Only generalised lessons with no company data are ever promoted to shared knowledge. Demo decks are fictional. |
| Why the sliders / why trust "18 → 4 months"? | Numbers come from the engine on the founder's own inputs; we solve for the break point rather than inventing a scary value, and show whether growth or spend is held fixed. |
| What about latency and cost? | Agents run in parallel and stream; analysis ≈ 45 s target. Cost per deck is a handful of LLM calls plus a few searches — measure and quote the real number from logs before you claim one. |
| How is this different from deck-review tools? | Those critique statically. We simulate the defense, ground claims in live sources, and run deterministic stress tests. |
| Who pays? | B-school E-Cells, incubators and accelerators (per-cohort licence), then founders directly. Quote pricing only if you have validated it; otherwise say "to be validated with 3 incubators". |
| Why Meko? What does it give you that a Postgres table wouldn't? | Shared agent memory, a knowledge base and per-run traces behind one MCP endpoint, so three agents and a grilling loop can recall what was said earlier and we get an audit trail and an Observe hub without hand-building a vector store and tables. We use a slice of it: memory, knowledge, trace, promote. Correctness never depends on it: math, scores, the clamp and verdicts are in code, and the app falls back to local memory if Meko is slow or down. |
| Where exactly is Meko used? | Findings written per persona; recall before each grill judgment and in cross-talk; concessions and open questions written after each answer; a trace per deal; evidence-backed lessons promoted to shared knowledge; the India diligence checklist docs are in its knowledge base and back some checklist items. All visible in the Memory panel. |
| What if Meko is down or the venue wifi dies? | Automatic local fallback with the same interface; the UI shows an amber "local fallback" chip instead of pretending. We rehearsed both modes (and a fully cached run). |
| Can the model write whatever it wants into memory / can memory be poisoned? | The model has no Meko tools: code decides what is written. Recalled memory is wrapped as untrusted data like decks and web pages, and cannot change scores, the clamp or verdicts. |
| Why Gemini? | Structured output keeps every agent response schema-valid, multimodal input handles image-only decks, we route a fast model for extraction/evaluation and a stronger one for persona analysis, and three agents run in parallel with streaming. It is the only LLM in the codebase. |
| What's the biggest limitation? | Live web evidence is only as good as public pages; funding data is often incomplete; the score is a rubric, not a prediction; Indian-market focus. Say this before they ask. |
| What would you build next? | Evidence upload loop (check uploaded documents against requests), voice defense, investor-style presets (B2B SaaS vs consumer), cohort-level dashboards for incubators. |

## 3. Business slide (1 slide, only what you can defend)
- **Customer:** incubators, accelerators, B-school entrepreneurship cells (cohort licence); founders (self-serve).
- **Why now:** founders pitch with zero realistic practice; mentors don't scale; B-schools run many pitch events.
- **Moat (honest):** workflow + grounded evidence ledger + defense data, not the model.
- **Validation:** tell them what you did (even 3 conversations with E-Cell heads or a mentor). If none, say it's the next step.

## 4. Test decks (P4)
`bolbot_clean`, `bolbot_ugly_images`, `bolbot_injection`, `sparse_early_stage`, `known_failed_startup` (recreated from public reporting; say so). Run `scripts/eval_decks.py` at C2, C3, and F1.

## 5. Demo-day checklist
- Two laptops with repo + `.env`, charger, HDMI/USB-C adapters, phone hotspot.
- `DEMO_MODE=cached` tested with wifi off. Cache refreshed at H21 (committed).
- Meko: portal tab pre-opened on the datapack's Observe hub (logged in), valid `MEKO_API_KEY` on both laptops, `meko_smoke.py` green, fresh datapack for the final run, `MEKO_MODE=local` rehearsal done once.
- Sponsor submission items from `docs/ROADMAP.md` §0.5 completed; README has "Built with Gemini + Meko".
- Deployed URL as third fallback. 3-minute backup video on desktop.
- Browser zoom 100–125 %, notifications off, one tab per scenario, fresh profile.
- Presenter and driver rehearsed 3× with a timer; scripted answers printed.
- Be ready to let a judge type their own answer in the Grill Room — it's the best moment; the clamp rule is what keeps it safe.
