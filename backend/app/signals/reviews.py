"""
Reviews signal -- explicit star ratings + model-derived text sentiment.

Design rationale:
  * Stars are the primary explicit signal but are noisy at low volume, so the
    review count feeds the confidence (few reviews -> the aggregator shrinks the
    sub-score toward the empirical review prior, exactly the IMDb effect).
  * Text sentiment (local transformer, lexicon fallback) corroborates the stars
    and catches divergence -- e.g. lukewarm prose behind a generous star, or a
    scathing review of an operational failure. Disagreement between stars and
    text lowers confidence.
  * Aspect extraction turns the prose into grounded facts (delivery / quality /
    support / website-ops / price) that the explanation can cite -- surfacing
    operational red flags a star average hides.

The raw sub-score is the plain blended estimate; the credibility shrinkage
toward the prior happens once, in the aggregator.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

import numpy as np

from app.config import SETTINGS
from app.models import BusinessInput
from app.nlp import extract_aspects, sentiment, sentiment_backend, top_negative_theme
from app.signals.base import ScoringContext, SignalOutput, SignalScorer
from app.stats import clip, credibility


def _stars_to_score(mean_rating: float) -> float:
    """Map a 1..5 star mean to 0..100 (1->0, 5->100)."""
    return clip((mean_rating - 1.0) / 4.0 * 100.0, 0.0, 100.0)


class ReviewsSignal(SignalScorer):
    name = "reviews"

    def is_present(self, biz: BusinessInput) -> bool:
        return bool(biz.customer_reviews)  # None or [] -> absent

    def prior(self, ctx: ScoringContext) -> float:
        if ctx.review_prior_score is not None:
            return ctx.review_prior_score
        return SETTINGS.reviews.default_prior_score

    def compute(self, biz: BusinessInput, ctx: ScoringContext) -> SignalOutput:
        cfg = SETTINGS.reviews
        reviews = biz.customer_reviews or []
        n = len(reviews)
        notes: List[str] = []

        ratings: List[int] = [r.rating for r in reviews if r.rating is not None]
        texts: List[str] = [r.text or "" for r in reviews]

        # --- star component ---------------------------------------------- #
        mean_rating: Optional[float] = float(np.mean(ratings)) if ratings else None
        star_score = _stars_to_score(mean_rating) if mean_rating is not None else None

        # --- text-sentiment component ------------------------------------ #
        probs = sentiment(texts) if texts else []
        text_score = float(np.mean(probs)) * 100.0 if probs else None
        backend = sentiment_backend()

        # --- blend -------------------------------------------------------- #
        if star_score is not None and text_score is not None:
            subscore = cfg.star_weight * star_score + cfg.text_weight * text_score
        elif star_score is not None:
            subscore = star_score
        elif text_score is not None:
            subscore = text_score
        else:
            # reviews exist but carry neither ratings nor text -> treat absent
            return SignalOutput(present=False, notes=["reviews present but empty"])

        # --- confidence: volume x star/text agreement -------------------- #
        c_volume = credibility(n, cfg.credibility_k_reviews)
        c_agreement = 1.0
        if star_score is not None and text_score is not None:
            disagreement = abs(star_score - text_score) / 100.0
            c_agreement = clip(1.0 - 0.5 * disagreement, 0.6, 1.0)
            if disagreement > 0.4:
                notes.append(
                    "stars and text sentiment diverge -> lower confidence"
                )
        confidence = clip(c_volume * c_agreement, 0.0, 1.0)

        # --- aspects (grounded operational facts) ------------------------ #
        pairs: List[Tuple[Optional[int], str]] = [(r.rating, r.text or "") for r in reviews]
        aspects = extract_aspects(pairs)
        worst_theme = top_negative_theme(aspects)
        if worst_theme:
            notes.append(f"most-cited complaint theme: {worst_theme}")

        drivers = {
            "n_reviews": n,
            "mean_rating": round(mean_rating, 3) if mean_rating is not None else None,
            "star_score": round(star_score, 1) if star_score is not None else None,
            "text_sentiment_score": round(text_score, 1) if text_score is not None else None,
            "sentiment_backend": backend,
            "aspects": aspects,
            "top_negative_theme": worst_theme,
            "confidence_parts": {
                "volume": round(c_volume, 3),
                "agreement": round(c_agreement, 3),
            },
        }
        return SignalOutput(
            present=True,
            subscore=round(subscore, 2),
            confidence=round(confidence, 4),
            drivers=drivers,
            notes=notes,
        )
