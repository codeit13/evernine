"""
Revenue signal -- scores *trajectory*, never absolute level.

Design rationale (defend-your-choices notes):
  * Absolute revenue is not comparable across businesses of different sizes, so
    we score momentum/trend, both of which are scale-free.
  * The sub-score blends two views to resolve the "one recent bad month after a
    long good history" case explicitly:
        - momentum: EWMA-recency-weighted MoM growth (recent months dominate),
        - trend:    slope of log-revenue over the whole history (anchors to the
                    long record so a single crash doesn't annihilate the score).
    revenue = momentum_weight*momentum + (1-momentum_weight)*trend.
  * A sharp, statistically-outlying recent drop is flagged as `recent_shock`
    (and surfaced to the explanation) without being allowed to zero out a strong
    multi-year record.

Confidence blends data volume, recency of the latest point, and volatility.
"""
from __future__ import annotations

from typing import List, Tuple

from app.config import SETTINGS
from app.models import BusinessInput
from app.signals.base import ScoringContext, SignalOutput, SignalScorer
from app.stats import (
    clip,
    coefficient_of_variation,
    credibility,
    ewma_growth,
    log_trend_slope,
    mom_growth,
    score_from_signed,
    zscore_of_last,
)


def _sorted_series(month_map: dict) -> Tuple[List[str], List[float]]:
    months = sorted(month_map.keys())
    return months, [float(month_map[m]) for m in months]


def _months_between(a: str, b: str) -> int:
    """Whole months from a to b for 'YYYY-MM' strings (b - a)."""
    ya, ma = int(a[:4]), int(a[5:7])
    yb, mb = int(b[:4]), int(b[5:7])
    return (yb - ya) * 12 + (mb - ma)


class RevenueSignal(SignalScorer):
    name = "revenue"

    def is_present(self, biz: BusinessInput) -> bool:
        return len(biz.revenue_by_month) >= 2  # need >=2 points to see a trend

    def compute(self, biz: BusinessInput, ctx: ScoringContext) -> SignalOutput:
        cfg = SETTINGS.revenue
        months, series = _sorted_series(biz.revenue_by_month)
        n = len(series)
        notes: List[str] = []

        momentum = ewma_growth(series, cfg.ewma_halflife) or 0.0
        trend = log_trend_slope(series)
        if trend is None:
            trend = momentum
        momentum_score = score_from_signed(momentum, cfg.growth_scale)
        trend_score = score_from_signed(trend, cfg.growth_scale)
        subscore = (
            cfg.momentum_weight * momentum_score
            + (1.0 - cfg.momentum_weight) * trend_score
        )

        # --- recent-shock detection -------------------------------------- #
        growths = mom_growth(series)
        last_growth = growths[-1] if growths else 0.0
        z_last = zscore_of_last(series)
        shock = bool(
            growths
            and last_growth <= cfg.shock_mom_threshold
            and z_last is not None
            and z_last <= -cfg.shock_zscore
        )
        if shock:
            notes.append(
                f"recent revenue shock: last month {last_growth*100:.0f}% MoM "
                f"after a longer stable/positive history"
            )

        # --- confidence --------------------------------------------------- #
        c_volume = credibility(n, cfg.credibility_k_months)
        # Recency: penalise a series whose latest point trails the dataset's
        # latest month. (In the bundled data every series ends in the same
        # month, so this is 1.0 for all -- but it matters for live data.)
        c_recency = 1.0
        if ctx.reference_month and months:
            gap = _months_between(months[-1], ctx.reference_month)
            c_recency = clip(1.0 - 0.15 * max(gap, 0), 0.4, 1.0)
        # Consistency: high growth volatility lowers confidence in the estimate,
        # but is floored so it modulates rather than dominates.
        # Volatility should modulate confidence, not dominate it: cap the penalty
        # at 30% so one erratic (or one shock) month can't collapse the estimate.
        cv = coefficient_of_variation(growths) if growths else None
        c_consistency = 1.0 if cv is None else clip(1.0 - min(cv, 1.0) * 0.3, 0.7, 1.0)
        confidence = clip(c_volume * c_recency * c_consistency, 0.0, 1.0)

        drivers = {
            "months": n,
            "first_month": months[0],
            "last_month": months[-1],
            "first_revenue": round(series[0], 2),
            "last_revenue": round(series[-1], 2),
            "ewma_mom_growth": round(momentum, 4),
            "log_trend_slope": round(float(trend), 4),
            "last_mom_growth": round(last_growth, 4),
            "recent_shock": shock,
            "momentum_score": round(momentum_score, 1),
            "trend_score": round(trend_score, 1),
            "confidence_parts": {
                "volume": round(c_volume, 3),
                "recency": round(c_recency, 3),
                "consistency": round(c_consistency, 3),
            },
        }
        return SignalOutput(
            present=True,
            subscore=round(subscore, 2),
            confidence=round(confidence, 4),
            drivers=drivers,
            notes=notes,
        )
