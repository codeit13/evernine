"""
The aggregator -- turns per-signal (sub-score, confidence) pairs into a single
composite health score, and is where the confidence-aware weighting lives.

Three layers, each separately defensible (this separation is deliberate -- it
avoids double-counting confidence and keeps each step easy to explain):

  Layer 1  Within-signal credibility shrinkage
           q*_s = c_s * q_s + (1 - c_s) * prior_s
           Thin/noisy signals are pulled toward their prior instead of trusted
           at face value. (Buhlmann credibility / IMDb Bayesian average.)

  Layer 2  Cross-signal aggregation with base importance weights, renormalised
           over the signals actually PRESENT:
           composite = sum_present(w_s * q*_s) / sum_present(w_s)
           A missing signal drops out of the average -- it is never treated as a
           zero score, which is the anti-pattern we explicitly avoid.

  Layer 3  Overall confidence, reported separately from the score:
           overall_confidence = sum_present(w_s * c_s) / sum_all(w_s)
           Missing signals keep their weight in the denominator only, so both
           missing categories and thin present ones drag confidence down. This
           cleanly separates "how healthy (given what we know)" from "how much
           we actually know".
"""
from __future__ import annotations

from typing import Dict, List

from app.config import SETTINGS
from app.models import BusinessInput, ScoreReport, SignalResult
from app.signals import ScoringContext, SignalScorer, default_signals
from app.stats import clip, shrink


def _confidence_band(overall_confidence: float) -> str:
    c = SETTINGS.confidence
    if overall_confidence >= c.high:
        return "high"
    if overall_confidence >= c.medium:
        return "medium"
    return "low"


def score_business(
    biz: BusinessInput,
    ctx: ScoringContext,
    signals: List[SignalScorer] = None,
    weights: Dict[str, float] = None,
) -> ScoreReport:
    signals = signals if signals is not None else default_signals()
    weights = weights if weights is not None else SETTINGS.base_weights

    results: Dict[str, SignalResult] = {}
    flags: List[str] = []

    total_weight = sum(weights.get(s.name, 0.0) for s in signals)
    present_weight = 0.0
    weighted_shrunk = 0.0        # sum_present(w * q*)
    weighted_conf = 0.0          # sum_present(w * c)

    for s in signals:
        w = weights.get(s.name, 0.0)
        prior = s.prior(ctx)
        present = s.is_present(biz)

        if not present:
            results[s.name] = SignalResult(
                name=s.name, present=False, base_weight=w, prior=prior,
                notes=[f"{s.name}: no data"],
            )
            continue

        out = s.compute(biz, ctx)
        if not out.present:  # signal decided it isn't usable after inspection
            results[s.name] = SignalResult(
                name=s.name, present=False, base_weight=w, prior=prior,
                notes=out.notes,
            )
            continue

        # Layer 1: credibility shrinkage toward the signal's prior.
        q_star = shrink(out.subscore, out.confidence, prior)

        present_weight += w
        weighted_shrunk += w * q_star
        weighted_conf += w * out.confidence

        results[s.name] = SignalResult(
            name=s.name,
            present=True,
            subscore=out.subscore,
            confidence=out.confidence,
            shrunk_subscore=round(q_star, 2),
            base_weight=w,
            prior=round(prior, 2),
            drivers=out.drivers,
            notes=out.notes,
        )
        for note in out.notes:
            if "recent revenue shock" in note:
                flags.append("recent_revenue_shock")

    # Layer 2: composite over present signals (renormalised, missing excluded).
    if present_weight > 0:
        composite = weighted_shrunk / present_weight
    else:
        composite = 50.0  # no usable signal at all -> neutral prior
        flags.append("no_signals_present")

    # Layer 3: overall confidence and coverage.
    overall_confidence = weighted_conf / total_weight if total_weight > 0 else 0.0
    coverage = present_weight / total_weight if total_weight > 0 else 0.0

    # Fill each present signal's realised contribution share for transparency.
    for name, r in results.items():
        if r.present and present_weight > 0:
            r.effective_weight = round(r.base_weight / present_weight, 4)

    # Portfolio-level explanatory flags.
    n_present = sum(1 for r in results.values() if r.present)
    if coverage < 0.5:
        flags.append("mostly_single_signal")
    if overall_confidence < SETTINGS.confidence.medium:
        flags.append("low_confidence")
    if n_present <= 1:
        flags.append("single_signal_only")

    band = _confidence_band(overall_confidence)

    return ScoreReport(
        business_id=biz.business_id,
        business_name=biz.business_name,
        category=biz.category,
        composite_score=round(clip(composite, 0.0, 100.0), 2),
        overall_confidence=round(clip(overall_confidence, 0.0, 1.0), 4),
        confidence_band=band,
        coverage=round(coverage, 4),
        signals=results,
        flags=sorted(set(flags)),
    )
