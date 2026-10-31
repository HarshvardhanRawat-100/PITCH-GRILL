import asyncio
import logging
import os
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

try:
    from contracts.schemas import (
        ChecklistItem,
        Concession,
        CrossTalk,
        Deal,
        FinalVerdict,
        Finding,
        GrillTurn,
        MemoryRecord,
        Narrative,
        Persona,
        clamp_outcome,
        resolution_for,
        verdict_for,
    )
except ImportError:
    from second_brain.contracts.schemas import (
        ChecklistItem,
        Concession,
        CrossTalk,
        Deal,
        FinalVerdict,
        Finding,
        GrillTurn,
        MemoryRecord,
        Narrative,
        Persona,
        clamp_outcome,
        resolution_for,
        verdict_for,
    )

from .evaluator import evaluate_answer
from .prompts import P_00, P_12, P_13, wrap_untrusted
from .scoring import compute_score

logger = logging.getLogger(__name__)

# Guarded store imports
try:
    from app.store import append_event, get_deal, save_deal
except ImportError:
    try:
        from backend.app.store import append_event, get_deal, save_deal
    except ImportError:
        _DEALS_CACHE: Dict[str, Deal] = {}

        def get_deal(deal_id: str) -> Optional[Deal]:
            return _DEALS_CACHE.get(deal_id)

        def save_deal(deal: Deal) -> None:
            _DEALS_CACHE[deal.id] = deal

        def append_event(deal_id: str, event_type: str, data: Any) -> None:
            pass


# Guarded memory imports
class _LocalGrillMemoryClient:
    def __init__(self) -> None:
        self._seq = 1
        self._memories: List[MemoryRecord] = []

    async def remember(
        self, deal_id: str, persona: Optional[str], text: str, tag: str
    ) -> MemoryRecord:
        rec = MemoryRecord(
            id=f"MR-{self._seq}",
            deal_id=deal_id,
            persona=persona,  # type: ignore
            kind="memory_add",
            text=text,
            source="local_fallback",
            status="ok",
        )
        self._seq += 1
        self._memories.append(rec)
        return rec

    async def recall(
        self, deal_id: str, query: str, persona: Optional[str] = None, k: int = 3
    ) -> MemoryRecord:
        hits = [m.text for m in self._memories if m.deal_id == deal_id][-k:]
        rec = MemoryRecord(
            id=f"MR-{self._seq}",
            deal_id=deal_id,
            persona=persona,  # type: ignore
            kind="memory_recall",
            text=query,
            hits=hits,
            source="local_fallback",
            status="ok",
        )
        self._seq += 1
        self._memories.append(rec)
        return rec

    async def trace(
        self, deal_id: str, label: str, exchange_text: str
    ) -> MemoryRecord:
        rec = MemoryRecord(
            id=f"MR-{self._seq}",
            deal_id=deal_id,
            kind="trace",
            text=f"{label}: {exchange_text[:100]}",
            source="local_fallback",
            status="ok",
        )
        self._seq += 1
        self._memories.append(rec)
        return rec


_local_grill_memory = _LocalGrillMemoryClient()

try:
    from app.memory import get_memory
except ImportError:
    try:
        from backend.app.memory import get_memory
    except ImportError:
        def get_memory() -> Any:
            return _local_grill_memory


def _emit_event(deal_id: str, event_type: str, data: Any) -> None:
    try:
        append_event(deal_id, event_type, data)
    except Exception as e:
        logger.warning(f"Failed to append event {event_type}: {e}")


def plan_grill(deal: Deal) -> List[Tuple[Persona, Finding]]:
    """
    Plan top-2 open findings per persona in order: F1, M1, T1, F2, M2, T2.
    """
    by_persona: Dict[str, List[Finding]] = {"finance": [], "market": [], "tech": []}
    for report in deal.reports:
        open_findings = [f for f in report.findings if f.resolved == "open"]
        # Already sorted by severity in post-processing
        by_persona[report.persona] = open_findings[:2]

    f_list = by_persona.get("finance", [])
    m_list = by_persona.get("market", [])
    t_list = by_persona.get("tech", [])

    plan: List[Tuple[Persona, Finding]] = []
    # Round 1: F1, M1, T1
    if len(f_list) > 0:
        plan.append(("finance", f_list[0]))
    if len(m_list) > 0:
        plan.append(("market", m_list[0]))
    if len(t_list) > 0:
        plan.append(("tech", t_list[0]))

    # Round 2: F2, M2, T2
    if len(f_list) > 1:
        plan.append(("finance", f_list[1]))
    if len(m_list) > 1:
        plan.append(("market", m_list[1]))
    if len(t_list) > 1:
        plan.append(("tech", t_list[1]))

    return plan


