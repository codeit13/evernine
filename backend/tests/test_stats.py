from __future__ import annotations

import math

from app.stats import (
    bayesian_mean,
    credibility,
    ewma,
    ewma_growth,
    log_trend_slope,
    score_from_signed,
    shrink,
    wilson_lower_bound,
    zscore_of_last,
)


def test_credibility_monotonic_and_bounds():
    assert credibility(0, 5) == 0.0
    assert credibility(5, 5) == 0.5
    assert 0 < credibility(2, 5) < credibility(20, 5) < 1


def test_shrink_pulls_toward_prior_when_low_confidence():
    # Low confidence -> close to prior; high confidence -> close to observed.
    assert shrink(90, 0.1, 50) < shrink(90, 0.9, 50)
    assert abs(shrink(90, 0.0, 50) - 50) < 1e-9
    assert abs(shrink(90, 1.0, 50) - 90) < 1e-9


def test_bayesian_mean_matches_imdb_form():
    # (n*mean + k*prior)/(n+k)
    assert abs(bayesian_mean(5.0, 2, 3.0, 5) - ((2 * 5 + 5 * 3) / 7)) < 1e-9
    assert bayesian_mean(5.0, 0, 3.0, 5) == 3.0  # no data -> prior


def test_score_from_signed_centered_at_fifty():
    assert abs(score_from_signed(0.0, 0.025) - 50.0) < 1e-9
    assert score_from_signed(0.05, 0.025) > 70
    assert score_from_signed(-0.05, 0.025) < 30


def test_wilson_lower_bound_conservative_for_small_n():
    # Same ratio, fewer observations -> lower (more conservative) bound.
    small = wilson_lower_bound(5, 6)
    large = wilson_lower_bound(500, 600)
    assert small is not None and large is not None
    assert small < large
    assert wilson_lower_bound(0, 0) is None  # undefined


def test_ewma_weights_recent_more():
    # Newer high values pull the EWMA above the simple mean.
    vals = [0, 0, 0, 10]
    assert ewma(vals, halflife=1) > sum(vals) / len(vals)


def test_ewma_growth_captures_recent_crash():
    rising = [100, 102, 104, 106]
    crash = [100, 102, 104, 60]
    assert ewma_growth(rising, 3) > 0
    assert ewma_growth(crash, 3) < 0


def test_log_trend_slope_sign():
    assert log_trend_slope([100, 110, 121, 133]) > 0
    assert log_trend_slope([100, 90, 81]) < 0
    assert log_trend_slope([100]) is None  # need >= 2 points


def test_zscore_of_last_flags_outlier_drop():
    z = zscore_of_last([100, 101, 99, 100, 40])
    assert z is not None and z < -2
