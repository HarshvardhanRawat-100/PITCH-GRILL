"""Gemini-only LLM wrapper with structured output, fallback routing, and telemetry."""
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger("app.llm")

T = TypeVar("T", bound=BaseModel)

# Module-level usage counters
_USAGE: Dict[str, Any] = {
    "calls": 0,
    "input_tokens": 0,
    "output_tokens": 0,
    "by_model": {},
}


def get_usage() -> Dict[str, Any]:
    """Return a snapshot of LLM token and call usage."""
    return {
        "calls": _USAGE["calls"],
        "input_tokens": _USAGE["input_tokens"],
        "output_tokens": _USAGE["output_tokens"],
        "by_model": dict(_USAGE["by_model"]),
    }


def _record_usage(model_name: str, input_tokens: int, output_tokens: int) -> None:
    _USAGE["calls"] += 1
    _USAGE["input_tokens"] += input_tokens
    _USAGE["output_tokens"] += output_tokens

    if model_name not in _USAGE["by_model"]:
        _USAGE["by_model"][model_name] = {"calls": 0, "input_tokens": 0, "output_tokens": 0}
    _USAGE["by_model"][model_name]["calls"] += 1
    _USAGE["by_model"][model_name]["input_tokens"] += input_tokens
    _USAGE["by_model"][model_name]["output_tokens"] += output_tokens


def _get_genai_client():
    """Lazily instantiate the google-genai client."""
    from google import genai
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def _execute_generate(
    model: str,
    contents: List[Any],
    *,
    system: Optional[str] = None,
    schema: Optional[Type[BaseModel]] = None,
    temperature: float = 0.2,
) -> Any:
    from google.genai import types

    client = _get_genai_client()
    config_args: Dict[str, Any] = {"temperature": temperature}

    if system:
        config_args["system_instruction"] = system

    if schema is not None:
        config_args["response_mime_type"] = "application/json"
        config_args["response_schema"] = schema

    config = types.GenerateContentConfig(**config_args)

    return await client.aio.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )


async def generate_json(
    prompt: str,
    schema: Type[T],
    *,
    system: Optional[str] = None,
    images: Optional[List[Any]] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> T:
    """Generate structured JSON conforming to `schema` via Google Gemini.

    - 45-second timeout
    - One retry on transient error
    - Fallback to fallback model
    - Validates with Pydantic
    - Logs duration & records token usage
    """
    if settings.MOCK:
        raise RuntimeError(
            "LLM cannot be called in MOCK mode. Mocks must be served at the route level."
        )

    target_model = model or settings.LLM_MODEL
    contents: List[Any] = [prompt]
    if images:
        contents.extend(images)

    t0 = time.time()
    last_err: Optional[Exception] = None

    # Try target model (1 attempt + 1 retry), then fallback model
    model_sequence = [target_model, target_model, settings.LLM_FALLBACK_MODEL]

    for attempt, current_model in enumerate(model_sequence):
        try:
            logger.info("Calling Gemini (%s, attempt %d)", current_model, attempt + 1)
            response = await asyncio.wait_for(
                _execute_generate(
                    current_model,
                    contents,
                    system=system,
                    schema=schema,
                    temperature=temperature,
                ),
                timeout=45.0,
            )

            # Record token usage
            in_tok = 0
            out_tok = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                in_tok = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                out_tok = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
            _record_usage(current_model, in_tok, out_tok)

            raw_text = response.text
            duration = time.time() - t0
            logger.info(
                "Gemini %s succeeded in %.2fs (tokens: in=%d, out=%d)",
                current_model,
                duration,
                in_tok,
                out_tok,
            )

            # Validate with Pydantic
            if isinstance(raw_text, str):
                return schema.model_validate_json(raw_text)
            elif isinstance(response.parsed, schema):
                return response.parsed
            else:
                return schema.model_validate(raw_text)

        except Exception as e:
            last_err = e
            logger.warning(
                "Gemini %s attempt %d failed: %s", current_model, attempt + 1, str(e)
            )
            if attempt < len(model_sequence) - 1:
                await asyncio.sleep(1.0)
                continue

    raise RuntimeError(
        f"generate_json failed after retries and fallback: {last_err}"
    ) from last_err


async def generate_text(
    prompt: str,
    *,
    system: Optional[str] = None,
    images: Optional[List[Any]] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> str:
    """Generate free-form text via Google Gemini."""
    if settings.MOCK:
        raise RuntimeError(
            "LLM cannot be called in MOCK mode. Mocks must be served at the route level."
        )

    target_model = model or settings.LLM_MODEL
    contents: List[Any] = [prompt]
    if images:
        contents.extend(images)

    t0 = time.time()
    last_err: Optional[Exception] = None

    model_sequence = [target_model, target_model, settings.LLM_FALLBACK_MODEL]

    for attempt, current_model in enumerate(model_sequence):
        try:
            response = await asyncio.wait_for(
                _execute_generate(
                    current_model,
                    contents,
                    system=system,
                    temperature=temperature,
                ),
                timeout=45.0,
            )

            in_tok = 0
            out_tok = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                in_tok = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                out_tok = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
            _record_usage(current_model, in_tok, out_tok)

            duration = time.time() - t0
            logger.info("Gemini text %s succeeded in %.2fs", current_model, duration)
            return response.text or ""

        except Exception as e:
            last_err = e
            logger.warning("Gemini text attempt %d failed: %s", attempt + 1, str(e))
            if attempt < len(model_sequence) - 1:
                await asyncio.sleep(1.0)
                continue

    raise RuntimeError(
        f"generate_text failed after retries and fallback: {last_err}"
    ) from last_err
