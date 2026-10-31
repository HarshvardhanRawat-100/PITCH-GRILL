"""Multimodal vision transcription for image-heavy slides using Google Gemini."""
import asyncio
import logging
from typing import List, Tuple
from pydantic import BaseModel

from app.config import settings
from app.ingest.parser import ParsedSlide
from app.ingest.prompts import P00_PREAMBLE, P02_VISION_TRANSCRIPTION
from app.llm import generate_json

logger = logging.getLogger("app.ingest.vision")


class SlideTranscription(BaseModel):
    text: str


async def _transcribe_single_slide(
    slide: ParsedSlide,
    semaphore: asyncio.Semaphore,
) -> Tuple[int, str, bool]:
    """Transcribe a single slide image via Gemini vision under semaphore limit."""
    async with semaphore:
        try:
            from google.genai import types

            image_part = types.Part.from_bytes(
                data=slide.png_bytes,
                mime_type="image/png",
            )

            prompt = f"{P00_PREAMBLE}\n{P02_VISION_TRANSCRIPTION}"

            result: SlideTranscription = await generate_json(
                prompt=prompt,
                schema=SlideTranscription,
                images=[image_part],
                model=settings.LLM_MODEL_VISION,
                temperature=0.2,
            )

            transcribed = result.text.strip()
            return slide.n, transcribed if transcribed else "[unreadable]", True
        except Exception as e:
            logger.warning("Vision transcription failed for slide %d: %s", slide.n, e)
            return slide.n, "[unreadable]", False


async def transcribe_slides(
    slides: List[ParsedSlide],
    max_vision_pages: int = 8,
    total_budget_s: float = 20.0,
) -> Tuple[List[ParsedSlide], List[str]]:
    """Transcribe flagged slides concurrently using Gemini Vision.

    - Caps vision processing at `max_vision_pages` (default 8)
    - Concurrency throttled by Semaphore(4)
    - Enforces `total_budget_s` (default 20.0s)
    - Fallback: sets text to "[unreadable]" and adds note to missing_data
    """
    flagged = [s for s in slides if s.needs_vision]
    if not flagged:
        return slides, []

    vision_targets = flagged[:max_vision_pages]
    overflow = flagged[max_vision_pages:]

    missing_notes: List[str] = []
    for ov in overflow:
        ov.text = "[unreadable]"
        missing_notes.append(
            f"Slide {ov.n} skipped vision transcription (capped at {max_vision_pages} pages)"
        )

    semaphore = asyncio.Semaphore(4)
    tasks = [_transcribe_single_slide(s, semaphore) for s in vision_targets]

    try:
        results = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True),
            timeout=total_budget_s,
        )
    except asyncio.TimeoutError:
        logger.warning("Vision transcription exceeded %.1fs total budget", total_budget_s)
        results = [
            (s.n, "[unreadable]", False) for s in vision_targets
        ]
        missing_notes.append("Vision transcription exceeded 20s budget; remaining slides marked unreadable")

    # Map transcriptions back to slides
    transcription_map = {}
    for res in results:
        if isinstance(res, Exception):
            continue
        slide_n, text, success = res
        transcription_map[slide_n] = (text, success)

    for slide in slides:
        if slide.n in transcription_map:
            text, success = transcription_map[slide.n]
            slide.text = text
            if not success or text == "[unreadable]":
                missing_notes.append(f"Slide {slide.n} was unreadable via vision")

    return slides, missing_notes
