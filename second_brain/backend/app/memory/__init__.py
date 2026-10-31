<<<<<<< HEAD
"""
Memory module export and factory.

Exports:
    get_memory() -> MemoryClient
    MemoryClient (Protocol)
    MekoClient
    LocalMemoryClient
    NullMemoryClient
"""
from __future__ import annotations

import os
from typing import Optional

from backend.app.memory.base import MemoryClient, NullMemoryClient
from backend.app.memory.local import LocalMemoryClient
from backend.app.memory.meko import MekoClient

_SINGLETON_CLIENT: Optional[MemoryClient] = None


def get_memory() -> MemoryClient:
    """
    Factory returning the configured MemoryClient singleton.

    Resolution logic:
    - DEMO_MODE == "cached" -> forces LocalMemoryClient (honest fallback)
    - MEKO_MODE == "off" -> NullMemoryClient (returns status='skipped')
    - MEKO_MODE == "local" -> LocalMemoryClient
    - MEKO_MODE == "live" (default) -> MekoClient (with auto-fallback to local)

    NEVER raises an exception.
    """
    global _SINGLETON_CLIENT
    if _SINGLETON_CLIENT is not None:
        return _SINGLETON_CLIENT

    demo_mode = os.getenv("DEMO_MODE", "").strip().lower()
    meko_mode = os.getenv("MEKO_MODE", "live").strip().lower()

    if demo_mode == "cached":
        _SINGLETON_CLIENT = LocalMemoryClient()
    elif meko_mode == "off":
        _SINGLETON_CLIENT = NullMemoryClient()
    elif meko_mode == "local":
        _SINGLETON_CLIENT = LocalMemoryClient()
    else:
        # live mode with auto-fallback
        _SINGLETON_CLIENT = MekoClient()

    return _SINGLETON_CLIENT


def reset_memory() -> None:
    """Helper for testing to reset the singleton client."""
    global _SINGLETON_CLIENT
    _SINGLETON_CLIENT = None


__all__ = [
    "get_memory",
    "reset_memory",
    "MemoryClient",
    "LocalMemoryClient",
    "MekoClient",
    "NullMemoryClient",
]
=======
# P4: memory package placeholder
>>>>>>> 4e0c116720f10c8fa76a1c65b78c8bf645ff529e
