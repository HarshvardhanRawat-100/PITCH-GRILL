"""Data Room Checklist Generator & Lifecycle Manager for Indian Startups.

Generates actionable, traceable due-diligence data room checklists (P-14)
combining statutory Indian library requirements, open red-team findings,
and Meko Knowledge Base evidence.
"""
import json
import logging
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from app.config import settings
from app.security import wrap_untrusted
from app.store import append_event, save_deal
from contracts.schemas import (
    ChecklistItem,
    Deal,
    Evaluation,
    Finding,
    LedgerEntry,
    SourceRef,
    all_findings,
)

logger = logging.getLogger("app.checklist")

LIBRARY_PATH = Path(__file__).parent / "checklist_library.json"

VALID_PRIORITIES = {"P0", "P1", "P2"}
VALID_OWNERS = {"founder", "legal", "finance", "tech"}


def load_checklist_library() -> list[dict[str, Any]]:
    """Load pre-defined India-focused diligence items from checklist_library.json."""
    if not LIBRARY_PATH.exists():
        logger.warning("Checklist library not found at %s", LIBRARY_PATH)
        return []
    try:
        with open(LIBRARY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        logger.error("Failed to read checklist library: %s", e)
        return []


class ChecklistResponse(BaseModel):
    """Schema for structured LLM response from P-14."""
    items: list[ChecklistItem] = Field(default_factory=list)


def _match_library_item(
    finding: Finding, library: list[dict[str, Any]], used_lib_ids: set[str]
) -> dict[str, Any] | None:
    """Match a finding to the most relevant library item using keyword and tag heuristics."""
    text = f"{finding.title} {finding.detail} {finding.category}".lower()
    best_item = None
    best_score = 0

    for item in library:
        if item["id"] in used_lib_ids:
            continue
        score = 0
        for tag in item.get("tags", []):
            if tag.lower() in text:
                score += 2
        for word in item["title"].lower().split():
            if len(word) > 3 and word in text:
                score += 1

        if score > best_score:
            best_score = score
            best_item = item

    if best_score > 0 and best_item:
        used_lib_ids.add(best_item["id"])
        return best_item
    return None


async def _search_meko_kb(category: str) -> list[str]:
    """Safely query Meko Knowledge Base for documents investors request."""
    try:
        from app.memory import get_memory
        mem = get_memory()
        if hasattr(mem, "kb_search"):
            rec = await mem.kb_search(f"{category} documents investors request", k=3)
            if rec and hasattr(rec, "hits") and rec.hits:
                return rec.hits
    except Exception as e:  # noqa: BLE001
        logger.debug("Meko kb_search skipped or unavailable: %s", e)
    return []


def _post_process_checklist(
    raw_items: list[ChecklistItem],
    valid_finding_ids: set[str],
    library: list[dict[str, Any]],
) -> list[ChecklistItem]:
    """Ensure checklist satisfies: 8-14 items, valid finding_ids, valid enums, sequential D-N ids."""
    seen_titles: set[str] = set()
    cleaned: list[ChecklistItem] = []

    for item in raw_items:
        norm_title = item.title.strip().lower()
        if norm_title in seen_titles:
            continue
        seen_titles.add(norm_title)

        # Validate finding_id: must exist in deal reports or be None
        f_id = item.finding_id if (item.finding_id and item.finding_id in valid_finding_ids) else None

        # Validate priority
        prio = item.priority if item.priority in VALID_PRIORITIES else "P1"

        # Validate owner
        owner = item.owner if item.owner in VALID_OWNERS else "founder"

        cleaned.append(
            ChecklistItem(
                id=f"D-{len(cleaned) + 1}",
                title=item.title.strip(),
                why=item.why.strip() or "Standard investor due diligence requirement.",
                finding_id=f_id,
                priority=prio,
                owner=owner,
                status="todo",
                india_specific=bool(item.india_specific),
            )
        )

    # Pad from library if fewer than 8 items
    if len(cleaned) < 8 and library:
        for lib in library:
            if len(cleaned) >= 8:
                break
            norm = lib["title"].strip().lower()
            if norm in seen_titles:
                continue
            seen_titles.add(norm)
            cleaned.append(
                ChecklistItem(
                    id=f"D-{len(cleaned) + 1}",
                    title=lib["title"],
                    why=lib.get("why_template", "Statutory due diligence verification."),
                    finding_id=None,
                    priority=lib.get("default_priority", "P1"),
                    owner=lib.get("owner", "founder"),
                    status="todo",
                    india_specific=bool(lib.get("india_specific", False)),
                )
            )

    # Enforce maximum 14 items
    if len(cleaned) > 14:
        # Prioritize P0, then P1, then P2
        prio_order = {"P0": 0, "P1": 1, "P2": 2}
        cleaned.sort(key=lambda x: prio_order.get(x.priority, 1))
        cleaned = cleaned[:14]

    # Re-index IDs cleanly D-1 ... D-N
    for idx, item in enumerate(cleaned, start=1):
        item.id = f"D-{idx}"

    return cleaned


async def generate(deal: Deal) -> list[ChecklistItem]:
    """Generate a data room checklist for an Indian startup based on findings, missing data, and library."""
    library = load_checklist_library()
    findings = all_findings(deal.reports)
    valid_finding_ids = {f.id for f in findings}
    missing_data = deal.deck.missing_data if deal.deck else []

    # Gather Knowledge Base hits if Meko is connected
    kb_hits: list[str] = []
    categories = {f.category for f in findings} or {"finance", "tech", "market"}
    for cat in categories:
        hits = await _search_meko_kb(cat)
        kb_hits.extend(hits)

    raw_items: list[ChecklistItem] = []

    # Try LLM generation if not in MOCK mode and Gemini key exists
    if not settings.MOCK and settings.GEMINI_API_KEY:
        try:
            from app.agents.prompts import P_00, P_14
            from app.llm import generate_json

            prompt = (
                f"{P_00}\n\n"
                f"{P_14}\n\n"
                f"INPUTS:\n"
                f"Findings: {[f.model_dump() for f in findings]}\n"
                f"Missing Data: {missing_data}\n"
                f"India Checklist Library: {library}\n"
                f"KB Hits: {wrap_untrusted('memory', json.dumps(kb_hits[:5]))}\n"
            )
            resp = await generate_json(prompt, ChecklistResponse, temperature=0.2)
            if resp and resp.items:
                raw_items = resp.items
        except Exception as e:  # noqa: BLE001
            logger.warning("LLM checklist generation failed, falling back to deterministic: %s", e)

    # Deterministic generation fallback or mock mode
    if not raw_items:
        used_lib_ids: set[str] = set()

        # 1. Map open/unresolved findings to library items or custom items
        for f in findings:
            if f.resolved == "resolved":
                continue
            matched = _match_library_item(f, library, used_lib_ids)
            if matched:
                raw_items.append(
                    ChecklistItem(
                        id=f"D-{len(raw_items) + 1}",
                        title=matched["title"],
                        why=f"Required by {f.persona.title()} Investor: {f.title}. {matched.get('why_template', '')}",
                        finding_id=f.id,
                        priority=matched.get("default_priority", "P0"),
                        owner=matched.get("owner", "founder"),
                        status="todo",
                        india_specific=bool(matched.get("india_specific", False)),
                    )
                )
            else:
                # Custom item for finding
                raw_items.append(
                    ChecklistItem(
                        id=f"D-{len(raw_items) + 1}",
                        title=f"{f.title} Supporting Proof & Verification",
                        why=f"Required by {f.persona.title()} Investor to resolve objection: {f.detail[:100]}",
                        finding_id=f.id,
                        priority="P0" if f.severity == "critical" else "P1",
                        owner="finance" if f.persona == "finance" else ("tech" if f.persona == "tech" else "founder"),
                        status="todo",
                        india_specific=False,
                    )
                )

        # 2. Add missing_data items from deck
        for md in missing_data:
            raw_items.append(
                ChecklistItem(
                    id=f"D-{len(raw_items) + 1}",
                    title=f"Documentation for: {md[:50]}",
                    why=f"Disclose documentation requested in pitch diligence: {md}",
                    finding_id=None,
                    priority="P1",
                    owner="founder",
                    status="todo",
                    india_specific=False,
                )
            )

        # 3. Add core foundational Indian compliance items from library
        core_lib_ids = {"LIB-02", "LIB-04", "LIB-05", "LIB-07", "LIB-10"}
        for lib in library:
            if lib["id"] in core_lib_ids and lib["id"] not in used_lib_ids:
                used_lib_ids.add(lib["id"])
                raw_items.append(
                    ChecklistItem(
                        id=f"D-{len(raw_items) + 1}",
                        title=lib["title"],
                        why=lib.get("why_template", "Standard statutory due diligence requirement."),
                        finding_id=None,
                        priority=lib.get("default_priority", "P0"),
                        owner=lib.get("owner", "legal"),
                        status="todo",
                        india_specific=bool(lib.get("india_specific", False)),
                    )
                )

    # Post process: de-duplicate, validate ranges, enforce 8-14 count
    final_checklist = _post_process_checklist(raw_items, valid_finding_ids, library)

    # M7 Knowledge Base Ledger Attribution:
    # Keep KB attribution only if hit text contains library item title
    if kb_hits:
        for item in final_checklist:
            for hit in kb_hits:
                if item.title.lower() in hit.lower():
                    # Add verified LedgerEntry
                    lead_id = f"L-{len(deal.ledger) + 1}"
                    quote_text = hit.strip()[:150]
                    words = quote_text.split()
                    if len(words) > 25:
                        quote_text = " ".join(words[:25]) + "..."

                    deal.ledger.append(
                        LedgerEntry(
                            id=lead_id,
                            claim_text=f"Checklist requirement: {item.title}",
                            source=SourceRef(
                                type="kb",
                                ref="india_diligence_checklist.md",
                                quote=quote_text,
                            ),
                            status="verified",
                            confidence=0.9,
                            persona=None,
                            finding_id=item.finding_id,
                        )
                    )
                    break

    # Save to deal and append event
    deal.checklist = final_checklist
    save_deal(deal)
    append_event(deal.id, "checklist", {"items": [i.model_dump() for i in final_checklist]})

    return final_checklist


def update_after_turn(
    deal: Deal, finding: Finding, evaluation: Evaluation
) -> list[ChecklistItem]:
    """Update checklist status after a grill turn.
    - resolved -> mark linked items 'addressed'.
    - partial / rejected -> keep existing, append follow-up from evaluation.missing_proof (max 1 per finding).
    """
    updated = False
    is_resolved = (evaluation.outcome == "accepted") or (finding.resolved == "resolved")

    if is_resolved:
        for item in deal.checklist:
            if item.finding_id == finding.id:
                item.status = "addressed"
                updated = True
    else:
        # Partial or rejected: keep existing items
        if evaluation.missing_proof and evaluation.missing_proof.strip():
            proof_text = evaluation.missing_proof.strip()
            # Ensure max 1 follow-up item per finding
            has_followup = any(
                item.finding_id == finding.id and item.title.startswith("Proof:")
                for item in deal.checklist
            )
            if not has_followup:
                owner = "finance" if finding.persona == "finance" else ("tech" if finding.persona == "tech" else "founder")
                prio = "P0" if evaluation.outcome == "rejected" else "P1"
                new_item = ChecklistItem(
                    id=f"D-{len(deal.checklist) + 1}",
                    title=f"Proof: {proof_text[:60]}",
                    why=f"Follow-up required from grill evaluation: {evaluation.reason[:100]}",
                    finding_id=finding.id,
                    priority=prio,
                    owner=owner,
                    status="todo",
                    india_specific=False,
                )
                deal.checklist.append(new_item)
                updated = True

    if updated:
        # Re-number IDs sequentially
        for idx, item in enumerate(deal.checklist, start=1):
            item.id = f"D-{idx}"
        save_deal(deal)
        append_event(deal.id, "checklist", {"items": [i.model_dump() for i in deal.checklist]})

    return deal.checklist
