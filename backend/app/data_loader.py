"""
Dataset loading and construction of the dataset-level ScoringContext.

The context carries two pieces of empirical, dataset-derived information so the
scoring of any one business stays a deterministic pure function:

  * reference_month     -- the latest YYYY-MM present anywhere in the dataset,
                           used for recency confidence (no wall-clock -> runs are
                           reproducible).
  * review_prior_score  -- the empirical-Bayes prior for the reviews signal: the
                           global mean review score across all businesses, mapped
                           to 0..100. Businesses with few reviews are shrunk
                           toward this population mean (the IMDb 'C' constant).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

import numpy as np

from app.config import SETTINGS
from app.models import BusinessInput, Dataset
from app.signals import ScoringContext


def load_dataset(path: Optional[str] = None) -> List[BusinessInput]:
    p = Path(path or SETTINGS.data_path)
    with p.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    return Dataset.model_validate(raw).businesses


def _empirical_review_prior_score(businesses: List[BusinessInput]) -> Optional[float]:
    ratings: List[float] = []
    for b in businesses:
        for r in (b.customer_reviews or []):
            if r.rating is not None:
                ratings.append(float(r.rating))
    if not ratings:
        return None
    mean_rating = float(np.mean(ratings))
    return float(np.clip((mean_rating - 1.0) / 4.0 * 100.0, 0.0, 100.0))


def _latest_month(businesses: List[BusinessInput]) -> Optional[str]:
    months: List[str] = []
    for b in businesses:
        months.extend(b.revenue_by_month.keys())
        months.extend(b.ad_spend_by_month.keys())
    return max(months) if months else None


def build_context(businesses: List[BusinessInput]) -> ScoringContext:
    return ScoringContext(
        reference_month=_latest_month(businesses),
        review_prior_score=_empirical_review_prior_score(businesses),
    )
