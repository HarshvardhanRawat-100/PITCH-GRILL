"""Deals route: creation, retrieval, deletion, markdown export, and mock pipeline execution."""

import asyncio
import json
import logging
import uuid
from datetime import UTC, datetime

from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import PlainTextResponse

from app.config import settings
from app.store import append_event, delete_deal, get_deal, save_deal
from contracts.schemas import (
    Deal,
)

logger = logging.getLogger("app.deals")

router = APIRouter(prefix="/api/deals", tags=["deals"])


def _load_fixture(filename: str):
    path = settings.FIXTURES_DIR / filename
    with open(path, encoding="utf-8") as f:
        return json.load(f)


async def run_pipeline(deal_id: str):
    """Execute analysis pipeline for a deal. In MOCK mode, replays realistic fixtures with delays.
    In real mode, runs the ingestion pipeline (parser -> vision -> extractor -> orchestrator)."""
    deal = get_deal(deal_id)
    if not deal:
        logger.error("Pipeline run failed: deal %s not found", deal_id)
        return

    upload_pdf_path = settings.DATA_DIR / "uploads" / f"{deal_id}.pdf"
    is_real_run = (not settings.MOCK) and upload_pdf_path.exists()

    logger.info(
        "Starting pipeline for deal %s (real=%s, MOCK=%s)", deal_id, is_real_run, settings.MOCK
    )

    if not is_real_run:
        # Mock / Demo replay pipeline
        # 1. Parsing stage
        append_event(
            deal_id,
            "stage",
            {
                "stage": "parsing",
                "message": "Parsing pitch deck slides and extracting text...",
                "progress": 0.1,
            },
        )
        await asyncio.sleep(0.3)

        # 2. Extracting stage & Deck facts
        append_event(
            deal_id,
            "stage",
            {
                "stage": "extracting",
                "message": "Extracting claims and financial inputs with Gemini...",
                "progress": 0.25,
            },
        )
        await asyncio.sleep(0.3)

        deck_data = _load_fixture("deck.json")
        append_event(deal_id, "deck", deck_data)
        await asyncio.sleep(0.2)

        # 3. Parallel Tools: Finance, Market, Tech
        append_event(
            deal_id,
            "stage",
            {
                "stage": "finance",
                "message": "Simulating 36-month financial engine and CAC break point...",
                "progress": 0.4,
            },
        )
        finance_data = _load_fixture("finance.json")
        append_event(deal_id, "finance", finance_data)
        await asyncio.sleep(0.25)

        append_event(
            deal_id,
            "stage",
            {
                "stage": "market",
                "message": "Grounding competitors and TAM claims with live web search...",
                "progress": 0.55,
            },
        )
        market_data = _load_fixture("market.json")
        append_event(deal_id, "market", market_data)
        await asyncio.sleep(0.25)

        append_event(
            deal_id,
            "stage",
            {
                "stage": "tech",
                "message": "Inspecting product website and GitHub repository signals...",
                "progress": 0.65,
            },
        )
        tech_data = _load_fixture("tech.json")
        append_event(deal_id, "tech", tech_data)
        await asyncio.sleep(0.25)

        # 4. Persona reports (Finance, Market, Tech)
        append_event(
            deal_id,
            "stage",
            {
                "stage": "moderating",
                "message": "Synthesizing red-team findings across three investor personas...",
                "progress": 0.75,
            },
        )
        reports = _load_fixture("reports.json")
        for rep in reports:
            append_event(deal_id, "persona_report", rep)
            await asyncio.sleep(0.2)

        # 5. Evidence Ledger
        ledger = _load_fixture("ledger.json")
        append_event(deal_id, "ledger", {"entries": ledger})
        await asyncio.sleep(0.2)

        # 6. Readiness Score
        append_event(
            deal_id,
            "stage",
            {
                "stage": "scoring",
                "message": "Computing initial Pitch Readiness Score...",
                "progress": 0.85,
            },
        )
        score_data = {
            "initial": 52.0,
            "current": 52.0,
            "by_persona": [
                {"persona": "finance", "initial": 48.0, "current": 48.0},
                {"persona": "market", "initial": 50.0, "current": 50.0},
                {"persona": "tech", "initial": 58.0, "current": 58.0},
            ],
        }
        append_event(deal_id, "score", score_data)
        await asyncio.sleep(0.2)

        # 7. Data Room Checklist
        append_event(
            deal_id,
            "stage",
            {
                "stage": "checklist",
                "message": "Generating India due-diligence data room checklist...",
                "progress": 0.92,
            },
        )
        checklist = _load_fixture("checklist.json")
        append_event(deal_id, "checklist", {"items": checklist})
        await asyncio.sleep(0.2)

        # 8. Memory records (replay top findings remembered to Meko)
        try:
            mem_records = _load_fixture("memory_log.json")
            for rec in mem_records[:4]:
                append_event(deal_id, "memory", rec)
                await asyncio.sleep(0.1)
        except Exception as e:
            logger.warning("Could not replay memory fixture: %s", e)

        # 9. Ready & Done
        append_event(
            deal_id,
            "stage",
            {
                "stage": "ready",
                "message": "Analysis complete. War room is ready for defense.",
                "progress": 1.0,
            },
        )
        append_event(deal_id, "done", {"phase": "analysis"})
        logger.info("Pipeline completed successfully for deal %s", deal_id)
        return

    # Real Ingestion Mode
    try:
        # Step 1: Parsing
        append_event(
            deal_id,
            "stage",
            {
                "stage": "parsing",
                "message": "Parsing pitch deck slides and rendering high-res pages...",
                "progress": 0.1,
            },
        )
        with open(upload_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        from app.ingest.parser import parse_pdf

        slides = parse_pdf(pdf_bytes)

        # Step 2: Vision transcription for flagged slides
        from app.ingest.vision import transcribe_slides

        slides, vision_notes = await transcribe_slides(slides)

        # Step 3: Structured extraction via Gemini
        append_event(
            deal_id,
            "stage",
            {
                "stage": "extracting",
                "message": "Extracting structured claims and financial metrics with Gemini...",
                "progress": 0.3,
            },
        )
        from app.ingest.extractor import extract_deck_facts

        deck_facts = await extract_deck_facts(slides, extra_notes=vision_notes)

        # Emit deck event
        append_event(deal_id, "deck", deck_facts.model_dump())

        # Step 4: Hand-off to Orchestrator (P2) if present
        try:
            from app.agents.orchestrator import run_analysis

            await run_analysis(deal_id)
        except (ImportError, AttributeError):
            logger.info("Orchestrator not yet present (P2 package); setting status to ready")
            append_event(
                deal_id,
                "stage",
                {
                    "stage": "ready",
                    "message": "Deck extraction complete. War room ready for analysis.",
                    "progress": 1.0,
                },
            )
            append_event(deal_id, "done", {"phase": "analysis"})

    except Exception as e:
        logger.error("Real ingestion pipeline failed for deal %s: %s", deal_id, e, exc_info=True)
        append_event(
            deal_id,
            "error",
            {"code": "ingest_error", "message": str(e), "recoverable": False},
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_deal(
    background_tasks: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    website_url: str | None = Form(default=None),
    github_url: str | None = Form(default=None),
    demo: bool = Query(default=False),
):
    """Upload a pitch deck PDF or start demo mode. Kicks off the diligence analysis pipeline."""
    deal_id = f"deal_{uuid.uuid4().hex[:8]}"

    if not demo and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "missing_input",
                    "message": "Must provide a PDF file or set demo=true",
                }
            },
        )

    # Validate PDF if provided
    if file:
        content = await file.read()

        # Check size (max 20 MB)
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "file_too_large",
                        "message": "Pitch deck PDF must be under 20 MB",
                    }
                },
            )

        # Check magic bytes
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "invalid_pdf",
                        "message": "File does not start with valid PDF magic bytes",
                    }
                },
            )

        # Check page count with PyMuPDF
        try:
            import fitz

            doc = fitz.open(stream=content, filetype="pdf")
            page_count = doc.page_count
            doc.close()
            if page_count > 40:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": {
                            "code": "too_many_pages",
                            "message": f"PDF has {page_count} pages (cap is 40)",
                        }
                    },
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "corrupt_pdf", "message": f"Could not parse PDF: {e!s}"}},
            )

        # Persist uploaded file
        upload_path = settings.DATA_DIR / "uploads" / f"{deal_id}.pdf"
        with open(upload_path, "wb") as f:
            f.write(content)

    # Initialize Deal in store
    deal = Deal(
        id=deal_id,
        status="parsing",
        created_at=datetime.now(UTC).isoformat(),
    )
    save_deal(deal)

    # Launch pipeline
    background_tasks.add_task(run_pipeline, deal_id)

    return {"deal_id": deal_id}


