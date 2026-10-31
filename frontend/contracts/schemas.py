"""
SecondBrain for Founders - CONTRACTS (single source of truth).
Mirror of contracts/types.ts. Money = INR rupees (float). Percent = 0-100.
After H1 these files are ADDITIVE-ONLY. Any change needs a commit prefixed
"CONTRACT CHANGE:" and a message in the team chat.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------- enums
SourceType = Literal["deck", "web", "inference", "calc", "cache", "kb"]  # kb = Meko knowledge base
Status = Literal["verified", "contradicted", "unverified", "assumed"]
Persona = Literal["finance", "market", "tech"]
Speaker = Literal["finance", "market", "tech", "moderator", "founder", "system"]
Severity = Literal["critical", "major", "minor"]
Category = Literal[
    "market", "finance", "tech", "traction", "team", "competition", "legal", "other"
]
Resolution = Literal["open", "partial", "resolved"]
Outcome = Literal["accepted", "partial", "rejected"]
EvidenceType = Literal["none", "assertion", "data_cited", "document_referenced"]
Verdict = Literal["invest", "pass", "need_more_data"]
DealStatus = Literal[
    "created", "parsing", "analyzing", "ready", "grilling", "complete", "error"
]


# ---------------------------------------------------------------- provenance
class SourceRef(BaseModel):
    type: SourceType
    ref: str  # "slide 7" | "https://..." | "model" | "finance_engine" | "cache:<file>"
    quote: str | None = None  # <= 25 words, VERBATIM from the source
    retrieved_at: str | None = None  # ISO8601


class Sourced(BaseModel):
    """A numeric input with provenance. value=None means 'not in deck'."""

    value: float | None = None
    origin: Literal["deck", "assumed", "founder"] = "assumed"
    slide: int | None = None
    note: str | None = None


# ---------------------------------------------------------------- deck
class FinancialInputs(BaseModel):
    arpu_monthly: Sourced = Field(default_factory=Sourced)  # INR / customer / month
    cac: Sourced = Field(default_factory=Sourced)  # INR per new customer
    gross_margin_pct: Sourced = Field(default_factory=Sourced)  # 0-100
    monthly_churn_pct: Sourced = Field(default_factory=Sourced)  # 0-100
    cash_in_bank: Sourced = Field(default_factory=Sourced)  # INR
    fixed_opex_monthly: Sourced = Field(default_factory=Sourced)  # INR, excl. CAC
    current_customers: Sourced = Field(default_factory=Sourced)
    new_customers_monthly: Sourced = Field(default_factory=Sourced)
    new_customer_growth_pct_monthly: Sourced = Field(default_factory=Sourced)


class SlideText(BaseModel):
    n: int  # 1-based
    text: str
    used_vision: bool = False


class Claim(BaseModel):
    id: str  # "c1", "c2", ...
    text: str
    category: Category
    slide: int | None = None
    quote: str | None = None  # <= 25 words verbatim


class Ask(BaseModel):
    amount_inr: float | None = None
    valuation_inr: float | None = None
    use_of_funds: list[str] = Field(default_factory=list)


class DeckFacts(BaseModel):
    company_name: str = "Unknown"
    one_liner: str = ""
    sector: str = ""
    stage: str = ""
    website_url: str | None = None
    github_url: str | None = None
    ask: Ask = Field(default_factory=Ask)
    claims: list[Claim] = Field(default_factory=list)
    financial_inputs: FinancialInputs = Field(default_factory=FinancialInputs)
    tam_claim_text: str | None = None
    tam_claim_inr: float | None = None
    no_competitor_claim: bool = False
    stated_competitors: list[str] = Field(default_factory=list)
    tech_claims: list[str] = Field(default_factory=list)
    missing_data: list[str] = Field(default_factory=list)
    slides: list[SlideText] = Field(default_factory=list)


# ---------------------------------------------------------------- findings
class Finding(BaseModel):
    id: str  # "F-1", "M-2", "T-3"
    persona: Persona
    title: str
    detail: str
    severity: Severity
    category: Category
    claim_id: str | None = None
    sources: list[SourceRef] = Field(default_factory=list)
    status: Status = "unverified"
    question: str  # what this investor asks in the Grill Room
    resolved: Resolution = "open"
    missing_proof: str | None = None  # doc/data that would settle it


class PersonaReport(BaseModel):
    persona: Persona
    headline: str  # one brutal sentence
    findings: list[Finding]  # 4-6, ordered by severity


# ---------------------------------------------------------------- tool outputs
class Funding(BaseModel):
    text: str  # must appear VERBATIM in the fetched page
    source_url: str


class Competitor(BaseModel):
    name: str
    url: str
    what_they_do: str
    overlap: Literal["high", "medium", "low"]
    funding: Funding | None = None  # None => show "funding unverified"
    evidence_quote: str
    verified: bool = False  # name + quote confirmed present in page text


class TamEvidence(BaseModel):
    figure_text: str
    figure_inr: float | None = None
    source_url: str
    year: int | None = None
    quote: str


class Funnel(BaseModel):
    tam_inr: float | None = None
    sam_inr: float | None = None
    som_inr: float | None = None
    assumptions: list[str] = Field(default_factory=list)


class MarketGrounding(BaseModel):
    competitors: list[Competitor] = Field(default_factory=list)
    tam_evidence: list[TamEvidence] = Field(default_factory=list)
    tam_verdict: Literal["supported", "contradicted", "unverified"] = "unverified"
    tam_note: str = ""
    no_competitor_claim_contradicted: bool = False
    funnel: Funnel | None = None
    from_cache: bool = False
    generated_at: str | None = None


class GithubStats(BaseModel):
    repo: str
    stars: int = 0
    last_commit: str | None = None
    languages: list[str] = Field(default_factory=list)


class TechSignals(BaseModel):
    site_url: str | None = None
    site_reachable: bool = False
    site_summary: str = ""
    claims_supported: list[str] = Field(default_factory=list)
    claims_unsupported: list[str] = Field(default_factory=list)
    github: GithubStats | None = None
    notes: list[str] = Field(default_factory=list)
    from_cache: bool = False


# ---------------------------------------------------------------- finance
class FinanceRequest(BaseModel):
    overrides: dict[str, float] = Field(default_factory=dict)  # keys = FinancialInputs fields
    mode: Literal["hold_growth", "hold_spend"] = "hold_growth"
    target_runway_months: int = 12


class MonthPoint(BaseModel):
    month: int
    customers: float
    revenue: float
    gross_profit: float
    acquisition_spend: float
    net_burn: float
    cash: float


class FinanceMetrics(BaseModel):
    ltv: float | None = None
    ltv_cac: float | None = None
    payback_months: float | None = None
    runway_months: float | None = None  # None => survives horizon
    runway_capped: bool = False  # True => show "36+"
    breakeven_month: int | None = None
    month0_net_burn: float = 0.0


class BreakPoint(BaseModel):
    target_runway_months: int
    base_cac: float | None = None
    breaking_cac: float | None = None  # None => no break up to 20x
    pct_increase: float | None = None
    already_below_target: bool = False


class TornadoBar(BaseModel):
    variable: str
    label: str
    runway_low: float  # variable -20%
    runway_high: float  # variable +20%
    delta_months: float


class FinanceResult(BaseModel):
    inputs: FinancialInputs  # after overrides; origin tracked
    mode: Literal["hold_growth", "hold_spend"]
    horizon_months: int = 36
    metrics: FinanceMetrics
    series: list[MonthPoint]
    break_point: BreakPoint
    tornado: list[TornadoBar]
    assumptions_used: list[str] = Field(default_factory=list)
    formulas: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------- ledger / checklist
class LedgerEntry(BaseModel):
    id: str  # "L-1"
    claim_text: str
    source: SourceRef
    status: Status
    confidence: float = 0.5  # 0-1
    persona: Persona | None = None
    finding_id: str | None = None
    updated_at: str | None = None


class ChecklistItem(BaseModel):
    id: str  # "D-1"
    title: str
    why: str
    finding_id: str | None = None
    priority: Literal["P0", "P1", "P2"]
    owner: Literal["founder", "legal", "finance", "tech"]
    status: Literal["todo", "addressed", "uploaded"] = "todo"
    india_specific: bool = False


# ---------------------------------------------------------------- grill room
class EvalCriteria(BaseModel):
    addresses_objection: bool
    quantified: bool
    evidence_type: EvidenceType


class Evaluation(BaseModel):
    criteria: EvalCriteria
    proposed_outcome: Outcome  # what the LLM wanted
    outcome: Outcome  # after clamp_outcome() - this one counts
    reason: str
    followup: str | None = None  # only if outcome == rejected
    missing_proof: str | None = None
    injection_attempt: bool = False


class GrillTurn(BaseModel):
    id: str  # "G-1"
    persona: Persona
    finding_id: str
    kind: Literal["question", "followup"]
    question_text: str
    answer: str | None = None
    evaluation: Evaluation | None = None
    finance_override: dict[str, float] | None = None


class Concession(BaseModel):
    finding_id: str
    persona: Persona
    outcome: Outcome
    score_delta: float
    reason: str
    turn_id: str


class CrossTalk(BaseModel):
    from_persona: Persona
    to_persona: Persona
    text: str
    after_turn_id: str | None = None


class PersonaScore(BaseModel):
    persona: Persona
    initial: float
    current: float


class ReadinessScore(BaseModel):
    initial: float
    current: float
    by_persona: list[PersonaScore]


class FinalVerdict(BaseModel):
    persona: Persona
    verdict: Verdict
    rationale: str


class Narrative(BaseModel):
    positioning: str
    one_liner: str
    tam_reframe: str
    narrative_md: str
    changes: list[str] = Field(default_factory=list)  # "Changed X because F-2 / G-3"



# ---------------------------------------------------------------- Meko (sponsor memory layer)
class MemoryRecord(BaseModel):
    """One Meko interaction, shown live in the 'Meko Memory' panel and kept as the audit trail."""

    id: str  # "MR-1" (local id)
    deal_id: str
    persona: Persona | None = None  # who wrote / recalled
    kind: Literal["memory_add", "memory_recall", "kb_search", "trace", "promote", "forget"]
    text: str  # what was written, or the query / top hit for reads
    hits: list[str] = Field(default_factory=list)  # recalled snippets (<=3, trimmed) for reads
    source: Literal["meko_live", "local_fallback"] = "meko_live"
    status: Literal["pending", "ok", "failed", "skipped"] = "pending"
    latency_ms: int | None = None
    meko_id: str | None = None  # id returned by Meko (needed to delete/read back)
    created_at: str | None = None


class MekoStatus(BaseModel):
    mode: Literal["live", "local", "off"] = "local"
    connected: bool = False
    datapack_id: str | None = None
    conversation_id: str | None = None
    calls_made: int = 0
    call_budget: int = 0
    note: str = ""  # e.g. "quota reached - using local fallback"

# ---------------------------------------------------------------- deal state
class Deal(BaseModel):
    id: str
    status: DealStatus = "created"
    created_at: str | None = None
    error: str | None = None
    deck: DeckFacts | None = None
    finance: FinanceResult | None = None
    market: MarketGrounding | None = None
    tech: TechSignals | None = None
    reports: list[PersonaReport] = Field(default_factory=list)
    top_issues: list[str] = Field(default_factory=list)  # finding ids, max 3
    ledger: list[LedgerEntry] = Field(default_factory=list)
    checklist: list[ChecklistItem] = Field(default_factory=list)
    grill_turns: list[GrillTurn] = Field(default_factory=list)
    concessions: list[Concession] = Field(default_factory=list)
    crosstalk: list[CrossTalk] = Field(default_factory=list)
    score: ReadinessScore | None = None
    verdicts: list[FinalVerdict] = Field(default_factory=list)
    narrative: Narrative | None = None
    memory_log: list[MemoryRecord] = Field(default_factory=list)
    meko: MekoStatus | None = None


SSEType = Literal[
    "stage", "deck", "finance", "market", "tech", "persona_report", "ledger",
    "score", "question", "evaluation", "concession", "crosstalk", "checklist",
    "verdict", "narrative", "memory", "done", "error",
]


class SSEEvent(BaseModel):
    type: SSEType
    deal_id: str
    seq: int
    ts: str
    data: dict


# ---------------------------------------------------------------- PURE RULES (shared, tested)
PENALTY: dict[str, float] = {"critical": 25.0, "major": 12.0, "minor": 5.0}
RESOLUTION_FACTOR: dict[str, float] = {"open": 0.0, "partial": 0.5, "resolved": 1.0}


def all_findings(reports: list[PersonaReport]) -> list[Finding]:
    return [f for r in reports for f in r.findings]


def initial_persona_score(findings: list[Finding]) -> float:
    return max(0.0, 100.0 - sum(PENALTY[f.severity] for f in findings))


def persona_score(findings: list[Finding]) -> float:
    pen = sum(PENALTY[f.severity] * (1.0 - RESOLUTION_FACTOR[f.resolved]) for f in findings)
    return max(0.0, 100.0 - pen)


def readiness(scores: list[float]) -> float:
    return sum(scores) / len(scores) if scores else 0.0


def clamp_outcome(c: EvalCriteria, proposed: Outcome) -> Outcome:
    """ANTI-SYCOPHANCY RULE - enforced in code, not in the prompt.
    accepted needs: addresses objection AND real evidence (data/document).
    partial needs: addresses objection AND (quantified OR any stated evidence)."""
    strong = c.evidence_type in ("data_cited", "document_referenced")
    allowed_accept = c.addresses_objection and strong
    allowed_partial = c.addresses_objection and (c.quantified or c.evidence_type != "none")
    out = proposed
    if out == "accepted" and not allowed_accept:
        out = "partial"
    if out == "partial" and not allowed_partial:
        out = "rejected"
    return out


def resolution_for(outcome: Outcome) -> Resolution:
    return {"accepted": "resolved", "partial": "partial", "rejected": "open"}[outcome]


def verdict_for(score: float, findings: list[Finding]) -> Verdict:
    unresolved_critical = any(f.severity == "critical" and f.resolved != "resolved" for f in findings)
    if score >= 70 and not unresolved_critical:
        return "invest"
    if score < 45:
        return "pass"
    return "need_more_data"
