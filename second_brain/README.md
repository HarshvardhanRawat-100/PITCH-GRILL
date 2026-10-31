# SecondBrain for Founders — AI Due-Diligence War Room

An adversarial, multi-agent due-diligence platform where founders upload their pitch deck (PDF) and face three hostile AI investor personas before pitching real venture capital:
1. **Finance Investor** — scrutinizes unit economics, burn rate, and runway with a **deterministic Python math engine**.
2. **Market Investor** — stress-tests TAM and competitor claims using **live web grounding via Tavily**, verified with strict substring quotes.
3. **Technical Investor** — audits product feasibility and data moats by inspecting the live product website and GitHub repository.

---

## 🏆 Built with Gemini + Meko

SecondBrain was built from day zero specifically for the **Google Gemini API** and **Yugabyte Meko** sponsor tracks. Rule: if a judge asks "where is Gemini / where is Meko?", we can point at a live screen within 5 seconds.

### The 5 Google Gemini Touchpoints
Gemini is the **only** LLM provider in the codebase (zero references to openai/anthropic).
1. **Structured Output Enforcement (`response_schema`)**: Every LLM extraction and persona synthesis call passes a strict Pydantic model (`DeckFacts`, `PersonaReport`, `Evaluation`) directly to Gemini via `google-genai`. This guarantees schema compliance without hallucinated JSON envelopes.
2. **Multimodal Vision Fallback (`LLM_MODEL_VISION`)**: Scanned, non-searchable, or graphic-heavy slides (< 40 text characters or > 60% image area) are rendered to 150 DPI in-memory PNGs and transcribed with Gemini vision under a 20-second concurrent budget.
3. **Resilient Model Routing & Fallback**: Fast inference models (`gemini-2.5-flash`) handle extraction and vision with an automatic fallback sequence to `gemini-2.5-pro` (`LLM_FALLBACK_MODEL`) on retry. Model names are dynamically validated using `scripts/list_models.py`.
4. **Parallel Agent Execution**: The three persona investors analyze simultaneously via `asyncio.gather`, streaming findings in real-time over SSE.
5. **Visible Real-time Usage Telemetry**: The persistent application footer exposes a live status chip (`Gemini <model> · N calls`) driven by `/api/health` and request telemetry.

### The 11 Yugabyte Meko Integration Points
Cross-agent shared memory operates over MCP (`https://mcp.mekodata.ai/mcp`), namespaced per deal:
1. **M1 — Resilient Memory Wrapper & Fallback**: `backend/app/memory/` supports `live`, `local`, and `off` modes. Every call enforces an 8-second timeout, 1 retry, call budgeting (`MEKO_CALL_BUDGET`), and honest local fallback.
2. **M2 — Deal Lifecycle & Cleanup**: Deal creation initializes a Meko session trace (`conversation_id`). Calling `DELETE /api/deals/{id}` executes `memory.forget_deal(deal_id)` to purge all session memories.
3. **M3 — Persona Findings Remembered**: Each investor's critical findings are written to Meko memory (`memory_add`), tagged by `agent_id = "<persona>:<deal_id>"`.
4. **M4 — Cross-Persona Recall in Grill Room**: When interrogating the founder, the evaluator recalls cross-persona memories (`memory_search`) so the Tech investor can follow up on contradictions discovered by the Finance investor.
5. **M5 — Defenses & Concessions Remembered**: Founder answers and concessions are stored to memory after evaluation and posted to the Meko trace (`conversation_add_message`).
6. **M6 — Promotion Gate in Code**: Only verified lessons from resolved findings pass `allowed_by_policy()` to be promoted (`memory_promote`) to Shared Knowledge. Deck text, company names, and raw founder answers are strictly blocked from promotion.
7. **M7 — Knowledge Base Grounding**: India compliance checklists (`checklist_library.json`) and investor rubrics are seeded into Meko Knowledge; the data room generator grounds items using `knowledgebase_search`.
8. **M8 — Live Memory Panel & Search**: The War Room UI includes a live memory feed (`memory_log`), latency counters, and a deal memory search box.
9. **M9 — Restart-Proof Memory State**: Even if the backend process restarts, the war room resumes and restores prior defenses directly from Meko.
10. **M10 — Live Audit Trail Demo**: Open the Meko **Observe hub** to show judges the immutable session trace.
11. **M11 — Function-Calling Tool Integration**: Read-only MCP tools for retrieval grounded in code.

