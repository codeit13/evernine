"""
Central configuration for the business-health scoring service.

Every "magic number" in the scoring pipeline lives here with a short rationale,
so the weighting logic is auditable and tunable in one place. Nothing in the
scoring path hard-codes a constant that isn't sourced from this module.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional

# Repo/back-end root (…/backend), so the default data path resolves regardless
# of the process working directory.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_DATA_PATH = str(_BACKEND_ROOT / "data" / "portfolio.json")


# ---------------------------------------------------------------------------
# Cross-signal base importance weights (Layer 2 of the aggregator).
#
# These express *how much a signal matters when it is fully trusted*. They are
# a business judgement, not a statistical fact, so they are deliberately explicit
# and documented:
#   - revenue is the strongest single indicator of health -> highest weight.
#   - loyalty/ops (repeat rate + support) reflects retention & service quality.
#   - reviews are informative but noisy and easily gamed -> moderate weight.
#   - ad efficiency is partly *derived from* revenue, so it gets the lowest
#     weight to avoid double-counting the revenue trend.
#
# Weights are renormalised over the signals actually PRESENT for a business, so
# a missing signal is never silently treated as a zero score -- it simply drops
# out of the average and lowers the reported overall confidence.
# ---------------------------------------------------------------------------
BASE_WEIGHTS: Dict[str, float] = {
    "revenue": 0.35,
    "loyalty_ops": 0.30,
    "reviews": 0.20,
    "ad_efficiency": 0.15,
}

# Neutral prior each sub-score is shrunk toward when confidence is low
# (Layer 1 credibility shrinkage: q* = c*q + (1-c)*prior).
# The revenue / loyalty / ad sub-scores are constructed so that 50 == "neutral /
# average business", which makes 50 the natural no-information prior.
# `reviews` is special: its prior is the *empirical* global mean review score
# computed from the dataset at load time (empirical Bayes -- see ScoringContext),
# because we genuinely know the population of reviews skews above the midpoint.
PRIORS: Dict[str, float] = {
    "revenue": 50.0,
    "loyalty_ops": 50.0,
    "reviews": 50.0,  # overridden by the empirical-Bayes prior when available
    "ad_efficiency": 50.0,
}


@dataclass(frozen=True)
class RevenueConfig:
    # "half-credibility" point: this many months of history == 50% confidence.
    # 4 months is thin, 8+ is decent, 12+ is strong.
    credibility_k_months: float = 4.0
    # EWMA half-life (in months) for the recency-weighted momentum component.
    ewma_halflife: float = 3.0
    # Blend of recent momentum vs long-run trend in the sub-score.
    # 0.6 leans recent (so a fresh crash registers) but keeps 40% long-history
    # anchoring (so one bad month doesn't annihilate a strong record).
    momentum_weight: float = 0.6
    # Scale for mapping a per-month growth rate through the sigmoid.
    # 0.025 => +2.5%/mo ~ score 73, -2.5%/mo ~ score 27.
    growth_scale: float = 0.025
    # A single month whose MoM growth is below this AND is a statistical outlier
    # vs the business's own history is flagged as a "recent shock".
    shock_mom_threshold: float = -0.15
    shock_zscore: float = 2.0


@dataclass(frozen=True)
class ReviewsConfig:
    # This many reviews == 50% confidence in the review signal.
    credibility_k_reviews: float = 5.0
    # Blend of explicit star rating vs model-derived text sentiment.
    # Stars are the primary explicit signal; text sentiment corroborates and
    # catches cases where the prose is far harsher/kinder than the stars.
    star_weight: float = 0.55
    text_weight: float = 0.45
    # Fallback prior score if the dataset yields no reviews at all to estimate
    # an empirical prior from (score units, 0-100).
    default_prior_score: float = 62.5  # == 3.5 stars on a 1..5 -> 0..100 map


@dataclass(frozen=True)
class LoyaltyOpsConfig:
    # Ticket volume half-credibility point.
    credibility_k_tickets: float = 30.0
    # Repeat-rate sigmoid: centre (0.25 repeat rate -> score 50) and scale.
    repeat_center: float = 0.25
    repeat_scale: float = 0.12
    # How much a high escalation rate is allowed to subtract from the
    # resolution-based support score (both are 0..1 proportions).
    escalation_penalty: float = 0.5
    # Relative weights of the two sub-components when both are present.
    repeat_weight: float = 0.5
    support_weight: float = 0.5
    # Confidence discount applied when only ONE of {repeat, support} is present.
    partial_coverage_factor: float = 0.6


@dataclass(frozen=True)
class AdEfficiencyConfig:
    # Overlapping revenue&ad months half-credibility point.
    credibility_k_months: float = 4.0
    ewma_halflife: float = 3.0
    # Scale for mapping the MoM change in ROAS (revenue/ad) through the sigmoid.
    roas_growth_scale: float = 0.06


@dataclass(frozen=True)
class ConfidenceConfig:
    # Confidence-band cut points on the 0..1 overall-confidence scale.
    high: float = 0.6
    medium: float = 0.35
    # Below `medium` is treated as "low".


@dataclass(frozen=True)
class ExplanationConfig:
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: float = 0.0          # deterministic explanations
    max_tokens: int = 400
    timeout_seconds: float = 20.0
    max_retries: int = 2
    # Absolute tolerance (in score points) when checking that a number quoted in
    # the explanation matches a number we actually computed.
    groundedness_abs_tol: float = 1.5


@dataclass(frozen=True)
class Settings:
    base_weights: Dict[str, float] = field(default_factory=lambda: dict(BASE_WEIGHTS))
    priors: Dict[str, float] = field(default_factory=lambda: dict(PRIORS))
    revenue: RevenueConfig = field(default_factory=RevenueConfig)
    reviews: ReviewsConfig = field(default_factory=ReviewsConfig)
    loyalty_ops: LoyaltyOpsConfig = field(default_factory=LoyaltyOpsConfig)
    ad_efficiency: AdEfficiencyConfig = field(default_factory=AdEfficiencyConfig)
    confidence: ConfidenceConfig = field(default_factory=ConfidenceConfig)
    explanation: ExplanationConfig = field(default_factory=ExplanationConfig)
    # Path to the bundled sample dataset (overridable via DATA_PATH env).
    data_path: str = _DEFAULT_DATA_PATH


SETTINGS = Settings()
