"""Tests ensuring all mock fixtures strictly validate against contracts/schemas.py."""
import json
from pathlib import Path
from contracts.schemas import (
    ChecklistItem,
    Deal,
    DeckFacts,
    FinanceResult,
    GrillTurn,
    LedgerEntry,
    MarketGrounding,
    MemoryRecord,
    PersonaReport,
    TechSignals,
)
from app.config import settings


def _read_fixture(filename: str):
    path = settings.FIXTURES_DIR / filename
    assert path.exists(), f"Fixture file {filename} does not exist"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def test_deck_fixture_validates():
    data = _read_fixture("deck.json")
    deck = DeckFacts.model_validate(data)
    assert deck.company_name == "BolBot"
    assert deck.tam_claim_inr == 5000000000.0
    assert deck.no_competitor_claim is True
    assert len(deck.slides) == 8


def test_finance_fixture_validates():
    data = _read_fixture("finance.json")
    res = FinanceResult.model_validate(data)
    assert res.metrics.runway_months == 18.2
    assert res.break_point.breaking_cac == 3410.0
    assert len(res.tornado) > 0


def test_market_fixture_validates():
    data = _read_fixture("market.json")
    grounding = MarketGrounding.model_validate(data)
    assert len(grounding.competitors) >= 3
    assert grounding.no_competitor_claim_contradicted is True
    for comp in grounding.competitors:
        assert comp.verified is True
        assert comp.url.startswith("http")


def test_tech_fixture_validates():
    data = _read_fixture("tech.json")
    tech = TechSignals.model_validate(data)
    assert tech.site_reachable is True
    assert tech.github is not None
    assert tech.github.repo == "bolbot-ai/bolbot-core"


def test_reports_fixture_validates():
    data = _read_fixture("reports.json")
    assert isinstance(data, list)
    assert len(data) == 3
    for r in data:
        report = PersonaReport.model_validate(r)
        assert report.persona in ("finance", "market", "tech")
        assert len(report.findings) >= 4
        for f in report.findings:
            assert f.id.startswith(("F-", "M-", "T-"))
            assert len(f.sources) >= 1


def test_ledger_fixture_validates():
    data = _read_fixture("ledger.json")
    assert isinstance(data, list)
    for entry in data:
        e = LedgerEntry.model_validate(entry)
        assert e.id.startswith("L-")
        assert e.source.type in ("deck", "web", "calc", "inference", "cache", "kb")


def test_checklist_fixture_validates():
    data = _read_fixture("checklist.json")
    assert isinstance(data, list)
    for item in data:
        chk = ChecklistItem.model_validate(item)
        assert chk.id.startswith("D-")
        assert chk.priority in ("P0", "P1", "P2")


def test_grill_turns_fixture_validates():
    data = _read_fixture("grill_turns.json")
    assert isinstance(data, list)
    for turn in data:
        gt = GrillTurn.model_validate(turn)
        assert gt.id.startswith("G-")
        assert gt.persona in ("finance", "market", "tech")


def test_memory_log_fixture_validates():
    data = _read_fixture("memory_log.json")
    assert isinstance(data, list)
    assert len(data) == 10
    kinds = set()
    for rec in data:
        mr = MemoryRecord.model_validate(rec)
        assert mr.id.startswith("MR-")
        kinds.add(mr.kind)
    assert "memory_add" in kinds
    assert "memory_recall" in kinds
    assert "kb_search" in kinds
    assert "promote" in kinds