def _find_finding_by_id(deal: Deal, finding_id: str) -> Optional[Finding]:
    for r in deal.reports:
        for f in r.findings:
            if f.id == finding_id:
                return f
    return None


async def start_grill(deal_id: str, deal: Optional[Deal] = None) -> GrillTurn:
    if deal is None:
        deal = get_deal(deal_id)
        if deal is None:
            raise ValueError(f"Deal {deal_id} not found")

    deal.status = "grilling"
    plan = plan_grill(deal)
    if not plan:
        raise ValueError("No open findings available to grill")

    first_persona, first_finding = plan[0]
    first_turn = GrillTurn(
        id="G-1",
        persona=first_persona,
        finding_id=first_finding.id,
        kind="question",
        question_text=first_finding.question,
    )
    deal.grill_turns = [first_turn]
    _emit_event(deal_id, "question", first_turn.model_dump())
    save_deal(deal)
    return first_turn


async def _generate_crosstalk(
    deal: Deal,
    last_turn: GrillTurn,
    recalled_memory: List[str],
    *,
    llm_generate: Optional[Callable[..., Any]] = None,
) -> Optional[CrossTalk]:
    # Pick a persona different from last_turn.persona
    candidates: List[Persona] = [p for p in ["finance", "market", "tech"] if p != last_turn.persona]
    from_persona = candidates[0]
    to_persona = last_turn.persona

    exchange_text = (
        f"Turn {last_turn.id}: {to_persona} asked '{last_turn.question_text}'. "
        f"Founder answered '{last_turn.answer}'. Evaluation: {last_turn.evaluation.outcome if last_turn.evaluation else 'pending'}."
    )
    recalled_str = "\n".join(recalled_memory) if recalled_memory else "No other persona memories."

    prompt = (
        f"{P_00}\n\n"
        + P_12.replace("{from_persona_name}", f"{from_persona.title()} Investor")
        .replace("{to_persona_name}", f"{to_persona.title()} Investor")
        .replace("{last_turn}", exchange_text)
        .replace("{related_findings}", "")
        .replace("{recalled_memory}", wrap_untrusted("memory", recalled_str))
    )

    if llm_generate is not None:
        try:
            res = await llm_generate(prompt=prompt, schema=CrossTalk, temperature=0.7)
            if isinstance(res, CrossTalk):
                return res
            if isinstance(res, dict):
                return CrossTalk.model_validate(res)
        except Exception:
            pass

    # Deterministic fallback interjection (<=25 words)
    fallback_texts = {
        "finance": f"{to_persona.title()}, that answer means nothing if their customer acquisition burn drains runway.",
        "market": f"{to_persona.title()}, margin assumptions collapse once funded competitors start running aggressive ads.",
        "tech": f"{to_persona.title()}, their unit claims depend entirely on third-party APIs with zero proprietary moat.",
    }
    return CrossTalk(
        from_persona=from_persona,
        to_persona=to_persona,
        text=fallback_texts.get(from_persona, "Watch the unit numbers closely."),
        after_turn_id=last_turn.id,
    )


