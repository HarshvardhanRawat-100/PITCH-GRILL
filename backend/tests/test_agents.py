import json
import os
import sys
from pathlib import Path
import pytest

# Ensure repo root and second_brain are on sys.path
REPO_ROOT = Path(__file__).resolve().parents[2]
SECOND_BRAIN = REPO_ROOT / "second_brain"
BACKEND = REPO_ROOT / "backend"

for path in [str(REPO_ROOT), str(SECOND_BRAIN), str(BACKEND)]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from contracts.schemas import (
        DeckFacts,
        FinanceResult,
        Finding,
        MarketGrounding,
        PersonaReport,
        SourceRef,
        TechSignals,
    )
except ImportError:
    from second_brain.contracts.schemas import (
        DeckFacts,
        FinanceResult,
        Finding,
        MarketGrounding,
        PersonaReport,
        SourceRef,
        TechSignals,
    )

from backend.app.agents.personas import run_persona
from backend.app.agents.prompts import render_persona_prompt, P_00, P_03, P_04, P_05, P_08


def load_fixtures():
    fixtures_dir = BACKEND / "app" / "fixtures"
    deck = DeckFacts.model_validate(json.load(open(fixtures_dir / "deck.json")))
    finance = FinanceResult.model_validate(json.load(open(fixtures_dir / "finance.json")))
    market = MarketGrounding.model_validate(json.load(open(fixtures_dir / "market.json")))
    tech = TechSignals.model_validate(json.load(open(fixtures_dir / "tech.json")))
    return deck, finance, market, tech


def create_sample_finding(
    title: str = "Unit economics break at CAC threshold",
    severity: str = "critical",
    category: str = "finance",
    sources: list = None,
    quote: str = None,
    question: str = "Can you prove your CAC won't double as you expand?",
    resolved: str = "partial",
) -> Finding:
    if sources is None:
        sources = [
            SourceRef(
                type="calc",
                ref="finance_engine",
                quote=quote or "CAC breaks runway at ₹8,100",
            )
        ]
    return Finding(
        id="TEMP-1",
        persona="finance",
        title=title,
        detail="The sensitivity analysis indicates runway collapses to 12 months if CAC increases by 80%.",
        severity=severity,
        category=category,
        sources=sources,
        status="contradicted",
        question=question,
        resolved=resolved,
        missing_proof="Audited cohort retention sheet",
    )


@pytest.mark.asyncio
async def test_prompts_and_rendering():
    assert "SecondBrain" in P_00
    assert "FINANCE INVESTOR" in P_03
    assert "MARKET INVESTOR" in P_04
    assert "TECHNICAL INVESTOR" in P_05
    assert "MODERATOR" in P_08

    deck, finance, _, _ = load_fixtures()
    prompt = render_persona_prompt("finance", deck, finance)
    assert P_00 in prompt
    assert "<untrusted_deck_facts>" in prompt
    assert "BolBot" in prompt
    assert "800000" in prompt


@pytest.mark.asyncio
async def test_run_persona_valid_schema():
    deck, finance, _, _ = load_fixtures()

    async def mock_llm(**kwargs):
        return PersonaReport(
            persona="finance",
            headline="BolBot's runway claims hide an 80% CAC sensitivity cliff.",
            findings=[
                create_sample_finding(title=f"Finding {i}", severity="major" if i % 2 == 0 else "critical")
                for i in range(5)
            ],
        )

    report = await run_persona("finance", deck, finance, llm_generate=mock_llm)
    assert isinstance(report, PersonaReport)
    assert report.persona == "finance"
    assert len(report.findings) == 5
    for f in report.findings:
        assert f.persona == "finance"
        assert f.id.startswith("F-")
        assert f.resolved == "open"
        assert len(f.sources) >= 1


@pytest.mark.asyncio
async def test_id_assignment_and_sorting():
    deck, finance, _, _ = load_fixtures()

    findings_input = [
        create_sample_finding(title="Minor defect", severity="minor"),
        create_sample_finding(title="Critical solvency risk", severity="critical"),
        create_sample_finding(title="Major burn discrepancy", severity="major"),
        create_sample_finding(title="Another minor note", severity="minor"),
        create_sample_finding(title="Critical unit economic flaw", severity="critical"),
    ]

    async def mock_llm(**kwargs):
        return PersonaReport(
            persona="finance",
            headline="Brutal assessment.",
            findings=findings_input,
        )

    report = await run_persona("finance", deck, finance, llm_generate=mock_llm)

    # Check ID sequence: F-1, F-2, ...
    expected_ids = [f"F-{i}" for i in range(1, len(report.findings) + 1)]
    assert [f.id for f in report.findings] == expected_ids

    # Check severity ordering: critical -> major -> minor
    severities = [f.severity for f in report.findings]
    assert severities == ["critical", "critical", "major", "minor", "minor"]


