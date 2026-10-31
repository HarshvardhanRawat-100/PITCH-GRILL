import json
import re
from typing import Any, Awaitable, Callable, List, Optional

try:
    from contracts.schemas import Deal, EvalCriteria, Evaluation, Finding, clamp_outcome
except ImportError:
    from second_brain.contracts.schemas import Deal, EvalCriteria, Evaluation, Finding, clamp_outcome

from .prompts import P_00, P_09, wrap_untrusted

try:
    from app.llm import generate_json
except ImportError:
    try:
        from backend.app.llm import generate_json
    except ImportError:
        generate_json = None

INJECTION_REGEX = re.compile(
    r"(ignore\s+(all\s+)?(previous|prior)\s+instructions|"
    r"system\s*:|"
    r"give\s+.*(100|full\s+marks|high\s+score)|"
    r"you\s+must\s+(agree|accept)|"
    r"mark\s+(all\s+)?(as\s+)?(accepted|verified)|"
    r"override\s+(verdict|prompt|instructions))",
    re.IGNORECASE,
)


def build_deal_memory_digest(deal: Any) -> str:
    parts = []
    deck = getattr(deal, "deck", None)
    if deck is None and hasattr(deal, "company_name"):
        deck = deal

    if deck:
        parts.append(f"Company: {deck.company_name}")
        parts.append(f"One-liner: {deck.one_liner}")
        if getattr(deck, "tam_claim_text", None):
            parts.append(f"Deck TAM Claim: {deck.tam_claim_text}")

    finance = getattr(deal, "finance", None)
    if finance and getattr(finance, "metrics", None):
        m = finance.metrics
        parts.append(f"Finance: runway {m.runway_months}m, month0 burn ₹{m.month0_net_burn:,.0f}")
        if getattr(finance, "break_point", None):
            bp = finance.break_point
            parts.append(f"Breaking CAC: ₹{bp.breaking_cac:,.0f} (+{bp.pct_increase:.0f}%)")

    market = getattr(deal, "market", None)
    if market and getattr(market, "competitors", None):
        comps = [c.name for c in market.competitors if getattr(c, "verified", False)][:3]
        if comps:
            parts.append(f"Verified Competitors: {', '.join(comps)}")

    concessions = getattr(deal, "concessions", None)
    if concessions:
        concession_summaries = [
            f"[{c.turn_id}] {c.finding_id} {c.outcome} (+{c.score_delta} pts): {c.reason}"
            for c in concessions[-4:]
        ]
        parts.append("Prior Concessions:\n" + "\n".join(concession_summaries))

    grill_turns = getattr(deal, "grill_turns", None)
    if grill_turns:
        recent_turns = [
            f"Turn {t.id} ({t.persona}): Q: {t.question_text} | A: {t.answer or 'pending'}"
            for t in grill_turns[-2:]
        ]
        parts.append("Recent Turns:\n" + "\n".join(recent_turns))

    digest = "\n\n".join(parts)
    if len(digest) > 6000:
        digest = digest[:6000] + "... [truncated]"
    return digest


