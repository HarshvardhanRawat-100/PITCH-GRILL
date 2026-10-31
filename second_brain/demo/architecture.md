# SecondBrain Architecture

## System Diagram (Gemini + Yugabyte Meko)

```mermaid
flowchart TD
    subgraph Client["Founder Web Interface (Next.js 14)"]
        UI["War Room Dashboard"]
        Ledger["Evidence Ledger Panel"]
        Lab["Finance Lab (Sliders)"]
        MarketUI["Market Intel & Tech Signals"]
        GrillUI["Grill Room Defense Chat"]
        MemoryUI["Meko Memory & Trace Hub"]
    end

    subgraph Ingestion["Ingestion Pipeline (PyMuPDF + Gemini Vision)"]
        Upload["Pitch Deck (PDF)"] --> Parser["Text Extractor"]
        Parser -->|Text < 40 chars| Vision["Gemini 2.5 Flash Vision"]
        Parser -->|Vector Text| Sanitizer["wrap_untrusted(label, text)"]
        Vision --> Sanitizer
        Sanitizer --> DeckFacts["DeckFacts Schema"]
    end

    subgraph ParallelTools["Parallel Grounding & Engine (asyncio.gather)"]
        DeckFacts --> FinanceEngine["Finance Math Engine\n(Deterministic Bisection)"]
        DeckFacts --> MarketTool["Market Grounding Tool\n(Tavily + Substring Verification)"]
        DeckFacts --> TechTool["Tech Check Tool\n(SSRF Guard + GitHub REST)"]
    end

    subgraph HostileAgents["Three Adversarial Investors (Google Gemini)"]
        FinanceEngine --> FinanceAgent["💰 Finance Investor"]
        MarketTool --> MarketAgent["📈 Market Investor"]
        TechTool --> TechAgent["🛠️ Technical Investor"]
    end

    subgraph MemoryLayer["Shared Memory Layer (Yugabyte Meko MCP)"]
        MekoMCP["Meko Client (Streamable HTTP)"]
        LocalFallback["Local In-Process Fallback"]
        PolicyGate["policy.py\n(Promotion Gate & Lesson Builder)"]

        FinanceAgent -->|memory_add| MekoMCP
        MarketAgent -->|memory_add| MekoMCP
        TechAgent -->|memory_add| MekoMCP

        GrillUI -->|recall before answer eval| MekoMCP
        GrillUI -->|trace conversation| MekoMCP
        PolicyGate -->|promote anonymized lesson| MekoMCP
        MekoMCP -->|on timeout / budget / error| LocalFallback
    end

    subgraph DefenseLoop["Grill Defense & Anti-Sycophancy"]
        FounderAnswer["Founder Typed Defense"] --> ClampRule["clamp_outcome()\n(Code Rule: Evidence Required)"]
        ClampRule --> ScoreEngine["Deterministic Score Engine\n(Readiness Score 0-100)"]
        ScoreEngine --> NarrativeBuilder["Improved Pitch Narrative\n(SAM/SOM + Verified Competitors)"]
    end

    UI <--> Ingestion
    Client <--> ParallelTools
    HostileAgents --> UI
    MemoryLayer <--> MemoryUI
```

## Core Architectural Guarantees
1. **Deterministic Numbers:** No LLM estimates financial metrics or scores. Math is 100% Python.
2. **Anti-Hallucination:** Every competitor quote and funding figure is verified as a verbatim substring in code against the fetched web page.
3. **Data Privacy & Policy Gating:** No company names, founder PII, or deck numbers are ever promoted into global Meko Shared Knowledge.
4. **Resilience:** Automatic fallback to `LocalMemoryClient` on network timeout, call budget exhaustion, or cached offline demo mode.