async def _finish_grill(
    deal: Deal,
    *,
    llm_generate: Optional[Callable[..., Any]] = None,
) -> None:
    deal.status = "complete"
    verdicts: List[FinalVerdict] = []

    for r in deal.reports:
        # Code computes verdict via schemas.verdict_for
        v_type = verdict_for(deal.score.current if deal.score else 0.0, r.findings)
        score_val = next(
            (p.current for p in deal.score.by_persona if p.persona == r.persona),
            deal.score.current if deal.score else 50.0,
        )

        rationale = (
            f"{r.persona.title()} verdict is {v_type.replace('_', ' ')}. "
            f"Key findings were evaluated with current score {score_val:.1f}."
        )

        verdict_obj = FinalVerdict(
            persona=r.persona,
            verdict=v_type,
            rationale=rationale,
        )
        verdicts.append(verdict_obj)
        _emit_event(deal.id, "verdict", verdict_obj.model_dump())

    deal.verdicts = verdicts

    # Guarded narrative generation
    try:
        from app.agents.narrative import generate_narrative
        deal.narrative = await generate_narrative(deal)
    except ImportError:
        try:
            from backend.app.agents.narrative import generate_narrative
            deal.narrative = await generate_narrative(deal)
        except ImportError:
            deal.narrative = Narrative(
                positioning=f"{deal.deck.company_name if deal.deck else 'BolBot'} - Defended positioning.",
                one_liner=deal.deck.one_liner if deal.deck else "",
                tam_reframe="Reframed bottom-up market sizing addressing competitor presence.",
                narrative_md="# Improved Pitch Narrative\n\nSharpened unit economics and competitive moat.",
                changes=[f"Addressed objection in {c.turn_id}" for c in deal.concessions],
            )

    if deal.narrative:
        _emit_event(deal.id, "narrative", deal.narrative.model_dump())

    _emit_event(deal.id, "done", {"phase": "grill"})


