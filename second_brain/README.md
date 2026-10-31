# SecondBrain for Founders — AI Due-Diligence War Room

An adversarial, multi-agent due-diligence platform where founders upload their pitch deck (PDF) and face three hostile AI investor personas before pitching real venture capital:
1. **Finance Investor** — scrutinizes unit economics, burn rate, and runway with a **deterministic Python math engine**.
2. **Market Investor** — stress-tests TAM and competitor claims using **live web grounding via Tavily**, verified with strict substring quotes.
3. **Technical Investor** — audits product feasibility and data moats by inspecting the live product website and GitHub repository.

---

## 🏆 Sponsor Tracks: Google Gemini & Yugabyte Meko

SecondBrain is built exclusively for and powered by:
- **Google Gemini API (`google-genai`)**: The **only** LLM SDK in the entire codebase. Used with strict structured output (`response_schema`), multimodal vision fallback for image-heavy slides, and resilient model fallback routing.
- **Yugabyte Meko**: The cross-agent shared memory layer over MCP (`https://mcp.mekodata.ai/mcp`). Enables agents to record findings, recall earlier concessions, maintain auditable session traces, and promote generalized lessons to shared knowledge with transparent local fallback.

---

## 🚀 Quickstart Commands

### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run in Mock Mode
MOCK=1 uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the War Room. Click **"Use Demo Deck (BolBot)"** to immediately stream the full due diligence analysis.

### 3. Run Automated Tests & Utilities
```bash
# Backend pytest suite (SSRF, store, fixtures, SSE, LLM mock-rejection)
cd backend && .venv/bin/pytest -q

# Frontend production build
cd frontend && npm run build

# Check available Gemini models for your API key
python scripts/list_models.py
```

---

## 🏗️ Architecture & Team Ownership

```
second_brain/
  contracts/        schemas.py (Pydantic source of truth), types.ts (TypeScript mirror)
  backend/app/
    main.py         FastAPI app, CORS, /api/health                          [P1]
    config.py       Environment settings & sponsor configuration             [P1]
    llm.py          Gemini-only wrapper with structured output & telemetry  [P1]
    store.py        In-memory deal store, event lists, JSON snapshots       [P1]
    sse.py          Server-Sent Events streaming engine with replay         [P1]
    security.py     SSRF protection, is_safe_url, PII redaction             [P1]
    routes/deals.py Deal lifecycle endpoints & mock pipeline runner         [P1]
    routes/events.py SSE event stream endpoint                              [P1]
    memory/         Meko MCP memory client & local fallback                 [P4]
    ingest/         PDF parser, vision fallback, claim extractor            [P1]
    agents/         Personas, orchestrator, scoring, grill state machine    [P2]
    tools/          Deterministic finance engine, market search, tech check  [P3, P4]
    fixtures/       Complete contract-validated BolBot fixtures             [All]
  frontend/
    app/            Next.js App Router (upload page, deal war room)         [P1]
    components/     Shell, report, grill, finance, market, data room        [All]
    lib/            api.ts, sse.ts                                          [P1]
```

---

## 🔐 Environment Variables (`.env`)

Copy `.env.example` to `.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key
LLM_MODEL=gemini-2.5-flash
LLM_MODEL_VISION=gemini-2.5-flash
LLM_FALLBACK_MODEL=gemini-1.5-flash

TAVILY_API_KEY=your_tavily_api_key

MEKO_MODE=live
MEKO_API_KEY=your_meko_key
MEKO_DATAPACK_ID=your_datapack_uuid
MEKO_MCP_URL=https://mcp.mekodata.ai/mcp
MEKO_CALL_BUDGET=200

MOCK=1
```
