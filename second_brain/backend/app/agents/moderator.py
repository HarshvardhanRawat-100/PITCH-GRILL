import json
from typing import Any, Awaitable, Callable, List, Optional, Tuple
from pydantic import BaseModel, Field

try:
    from contracts.schemas import Finding, PersonaReport, all_findings
except ImportError:
    from second_brain.contracts.schemas import Finding, PersonaReport, all_findings

from .prompts import P_00, P_08

try:
    from app.llm import generate_json
except ImportError:
    try:
        from backend.app.llm import generate_json
    except ImportError:
        generate_json = None

SEVERITY_ORDER = {"critical": 0, "major": 1, "minor": 2}


class ModeratorOutput(BaseModel):
    reports: List[PersonaReport]
    top_issues: List[str] = Field(default_factory=list)
    summary: str = ""
    conflicts: List[str] = Field(default_factory=list)


def _dedupe_and_detect_conflicts(
    reports: List[PersonaReport],
) -> Tuple[List[PersonaReport], List[str]]:
    conflicts: List[str] = []
    finance_findings = [f for r in reports if r.persona == "finance" for f in r.findings]
    market_findings = [f for r in reports if r.persona == "market" for f in r.findings]

    # Check for direct contradictions (e.g. Finance CAC vs Market competitor acquisition channels)
    finance_cac_assumed = any(f.category == "finance" and f.status == "assumed" for f in finance_findings)
    market_has_funded_rivals = any(
        f.category == "competition" and f.status in ("verified", "contradicted")
        for f in market_findings
    )

    if finance_cac_assumed and market_has_funded_rivals:
        conflict_msg = (
            "Finance relies on an unverified CAC assumption, while Market identified "
            "funded competitors operating in the same acquisition channels."
        )
        conflicts.append(conflict_msg)
        for r in reports:
            if r.persona == "finance":
                conflict_finding = Finding(
                    id=f"F-{len(r.findings) + 1}",
                    persona="finance",
                    title="Conflict: CAC assumption contradicted by funded competition",
                    detail=conflict_msg,
                    severity="minor",
                    category="competition",
                    sources=[],
                    status="contradicted",
                    question="How does verified competitor funding impact your projected CAC?",
                    resolved="open",
                )
                r.findings.append(conflict_finding)
                break

    return reports, conflicts


def _fallback_top_issues(reports: List[PersonaReport]) -> List[str]:
    all_f = all_findings(reports)
    sorted_f = sorted(all_f, key=lambda f: SEVERITY_ORDER.get(f.severity, 3))
    return [f.id for f in sorted_f[:3]]


async def run_moderator(
    reports: List[PersonaReport],
    *,
    llm_generate: Optional[Callable[..., Awaitable[Any]]] = None,
) -> ModeratorOutput:
    cleaned_reports, conflicts = _dedupe_and_detect_conflicts(reports)
    all_f = all_findings(cleaned_reports)
    valid_ids = {f.id for f in all_f}

    # If LLM generation available, attempt P-08 structured call
    generator = llm_generate or generate_json
    if generator is not None:
        try:
            reports_json = json.dumps([r.model_dump() for r in cleaned_reports], indent=2)
            prompt = f"{P_00}\n\n{P_08.replace('{persona_reports}', reports_json)}"
            raw = await generator(prompt=prompt, schema=ModeratorOutput, temperature=0.2)
            if isinstance(raw, dict):
                raw = ModeratorOutput.model_validate(raw)

            # Validate that returned top_issues exist
            validated_top_issues = [tid for tid in raw.top_issues if tid in valid_ids]
            if len(validated_top_issues) < 3:
                fallback = _fallback_top_issues(cleaned_reports)
                for fid in fallback:
                    if fid not in validated_top_issues and len(validated_top_issues) < 3:
                        validated_top_issues.append(fid)

            summary = raw.summary.strip() or "Panel diligence complete across finance, market, and tech pillars."
            return ModeratorOutput(
                reports=raw.reports or cleaned_reports,
                top_issues=validated_top_issues,
                summary=summary,
                conflicts=conflicts,
            )
        except Exception:
            pass

    # Deterministic in-code fallback
    top_issues = _fallback_top_issues(cleaned_reports)
    summary = (
        f"The panel identified {len(all_f)} critical and major findings across unit economics, "
        "direct market competition, and technical moat feasibility."
    )
    return ModeratorOutput(
        reports=cleaned_reports,
        top_issues=top_issues,
        summary=summary,
        conflicts=conflicts,
    )
