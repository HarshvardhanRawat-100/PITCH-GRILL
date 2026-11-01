# PITCH-GRILL — AI Diligence & Investor War Room

> **"Face three hostile investors before the real ones do."**  
> An uncompromising, multi-agent AI Due-Diligence War Room that red-teams startup pitch decks with deterministic unit economics, live web verification, and shared agent memory.

---

## 📌 Problem Statement

Early-stage founders face a critical, high-stakes asymmetry when pitching institutional venture capitalists:

1. **Unprepared for Hostile Due-Diligence:** Most founders practice pitch decks with supportive peers and mentors who offer superficial, agreeable feedback. In real partner meetings, investors aggressively stress-test fragile unit economics, unrealistic TAM projections, burn rate, and technical defensibility. Founders get caught off-guard and fail diligence on questions they could have anticipated.
2. **Generic AI Tools Are Inadequate & Sycophantic:** Off-the-shelf generative AI models cannot perform genuine diligence. They **hallucinate financial calculations**, accept optimistic claims without verification, and are easily sweet-talked with charismatic rhetoric (sycophancy). They lack multi-agent specialization, live web grounding, and persistent, auditable memory across evaluation phases.
3. **The Solution — PITCH-GRILL:** A hostile, multi-agent war room where three specialized investor personas (Finance, Market, and Technical) independently interrogate the deck. It combines **Google Gemini** for reasoning and narrative extraction, a **deterministic math engine** (zero hallucinated numbers), **live web scraping** (substring-verified quotes), and **Yugabyte Meko** for shared cross-agent memory—all governed by strict **anti-sycophancy rules enforced in code** that require concrete evidence to accept any founder defense.

---

## 👥 Team Members

| Name | Institution |
| :--- | :--- |
| **Harshvardhan Rawat** | Student, University School of Automation & Robotics (USAR), GGSIPU |
| **Nikunj Mundhra** | Student, University School of Automation & Robotics (USAR), GGSIPU |
| **Aayush Aswal** | Student, Bhagwan Parshuram Institute of Technology (BPIT), GGSIPU |
| **Abhigyan Badyar** | Student, National Forensic Sciences University (NFSU) |

---

## 📊 Presentation & Pitch Deck