@pytest.mark.asyncio
async def test_source_enforcement():
    deck, finance, _, _ = load_fixtures()

    findings_input = [
        create_sample_finding(title="Unsourced claim", severity="critical", sources=[]),
        create_sample_finding(title="Sourced claim", severity="major"),
    ]

    async def mock_llm(**kwargs):
        return PersonaReport(
            persona="finance",
            headline="Testing source enforcement.",
            findings=findings_input,
        )

    report = await run_persona("finance", deck, finance, llm_generate=mock_llm)
    f_unsourced = report.findings[0]
    assert len(f_unsourced.sources) >= 1
    assert f_unsourced.sources[0].type == "inference"
    assert f_unsourced.sources[0].ref == "model"
    assert f_unsourced.status == "unverified"


@pytest.mark.asyncio
async def test_quote_truncation():
    deck, finance, _, _ = load_fixtures()

    long_quote = "word " * 45  # 45 words
    finding = create_sample_finding(quote=long_quote)

    async def mock_llm(**kwargs):
        return PersonaReport(
            persona="finance",
            headline="Testing quote truncation.",
            findings=[finding],
        )

    report = await run_persona("finance", deck, finance, llm_generate=mock_llm)
    res_quote = report.findings[0].sources[0].quote
    assert len(res_quote.split()) == 25


@pytest.mark.asyncio
async def test_length_capping_and_resolved_status():
    deck, finance, _, _ = load_fixtures()

    long_title = "This title has way more than ten words in order to verify that it gets capped properly"
    long_question = " ".join([f"qword{i}" for i in range(50)])  # 50 words
    finding = create_sample_finding(title=long_title, question=long_question, resolved="resolved")

    async def mock_llm(**kwargs):
        return PersonaReport(
            persona="finance",
            headline="Length capping test.",
            findings=[finding],
        )

    report = await run_persona("finance", deck, finance, llm_generate=mock_llm)
    res_finding = report.findings[0]
    assert len(res_finding.title.split()) <= 10
    assert len(res_finding.question.split()) <= 35
    assert res_finding.resolved == "open"


@pytest.mark.asyncio
async def test_market_competitor_validation():
    deck, _, market, _ = load_fixtures()

    # Allowed competitors in market.json: Bikayi, Wati, QuickSell
    valid_finding = Finding(
        id="M-1",
        persona="market",
        title="Direct competition from Bikayi",
        detail="Competitor Bikayi already offers WhatsApp catalogue commerce.",
        severity="critical",
        category="competition",
        sources=[SourceRef(type="web", ref="https://bikayi.com", quote="Bikayi enables merchants")],
        status="verified",
        question="How do you displace Bikayi?",
        resolved="open",
    )

    hallucinated_finding = Finding(
        id="M-2",
        persona="market",
        title="Threat from Competitor RandomHallucinationInc",
        detail="Competitor RandomHallucinationInc raised $50M to dominate WhatsApp commerce.",
        severity="major",
        category="competition",
        sources=[SourceRef(type="inference", ref="model")],
        status="unverified",
        question="What about RandomHallucinationInc?",
        resolved="open",
    )

    async def mock_llm(**kwargs):
        return PersonaReport(
            persona="market",
            headline="Market assessment.",
            findings=[valid_finding, hallucinated_finding],
        )

    report = await run_persona("market", deck, market, llm_generate=mock_llm)

    # Valid competitor retained
    assert "Bikayi" in report.findings[0].title or "Bikayi" in report.findings[0].detail
    assert report.findings[0].category == "competition"

    # Hallucinated competitor scrubbed from finding
    f2 = report.findings[1]
    assert "RandomHallucinationInc" not in f2.detail
    assert "RandomHallucinationInc" not in f2.title
    assert "unverified competitor" in f2.detail or "unverified competitor" in f2.title or f2.category == "market"


