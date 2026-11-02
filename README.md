# PITCH-GRILL — AI Diligence & Investor War Room

![Tests](https://img.shields.io/badge/backend%20tests-161%20passing-brightgreen)
![Red-Team](https://img.shields.io/badge/red--team-12%2F12%20rejected-critical)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Gemini](https://img.shields.io/badge/LLM-Google%20Gemini%202.5-4285F4)
![Memory](https://img.shields.io/badge/memory-Yugabyte%20Meko%20(MCP)-ff6b35)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> **"Face three hostile investors before the real ones do."**
> A multi-agent AI due-diligence war room that red-teams startup pitch decks with deterministic unit economics, live web verification, and shared agent memory.

---

## Problem

Early-stage founders face a high-stakes asymmetry when pitching VCs:

1. **No hostile practice.** Founders rehearse with supportive peers who give agreeable feedback. Real partner meetings stress-test fragile unit economics, inflated TAM, burn rate, and technical defensibility — and founders get caught off guard on questions they could have anticipated.
2. **Generic AI is sycophantic.** Off-the-shelf models hallucinate financial numbers, accept optimistic claims without verification, and can be sweet-talked with confident rhetoric. They lack specialized agents, live grounding, and auditable memory.

**PITCH-GRILL** is a hostile, multi-agent war room where three specialized investor personas independently interrogate the deck — combining **Google Gemini** for reasoning, a **deterministic math engine** (zero hallucinated numbers), **live web grounding** (substring-verified quotes), and **Yugabyte Meko** shared memory — all governed by **anti-sycophancy rules enforced in code** that demand concrete evidence before accepting any defense.

---

## Team

| Name | Institution |
| :--- | :--- |
| **Harshvardhan Rawat** | University School of Automation & Robotics (USAR), GGSIPU |
| **Nikunj Mundhra** | University School of Automation & Robotics (USAR), GGSIPU |
| **Aayush Aswal** | Bhagwan Parshuram Institute of Technology (BPIT), GGSIPU |
| **Abhigyan Badyar** | National Forensic Sciences University (NFSU) |

---

## Pitch Deck

**[Google Drive Presentation (Judges)](https://drive.google.com/file/d/1yw17gtyI6nsWKbPPooGScNMBshh9Fhn-/view?usp=drivesdk)**

---

## How It Works

A founder uploads a pitch deck (PDF). Three hostile, specialized AI investor personas cross-examine and red-team it in real time:

- **Finance Investor** — unit economics, burn, runway, valuation, capital efficiency, via a deterministic computation engine in INR (the LLM *never* does the math).
- **Market Investor** — TAM/SAM/SOM, distribution, and competitors, grounded against live web sources with quotes verified in code.
- **Technical Investor** — architecture, scalability, defensibility, and data moats, checked against the founder's website, GitHub, and engineering rubrics.

After parallel ingestion and analysis, the founder enters the **Grill Room** for a turn-bounded defense session with anti-sycophancy clamping, then receives an **Investment Committee Verdict**, an India-specific **Data Room Checklist**, and an improved **Pitch Narrative**.

```
Upload PDF -> Parse / Vision OCR -> DeckFacts
  -> Finance engine + Market search + Tech check   (parallel)
    -> 3 persona agents                            (parallel)
      -> Moderator -> Evidence Ledger -> Readiness Score
        -> Finance Lab -> Market Intel
          -> GRILL ROOM  (live Q&A, <=12 turns, clamp_outcome)
            -> Data Room checklist
              -> Improved pitch + before/after score
```

---

## Under the Hood — Engineering Guarantees

What makes this more than a chatbot wrapper:

- **Anti-sycophancy clamp (in code).** Each answer's outcome is decided by `clamp_outcome()` in `contracts/schemas.py`, not by the LLM. Confidence and flattery can't buy a good score — only cited data or a referenced document can. It cannot be prompt-engineered away. **Red-team: 12/12 adversarial answers rejected, 0 injections succeeded.**
- **The LLM never does math.** All burn, runway, LTV, CAC sensitivity, and scores run in a deterministic Python engine (`tools/finance_engine.py`, <100ms). The LLM only extracts inputs and narrates.
- **Grounded, not guessed.** Competitor names and evidence quotes must be verified as substrings of fetched page text *in code* before they appear — no hallucinated competitors.
- **Prompt-injection defense.** Untrusted text (deck, web, founder answers, recalled memory) is wrapped in tags and regex-flagged; injection attempts are auto-rejected.
- **Resilient shared memory.** Yugabyte Meko over MCP with an 8s timeout, retry, and automatic local fallback (circuit breaker after 3 consecutive failures). Meko calls stay off the critical path.
- **Fully testable offline.** `MOCK=1` replays realistic workflows with zero external API calls. **161 backend tests** cover finance math, prompt injection, memory resilience, agents, and routes.

---

## Architecture

```
                 +-----------------------------------------------+
                 |          FOUNDER / CLIENT BROWSER             |
                 |        Next.js 14 App Router + Tailwind       |
                 +-----------------------+-----------------------+
                                         | REST + Server-Sent Events
                                         v
                 +-----------------------------------------------+
                 |             FASTAPI BACKEND (8000)            |
                 |  /deals  /events  /finance  /grill            |
                 |  /market /memory  /checklist /export.md       |
                 +-----------+-----------------------+-----------+
                             |                       |
          +------------------+--------+   +----------+------------------+
          |    INTELLIGENCE & TOOLS   |   |    STATE & SHARED MEMORY     |
          | - Google Gemini 2.5       |   | - Deal Store (JSON sessions) |
          | - Tavily web grounding    |   | - Yugabyte Meko (MCP log)    |
          | - Deterministic finance   |   | - Local resilient fallback   |
          | - PDF parser + Vision OCR |   | - Evidence Ledger + audit    |
          +---------------------------+   +------------------------------+
```

### Core Technologies
- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, PyMuPDF, AsyncIO
- **Frontend:** Next.js 14, React 18, TypeScript, TailwindCSS, Recharts, Zustand
- **LLM:** Google Gemini via `google-genai` (`gemini-3.5-flash` primary, `gemini-3.5-pro` fallback)
- **Memory:** Yugabyte Meko over MCP with automatic local fallback
- **Grounding:** Tavily Search API
- **Shared contracts:** `contracts/schemas.py` (Pydantic v2) + `contracts/types.ts`

---

## Setup

**Prerequisites:** Python 3.11+, Node.js 18/20, `pip` + `npm` (Docker optional).

```bash
cp .env.example .env
```

Set your keys in `.env`:
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/)
- `TAVILY_API_KEY` — optional, for live market search
- `MEKO_API_KEY` — optional, for live agent memory

If `GEMINI_API_KEY` is omitted, the platform runs in deterministic **Mock Mode** (`MOCK=1`) with zero external calls.

---

## Running Locally

### Native (recommended)

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Health check: `http://localhost:8000/api/health`

**Frontend** (separate terminal):
```bash
cd frontend
npm ci && npm run dev
```
Open `http://localhost:3000`

### Docker
```bash
docker compose up --build
```
Frontend `:3000` · Backend `:8000` · Swagger `:8000/docs`

---

## Demo

1. Open `http://localhost:3000`
2. Click **"Try Demo Deck"** (BolBot — Conversational AI for Bharat SMEs)
3. Watch live extraction, red-team analysis, and scoring stream via SSE
4. Use the **Finance Lab** sliders to test runway sensitivity in INR
5. Check **Market Intel** for live groundings (Bikayi, Wati, LimeChat)
6. Enter the **Grill Room** and defend against hostile questions
7. Review the **Data Room** checklist and export the diligence summary

---

## Testing

```bash
pytest backend/tests/ -q          # 161 backend tests
ruff check backend scripts contracts

cd frontend
npx tsc --noEmit && npm test && npm run lint && npm run build
```

---

## Golden Rules

1. **The LLM never does math** — all numbers come from `tools/finance_engine.py`.
2. **Currency uniformity** — everything in INR, formatted in Lakhs/Crores.
3. **Anti-sycophancy enforced in code** — `clamp_outcome()` in `contracts/schemas.py`; flattery without data cannot pass.
4. **Resilient memory** — Meko MCP with circuit breaking and local persistence.
