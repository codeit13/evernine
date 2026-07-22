from __future__ import annotations

import pytest

from app.service import ScoringService


@pytest.fixture(scope="session")
def service() -> ScoringService:
    # Offline: explanations use the deterministic template (no network in tests).
    return ScoringService()  # default bundled sample portfolio


@pytest.fixture(scope="session")
def reports(service):
    return {r.business_id: r for r in service.score_all(use_llm=False)}