@router.get("/{deal_id}", response_model=Deal)
async def get_deal_endpoint(deal_id: str):
    """Get the full state of a deal."""
    deal = get_deal(deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Deal {deal_id} not found"}},
        )
    return deal


@router.delete("/{deal_id}")
async def delete_deal_endpoint(deal_id: str):
    """Delete state, events, uploaded files, and snapshots for a deal."""
    deal = get_deal(deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Deal {deal_id} not found"}},
        )

    # Meko forget-on-delete (guarded until P4 memory module is present)
    try:
        from app.memory import get_memory

        mem = get_memory()
        if hasattr(mem, "forget_deal"):
            await mem.forget_deal(deal_id)
    except ImportError:
        pass
    except Exception as e:
        logger.warning("Meko forget_deal encountered non-fatal error: %s", e)

    delete_deal(deal_id)
    return {"deleted": True}


@router.get("/{deal_id}/export.md")
async def export_deal_markdown(deal_id: str):
    """Export deal diligence report as Markdown."""
    deal = get_deal(deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Deal {deal_id} not found"}},
        )

    company_name = deal.deck.company_name if deal.deck else "Unknown Startup"
    score_str = f"{deal.score.current:.1f}/100" if deal.score else "N/A"

    lines = [
        f"# SecondBrain Due Diligence Report: {company_name}",
        f"Generated at: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}",
        f"**Pitch Readiness Score**: {score_str}",
        "",
        "## Executive Summary",
        deal.deck.one_liner if deal.deck else "No summary available.",
        "",
        "## Red-Team Findings",
    ]

    for rep in deal.reports:
        lines.append(f"### {rep.persona.title()} Investor")
        lines.append(f"_{rep.headline}_")
        for f in rep.findings:
            lines.append(f"- **[{f.severity.upper()}] {f.title}**: {f.detail}")
            lines.append(f'  - Status: `{f.status}` | Question: *"{f.question}"*')
        lines.append("")

    lines.extend(
        [
            "## Due Diligence Data Room Checklist",
        ]
    )
    for item in deal.checklist:
        lines.append(f"- [{item.priority}] **{item.title}** ({item.owner}) - Status: {item.status}")
        lines.append(f"  - _Why: {item.why}_")

    content = "\n".join(lines)
    return PlainTextResponse(content, media_type="text/markdown")
