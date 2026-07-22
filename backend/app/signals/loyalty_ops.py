"""
Loyalty & Ops signal -- repeat purchase rate + support-ticket quality.

Combines two retention/service sub-components:
  * repeat rate  -> sigmoid centred so 0.25 (a typical D2C repeat rate) == 50.
  * support      -> Wilson lower bound of the 48h-resolution rate, minus an
                    escalation penalty. Wilson keeps small ticket volumes from
                    being over-trusted (5/6 resolved != 500/600 resolved).

The ambiguous-zero case (BIZ-003: real revenue but total == 0 tickets) is
handled explicitly: 0/0 resolution is *undefined*, so support is treated as
NO DATA (absent sub-component with a confidence discount), NOT as a perfect
100. Rewarding "no tickets" as flawless service would be the wrong call -- with
real sales it almost certainly means the channel isn't instrumented.

If only one sub-component is present, the sub-score uses it and confidence is
discounted (partial_coverage_factor). If neither is present, the whole signal
is absent.
"""
from __future__ import annotations

from typing import List, Optional

from app.config import SETTINGS
from app.models import BusinessInput
from app.signals.base import ScoringContext, SignalOutput, SignalScorer
from app.stats import clip, credibility, score_from_signed, wilson_lower_bound


class LoyaltyOpsSignal(SignalScorer):
    name = "loyalty_ops"

    def _has_support(self, biz: BusinessInput) -> bool:
        t = biz.customer_support_tickets
        return t is not None and t.total > 0  # total==0 -> undefined -> no data

    def _has_repeat(self, biz: BusinessInput) -> bool:
        return biz.repeat_purchase_rate is not None

    def is_present(self, biz: BusinessInput) -> bool:
        return self._has_repeat(biz) or self._has_support(biz)

    def compute(self, biz: BusinessInput, ctx: ScoringContext) -> SignalOutput:
        cfg = SETTINGS.loyalty_ops
        notes: List[str] = []

        # --- repeat component --------------------------------------------- #
        repeat_score: Optional[float] = None
        repeat_rate = biz.repeat_purchase_rate
        if self._has_repeat(biz):
            repeat_score = score_from_signed(
                repeat_rate - cfg.repeat_center, cfg.repeat_scale
            )

        # --- support component -------------------------------------------- #
        support_score: Optional[float] = None
        resolution_lb: Optional[float] = None
        escalation_rate: Optional[float] = None
        n_tickets = 0
        t = biz.customer_support_tickets
        if self._has_support(biz):
            n_tickets = t.total
            resolution_lb = wilson_lower_bound(t.resolved_within_48h, t.total)
            escalation_rate = clip(t.escalated / t.total, 0.0, 1.0)
            if resolution_lb is not None:
                support_score = 100.0 * clip(
                    resolution_lb - cfg.escalation_penalty * escalation_rate, 0.0, 1.0
                )
        elif t is not None and t.total == 0:
            notes.append(
                "support tickets total == 0 with active revenue -> treated as "
                "no data (not a perfect score)"
            )

        # --- combine ------------------------------------------------------ #
        present_parts = [s for s in (repeat_score, support_score) if s is not None]
        if not present_parts:
            return SignalOutput(present=False, notes=notes or ["no loyalty/ops data"])

        if repeat_score is not None and support_score is not None:
            subscore = (
                cfg.repeat_weight * repeat_score + cfg.support_weight * support_score
            )
            coverage_factor = 1.0
        else:
            subscore = present_parts[0]
            coverage_factor = cfg.partial_coverage_factor
            notes.append("only one of {repeat rate, support} present")

        # --- confidence --------------------------------------------------- #
        # Ticket volume drives support confidence; a present repeat rate adds a
        # floor of evidence. Combined, then discounted for partial coverage.
        c_tickets = credibility(n_tickets, cfg.credibility_k_tickets)
        c_repeat = 0.6 if self._has_repeat(biz) else 0.0
        base_conf = max(c_tickets, c_repeat) if present_parts else 0.0
        confidence = clip(base_conf * coverage_factor, 0.0, 1.0)

        drivers = {
            "repeat_purchase_rate": repeat_rate,
            "repeat_score": round(repeat_score, 1) if repeat_score is not None else None,
            "support_tickets_total": n_tickets,
            "resolution_rate": round(t.resolved_within_48h / t.total, 3)
            if self._has_support(biz) else None,
            "resolution_wilson_lb": round(resolution_lb, 3) if resolution_lb is not None else None,
            "escalation_rate": round(escalation_rate, 3) if escalation_rate is not None else None,
            "support_score": round(support_score, 1) if support_score is not None else None,
        }
        return SignalOutput(
            present=True,
            subscore=round(subscore, 2),
            confidence=round(confidence, 4),
            drivers=drivers,
            notes=notes,
        )