@pytest.mark.asyncio
async def test_three_persona_reports_from_fixtures_validate_and_sourced():
    """ACCEPTANCE CRITERIA: three PersonaReports from fixtures validate and are sourced."""
    deck, finance, market, tech = load_fixtures()

    async def mock_finance_llm(**kwargs):
        return PersonaReport(
            persona="finance",
            headline="Unit economics collapse under modest CAC stress.",
            findings=[
                Finding(
                    id="F-1",
                    persona="finance",
                    title="Runway drops below 12 months if CAC reaches ₹8,100",
                    detail="Deterministic model shows breaking CAC is ₹8,100 (+80%).",
                    severity="critical",
                    category="finance",
                    sources=[SourceRef(type="calc", ref="finance_engine", quote="breaking_cac: 8100.0")],
                    status="unverified",
                    question="How will you defend unit margins if SME CAC spikes?",
                    resolved="open",
                ),
                Finding(
                    id="F-2",
                    persona="finance",
                    title="Monthly fixed burn of ₹8 Lakh lacks headcount justification",
                    detail="Fixed opex consumes majority of the ₹2 Cr ask in 18 months.",
                    severity="major",
                    category="finance",
                    sources=[SourceRef(type="deck", ref="slide 9", quote="₹8 Lakh fixed monthly burn")],
                    status="assumed",
                    question="What is the exact headcount plan behind ₹8 Lakh/mo?",
                    resolved="open",
                ),
                Finding(
                    id="F-3",
                    persona="finance",
                    title="Pilot churn of 4% monthly compounds to 39% annually",
                    detail="4% monthly churn reduces LTV significantly in SME retail.",
                    severity="major",
                    category="traction",
                    sources=[SourceRef(type="deck", ref="slide 7", quote="Churn 4%/mo")],
                    status="unverified",
                    question="Can you show 6-month logo retention curves?",
                    resolved="open",
                ),
                Finding(
                    id="F-4",
                    persona="finance",
                    title="Valuation of ₹10 Cr is rich for ₹54 Lakh ARR run-rate",
                    detail="150 merchants at ₹3,000/mo implies ₹4.5 Lakh MRR.",
                    severity="minor",
                    category="finance",
                    sources=[SourceRef(type="calc", ref="finance_engine", quote="revenue: 450000.0")],
                    status="unverified",
                    question="Why does this warrant a 18x forward multiple?",
                    resolved="open",
                ),
            ],
        )

    async def mock_market_llm(**kwargs):
        return PersonaReport(
            persona="market",
            headline="Claim of no direct competitors is contradicted by funded rivals.",
            findings=[
                Finding(
                    id="M-1",
                    persona="market",
                    title="Bikayi and Wati directly contradict no competitors claim",
                    detail="Wati has raised $23M and Bikayi $10.8M in WhatsApp commerce.",
                    severity="critical",
                    category="competition",
                    sources=[
                        SourceRef(
                            type="web",
                            ref="https://techcrunch.com/2021/09/20/bikayi-series-a",
                            quote="Bikayi enables merchants to set up digital storefronts",
                        )
                    ],
                    status="contradicted",
                    question="Why does your deck claim no competitors when Wati exists?",
                    resolved="open",
                ),
                Finding(
                    id="M-2",
                    persona="market",
                    title="TAM claim of ₹500 Cr is conservative vs industry estimates",
                    detail="Market size estimates project ₹1,200 Cr by 2026.",
                    severity="major",
                    category="market",
                    sources=[
                        SourceRef(
                            type="web",
                            ref="https://entrackr.com/reports/indian-conversational-commerce",
                            quote="market projected to reach ₹1,200 crore",
                        )
                    ],
                    status="verified",
                    question="Why is your TAM slide understated?",
                    resolved="open",
                ),
                Finding(
                    id="M-3",
                    persona="market",
                    title="SME distribution channels lack regional MoS",
                    detail="Acquiring 40 merchants/mo requires feet-on-street or heavy ads.",
                    severity="major",
                    category="market",
                    sources=[SourceRef(type="deck", ref="slide 6", quote="40 new merchants added per month")],
                    status="unverified",
                    question="What is your organic merchant referral coefficient?",
                    resolved="open",
                ),
                Finding(
                    id="M-4",
                    persona="market",
                    title="Missing cohort data obscures merchant retention",
                    detail="No cohort curves provided in deck.",
                    severity="minor",
                    category="traction",
                    sources=[SourceRef(type="inference", ref="model")],
                    status="unverified",
                    question="Where is the retention cohort breakdown?",
                    resolved="open",
                ),
            ],
        )

    async def mock_tech_llm(**kwargs):
        return PersonaReport(
            persona="tech",
            headline="Proprietary Indic NLP claims lack infrastructure evidence.",
            findings=[
                Finding(
                    id="T-1",
                    persona="tech",
                    title="Proprietary Indic NLP models unsupported by website and repo",
                    detail="Public site and GitHub repo show reliance on standard OpenAI APIs.",
                    severity="critical",
                    category="tech",
                    sources=[SourceRef(type="web", ref="https://bolbot.ai", quote="standard OpenAI and Meta Cloud APIs")],
                    status="contradicted",
                    question="Where are your custom trained model weights hosted?",
                    resolved="open",
                ),
                Finding(
                    id="T-2",
                    persona="tech",
                    title="Direct dependency on WhatsApp Cloud API pricing rules",
                    detail="Meta per-conversation pricing poses margin risk as volumes scale.",
                    severity="major",
                    category="tech",
                    sources=[SourceRef(type="deck", ref="slide 4", quote="WhatsApp Cloud API webhooks")],
                    status="unverified",
                    question="How does Meta's conversation pricing affect your 75% margin?",
                    resolved="open",
                ),
                Finding(
                    id="T-3",
                    persona="tech",
                    title="DPDP Act 2023 compliance missing for customer PII",
                    detail="Processing consumer payment and phone data requires explicit consent records.",
                    severity="major",
                    category="legal",
                    sources=[SourceRef(type="inference", ref="model")],
                    status="unverified",
                    question="How is consent collected under the Indian DPDP Act?",
                    resolved="open",
                ),
                Finding(
                    id="T-4",
                    persona="tech",
                    title="GitHub activity shows early prototype stage with 42 stars",
                    detail="Repo has recent commits but light test coverage.",
                    severity="minor",
                    category="tech",
                    sources=[SourceRef(type="web", ref="https://github.com/bolbot-ai/core", quote="stars: 42")],
                    status="verified",
                    question="What is your production test coverage on order webhooks?",
                    resolved="open",
                ),
            ],
        )

    finance_report = await run_persona("finance", deck, finance, llm_generate=mock_finance_llm)
    market_report = await run_persona("market", deck, market, llm_generate=mock_market_llm)
    tech_report = await run_persona("tech", deck, tech, llm_generate=mock_tech_llm)

    # Validate Finance
    assert isinstance(finance_report, PersonaReport)
    assert finance_report.persona == "finance"
    assert 4 <= len(finance_report.findings) <= 6
    for f in finance_report.findings:
        assert f.id.startswith("F-")
        assert len(f.sources) >= 1
        assert f.resolved == "open"

    # Validate Market
    assert isinstance(market_report, PersonaReport)
    assert market_report.persona == "market"
    assert 4 <= len(market_report.findings) <= 6
    for f in market_report.findings:
        assert f.id.startswith("M-")
        assert len(f.sources) >= 1
        assert f.resolved == "open"

    # Validate Tech
    assert isinstance(tech_report, PersonaReport)
    assert tech_report.persona == "tech"
    assert 4 <= len(tech_report.findings) <= 6
    for f in tech_report.findings:
        assert f.id.startswith("T-")
        assert len(f.sources) >= 1
        assert f.resolved == "open"


@pytest.mark.slow
@pytest.mark.asyncio
async def test_real_llm_persona():
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        pytest.skip("GEMINI_API_KEY not set in environment; skipping slow real LLM test")

    try:
        from google import genai
    except ImportError:
        pytest.skip("google-genai SDK not installed; skipping slow real LLM test")

    deck, finance, _, _ = load_fixtures()

    async def real_llm_call(prompt: str, schema: type, **kwargs):
        client = genai.Client(api_key=gemini_key)
        model = os.getenv("LLM_MODEL", "gemini-2.5-flash")
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config={"response_mime_type": "application/json", "response_schema": schema},
        )
        return schema.model_validate_json(response.text)

    report = await run_persona("finance", deck, finance, llm_generate=real_llm_call)
    assert isinstance(report, PersonaReport)
    assert report.persona == "finance"
    assert 4 <= len(report.findings) <= 6
    for f in report.findings:
        assert f.id.startswith("F-")
        assert len(f.sources) >= 1
