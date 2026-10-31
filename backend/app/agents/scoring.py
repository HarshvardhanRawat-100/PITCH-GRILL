from typing import List, Optional

try:
    from contracts.schemas import (
        PersonaReport,
        PersonaScore,
        ReadinessScore,
        initial_persona_score,
        persona_score,
        readiness,
    )
except ImportError:
    from second_brain.contracts.schemas import (
        PersonaReport,
        PersonaScore,
        ReadinessScore,
        initial_persona_score,
        persona_score,
        readiness,
    )


def compute_score(
    reports: List[PersonaReport],
    existing_score: Optional[ReadinessScore] = None,
) -> ReadinessScore:
    """
    Wrap schemas.initial_persona_score, persona_score, and readiness.
    Initial score is fixed once at analysis end; current is recomputed as findings resolve.
    """
    by_persona: List[PersonaScore] = []
    initial_scores: List[float] = []
    current_scores: List[float] = []

    for r in reports:
        existing_p = (
            next((p for p in existing_score.by_persona if p.persona == r.persona), None)
            if existing_score
            else None
        )
        init_val = (
            existing_p.initial
            if existing_p is not None
            else initial_persona_score(r.findings)
        )
        curr_val = persona_score(r.findings)

        initial_scores.append(init_val)
        current_scores.append(curr_val)
        by_persona.append(
            PersonaScore(
                persona=r.persona,
                initial=round(init_val, 1),
                current=round(curr_val, 1),
            )
        )

    init_readiness = (
        existing_score.initial
        if existing_score is not None
        else round(readiness(initial_scores), 1)
    )
    curr_readiness = round(readiness(current_scores), 1)

    return ReadinessScore(
        initial=init_readiness,
        current=curr_readiness,
        by_persona=by_persona,
    )
