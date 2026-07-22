"""
Edge-case tests -- the six sample businesses are fixtures for the exact
data-shape scenarios the scoring must handle. Each test asserts the *behaviour*
the confidence-aware mechanism should produce, not a brittle exact number.
"""
from __future__ import annotations


def test_all_scores_in_range(reports):
    for r in reports.values():
        assert 0.0 <= r.composite_score <= 100.0
        assert 0.0 <= r.overall_confidence <= 1.0
        assert 0.0 <= r.coverage <= 1.0


# --- BIZ-001: rich, healthy, growing -> decent score, HIGH confidence ------ #
def test_biz001_rich_and_confident(reports):
    r = reports["BIZ-001"]
    assert r.coverage == 1.0
    assert r.confidence_band == "high"
    assert all(s.present for s in r.signals.values())


# --- BIZ-002: only 2 months -> LOW confidence regardless of the score ------ #
def test_biz002_thin_history_low_confidence(reports):
    r = reports["BIZ-002"]
    assert r.confidence_band == "low"
    assert "low_confidence" in r.flags
    # revenue is present but heavily credibility-discounted (2 months).
    assert r.signals["revenue"].confidence < 0.4


# --- BIZ-003: empty reviews + zero support tickets ------------------------- #
def test_biz003_empty_reviews_excluded(reports):
    r = reports["BIZ-003"]
    assert r.signals["reviews"].present is False        # [] -> excluded, not 0
    assert r.coverage < 1.0                              # missing weight dropped


def test_biz003_zero_tickets_not_perfect_support(reports):
    r = reports["BIZ-003"]
    loyalty = r.signals["loyalty_ops"]
    # total==0 must NOT yield a perfect support score; it's treated as no data,
    # so loyalty rests on the (mediocre 0.21) repeat rate only.
    assert loyalty.present is True
    assert loyalty.drivers.get("support_score") is None
    assert loyalty.subscore < 60


# --- BIZ-004: rich data but genuinely unhealthy -> LOW score, HIGH conf ---- #
def test_biz004_unhealthy_but_confident(reports):
    r = reports["BIZ-004"]
    assert r.composite_score < 40           # genuinely weak
    assert r.confidence_band == "high"      # and we're sure about it
    assert r.signals["revenue"].subscore < 40
    assert r.signals["loyalty_ops"].subscore < 40


def test_biz004_lower_than_biz001(reports):
    # A declining business must score below a growing one despite similar richness.
    assert reports["BIZ-004"].composite_score < reports["BIZ-001"].composite_score


# --- BIZ-005: three missing categories -> rests on ~1 signal, low conf ----- #
def test_biz005_extreme_missing(reports):
    r = reports["BIZ-005"]
    assert r.signals["reviews"].present is False
    assert r.signals["loyalty_ops"].present is False
    assert r.coverage <= 0.5
    assert r.confidence_band == "low"


# --- BIZ-006: long good history, one recent crash -------------------------- #
def test_biz006_recent_shock_flagged(reports):
    r = reports["BIZ-006"]
    assert "recent_revenue_shock" in r.flags
    rev = r.signals["revenue"]
    assert rev.drivers["recent_shock"] is True
    assert rev.drivers["last_mom_growth"] < -0.15


def test_biz006_shock_reflected_but_not_annihilated(reports):
    # The crash pulls revenue down (below neutral) but the long history keeps it
    # from collapsing to ~0, and high confidence is retained (14 months).
    rev = reports["BIZ-006"].signals["revenue"]
    assert 20 < rev.subscore < 50
    assert rev.confidence > 0.5


def test_biz006_confidence_higher_than_thin_biz002(reports):
    assert reports["BIZ-006"].overall_confidence > reports["BIZ-002"].overall_confidence


# --- Missing signals never crash and never count as zero ------------------- #
def test_missing_signal_excluded_not_zeroed(reports):
    # BIZ-005 rests on revenue+ad; if missing signals were scored 0, the
    # composite would be far below its revenue/ad sub-scores. Assert it is a
    # weighted average of the PRESENT signals instead.
    r = reports["BIZ-005"]
    present_scores = [s.shrunk_subscore for s in r.signals.values() if s.present]
    assert min(present_scores) - 1 <= r.composite_score <= max(present_scores) + 1
