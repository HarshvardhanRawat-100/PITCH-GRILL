import asyncio
import json
import logging
import os
from collections.abc import Callable
from pathlib import Path
from typing import Any

try:
    from contracts.schemas import (
        ChecklistItem,
        Deal,
        DeckFacts,
        FinanceResult,
        MarketGrounding,
        MemoryRecord,
        PersonaReport,
        TechSignals,
    )
except ImportError:
    from contracts.schemas import (
        ChecklistItem,
        Deal,
        DeckFacts,
        FinanceResult,
        MarketGrounding,
        MemoryRecord,
        PersonaReport,
        TechSignals,
    )

from .ledger import build_ledger
from .moderator import run_moderator
from .personas import run_persona
from .scoring import compute_score

logger = logging.getLogger(__name__)

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"

# Guarded store imports
try:
    from app.store import append_event, get_deal, save_deal
except ImportError:
    try:
        from app.store import append_event, get_deal, save_deal
    except ImportError:
        _STORE_DEALS: dict[str, Deal] = {}

        def get_deal(deal_id: str) -> Deal | None:
            return _STORE_DEALS.get(deal_id)

        def save_deal(deal: Deal) -> None:
            _STORE_DEALS[deal.id] = deal

        def append_event(deal_id: str, event_type: str, data: Any) -> None:
            pass


