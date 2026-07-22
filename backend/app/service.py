"""
Service layer -- wires loading, scoring, and explanation together.

Kept separate from the FastAPI layer so the exact same logic is usable from the
CLI (scripts/score_all.py), tests, and the API. Scoring is pure and offline;
only the (optional) explanation makes a network call.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from app.aggregate import score_business
from app.data_loader import build_context, load_dataset
from app.explain import explain
from app.models import BusinessInput, ScoreReport
from app.signals import ScoringContext, default_signals


class ScoringService:
    def __init__(self, data_path: Optional[str] = None):
        self.businesses: List[BusinessInput] = load_dataset(data_path)
        self.context: ScoringContext = build_context(self.businesses)
        self.signals = default_signals()
        self._by_id: Dict[str, BusinessInput] = {
            b.business_id: b for b in self.businesses
        }

    # -- lookups ---------------------------------------------------------- #
    def list_businesses(self) -> List[Dict[str, str]]:
        return [
            {"business_id": b.business_id, "business_name": b.business_name,
             "category": b.category or ""}
            for b in self.businesses
        ]

    def get(self, business_id: str) -> Optional[BusinessInput]:
        return self._by_id.get(business_id)

    # -- scoring ---------------------------------------------------------- #
    def score(self, biz: BusinessInput, use_llm: bool = True) -> ScoreReport:
        """Score one business. An explanation is always attached; use_llm=False
        uses the deterministic template instead of a live model call."""
        report = score_business(biz, self.context, self.signals)
        text, source, detail = explain(report, use_llm=use_llm)
        report.explanation = text
        report.explanation_source = source
        report.explanation_grounded = detail.grounded
        report.groundedness = detail
        return report

    def score_by_id(
        self, business_id: str, use_llm: bool = True
    ) -> Optional[ScoreReport]:
        biz = self.get(business_id)
        if biz is None:
            return None
        return self.score(biz, use_llm)

    def score_all(self, use_llm: bool = True) -> List[ScoreReport]:
        return [self.score(b, use_llm) for b in self.businesses]
