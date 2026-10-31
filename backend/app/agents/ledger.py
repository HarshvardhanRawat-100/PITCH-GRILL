
try:
    from contracts.schemas import (
        DeckFacts,
        FinanceResult,
        LedgerEntry,
        MarketGrounding,
        PersonaReport,
        SourceRef,
        TechSignals,
        all_findings,
    )
except ImportError:
    from contracts.schemas import (
        DeckFacts,
        FinanceResult,
        LedgerEntry,
        MarketGrounding,
        PersonaReport,
        SourceRef,
        TechSignals,
        all_findings,
    )

# Confidence heuristic documented per spec:
# - calc: 0.9 (deterministic math engine)
# - web + verified: 0.85 (verified by substring against fetched page text)
# - web (unverified/general): 0.70
# - deck-only: 0.40 (self-reported in founder slides)
# - inference: 0.30 (model deduction without direct primary evidence)
# - assumed: 0.20 (assumed default / missing input)
CONFIDENCE_MAP = {
    "calc": 0.9,
    "web_verified": 0.85,
    "web": 0.7,
    "deck": 0.4,
    "inference": 0.3,
    "assumed": 0.2,
}


def build_ledger(
    deck: DeckFacts | None,
    reports: list[PersonaReport],
    finance: FinanceResult | None = None,
    market: MarketGrounding | None = None,
    tech: TechSignals | None = None,
) -> list[LedgerEntry]:
    entries: list[LedgerEntry] = []
    seq = 1

    # 1. Deck Claims (deck-only 0.4, unverified)
    if deck and deck.claims:
        for claim in deck.claims:
            slide_ref = f"slide {claim.slide}" if claim.slide else "deck"
            entries.append(
                LedgerEntry(
                    id=f"L-{seq}",
                    claim_text=claim.text,
                    source=SourceRef(type="deck", ref=slide_ref, quote=claim.quote),
                    status="unverified",
                    confidence=CONFIDENCE_MAP["deck"],
                )
            )
            seq += 1

    # 2. Findings from Persona Reports
    for finding in all_findings(reports):
        first_src = (
            finding.sources[0]
            if finding.sources
            else SourceRef(type="inference", ref="model")
        )

        conf = CONFIDENCE_MAP["deck"]
        if first_src.type == "calc":
            conf = CONFIDENCE_MAP["calc"]
        elif first_src.type == "web":
            conf = (
                CONFIDENCE_MAP["web_verified"]
                if finding.status == "verified"
                else CONFIDENCE_MAP["web"]
            )
        elif first_src.type == "inference":
            conf = CONFIDENCE_MAP["inference"]
        elif finding.status == "assumed":
            conf = CONFIDENCE_MAP["assumed"]

        entries.append(
            LedgerEntry(
                id=f"L-{seq}",
                claim_text=f"{finding.title}: {finding.detail}",
                source=first_src,
                status=finding.status,
                confidence=conf,
                persona=finding.persona,
                finding_id=finding.id,
            )
        )
        seq += 1

    # 3. Market Competitors (web, verified 0.85)
    if market and market.competitors:
        for comp in market.competitors:
            status = "verified" if comp.verified else "unverified"
            conf = CONFIDENCE_MAP["web_verified"] if comp.verified else CONFIDENCE_MAP["web"]
            entries.append(
                LedgerEntry(
                    id=f"L-{seq}",
                    claim_text=f"Market Competitor: {comp.name} ({comp.overlap} overlap) - {comp.what_they_do}",
                    source=SourceRef(
                        type="web",
                        ref=comp.url,
                        quote=comp.evidence_quote,
                    ),
                    status=status,
                    confidence=conf,
                    persona="market",
                )
            )
            seq += 1

    # 4. TAM Evidence from Market Grounding
    if market and market.tam_evidence:
        for tam in market.tam_evidence:
            entries.append(
                LedgerEntry(
                    id=f"L-{seq}",
                    claim_text=f"TAM Benchmark: {tam.figure_text} ({tam.year or 'recent'})",
                    source=SourceRef(
                        type="web",
                        ref=tam.source_url,
                        quote=tam.quote,
                    ),
                    status="verified",
                    confidence=CONFIDENCE_MAP["web_verified"],
                    persona="market",
                )
            )
            seq += 1

    # 5. Tech Signals
    if tech:
        for claim in tech.claims_supported:
            entries.append(
                LedgerEntry(
                    id=f"L-{seq}",
                    claim_text=f"Supported Tech Claim: {claim}",
                    source=SourceRef(type="web", ref=tech.site_url or "website"),
                    status="verified",
                    confidence=CONFIDENCE_MAP["web_verified"],
                    persona="tech",
                )
            )
            seq += 1

        for claim in tech.claims_unsupported:
            entries.append(
                LedgerEntry(
                    id=f"L-{seq}",
                    claim_text=f"Unsupported Tech Claim: {claim}",
                    source=SourceRef(type="web", ref=tech.site_url or "website"),
                    status="contradicted",
                    confidence=CONFIDENCE_MAP["web"],
                    persona="tech",
                )
            )
            seq += 1

    # 6. Assumed Financial Inputs (status 'assumed', confidence 0.2)
    if deck and deck.financial_inputs:
        for field_name, sourced in deck.financial_inputs.__dict__.items():
            if hasattr(sourced, "origin") and sourced.origin == "assumed":
                entries.append(
                    LedgerEntry(
                        id=f"L-{seq}",
                        claim_text=f"Assumed financial input: {field_name}",
                        source=SourceRef(
                            type="calc",
                            ref="finance_engine",
                            quote=getattr(sourced, "note", None),
                        ),
                        status="assumed",
                        confidence=CONFIDENCE_MAP["assumed"],
                        persona="finance",
                    )
                )
                seq += 1

    return entries
