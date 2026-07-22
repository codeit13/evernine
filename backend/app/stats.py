"""
Pure, dependency-light statistical primitives used across all signals.

These functions are the mathematical backbone of the "confidence-aware
weighting" mechanism. They are deliberately small, pure, and unit-tested so the
scoring logic is transparent and defensible:

  * credibility(n, k)          -- Buhlmann-style credibility weight n/(n+k)
  * shrink(observed, conf, mu) -- q* = c*observed + (1-c)*prior  (the one, single
                                  shrinkage operation applied per signal)
  * bayesian_mean(...)         -- small-sample-robust mean (the IMDb formula)
  * wilson_lower_bound(...)    -- conservative estimate of a proportion given n
  * ewma / ewma_growth         -- recency-weighted momentum
  * log_trend_slope(...)       -- long-run trajectory
  * score_from_signed(...)     -- map a signed magnitude to a 0..100 sub-score

References (see README):
  - Buhlmann credibility: estimate = Z*observed + (1-Z)*collective
  - Bayesian average (IMDb Top-250): WR = v/(v+m)*R + m/(v+m)*C
  - Wilson (1927) score interval lower bound (Evan Miller, "How not to sort by
    average rating")
"""
from __future__ import annotations

import math
from typing import List, Optional, Sequence

import numpy as np


def clip(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def sigmoid(x: float) -> float:
    # Numerically stable logistic.
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def score_from_signed(x: float, scale: float) -> float:
    """Map a signed magnitude (e.g. a growth rate) to a 0..100 sub-score.

    x == 0     -> 50   (neutral)
    x == scale -> ~73  (one 'unit' of good)
    x == -scale-> ~27
    """
    return 100.0 * sigmoid(x / scale)


def credibility(n: float, k: float) -> float:
    """Buhlmann/IMDb credibility weight in [0, 1).

    n == 0 -> 0 (no evidence), n == k -> 0.5, n -> inf -> 1.
    """
    if n <= 0:
        return 0.0
    return float(n) / (float(n) + float(k))


def shrink(observed: float, confidence: float, prior: float) -> float:
    """The single credibility-shrinkage step: q* = c*observed + (1-c)*prior.

    Low confidence pulls the estimate toward the prior instead of trusting a
    noisy observation at face value. This is the same operation as a Buhlmann
    credibility estimate and the IMDb Bayesian average.
    """
    c = clip(confidence, 0.0, 1.0)
    return c * observed + (1.0 - c) * prior


def bayesian_mean(mean: float, n: int, prior: float, k: float) -> float:
    """Small-sample-robust mean: (n*mean + k*prior) / (n + k).

    Identical in form to shrink() with confidence = n/(n+k); provided separately
    because it reads more naturally for rating/proportion means.
    """
    if n <= 0:
        return prior
    return (n * mean + k * prior) / (n + k)


def wilson_lower_bound(successes: float, n: float, z: float = 1.96) -> Optional[float]:
    """Lower bound of the Wilson score interval for a binomial proportion.

    Returns a *conservative* estimate of the true success rate that is pulled
    downward when n is small, so e.g. 5/6 resolved tickets is not treated with
    the same trust as 500/600. Returns None when n == 0 (proportion undefined).
    """
    if n <= 0:
        return None
    p = clip(successes / n, 0.0, 1.0)
    denom = 1.0 + z * z / n
    centre = p + z * z / (2.0 * n)
    margin = z * math.sqrt((p * (1.0 - p) + z * z / (4.0 * n)) / n)
    return clip((centre - margin) / denom, 0.0, 1.0)


def _recency_weights(n: int, halflife: float) -> np.ndarray:
    """Weights that decay exponentially into the past; newest point weight 1.0."""
    if n <= 0:
        return np.array([])
    ages = np.arange(n - 1, -1, -1, dtype=float)  # oldest..newest -> age n-1..0
    decay = 0.5 ** (1.0 / max(halflife, 1e-9))
    return decay ** ages


def ewma(values: Sequence[float], halflife: float) -> Optional[float]:
    """Recency-weighted mean of an ordered (oldest->newest) series."""
    vals = np.asarray(list(values), dtype=float)
    if vals.size == 0:
        return None
    w = _recency_weights(vals.size, halflife)
    return float(np.sum(w * vals) / np.sum(w))


def mom_growth(series: Sequence[float]) -> List[float]:
    """Month-over-month fractional growth rates for an ordered series."""
    vals = list(series)
    out: List[float] = []
    for prev, cur in zip(vals[:-1], vals[1:]):
        if prev and prev != 0:
            out.append((cur - prev) / prev)
    return out


def ewma_growth(series: Sequence[float], halflife: float) -> Optional[float]:
    """Recency-weighted average month-over-month growth."""
    g = mom_growth(series)
    if not g:
        return None
    return ewma(g, halflife)


def log_trend_slope(series: Sequence[float]) -> Optional[float]:
    """Per-step slope of log(value) -- the long-run compounding trajectory.

    Robust to level (a $500k and a $50k business with the same growth get the
    same slope). Requires >= 2 strictly-positive points.
    """
    vals = np.asarray([v for v in series], dtype=float)
    if vals.size < 2 or np.any(vals <= 0):
        return None
    x = np.arange(vals.size, dtype=float)
    slope = np.polyfit(x, np.log(vals), 1)[0]
    return float(slope)


def zscore_of_last(values: Sequence[float]) -> Optional[float]:
    """z-score of the final value vs the distribution of the earlier values."""
    vals = np.asarray(list(values), dtype=float)
    if vals.size < 3:
        return None
    hist = vals[:-1]
    mu = float(np.mean(hist))
    sd = float(np.std(hist))
    if sd == 0:
        return None
    return (float(vals[-1]) - mu) / sd


def coefficient_of_variation(values: Sequence[float]) -> Optional[float]:
    vals = np.asarray(list(values), dtype=float)
    if vals.size < 2:
        return None
    mu = float(np.mean(vals))
    if mu == 0:
        return None
    return float(np.std(vals) / abs(mu))