#### Force Local Memory Switch
To force offline / local-fallback mode (e.g. for unreliable venue Wi-Fi), set:
```bash
MEKO_MODE=local
```
The UI status chip immediately turns amber and displays `Meko local fallback`, continuing operation without network calls to MCP.

---

## ⚡ One-Command Run Options

### Option 1: Native Launcher Script (Recommended for Development)
Runs both Backend (FastAPI on `:8000`) and Frontend (Next.js on `:3000`) concurrently with automatic cleanup on `Ctrl+C`:
```bash
./run_all.sh
```

### Option 2: Docker Compose (Clean Containerized Environment)
Runs isolated containers with volume mapping for persistence:
```bash
docker compose up --build
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)
- API Health: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Option 3: Manual Split Terminals
**Terminal 1 (Backend):**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## ☁️ Cloud Deployment Guide (Backup Instances)

For demo day safety, deploy a live cloud backup:

### 1. Backend on Render / Railway
Deploy from the repository root:
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Root Directory**: `backend`
- **Environment Variables**:
  | Variable | Value / Description |
  |---|---|
  | `MOCK` | `0` (or `1` for pure mock replay) |
  | `DEMO_MODE` | `cached` |
  | `GEMINI_API_KEY` | Your Google AI Studio API Key |
  | `TAVILY_API_KEY` | Your Tavily Search API Key |
  | `MEKO_MODE` | `live` (set `local` for local fallback) |
  | `MEKO_API_KEY` | Your Yugabyte Meko API Key |
  | `MEKO_DATAPACK_ID` | Datapack UUID from `mcp.mekodata.ai` |
  | `MEKO_MCP_URL` | `https://mcp.mekodata.ai/mcp` |
  | `MEKO_CALL_BUDGET` | `200` |
  | `MEKO_TIMEOUT_S` | `8` |
  | `LLM_MODEL` | `gemini-2.5-flash` |
  | `LLM_MODEL_VISION`| `gemini-2.5-flash` |
  | `LLM_FALLBACK_MODEL` | `gemini-2.5-pro` |

Verify backend health: `curl https://your-backend.onrender.com/api/health`

### 2. Frontend on Vercel
Deploy the `frontend/` directory:
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Environment Variables**:
  | Variable | Value |
  |---|---|
  | `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` |

---

## 📋 Demo Day Runbook

### Fast Start (Before Pitching)
1. **Cold-start check**:
   ```bash
   curl -s http://localhost:8000/api/health | jq .
   ```
   Verify `"ok": true`, Gemini call counter, and Meko mode.
2. **Switching to Cached Demo Mode**:
   If live web search or external Wi-Fi is spotty during the pitch, set:
   ```bash
   DEMO_MODE=cached
   MEKO_MODE=local
   ```
   This serves pre-grounded market facts and local memory without hitting external rate limits.
3. **Refreshing Cached Grounding Data**:
   To re-run market intelligence and refresh the demo cache:
   ```bash
   python scripts/build_cache.py
   ```
4. **Happy Path Demo Steps**:
   - Open [http://localhost:3000](http://localhost:3000).
   - Click **"Use Demo Deck (BolBot)"**.
   - Watch the animated War Room investor cards analyze unit economics, competitors, and code moats live.
   - Review top critical red flags, missing data checklist, and persona findings.
   - Click **"Export .md"** or **"Print / PDF"** to demonstrate instant export.
   - Switch to the Grill Room tab to defend against the hostile investor interrogation.
