"""Configuration settings for SecondBrain backend."""

import sys
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure repo root is on sys.path so 'contracts.schemas' can be imported anywhere
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = REPO_ROOT / ".env"
if not ENV_FILE.exists():
    ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # Operating flags
    MOCK: bool = False
    DEMO_MODE: str = ""
    ENABLE_CROSSTALK: bool = True

    # Google Gemini (the ONLY LLM provider)
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_MODEL_VISION: str = "gemini-2.5-flash"
    LLM_FALLBACK_MODEL: str = "gemini-1.5-flash"

    # Search
    TAVILY_API_KEY: str = ""

    # Yugabyte Meko
    MEKO_MODE: Literal["live", "local", "off"] = "local"
    MEKO_API_KEY: str = ""
    MEKO_DATAPACK_ID: str = ""
    MEKO_MCP_URL: str = "https://mcp.mekodata.ai/mcp"
    MEKO_CALL_BUDGET: int = 200
    MEKO_TIMEOUT_S: int = 8

    # Paths
    DATA_DIR: Path = BACKEND_DIR / "data"
    FIXTURES_DIR: Path = Path(__file__).resolve().parent / "fixtures"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
# Ensure data directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
(settings.DATA_DIR / "uploads").mkdir(parents=True, exist_ok=True)