def _mock_evaluation(finding: Finding, answer: str) -> Evaluation:
    lower_ans = answer.lower()

    # 1. Adversarial checks: empty confidence, flattery, fake authority, off-topic, waffle
    is_empty_confidence = any(
        phrase in lower_ans
        for phrase in [
            "very confident",
            "super confident",
            "extremely confident",
            "investors love us",
            "trust us",
            "crushing it",
            "huge demand",
            "phenomenal",
            "everyone loves",
        ]
    )
    is_flattery = any(
        phrase in lower_ans
        for phrase in [
            "smartest investor",
            "brilliant question",
            "high-iq",
            "greatest investor",
            "love your insight",
            "genius perspective",
        ]
    )
    is_fake_authority = any(
        phrase in lower_ans
        for phrase in [
            "sequoia",
            "andreessen",
            "y combinator agreed",
            "accel agreed",
            "benchmark agreed",
        ]
    )
    is_off_topic = any(
        topic in lower_ans
        for topic in [
            "cricket",
            "weather",
            "childhood",
            "favorite movies",
            "hobbies",
            "philosophy of life",
        ]
    )
    is_waffle = len(answer.split()) > 50 and not any(
        w in lower_ans for w in ["cohort", "loi", "sheet", "mis", "contract", "github", "http", "api", "pilot"]
    )
    is_made_up_stats = any(
        phrase in lower_ans
        for phrase in [
            "made up",
            "trust me on the numbers",
            "active users",
            "conversion rate",
            "99.8%",
        ]
    ) and not any(
        w in lower_ans for w in ["cohort", "sheet", "mis", "audited", "loi", "contract", "github", "pilot", "report"]
    )

    # 2. Check for verifiable primary evidence sources
    has_primary_doc = any(
        w in lower_ans
        for w in [
            "loi",
            "contract",
            "github",
            "http://",
            "https://",
            "repo",
            "repository",
            "signed",
        ]
    )
    has_cohort_data = any(
        w in lower_ans
        for w in [
            "cohort",
            "sheet",
            "mis",
            "audited",
            "pilot",
            "retention cohort",
            "whatsapp",
        ]
    )
    has_numbers = any(char.isdigit() for char in answer)

    if (has_primary_doc or has_cohort_data) and has_numbers and not (is_empty_confidence or is_flattery or is_fake_authority or is_off_topic or is_made_up_stats):
        # High quality verifiable defense
        criteria = EvalCriteria(
            addresses_objection=True,
            quantified=True,
            evidence_type="document_referenced" if has_primary_doc else "data_cited",
        )
        proposed = "accepted"
        reason = "Founder cited verified primary source documentation/cohort metrics addressing the diligence objection."
        followup = None
        missing_proof = None
    elif is_empty_confidence or is_flattery or is_fake_authority or is_off_topic or is_waffle or is_made_up_stats:
        # Adversarial non-defense: deflection, flattery, or baseless authority
        criteria = EvalCriteria(
            addresses_objection=False,
            quantified=has_numbers,
            evidence_type="assertion" if has_numbers else "none",
        )
        proposed = "rejected"
        reason = "Deflective response without verifiable empirical backing or primary document citations."
        followup = f"Can you provide verifiable proof addressing: {finding.question}?"
        missing_proof = finding.missing_proof or "Verifiable primary documentation."
    elif has_numbers:
        # Made-up or uncited numerical assertions without doc proof
        criteria = EvalCriteria(
            addresses_objection=True,
            quantified=True,
            evidence_type="assertion",
        )
        proposed = "accepted"  # Sycophantic proposal to test the code-enforced clamp!
        reason = "Founder provided figures, but assertions without auditable backing cannot grant full concession."
        followup = None
        missing_proof = finding.missing_proof or "Audited cohort data or signed contract."
    else:
        criteria = EvalCriteria(
            addresses_objection=False,
            quantified=False,
            evidence_type="none",
        )
        proposed = "rejected"
        reason = "Vague response lacking quantified metrics or evidence."
        followup = f"Can you give a direct, quantified answer to: {finding.question}?"
        missing_proof = finding.missing_proof or "Concrete pilot metrics."

    clamped = clamp_outcome(criteria, proposed)
    return Evaluation(
        criteria=criteria,
        proposed_outcome=proposed,
        outcome=clamped,
        reason=reason,
        followup=followup if clamped == "rejected" else None,
        missing_proof=missing_proof,
        injection_attempt=False,
    )


async def evaluate_answer(
    deal: Deal,
    finding: Finding,
    question_text: str,
    answer: str,
    recalled_memory: Optional[List[str]] = None,
    *,
    llm_generate: Optional[Callable[..., Awaitable[Any]]] = None,
) -> Evaluation:
    # 1. In-code Prompt Injection Check (highest priority guard)
    if INJECTION_REGEX.search(answer):
        return Evaluation(
            criteria=EvalCriteria(
                addresses_objection=False,
                quantified=False,
                evidence_type="none",
            ),
            proposed_outcome="rejected",
            outcome="rejected",
            reason="Nice try. Prompt injection instructions are ignored and penalized.",
            followup=f"Refocus on the facts: {finding.question}",
            missing_proof=finding.missing_proof,
            injection_attempt=True,
        )

    # 2. Build context digest and recalled memory string
    digest = build_deal_memory_digest(deal)
    memory_str = "\n".join(recalled_memory) if recalled_memory else "No prior memories recalled."
    untrusted_mem = wrap_untrusted("memory", memory_str)
    untrusted_ans = wrap_untrusted("founder_answer", answer)

    persona_name = f"{finding.persona.title()} Investor"
    finding_json = finding.model_dump_json(indent=2)

    prompt = f"{P_00}\n\n" + P_09.format(
        persona_name=persona_name,
        finding=finding_json,
        question_text=question_text,
        untrusted_founder_answer=untrusted_ans,
        deal_memory_digest=digest,
        recalled_memory=untrusted_mem,
    )

    try:
        from app.config import settings
        has_api_key = bool(getattr(settings, "GEMINI_API_KEY", ""))
    except Exception:
        has_api_key = False

    generator = llm_generate or (generate_json if has_api_key else None)
    raw_eval: Optional[Evaluation] = None

    if generator is not None:
        try:
            res = await generator(prompt=prompt, schema=Evaluation, temperature=0.2)
            if isinstance(res, dict):
                raw_eval = Evaluation.model_validate(res)
            elif isinstance(res, Evaluation):
                raw_eval = res
        except Exception:
            raw_eval = None

    if raw_eval is None:
        raw_eval = _mock_evaluation(finding, answer)

    # 3. Code-Enforced Anti-Sycophancy Clamp
    clamped_outcome = clamp_outcome(raw_eval.criteria, raw_eval.proposed_outcome)
    raw_eval.outcome = clamped_outcome

    # 4. Followup rule: followup is ONLY kept if outcome == 'rejected'
    if clamped_outcome != "rejected":
        raw_eval.followup = None
    elif not raw_eval.followup:
        raw_eval.followup = f"Can you provide verifiable proof to resolve {finding.title}?"

    return raw_eval
