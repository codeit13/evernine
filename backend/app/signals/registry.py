"""
The registry of active signals.

This ordered list is the single source of truth for which signals exist. The
aggregator and API iterate over it, so registering a new SignalScorer here (plus
a base weight in config.BASE_WEIGHTS) is all that's needed to add a signal.
"""
from __future__ import annotations

from typing import List

from app.signals.ad_efficiency import AdEfficiencySignal
from app.signals.base import SignalScorer
from app.signals.loyalty_ops import LoyaltyOpsSignal
from app.signals.reviews import ReviewsSignal
from app.signals.revenue import RevenueSignal


def default_signals() -> List[SignalScorer]:
    return [
        RevenueSignal(),
        ReviewsSignal(),
        LoyaltyOpsSignal(),
        AdEfficiencySignal(),
    ]
