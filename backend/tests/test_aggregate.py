"""Property tests for the aggregator using synthetic businesses."""
from __future__ import annotations

from app.aggregate import score_business
from app.data_loader import build_context
from app.models import BusinessInput, Review, SupportTickets
from app.signals import ScoringContext


def _months(start_year, start_month, values):
    out = {}
    y, m = start_year, start_month
    for v in values:
        out[f"{y:04d}-{m:02d}"] = v
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


CTX = ScoringContext(reference_month="2026-06", review_prior_score=60.0)


def test_more_history_increases_confidence():
    short = BusinessInput(
        business_id="S", business_name="S",
        revenue_by_month=_months(2026, 5, [100, 102]),
    )
    long = BusinessInput(
        business_id="L", business_name="L",
        revenue_by_month=_months(2025, 1, [100 + i for i in range(18)]),
    )
    cs = score_business(short, CTX).signals["revenue"].confidence
    cl = score_business(long, CTX).signals["revenue"].confidence
    assert cl > cs


def test_missing_signal_lowers_overall_confidence():
    full = BusinessInput(
        business_id="F", business_name="F",
        revenue_by_month=_months(2025, 1, [100 + i for i in range(12)]),
        customer_reviews=[Review(rating=5, text="great") for _ in range(8)],
        repeat_purchase_rate=0.4,
        customer_support_tickets=SupportTickets(total=100, resolved_within_48h=90, escalated=3),
        ad_spend_by_month=_months(2025, 1, [10 + i * 0.1 for i in range(12)]),
    )
    sparse = BusinessInput(
        business_id="P", business_name="P",
        revenue_by_month=_months(2025, 1, [100 + i for i in range(12)]),
        ad_spend_by_month=_months(2025, 1, [10 + i * 0.1 for i in range(12)]),
    )
    rf = score_business(full, CTX)
    rp = score_business(sparse, CTX)
    assert rf.overall_confidence > rp.overall_confidence
    assert rf.coverage > rp.coverage


def test_composite_is_bounded_average_of_present_shrunk_scores():
    biz = BusinessInput(
        business_id="B", business_name="B",
        revenue_by_month=_months(2025, 1, [100 + i for i in range(12)]),
        repeat_purchase_rate=0.5,
        customer_support_tickets=SupportTickets(total=80, resolved_within_48h=70, escalated=2),
    )
    r = score_business(biz, CTX)
    present = [s.shrunk_subscore for s in r.signals.values() if s.present]
    assert min(present) - 1 <= r.composite_score <= max(present) + 1


def test_all_missing_defaults_to_neutral_with_zero_confidence():
    biz = BusinessInput(business_id="X", business_name="X")
    r = score_business(biz, CTX)
    assert r.overall_confidence == 0.0
    assert r.coverage == 0.0
    assert "no_signals_present" in r.flags


def test_declining_scores_below_growing():
    grow = BusinessInput(
        business_id="G", business_name="G",
        revenue_by_month=_months(2025, 1, [100 * (1.03 ** i) for i in range(12)]),
    )
    fall = BusinessInput(
        business_id="D", business_name="D",
        revenue_by_month=_months(2025, 1, [100 * (0.97 ** i) for i in range(12)]),
    )
    assert score_business(grow, CTX).composite_score > score_business(fall, CTX).composite_score