async def submit_answer(
    deal_id: str,
    turn_id: str,
    answer: str,
    deal: Optional[Deal] = None,
    *,
    llm_generate: Optional[Callable[..., Any]] = None,
) -> GrillTurn:
    if deal is None:
        deal = get_deal(deal_id)
        if deal is None:
            raise ValueError(f"Deal {deal_id} not found")

    turn = next((t for t in deal.grill_turns if t.id == turn_id), None)
    if not turn:
        raise ValueError(f"Turn {turn_id} not found on deal {deal_id}")

    # Idempotent repeat
    if turn.answer is not None and turn.evaluation is not None:
        return turn

    finding = _find_finding_by_id(deal, turn.finding_id)
    if not finding:
        raise ValueError(f"Finding {turn.finding_id} not found")

    memory = get_memory()

    # 1. MEKO Recall before evaluating (hard 4s budget)
    recalled_hits: List[str] = []
    try:
        recall_task = memory.recall(
            deal_id,
            query=f"{finding.title} {answer[:120]}",
            persona=finding.persona,
            k=3,
        )
        rec = await asyncio.wait_for(recall_task, timeout=4.0)
        if isinstance(rec, MemoryRecord):
            deal.memory_log.append(rec)
            recalled_hits = rec.hits
            _emit_event(deal_id, "memory", rec.model_dump())
    except Exception as e:
        logger.info(f"Memory recall timed out or failed gracefully: {e}")

    # 2. Evaluate answer
    evaluation = await evaluate_answer(
        deal,
        finding,
        turn.question_text,
        answer,
        recalled_memory=recalled_hits,
        llm_generate=llm_generate,
    )
    turn.answer = answer
    turn.evaluation = evaluation

    # 3. Update finding resolution in code
    outcome = evaluation.outcome
    finding.resolved = resolution_for(outcome)

    # 4. Recompute Readiness Score
    prev_score = deal.score.current if deal.score else 0.0
    deal.score = compute_score(deal.reports, existing_score=deal.score)
    score_delta = round(deal.score.current - prev_score, 1)

    # 5. Create Concession
    concession = Concession(
        finding_id=finding.id,
        persona=finding.persona,
        outcome=outcome,
        score_delta=score_delta,
        reason=evaluation.reason,
        turn_id=turn.id,
    )
    deal.concessions.append(concession)

    # 6. Update ledger status
    for entry in deal.ledger:
        if entry.finding_id == finding.id:
            if outcome == "accepted" and evaluation.criteria.evidence_type in ("data_cited", "document_referenced"):
                entry.status = "verified"
                entry.confidence = 0.85
            break

    # 7. Update checklist
    for item in deal.checklist:
        if item.finding_id == finding.id:
            if outcome == "accepted":
                item.status = "addressed"
            elif outcome in ("partial", "rejected") and evaluation.missing_proof:
                followup_id = f"D-{len(deal.checklist) + 1}"
                if not any(it.title == evaluation.missing_proof for it in deal.checklist):
                    deal.checklist.append(
                        ChecklistItem(
                            id=followup_id,
                            title=evaluation.missing_proof[:80],
                            why=f"Follow-up evidence requested in {turn.id}.",
                            finding_id=finding.id,
                            priority="P1",
                            owner="founder",
                            status="todo",
                            india_specific=False,
                        )
                    )
            break

    # 8. Finance override hook
    if finding.persona == "finance":
        try:
            from app.tools.finance_glue import apply_answer
            new_finance = await apply_answer(deal, answer)
            if new_finance:
                deal.finance = new_finance
                _emit_event(deal_id, "finance", new_finance.model_dump())
                dec_rec = await memory.remember(
                    deal_id,
                    "finance",
                    f"DECISION: founder updated finance inputs in {turn.id}",
                    "DECISION",
                )
                if isinstance(dec_rec, MemoryRecord):
                    deal.memory_log.append(dec_rec)
                    _emit_event(deal_id, "memory", dec_rec.model_dump())
        except Exception:
            pass

    # Emit evaluation, concession, score events
    _emit_event(deal_id, "evaluation", {"turn": turn.model_dump()})
    _emit_event(deal_id, "concession", concession.model_dump())
    _emit_event(deal_id, "score", deal.score.model_dump())

    # 9. MEKO Addendum: remember concession/open_question and trace
    try:
        if outcome in ("accepted", "partial"):
            mem_rec = await memory.remember(
                deal_id,
                finding.persona,
                f"CONCESSION {turn.id} {finding.id} {outcome} (+{score_delta} pts): {evaluation.reason}",
                "CONCESSION",
            )
        else:
            mem_rec = await memory.remember(
                deal_id,
                finding.persona,
                f"OPEN_QUESTION {turn.id} {finding.id}: {evaluation.missing_proof or evaluation.reason}",
                "OPEN_QUESTION",
            )
        if isinstance(mem_rec, MemoryRecord):
            deal.memory_log.append(mem_rec)
            _emit_event(deal_id, "memory", mem_rec.model_dump())

        trace_rec = await memory.trace(
            deal_id,
            label=f"grill turn {turn.id}",
            exchange_text=f"Q: {turn.question_text} | A: {answer} | Outcome: {outcome}",
        )
        if isinstance(trace_rec, MemoryRecord):
            deal.memory_log.append(trace_rec)
            _emit_event(deal_id, "memory", trace_rec.model_dump())
    except Exception as e:
        logger.warning(f"Memory post-evaluation writes failed: {e}")

    # 10. Cross-talk after turns 2, 4, 6
    turn_num = len(deal.grill_turns)
    if turn_num in (2, 4, 6) and os.getenv("ENABLE_CROSSTALK") == "1":
        crosstalk = await _generate_crosstalk(deal, turn, recalled_hits, llm_generate=llm_generate)
        if crosstalk:
            deal.crosstalk.append(crosstalk)
            _emit_event(deal_id, "crosstalk", crosstalk.model_dump())

    # 11. Plan Next Turn
    # If rejected and turn was initial question with followup, ask followup next
    next_turn: Optional[GrillTurn] = None
    if outcome == "rejected" and turn.kind == "question" and evaluation.followup:
        next_turn = GrillTurn(
            id=f"G-{turn_num + 1}",
            persona=finding.persona,
            finding_id=finding.id,
            kind="followup",
            question_text=evaluation.followup,
        )
    else:
        plan = plan_grill(deal)
        # Find next open finding in plan that has not been grilled in this round
        grilled_finding_ids = {t.finding_id for t in deal.grill_turns if t.kind == "question"}
        next_pair = next((p for p in plan if p[1].id not in grilled_finding_ids), None)
        if next_pair:
            next_turn = GrillTurn(
                id=f"G-{turn_num + 1}",
                persona=next_pair[0],
                finding_id=next_pair[1].id,
                kind="question",
                question_text=next_pair[1].question,
            )

    if next_turn and turn_num < 12:
        deal.grill_turns.append(next_turn)
        _emit_event(deal_id, "question", next_turn.model_dump())
    else:
        await _finish_grill(deal, llm_generate=llm_generate)

    save_deal(deal)
    return turn