- 🔗 **Google Drive Pitch Deck (Judges):** [Presentation Deck Placeholder](https://drive.google.com/drive/folders/YOUR_GOOGLE_DRIVE_DECK_LINK_HERE) *(Paste your Google Drive link here)*

---

## 💡 How PITCH-GRILL Works

When a founder uploads a pitch deck (PDF), three hostile, specialized AI investor personas cross-examine and red-team the pitch in real time:

- **💰 Finance Investor (P3):** Interrogates unit economics, burn rate, runway, valuation, and capital efficiency using a deterministic financial computation engine with mathematical assertions in INR (Indian Rupees).
- **📈 Market Investor (P4):** Validates market sizing (TAM/SAM/SOM), distribution channels, and competitors by crawling and grounding claims against live web sources.
- **🛠️ Technical Investor (P2):** Scrutinizes technical architecture, scalability, defensibility, and data moats against founder websites, GitHub repos, and engineering rubrics.

Following parallel ingestion, founders enter the **Grill Room** for an interactive, turn-bounded defense session with anti-sycophancy clamping, before receiving a synthesized **Investment Committee Final Verdict**, an India-specific **Data Room Checklist**, and an improved **Pitch Narrative**.

---

## 🏛 Architecture & Tech Stack

```
                                 ┌──────────────────────────────────────────────────────────┐
                                 │                   FOUNDER / CLIENT BROWSER               │
                                 │              Next.js 14 App Router + TailwindCSS         │
                                 └────────────────────────────┬─────────────────────────────┘
                                                              │ REST + Server-Sent Events
                                                              ▼
                                 ┌──────────────────────────────────────────────────────────┐
                                 │                   FASTAPI BACKEND (8000)                 │
                                 ├────────────────────────────┬─────────────────────────────┤
                                 │  /api/deals                │  /api/deals/{id}/events     │
                                 │  /api/deals/{id}/finance   │  /api/deals/{id}/grill      │
                                 │  /api/deals/{id}/market    │  /api/deals/{id}/memory     │
                                 │  /api/deals/{id}/checklist │  /api/deals/{id}/export.md  │
                                 └─────────────┬──────────────────────────────┬─────────────┘
                                               │                              │
                    ┌──────────────────────────┴────────┐        ┌────────────┴──────────────────────┐
                    │       INTELLIGENCE & TOOLS        │        │        STATE & SHARED MEMORY      │
                    ├───────────────────────────────────┤        ├───────────────────────────────────┤
                    │ • Google Gemini (2.5-flash)       │        │ • Deal Store (File/JSON Sessions) │
                    │ • Tavily Web Search Grounding     │        │ • Yugabyte Meko (MCP Memory Log)  │
                    │ • Deterministic Finance Engine    │        │ • Local Resilient Fallback Store  │
                    │ • PDF Slide Parser & Vision OCR   │        │ • Evidence Ledger & Audit Trail   │
                    └───────────────────────────────────┘        └───────────────────────────────────┘
```

### Core Technologies
- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, PyMuPDF (fitz), AsyncIO.
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, Recharts, Zustand.
- **LLM Engine:** Google Gemini (`google-genai` SDK with `gemini-2.5-flash` primary & `gemini-2.5-pro` fallback).
- **Agent Memory:** Yugabyte Meko via Model Context Protocol (MCP) with automatic local fallback.
- **Live Grounding:** Tavily Search API.
- **Shared Contracts:** `contracts/schemas.py` (Pydantic v2) and `contracts/types.ts` (TypeScript).

---

## 📁 Repository Structure

```
PITCH-GRILL/
├── backend/
│   ├── app/
│   │   ├── agents/          # Investor persona agents, orchestrator, and answer evaluator
│   │   ├── fixtures/        # Pitch decks, grill dialogs, market, and reports test fixtures
│   │   ├── ingest/          # PDF text extraction, vision OCR, and structured claim extraction
│   │   ├── kb/              # Domain knowledge base (India diligence, investor rubrics)
│   │   ├── memory/          # Meko MCP memory client, local fallback, and privacy policies
│   │   ├── routes/          # FastAPI routers (deals, events, finance, grill, market, checklist, memory)
│   │   ├── tools/           # Deterministic Finance Engine, India checklist, market & tech grounders
│   │   ├── config.py        # Environment settings and LLM configuration
│   │   ├── llm.py           # Gemini SDK client with retry, fallback, and structured JSON parsing
│   │   ├── main.py          # FastAPI application mount, CORS, and health endpoint
│   │   ├── security.py      # Prompt injection resistance and untrusted data wrapping
│   │   ├── sse.py           # Server-Sent Events broker
│   │   └── store.py         # Deal state repository and event streaming logs
│   ├── tests/               # 161 backend tests covering finance, memory, agents, ingest, injection
│   ├── Dockerfile           # Backend container definition
│   ├── requirements.txt     # Python dependencies
│   └── pytest.ini           # Pytest test discovery configuration
│
├── frontend/
│   ├── app/                 # Next.js App Router (Upload Home + Dynamic Deal War Room)
│   ├── components/
│   │   ├── dataroom/        # India Due Diligence Checklist & CSV Export
│   │   ├── finance/         # Finance Lab (interactive sliders, burn/runway charts, sensitivity)
│   │   ├── grill/           # Live Grill Room (chat streams, evaluation cards, cross-talk bubbles)
│   │   ├── ledger/          # Sourced Evidence Ledger
│   │   ├── market/          # Market & TAM Intelligence grounding
│   │   ├── memory/          # Yugabyte Meko Memory inspector
│   │   ├── report/          # Investor findings & deep-dive reports
│   │   ├── shell/           # Headers, footers, status rings
│   │   └── upload/          # Pitch deck dropzone and demo launcher
│   ├── contracts/           # Synced frontend TypeScript schemas
│   ├── lib/                 # API client, SSE streaming consumer, formatters, Zustand store
│   ├── package.json         # Node.js dependencies
│   ├── Dockerfile           # Frontend container definition
│   └── tsconfig.json        # TypeScript configuration with path aliases
│
├── contracts/
│   ├── schemas.py           # Canonical Pydantic schemas (single source of truth)
│   └── types.ts             # Canonical TypeScript definitions
│
├── demo/
│   ├── architecture.md      # Demo architecture runbook
│   ├── backup_video_checklist.md # Video recording checklist
│   ├── decks/               # 5 realistic pitch deck PDFs (clean, ugly images, injection, sparse, failed)
│   ├── qa.md                # Hackathon & judge Q&A guide
│   └── script.md            # Live presentation demo script
│
├── docs/
│   ├── API_AND_EVENTS.md    # Complete REST & SSE API specification
│   ├── DEMO_AND_QA.md       # Stage-by-stage demo workflow
│   ├── ISSUES.md            # Cross-module coordination tracker
│   ├── PRODUCT_PROMPTS.md   # System prompts (P-01 to P-13)
│   ├── REPOSITORY_AUDIT.md  # Architectural audit, consolidation & validation history
│   ├── ROADMAP.md           # Product roadmap & sponsor track criteria
│   └── TEAM_PROMPTS.md      # Engineer delegation briefs (P1, P2, P3, P4)
│
├── scripts/                 # Utility scripts (eval_decks, redteam_grill, meko_smoke, generate_decks)
├── docker-compose.yml       # Production/development multi-container setup
├── run_all.sh               # Dual-stack native bash launcher
├── .env.example             # Clean environment variable template
├── .gitignore               # Root git ignore specification
└── README.md                # Project documentation
```

---

## ⚙️ Prerequisites & Environment Setup

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 18.x or 20.x
- **Package Managers:** `pip` and `npm`
- **Docker & Docker Compose:** (Optional, for containerized run)

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your API keys:
- `GEMINI_API_KEY`: Obtain from [Google AI Studio](https://aistudio.google.com/).
- `TAVILY_API_KEY`: (Optional) Obtain from [Tavily](https://tavily.com/) for live market search.
- `MEKO_API_KEY`: (Optional) Obtain from [Meko Cloud](https://cloud.mekodata.ai) for live agent memory.

> [!NOTE]
> If `GEMINI_API_KEY` is omitted, the entire platform runs seamlessly in deterministic **Mock Mode** (`MOCK=1`), replaying realistic diligence workflows with zero external API calls.

---

## 🚀 Running Locally

### Option A: Native Development (Recommended)

#### 1. Backend Service
```bash
cd backend
python -m venv .venv

# On Linux / macOS:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend health check is accessible at `http://localhost:8000/api/health`.

#### 2. Frontend Service
In a separate terminal:
```bash
cd frontend
npm ci
npm run dev
```
Open `http://localhost:3000` in your browser.

---

### Option B: Docker Compose
Run both backend and frontend in isolated containers:
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`

---

## 🎯 Demo Mode & Verification

1. Open `http://localhost:3000`
2. Click **"Try Demo Deck"** (BolBot — Conversational AI for Bharat SMEs).
3. Watch the live extraction, red-team analysis, and score calculation stream via SSE.
4. Explore the **Finance Lab** sliders to test runway sensitivity in INR.
5. Review **Market Intel** to see live competitive groundings (Bikayi, Wati, LimeChat).
6. Enter the **Grill Room** to answer hostile investor questions.
7. Inspect the **Data Room** for India-specific checklist compliance and download the final Diligence Markdown summary.

---

## 🧪 Testing & Validation

### Backend Tests
Execute the comprehensive test suite (161 tests covering financial math, prompt injection, memory resilience, and route handlers):
```bash
pytest backend/tests/ -q
```

Linting and code quality:
```bash
ruff check backend scripts contracts
```

### Frontend Checks
Run TypeScript verification, unit tests, ESLint, and Next.js production build:
```bash
cd frontend
npx tsc --noEmit
npm test
npm run lint
npm run build
```

---

## 🔒 Security & Golden Rules
1. **The LLM never does math:** All runway, burn, LTV, CAC sensitivity, and score calculations are executed in deterministic Python (`backend/app/tools/finance_engine.py`).
2. **Strict Currency Uniformity:** All monetary values are calculated in INR (₹) and formatted in Lakhs/Crores.
3. **Anti-Sycophancy Enforced in Code:** Concessions and outcomes are clamped deterministically via `clamp_outcome()` in `contracts/schemas.py`. Flattery without data cannot bypass diligence.
4. **Resilient Memory:** Yugabyte Meko MCP integration includes automatic circuit breaking and local memory persistence.
