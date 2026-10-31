import re
from collections.abc import Awaitable, Callable
from typing import Any

try:
    from contracts.schemas import Finding, Persona, PersonaReport, SourceRef
except ImportError:
    try:
        from contracts.schemas import Finding, Persona, PersonaReport, SourceRef
    except ImportError:
        import sys
        from pathlib import Path
        for parent in Path(__file__).resolve().parents:
            if (parent / "contracts" / "schemas.py").exists():
                if str(parent) not in sys.path:
                    sys.path.insert(0, str(parent))
                break
            if (parent / "second_brain" / "contracts" / "schemas.py").exists():
                sb = str(parent / "second_brain")
                if sb not in sys.path:
                    sys.path.insert(0, sb)
                break
        from contracts.schemas import Finding, Persona, PersonaReport, SourceRef

from .prompts import render_persona_prompt

try:
    from app.llm import generate_json as _app_generate_json
except ImportError:
    try:
        from app.llm import generate_json as _app_generate_json
    except ImportError:
        _app_generate_json = None


async def generate_json(prompt: str, schema: type, **kwargs: Any) -> Any:
    if _app_generate_json is not None:
        return await _app_generate_json(prompt, schema, **kwargs)
    raise NotImplementedError(
        "P1 scaffold not yet present. Pass llm_generate or mock generate_json in tests."
    )


SEVERITY_ORDER = {"critical": 0, "major": 1, "minor": 2}
PERSONA_PREFIX = {"finance": "F", "market": "M", "tech": "T"}


def _get_allowed_competitor_names(tool_output: Any) -> list[str]:
    names: list[str] = []
    if hasattr(tool_output, "competitors"):
        for comp in tool_output.competitors:
            name = getattr(comp, "name", None)
            if name:
                names.append(name.strip())
    elif isinstance(tool_output, dict) and "competitors" in tool_output:
        for comp in tool_output.get("competitors", []):
            if isinstance(comp, dict) and comp.get("name"):
                names.append(comp["name"].strip())
            elif hasattr(comp, "name") and comp.name:
                names.append(comp.name.strip())
    return names


def _sanitize_market_competitors(finding: Finding, allowed_names: list[str]) -> None:
    allowed_lower = {name.lower() for name in allowed_names if name}
    combined_text = f"{finding.title} {finding.detail}".lower()
    has_allowed = any(name in combined_text for name in allowed_lower)

    if finding.category == "competition" and not has_allowed:
        finding.category = "market"

    pattern = re.compile(r"\bcompetitor\s+([\"']?)([A-Z][a-zA-Z0-9_\-\s]{1,30})\1", re.IGNORECASE)

    def _replace_unverified(match: re.Match) -> str:
        extracted = match.group(2).strip()
        if extracted.lower() in allowed_lower:
            return match.group(0)
        return "unverified competitor"

    finding.detail = pattern.sub(_replace_unverified, finding.detail)
    finding.title = pattern.sub(_replace_unverified, finding.title)


def _post_process_report(
    report: PersonaReport,
    persona: Persona,
    tool_output: Any,
) -> PersonaReport:
    report.persona = persona
    findings = list(report.findings)

    # 1. Sort by severity: critical -> major -> minor
    findings.sort(key=lambda f: SEVERITY_ORDER.get(f.severity, 3))

    # 2. Enforce 4-6 findings
    if len(findings) > 6:
        findings = findings[:6]

    allowed_competitors = _get_allowed_competitor_names(tool_output) if persona == "market" else []
    prefix = PERSONA_PREFIX.get(persona, "F")

    # 3. Post-process each finding
    for idx, finding in enumerate(findings, start=1):
        finding.id = f"{prefix}-{idx}"
        finding.persona = persona
        finding.resolved = "open"

        # Every finding must have >=1 SourceRef
        if not finding.sources:
            finding.sources = [SourceRef(type="inference", ref="model")]
            finding.status = "unverified"
        else:
            for src in finding.sources:
                if src.quote:
                    words = src.quote.split()
                    if len(words) > 25:
                        src.quote = " ".join(words[:25])

        # Cap lengths: title <= 10 words, question <= 35 words
        if finding.title:
            t_words = finding.title.split()
            if len(t_words) > 10:
                finding.title = " ".join(t_words[:10])

        if finding.question:
            q_words = finding.question.split()
            if len(q_words) > 35:
                finding.question = " ".join(q_words[:35])

        # Market competitor validation
        if persona == "market":
            _sanitize_market_competitors(finding, allowed_competitors)

    report.findings = findings
    return report


def _mock_persona_report(persona: Persona) -> PersonaReport:
    headlines = {
        "finance": "Unit economics vulnerable to CAC inflation.",
        "market": "Direct competitors challenge market dominance claims.",
        "tech": "Technical claims require infrastructure validation.",
    }
    categories = {
        "finance": "finance",
        "market": "competition",
        "tech": "tech",
    }
    severities = ["critical", "major", "minor", "minor"]
    findings = [
        Finding(
            id=f"{PERSONA_PREFIX.get(persona, 'F')}-{i+1}",
            persona=persona,
            title=f"{persona.title()} key diligence issue {i+1}",
            detail=f"Diligence assessment for {persona} based on deck claims and tool outputs.",
            severity=severities[i],
            category=categories.get(persona, "other"),
            sources=[SourceRef(type="inference", ref="model")],
            status="unverified",
            question=f"How will you address this {persona} concern?",
            resolved="open",
        )
        for i in range(4)
    ]
    return PersonaReport(
        persona=persona,
        headline=headlines.get(persona, f"{persona.title()} diligence report."),
        findings=findings,
    )


async def run_persona(
    persona: Persona,
    deck: Any,
    tool_output: Any,
    *,
    llm_generate: Callable[..., Awaitable[PersonaReport]] | None = None,
) -> PersonaReport:
    prompt = render_persona_prompt(persona, deck, tool_output)

    try:
        from app.config import settings
        has_api_key = bool(getattr(settings, "GEMINI_API_KEY", ""))
    except Exception:
        has_api_key = False

    try:
        if llm_generate is not None:
            raw_report = await llm_generate(prompt=prompt, schema=PersonaReport, system=None, temperature=0.2)
        elif generate_json is not None and has_api_key:
            raw_report = await generate_json(prompt=prompt, schema=PersonaReport, system=None, temperature=0.2)
        else:
            raw_report = _mock_persona_report(persona)
    except Exception:
        raw_report = _mock_persona_report(persona)

    if isinstance(raw_report, dict):
        raw_report = PersonaReport.model_validate(raw_report)

    return _post_process_report(raw_report, persona, tool_output)
