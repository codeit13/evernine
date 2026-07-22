"""
The SignalScorer contract -- the extension point of the whole system.

Adding a 5th signal (web traffic, NPS, inventory turnover, ...) is:
  1. subclass SignalScorer, implement is_present() + compute(),
  2. register the instance in signals/registry.py with a base weight in config.

The aggregator, credibility shrinkage, confidence roll-up, and the API are all
signal-agnostic: they iterate over whatever scorers are registered. No other
code changes. That decoupling is the "how would you extend this" answer.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.models import BusinessInput


@dataclass
class ScoringContext:
    """Dataset-level context shared with every signal for one scoring run.

    Carries empirical-Bayes priors and the recency reference so that individual
    signals stay pure functions of (business, context) and the whole run is
    deterministic (the reference month is derived from the data, not the wall
    clock).
    """
    reference_month: Optional[str] = None          # latest YYYY-MM in the dataset
    review_prior_score: Optional[float] = None      # empirical global review score


@dataclass
class SignalOutput:
    """What a signal returns for one business."""
    present: bool
    subscore: Optional[float] = None                # raw 0..100
    confidence: float = 0.0                          # 0..1
    drivers: Dict[str, object] = field(default_factory=dict)  # grounded facts
    notes: List[str] = field(default_factory=list)


class SignalScorer(abc.ABC):
    #: stable key used in weights/priors/config and in the API response
    name: str = "signal"

    @abc.abstractmethod
    def is_present(self, biz: BusinessInput) -> bool:
        """Is there ANY usable data for this signal? (empty/null/0-rows => False)"""

    @abc.abstractmethod
    def compute(self, biz: BusinessInput, ctx: ScoringContext) -> SignalOutput:
        """Compute the raw sub-score + confidence + grounded drivers."""

    def prior(self, ctx: ScoringContext) -> float:
        """Prior this signal is shrunk toward when confidence is low."""
        from app.config import SETTINGS
        return SETTINGS.priors.get(self.name, 50.0)
