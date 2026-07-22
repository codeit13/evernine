"""
Ad-efficiency signal -- marketing *efficiency*, not raw spend.

Raw ad spend is neither good nor bad on its own (high spend can mean growth
investment or panic). What matters is the return: revenue per ad dollar (a ROAS
proxy) and, more importantly, its *trend*.

  * Rising ROAS  -> efficient, healthy marketing.
  * Falling ROAS -> deteriorating efficiency (e.g. BIZ-004: ad spend climbing
    while revenue falls) -> a strong red flag.

Because this metric is derived from revenue, it carries the lowest base weight
(config) to avoid double-counting the revenue trend; it is framed as a distinct
"efficiency" lens rather than a second revenue vote.

Requires overlapping revenue & ad-spend months to compute ROAS.
"""
from __future__ import annotations

from typing import List, Tuple

from app.config import SETTINGS
from app.models import BusinessInput
from app.signals.base import ScoringContext, SignalOutput, SignalScorer
from app.stats import clip, credibility, ewma_growth, score_from_signed


def _roas_series(biz: BusinessInput) -> Tuple[List[str], List[float]]:
    months = sorted(set(biz.revenue_by_month) & set(biz.ad_spend_by_month))
    roas: List[float] = []
    kept: List[str] = []
    for m in months:
        ad = float(biz.ad_spend_by_month[m])
        if ad > 0:
            roas.append(float(biz.revenue_by_month[m]) / ad)
            kept.append(m)
    return kept, roas


class AdEfficiencySignal(SignalScorer):
    name = "ad_efficiency"

    def is_present(self, biz: BusinessInput) -> bool:
        months, roas = _roas_series(biz)
        return len(roas) >= 2

    def compute(self, biz: BusinessInput, ctx: ScoringContext) -> SignalOutput:
        cfg = SETTINGS.ad_efficiency
        months, roas = _roas_series(biz)
        n = len(roas)

        roas_growth = ewma_growth(roas, cfg.ewma_halflife) or 0.0
        subscore = score_from_signed(roas_growth, cfg.roas_growth_scale)

        confidence = clip(credibility(n, cfg.credibility_k_months), 0.0, 1.0)

        drivers = {
            "overlap_months": n,
            "first_roas": round(roas[0], 3),
            "last_roas": round(roas[-1], 3),
            "ewma_roas_growth": round(roas_growth, 4),
        }
        notes: List[str] = []
        if roas_growth < -0.02:
            notes.append("marketing efficiency (ROAS) is declining")
        return SignalOutput(
            present=True,
            subscore=round(subscore, 2),
            confidence=round(confidence, 4),
            drivers=drivers,
            notes=notes,
        )
