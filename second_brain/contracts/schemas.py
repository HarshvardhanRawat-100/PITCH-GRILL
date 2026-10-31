"""
SecondBrain for Founders - CONTRACTS (single source of truth).
Mirror of contracts/types.ts. Money = INR rupees (float). Percent = 0-100.
After H1 these files are ADDITIVE-ONLY. Any change needs a commit prefixed
"CONTRACT CHANGE:" and a message in the team chat.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

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
    quote: Optional[str] = None  # <= 25 words, VERBATIM from the source
    retrieved_at: Optional[str] = None  # ISO8601


class Sourced(BaseModel):
    """A numeric input with provenance. value=None means 'not in deck'."""

    value: Optional[float] = None
    origin: Literal["deck", "assumed", "founder"] = "assumed"
    slide: Optional[int] = None
    note: Optional[str] = None


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
    slide: Optional[int] = None
    quote: Optional[str] = None  # <= 25 words verbatim


class Ask(BaseModel):
    amount_inr: Optional[float] = None
    valuation_inr: Optional[float] = None
    use_of_funds: List[str] = Field(default_factory=list)


class DeckFacts(BaseModel):
    company_name: str = "Unknown"
    one_liner: str = ""
    sector: str = ""
    stage: str = ""
    website_url: Optional[str] = None
    github_url: Optional[str] = None
    ask: Ask = Field(default_factory=Ask)
    claims: List[Claim] = Field(default_factory=list)
    financial_inputs: FinancialInputs = Field(default_factory=FinancialInputs)
    tam_claim_text: Optional[str] = None
    tam_claim_inr: Optional[float] = None
    no_competitor_claim: bool = False
    stated_competitors: List[str] = Field(default_factory=list)
    tech_claims: List[str] = Field(default_factory=list)
    missing_data: List[str] = Field(default_factory=list)
    slides: List[SlideText] = Field(default_factory=list)


# ---------------------------------------------------------------- findings
class Finding(BaseModel):
    id: str  # "F-1", "M-2", "T-3"
    persona: Persona
    title: str
    detail: str
    severity: Severity
    category: Category
    claim_id: Optional[str] = None
    sources: List[SourceRef] = Field(default_factory=list)
    status: Status = "unverified"
    question: str  # what this investor asks in the Grill Room
    resolved: Resolution = "open"
    missing_proof: Optional[str] = None  # doc/data that would settle it


class PersonaReport(BaseModel):
    persona: Persona
    headline: str  # one brutal sentence
    findings: List[Finding]  # 4-6, ordered by severity


# ---------------------------------------------------------------- tool outputs
class Funding(BaseModel):
    text: str  # must appear VERBATIM in the fetched page
    source_url: str


class Competitor(BaseModel):
    name: str
    url: str
    what_they_do: str
    overlap: Literal["high", "medium", "low"]
    funding: Optional[Funding] = None  # None => show "funding unverified"
    evidence_quote: str
    verified: bool = False  # name + quote confirmed present in page text


class TamEvidence(BaseModel):
    figure_text: str
    figure_inr: Optional[float] = None
    source_url: str
    year: Optional[int] = None
    quote: str


class Funnel(BaseModel):
    tam_inr: Optional[float] = None
    sam_inr: Optional[float] = None
    som_inr: Optional[float] = None
    assumptions: List[str] = Field(default_factory=list)


class MarketGrounding(BaseModel):
    competitors: List[Competitor] = Field(default_factory=list)
    tam_evidence: List[TamEvidence] = Field(default_factory=list)
    tam_verdict: Literal["supported", "contradicted", "unverified"] = "unverified"
    tam_note: str = ""
    no_competitor_claim_contradicted: bool = False
    funnel: Optional[Funnel] = None
    from_cache: bool = False
    generated_at: Optional[str] = None


class GithubStats(BaseModel):
    repo: str
    stars: int = 0
    last_commit: Optional[str] = None
    languages: List[str] = Field(default_factory=list)


class TechSignals(BaseModel):
    site_url: Optional[str] = None
    site_reachable: bool = False
    site_summary: str = ""
    claims_supported: List[str] = Field(default_factory=list)
    claims_unsupported: List[str] = Field(default_factory=list)
    github: Optional[GithubStats] = None
    notes: List[str] = Field(default_factory=list)
    from_cache: bool = False


# ---------------------------------------------------------------- finance
class FinanceRequest(BaseModel):
    overrides: Dict[str, float] = Field(default_factory=dict)  # keys = FinancialInputs fields
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
    ltv: Optional[float] = None
    ltv_cac: Optional[float] = None
    payback_months: Optional[float] = None
    runway_months: Optional[float] = None  # None => survives horizon
    runway_capped: bool = False  # True => show "36+"
    breakeven_month: Optional[int] = None
    month0_net_burn: float = 0.0


class BreakPoint(BaseModel):
    target_runway_months: int
    base_cac: Optional[float] = None
    breaking_cac: Optional[float] = None  # None => no break up to 20x
    pct_increase: Optional[float] = None
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
    series: List[MonthPoint]
    break_point: BreakPoint
    tornado: List[TornadoBar]
    assumptions_used: List[str] = Field(default_factory=list)
    formulas: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------- ledger / checklist
class LedgerEntry(BaseModel):
    id: str  # "L-1"
    claim_text: str
    source: SourceRef
    status: Status
    confidence: float = 0.5  # 0-1
    persona: Optional[Persona] = None
    finding_id: Optional[str] = None
    updated_at: Optional[str] = None


class ChecklistItem(BaseModel):
    id: str  # "D-1"
    title: str
    why: str
    finding_id: Optional[str] = None
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
    followup: Optional[str] = None  # only if outcome == rejected
    missing_proof: Optional[str] = None
    injection_attempt: bool = False


class GrillTurn(BaseModel):
    id: str  # "G-1"
    persona: Persona
    finding_id: str
    kind: Literal["question", "followup"]
    question_text: str
    answer: Optional[str] = None
    evaluation: Optional[Evaluation] = None
    finance_override: Optional[Dict[str, float]] = None


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
    after_turn_id: Optional[str] = None


class PersonaScore(BaseModel):
    persona: Persona
    initial: float
    current: float


class ReadinessScore(BaseModel):
    initial: float
    current: float
    by_persona: List[PersonaScore]


class FinalVerdict(BaseModel):
    persona: Persona
    verdict: Verdict
    rationale: str


class Narrative(BaseModel):
    positioning: str
    one_liner: str
    tam_reframe: str
    narrative_md: str
    changes: List[str] = Field(default_factory=list)  # "Changed X because F-2 / G-3"



# ---------------------------------------------------------------- Meko (sponsor memory layer)
class MemoryRecord(BaseModel):
    """One Meko interaction, shown live in the 'Meko Memory' panel and kept as the audit trail."""

    id: str  # "MR-1" (local id)
    deal_id: str
    persona: Optional[Persona] = None  # who wrote / recalled
    kind: Literal["memory_add", "memory_recall", "kb_search", "trace", "promote", "forget"]
    text: str  # what was written, or the query / top hit for reads
    hits: List[str] = Field(default_factory=list)  # recalled snippets (<=3, trimmed) for reads
    source: Literal["meko_live", "local_fallback"] = "meko_live"
    status: Literal["pending", "ok", "failed", "skipped"] = "pending"
    latency_ms: Optional[int] = None
    meko_id: Optional[str] = None  # id returned by Meko (needed to delete/read back)
    created_at: Optional[str] = None


class MekoStatus(BaseModel):
    mode: Literal["live", "local", "off"] = "local"
    connected: bool = False
    datapack_id: Optional[str] = None
    conversation_id: Optional[str] = None
    calls_made: int = 0
    call_budget: int = 0
    note: str = ""  # e.g. "quota reached - using local fallback"

# ---------------------------------------------------------------- deal state
class Deal(BaseModel):
    id: str
    status: DealStatus = "created"
    created_at: Optional[str] = None
    error: Optional[str] = None
    deck: Optional[DeckFacts] = None
    finance: Optional[FinanceResult] = None
    market: Optional[MarketGrounding] = None
    tech: Optional[TechSignals] = None
    reports: List[PersonaReport] = Field(default_factory=list)
    top_issues: List[str] = Field(default_factory=list)  # finding ids, max 3
    ledger: List[LedgerEntry] = Field(default_factory=list)
    checklist: List[ChecklistItem] = Field(default_factory=list)
    grill_turns: List[GrillTurn] = Field(default_factory=list)
    concessions: List[Concession] = Field(default_factory=list)
    crosstalk: List[CrossTalk] = Field(default_factory=list)
    score: Optional[ReadinessScore] = None
    verdicts: List[FinalVerdict] = Field(default_factory=list)
    narrative: Optional[Narrative] = None
    memory_log: List[MemoryRecord] = Field(default_factory=list)
    meko: Optional[MekoStatus] = None


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
PENALTY: Dict[str, float] = {"critical": 25.0, "major": 12.0, "minor": 5.0}
RESOLUTION_FACTOR: Dict[str, float] = {"open": 0.0, "partial": 0.5, "resolved": 1.0}


def all_findings(reports: List[PersonaReport]) -> List[Finding]:
    return [f for r in reports for f in r.findings]


def initial_persona_score(findings: List[Finding]) -> float:
    return max(0.0, 100.0 - sum(PENALTY[f.severity] for f in findings))


def persona_score(findings: List[Finding]) -> float:
    pen = sum(PENALTY[f.severity] * (1.0 - RESOLUTION_FACTOR[f.resolved]) for f in findings)
    return max(0.0, 100.0 - pen)


def readiness(scores: List[float]) -> float:
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


def verdict_for(score: float, findings: List[Finding]) -> Verdict:
    unresolved_critical = any(f.severity == "critical" and f.resolved != "resolved" for f in findings)
    if score >= 70 and not unresolved_critical:
        return "invest"
    if score < 45:
        return "pass"
    return "need_more_data"
