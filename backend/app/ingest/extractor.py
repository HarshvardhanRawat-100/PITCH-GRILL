"""Extract structured DeckFacts from parsed slides using Gemini and strict code post-processing."""

import logging
import re

from contracts.schemas import Claim, DeckFacts, SlideText, Sourced

from app.config import settings
from app.ingest.parser import ParsedSlide
from app.ingest.prompts import P00_PREAMBLE, P01_DECK_EXTRACTION
from app.llm import generate_json
from app.security import wrap_untrusted

logger = logging.getLogger("app.ingest.extractor")

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+previous", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"give\s+.*(?:100|full|high)\s+.*score", re.IGNORECASE),
    re.compile(r"rate\s+.*(?:100|full|perfect)", re.IGNORECASE),
    re.compile(r"disregard\s+(?:all|previous)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
]

TAM_REGEX = re.compile(
    r"(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?)\b",
    re.IGNORECASE,
)


def _normalize_ws(text: str) -> str:
    """Normalize internal and surrounding whitespace."""
    return " ".join(text.split())


def _convert_inr_text(tam_text: str) -> float | None:
    """Fallback regex conversion for Indian currency expressions (e.g. ₹500 crore)."""
    if not tam_text:
        return None
    match = TAM_REGEX.search(tam_text)
    if not match:
        return None

    val_str, unit_str = match.groups()
    try:
        val = float(val_str)
        unit = unit_str.lower()
        if unit.startswith("cr"):
            return val * 10_000_000.0
        elif unit.startswith("l"):
            return val * 100_000.0
    except Exception:
        pass
    return None


def post_process_deck_facts(
    deck: DeckFacts,
    slides: list[ParsedSlide],
    extra_notes: list[str] | None = None,
) -> DeckFacts:
    """Code post-processing enforcing Golden Rules:

    1. Fills slides (SlideText) with vision flag
    2. Drops claims whose quote is not a substring of slide text (verbatim check)
    3. Caps quotes to 25 words
    4. Validates Sourced.origin consistency (value present => origin 'deck')
    5. Regex fallback for TAM crore/lakh conversion
    6. Scans slides for prompt injection attempts and flags in missing_data
    """
    # 1. Fill SlideText
    slide_texts = [SlideText(n=s.n, text=s.text, used_vision=s.needs_vision) for s in slides]
    deck.slides = slide_texts

    # Map 1-based slide index to normalized text
    slide_map = {s.n: _normalize_ws(s.text).lower() for s in slides}

    # 2 & 3. Drop unverified claim quotes and cap length to 25 words
    valid_claims: list[Claim] = []
    for claim in deck.claims:
        if not claim.quote:
            continue

        norm_quote = _normalize_ws(claim.quote)
        # Cap quote to 25 words
        words = norm_quote.split()
        capped_quote = " ".join(words[:25])
        claim.quote = capped_quote

        # Verify quote is a substring of the claimed slide text
        slide_n = claim.slide
        if slide_n and slide_n in slide_map:
            target_text = slide_map[slide_n]
            if capped_quote.lower() in target_text:
                valid_claims.append(claim)
            else:
                logger.debug(
                    "Dropping claim %s: quote %r not in slide %d text",
                    claim.id,
                    capped_quote,
                    slide_n,
                )
        else:
            # Check across all slides as a lenient fallback
            if any(capped_quote.lower() in st for st in slide_map.values()):
                valid_claims.append(claim)
            else:
                logger.debug(
                    "Dropping claim %s: quote %r not found anywhere in deck",
                    claim.id,
                    capped_quote,
                )

    deck.claims = valid_claims

    # 4. Sourced.origin consistency
    fi = deck.financial_inputs
    for field_name in fi.model_fields.keys():
        sourced_item: Sourced = getattr(fi, field_name)
        if sourced_item.value is not None:
            sourced_item.origin = "deck"
        else:
            sourced_item.origin = "assumed"

    # 5. TAM crore/lakh conversion fallback
    if deck.tam_claim_inr is None and deck.tam_claim_text:
        converted = _convert_inr_text(deck.tam_claim_text)
        if converted is not None:
            deck.tam_claim_inr = converted

    # 6. Prompt injection detection
    for s in slides:
        for pat in INJECTION_PATTERNS:
            if pat.search(s.text):
                warning = f"Possible prompt-injection text found on slide {s.n}"
                if warning not in deck.missing_data:
                    deck.missing_data.append(warning)
                logger.warning("Injection detected on slide %d: %s", s.n, pat.pattern)

    # Append extra notes from vision stage
    if extra_notes:
        for note in extra_notes:
            if note not in deck.missing_data:
                deck.missing_data.append(note)

    return deck


async def extract_deck_facts(
    slides: list[ParsedSlide],
    extra_notes: list[str] | None = None,
) -> DeckFacts:
    """Extract structured facts from slides via Gemini structured output and code post-processing."""
    # Build slide text block
    slide_blocks = []
    for s in slides:
        slide_blocks.append(f"[slide {s.n}]\n{s.text}")
    raw_text = "\n\n".join(slide_blocks)

    wrapped_deck = wrap_untrusted("deck", raw_text)
    prompt = f"{P00_PREAMBLE}\n{P01_DECK_EXTRACTION.format(untrusted_deck=wrapped_deck)}"

    logger.info("Extracting DeckFacts from %d slides via Gemini", len(slides))
    extracted: DeckFacts = await generate_json(
        prompt=prompt,
        schema=DeckFacts,
        model=settings.LLM_MODEL,
        temperature=0.2,
    )

    return post_process_deck_facts(extracted, slides, extra_notes=extra_notes)