# Guarded memory imports
class _LocalMemoryClient:
    def __init__(self) -> None:
        self._seq = 1

    async def remember(
        self, deal_id: str, persona: str | None, text: str, tag: str
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
        return rec


_local_memory_instance = _LocalMemoryClient()

try:
    from app.memory import get_memory
except ImportError:
    try:
        from app.memory import get_memory
    except ImportError:
        def get_memory() -> Any:
            return _local_memory_instance


def _emit_event(deal_id: str, event_type: str, data: Any) -> None:
    try:
        append_event(deal_id, event_type, data)
    except Exception as e:
        logger.warning(f"Failed to append event {event_type}: {e}")


async def _run_finance_tool(deal_id: str, deck: DeckFacts) -> FinanceResult:
    try:
        if os.getenv("MOCK") == "1":
            raise ImportError("MOCK=1 requested")
        from app.tools.finance_glue import run as run_finance
        res = await run_finance(deck)
    except Exception as e:
        if os.getenv("MOCK") != "1" and not isinstance(e, ImportError):
            _emit_event(
                deal_id,
                "error",
                {"code": "FINANCE_TOOL_ERROR", "message": str(e), "recoverable": True},
            )
        with open(FIXTURES_DIR / "finance.json") as f:
            res = FinanceResult.model_validate(json.load(f))
    _emit_event(deal_id, "finance", res.model_dump())
    return res


async def _run_market_tool(deal_id: str, deck: DeckFacts) -> MarketGrounding:
    try:
        if os.getenv("MOCK") == "1":
            raise ImportError("MOCK=1 requested")
        from app.tools.market_search import run as run_market
        res = await run_market(deck)
    except Exception as e:
        if os.getenv("MOCK") != "1" and not isinstance(e, ImportError):
            _emit_event(
                deal_id,
                "error",
                {"code": "MARKET_TOOL_ERROR", "message": str(e), "recoverable": True},
            )
        with open(FIXTURES_DIR / "market.json") as f:
            res = MarketGrounding.model_validate(json.load(f))
    _emit_event(deal_id, "market", res.model_dump())
    return res


async def _run_tech_tool(deal_id: str, deck: DeckFacts) -> TechSignals:
    try:
        if os.getenv("MOCK") == "1":
            raise ImportError("MOCK=1 requested")
        from app.tools.tech_check import run as run_tech
        res = await run_tech(deck)
    except Exception as e:
        if os.getenv("MOCK") != "1" and not isinstance(e, ImportError):
            _emit_event(
                deal_id,
                "error",
                {"code": "TECH_TOOL_ERROR", "message": str(e), "recoverable": True},
            )
        with open(FIXTURES_DIR / "tech.json") as f:
            res = TechSignals.model_validate(json.load(f))
    _emit_event(deal_id, "tech", res.model_dump())
    return res


async def _run_checklist_tool(deal: Deal) -> list[ChecklistItem]:
    try:
        if os.getenv("MOCK") == "1":
            raise ImportError("MOCK=1 requested")
        from app.tools.checklist import generate as generate_checklist
        items = await generate_checklist(deal)
        return items
    except Exception:
        # Fallback minimal checklist
        return [
            ChecklistItem(
                id="D-1",
                title="DPIIT Startup Recognition Certificate",
                why="Required to claim tax holidays and formal Indian startup status.",
                priority="P0",
                owner="founder",
                status="todo",
                india_specific=True,
            ),
            ChecklistItem(
                id="D-2",
                title="SME Pilot Agreements & Revenue Share Contracts",
                why="Validates commercial traction claim of 150 merchants.",
                priority="P0",
                owner="founder",
                status="todo",
                india_specific=False,
            ),
        ]


async def _record_findings_to_memory(
    memory_client: Any, deal: Deal, persona: str, findings: list[Any]
) -> None:
    tasks = []
    for f in findings:
        detail_snippet = f.detail[:200]
        text = f"FINDING {f.id} ({f.severity}, {persona}): {f.title} - {detail_snippet}"
        tasks.append(memory_client.remember(deal.id, persona, text, "FINDING"))

    records = await asyncio.gather(*tasks, return_exceptions=True)
    for r in records:
        if isinstance(r, MemoryRecord):
            deal.memory_log.append(r)
            _emit_event(deal.id, "memory", r.model_dump())


async def run_analysis(
    deal_id: str,
    deal: Deal | None = None,
    *,
    llm_generate: Callable[..., Any] | None = None,
) -> Deal:
    # 1. Resolve or create deal
    if deal is None:
        deal = get_deal(deal_id)
        if deal is None:
            deal = Deal(id=deal_id)

    if deal.deck is None:
        with open(FIXTURES_DIR / "deck.json") as f:
            deal.deck = DeckFacts.model_validate(json.load(f))

    _emit_event(
        deal_id,
        "stage",
        {"stage": "extracting", "message": "Deck facts parsed", "progress": 0.2},
    )

    # 2. Parallel tools gather (finance, market, tech)
    _emit_event(
        deal_id,
        "stage",
        {"stage": "finance", "message": "Running valuation & market search", "progress": 0.3},
    )

    async def _safe_run(coro_fn, tool_name: str, fallback_file: str, model_cls: Any) -> Any:
        try:
            return await coro_fn(deal_id, deal.deck)
        except Exception as e:
            _emit_event(
                deal_id,
                "error",
                {"code": f"{tool_name.upper()}_ERROR", "message": str(e), "recoverable": True},
            )
            with open(FIXTURES_DIR / fallback_file) as f:
                res = model_cls.model_validate(json.load(f))
            _emit_event(deal_id, tool_name, res.model_dump())
            return res

    finance_task = _safe_run(_run_finance_tool, "finance", "finance.json", FinanceResult)
    market_task = _safe_run(_run_market_tool, "market", "market.json", MarketGrounding)
    tech_task = _safe_run(_run_tech_tool, "tech", "tech.json", TechSignals)

    deal.finance, deal.market, deal.tech = await asyncio.gather(
        finance_task, market_task, tech_task
    )

    # 3. Parallel persona agents
    _emit_event(
        deal_id,
        "stage",
        {"stage": "analyzing", "message": "Three investors reviewing deal", "progress": 0.5},
    )

    persona_tasks = [
        run_persona("finance", deal.deck, deal.finance, llm_generate=llm_generate),
        run_persona("market", deal.deck, deal.market, llm_generate=llm_generate),
        run_persona("tech", deal.deck, deal.tech, llm_generate=llm_generate),
    ]

    reports: list[PersonaReport] = await asyncio.gather(*persona_tasks)
    deal.reports = reports

    for r in reports:
        _emit_event(deal_id, "persona_report", r.model_dump())

    # M3: Record findings to memory concurrently (off critical path)
    mem_client = get_memory()
    mem_tasks = [
        _record_findings_to_memory(mem_client, deal, r.persona, r.findings)
        for r in reports
    ]
    await asyncio.gather(*mem_tasks, return_exceptions=True)

    # 4. Moderator dedupe / reconcile
    _emit_event(
        deal_id,
        "stage",
        {"stage": "moderating", "message": "Moderator reconciling panel issues", "progress": 0.7},
    )
    mod_out = await run_moderator(deal.reports, llm_generate=llm_generate)
    deal.reports = mod_out.reports
    deal.top_issues = mod_out.top_issues

    # M3: Record conflicts as DECISION memories
    for conflict in mod_out.conflicts:
        dec_rec = await mem_client.remember(deal.id, None, f"DECISION: {conflict}", "DECISION")
        if isinstance(dec_rec, MemoryRecord):
            deal.memory_log.append(dec_rec)
            _emit_event(deal.id, "memory", dec_rec.model_dump())

    # 5. Scoring
    _emit_event(
        deal_id,
        "stage",
        {"stage": "scoring", "message": "Computing initial Pitch Readiness Score", "progress": 0.8},
    )
    deal.score = compute_score(deal.reports)
    _emit_event(deal_id, "score", deal.score.model_dump())

    # 6. Evidence Ledger
    deal.ledger = build_ledger(
        deal.deck, deal.reports, deal.finance, deal.market, deal.tech
    )
    _emit_event(deal_id, "ledger", {"entries": [e.model_dump() for e in deal.ledger]})

    # 7. Checklist
    _emit_event(
        deal_id,
        "stage",
        {"stage": "checklist", "message": "Generating data room checklist", "progress": 0.9},
    )
    deal.checklist = await _run_checklist_tool(deal)
    _emit_event(deal_id, "checklist", {"items": [item.model_dump() for item in deal.checklist]})

    # 8. Mark ready & emit done
    deal.status = "ready"
    _emit_event(
        deal_id,
        "stage",
        {"stage": "ready", "message": "Due-diligence report ready", "progress": 1.0},
    )
    _emit_event(deal_id, "done", {"phase": "analysis"})

    save_deal(deal)
    return deal
