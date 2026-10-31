"""
LOCAL conftest — adds repo root to sys.path so `from contracts.schemas import …` works.
DO NOT COMMIT this file (it is only needed until P1's scaffold defines the import convention).
"""
import sys
from pathlib import Path

# Repo root is two levels up from backend/tests/
_repo_root = str(Path(__file__).resolve().parent.parent.parent)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

# Also add backend/ so `from app.tools.finance_engine import …` works
_backend = str(Path(__file__).resolve().parent.parent)
if _backend not in sys.path:
    sys.path.insert(0, _backend)
