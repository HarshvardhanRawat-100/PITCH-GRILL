"""Tests for Gemini LLM wrapper."""

import pytest
from pydantic import BaseModel

from app.config import settings
from app.llm import generate_json, generate_text, get_usage


class SampleSchema(BaseModel):
    message: str


@pytest.mark.asyncio
async def test_llm_rejects_in_mock_mode():
    settings.MOCK = True
    with pytest.raises(RuntimeError) as exc_info:
        await generate_json("Hello", SampleSchema)
    assert "LLM cannot be called in MOCK mode" in str(exc_info.value)

    with pytest.raises(RuntimeError) as exc_info:
        await generate_text("Hello")
    assert "LLM cannot be called in MOCK mode" in str(exc_info.value)


def test_usage_telemetry_structure():
    usage = get_usage()
    assert "calls" in usage
    assert "input_tokens" in usage
    assert "output_tokens" in usage
    assert "by_model" in usage
