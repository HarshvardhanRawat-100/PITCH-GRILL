"""
Memory Promotion Policy (Pure Code).

Determines whether a grill finding / defense outcome is permitted to be
promoted to Meko Shared Knowledge (which is datapack-wide and permanent),
and builds the anonymized, generalized lesson string.

Rules (Golden Rule 11 & Spec section 10):
- allowed_by_policy(finding, evaluation) -> bool:
  - finding.resolved == "resolved"
  - evaluation.criteria.evidence_type in ("data_cited", "document_referenced")
  - not evaluation.injection_attempt
- to_lesson(finding, evaluation) -> str:
  - Uses ONLY persona, category, and evidence_type.
  - NEVER includes company names, URLs, deck numbers, or founder text.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from contracts.schemas import Evaluation, Finding


def allowed_by_policy(finding: Finding, evaluation: Evaluation) -> bool:
    """
    Check if a resolved finding and evaluation can be promoted to Shared Knowledge.

    Promotion is strictly gated:
    1. Finding must be fully resolved ('resolved').
    2. Defense must have provided real verifiable evidence ('data_cited' or 'document_referenced').
    3. Must NOT be an injection attempt.
    """
    if finding.resolved != "resolved":
        return False

    if evaluation.injection_attempt:
        return False

    if evaluation.criteria.evidence_type not in ("data_cited", "document_referenced"):
        return False

    return True


# Standardized descriptive phrases by category and evidence type
_EVIDENCE_DESCRIPTIONS = {
    "data_cited": "audited cohort metrics or pilot quantitative data",
    "document_referenced": "a referenced contract, filing, or signed customer document",
}

_CATEGORY_ACTIONS = {
    "finance": "unit economics or runway projection",
    "market": "TAM boundary or competitive differentiation claim",
    "tech": "technical moat or proprietary architecture assertion",
    "traction": "reported customer retention or growth metric",
    "team": "domain execution capability assertion",
    "competition": "market positioning or displacement claim",
    "legal": "regulatory compliance or IP ownership position",
    "other": "due-diligence assertion",
}


def to_lesson(finding: Finding, evaluation: Evaluation) -> str:
    """
    Generate an anonymized, generalized lesson string.

    Guarantees that NO company names, URLs, specific financial figures,
    or founder defense text are leaked into global datapack memory.
    """
    evidence_desc = _EVIDENCE_DESCRIPTIONS.get(
        evaluation.criteria.evidence_type, "verifiable proof"
    )
    category_action = _CATEGORY_ACTIONS.get(
        finding.category, f"{finding.category} claim"
    )

    return (
        f"LESSON ({finding.persona}/{finding.category}): "
        f"A hostile {finding.persona} objection regarding {category_action} "
        f"was accepted only after {evidence_desc} was cited."
    )
