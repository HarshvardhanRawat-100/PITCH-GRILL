"""Unit tests for India Diligence Checklist generation and turn lifecycle updates."""
import pytest
from app.tools.checklist import generate, load_checklist_library, update_after_turn

from contracts.schemas import (
    ChecklistItem,
    Deal,
    DeckFacts,
    EvalCriteria,
    Evaluation,
    FinancialInputs,
    Finding,
    PersonaReport,
    Sourced,
)


def _sample_deal() -> Deal:
    dummy_sourced = Sourced(value=1000.0, origin="deck")
    fin_inputs = FinancialInputs(
        arpu_monthly=dummy_sourced,
        cac=dummy_sourced,
        gross_margin_pct=Sourced(value=75.0, origin="deck"),
        monthly_churn_pct=Sourced(value=3.0, origin="deck"),
        cash_in_bank=dummy_sourced,
        fixed_opex_monthly=dummy_sourced,
        current_customers=dummy_sourced,
        new_customers_monthly=dummy_sourced,
        new_customer_growth_pct_monthly=dummy_sourced,
    )
    deck = DeckFacts(
        company_name="BolBot",
        one_liner="AI sales agent for Indian SMEs on WhatsApp",
        sector="SaaS",
        stage="seed",
        ask={"use_of_funds": ["Engineering", "Sales"]},
        claims=[],
        financial_inputs=fin_inputs,
        no_competitor_claim=True,
        stated_competitors=[],
        tech_claims=["Indic speech model", "WhatsApp cloud connector"],
        missing_data=["No cohort retention data", "No DPDP audit declaration"],
        slides=[],
    )
    reports = [
        PersonaReport(
            persona="finance",
            headline="High burn risk",
            findings=[
                Finding(
                    id="F-1",
                    persona="finance",
                    title="Meta CAC inflation risks margin collapse",
                    detail="Ad acquisition costs in Indian vernacular markets scale exponentially.",
                    severity="critical",
                    category="finance",
                    sources=[],
                    status="unverified",
                    question="How does CAC scale past pilot merchants?",
                    resolved="open",
                ),
            ],
        ),
        PersonaReport(
            persona="tech",
            headline="Scalability and privacy doubts",
            findings=[
                Finding(
                    id="T-1",
                    persona="tech",
                    title="DPDP consent framework unverified",
                    detail="WhatsApp message collection requires explicit DPDP consent architecture.",
                    severity="major",
                    category="tech",
                    sources=[],
                    status="unverified",
                    question="Where are privacy consents persisted?",
                    resolved="open",
                ),
            ],
        ),
    ]
    return Deal(id="deal_test_123", deck=deck, reports=reports)


def test_library_contents():
    """Verify checklist library has ~20 items with all required fields."""
    lib = load_checklist_library()
    assert len(lib) >= 20
    seen_ids = set()
    for item in lib:
        assert item["id"] not in seen_ids
        seen_ids.add(item["id"])
        assert "title" in item and len(item["title"]) > 0
        assert "why_template" in item
        assert "tags" in item and isinstance(item["tags"], list)
        assert item["owner"] in {"founder", "legal", "finance", "tech"}
        assert item["default_priority"] in {"P0", "P1", "P2"}
        assert "india_specific" in item


@pytest.mark.asyncio
async def test_generate_checklist():
    """Verify generate produces 8-14 items, sequential IDs, and matches findings."""
    deal = _sample_deal()
    items = await generate(deal)

    assert 8 <= len(items) <= 14
    for idx, item in enumerate(items, start=1):
        assert item.id == f"D-{idx}"
        assert item.priority in {"P0", "P1", "P2"}
        assert item.owner in {"founder", "legal", "finance", "tech"}
        assert item.status == "todo"
        if item.finding_id:
            assert item.finding_id in {"F-1", "T-1"}

    # Must contain DPDP item matching T-1 or core statutory
    dpdp_found = any("DPDP" in item.title for item in items)
    assert dpdp_found


def test_update_after_turn_resolved():
    """Verify resolved turn marks linked checklist items as addressed."""
    deal = _sample_deal()
    deal.checklist = [
        ChecklistItem(
            id="D-1",
            title="Cohort Retention Sheet",
            why="Finance finding proof",
            finding_id="F-1",
            priority="P0",
            owner="finance",
            status="todo",
            india_specific=False,
        ),
        ChecklistItem(
            id="D-2",
            title="DPDP Compliance Protocol",
            why="Tech finding proof",
            finding_id="T-1",
            priority="P1",
            owner="legal",
            status="todo",
            india_specific=True,
        ),
    ]

    finding = deal.reports[0].findings[0]  # F-1
    evaluation = Evaluation(
        criteria=EvalCriteria(
            addresses_objection=True,
            quantified=True,
            evidence_type="data_cited",
        ),
        proposed_outcome="accepted",
        outcome="accepted",
        reason="Founder provided granular merchant cohort sheets.",
    )

    updated = update_after_turn(deal, finding, evaluation)
    assert updated[0].id == "D-1"
    assert updated[0].status == "addressed"
    assert updated[1].status == "todo"


def test_update_after_turn_rejected_adds_followup():
    """Verify rejected turn adds single follow-up proof item without duplicates."""
    deal = _sample_deal()
    deal.checklist = [
        ChecklistItem(
            id="D-1",
            title="Cap Table",
            why="Standard",
            finding_id=None,
            priority="P0",
            owner="finance",
            status="todo",
            india_specific=False,
        )
    ]

    finding = deal.reports[0].findings[0]  # F-1
    evaluation = Evaluation(
        criteria=EvalCriteria(
            addresses_objection=False,
            quantified=False,
            evidence_type="none",
        ),
        proposed_outcome="rejected",
        outcome="rejected",
        reason="Assertion only without audited cohort data.",
        missing_proof="Signed LOIs and 3-month merchant retention cohort data",
    )

    # First turn update
    updated = update_after_turn(deal, finding, evaluation)
    assert len(updated) == 2
    assert updated[1].id == "D-2"
    assert "Proof: Signed LOIs" in updated[1].title
    assert updated[1].finding_id == "F-1"
    assert updated[1].priority == "P0"

    # Second rejected turn on same finding should NOT add duplicate follow-up
    updated_again = update_after_turn(deal, finding, evaluation)
    assert len(updated_again) == 2
