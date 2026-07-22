"""Tests for the groundedness guard and the template explanation."""
from __future__ import annotations

from app.explain import check_groundedness, template_explanation


def test_template_is_always_grounded(reports):
    for r in reports.values():
        detail = check_groundedness(r.explanation, r)
        assert detail.grounded, f"{r.business_id}: {detail.reason}"


def test_guard_catches_invented_number(reports):
    r = reports["BIZ-001"]
    # A fabricated figure the model might hallucinate.
    bad = "This business grew revenue by 250% and has a 99 health score."
    detail = check_groundedness(bad, r)
    assert detail.grounded is False
    assert any(abs(x - 250) < 1 or abs(x - 99) < 1 for x in detail.unsupported_numbers)


def test_guard_accepts_real_composite(reports):
    r = reports["BIZ-004"]
    good = f"The business scores {r.composite_score:.0f} out of 100."
    detail = check_groundedness(good, r)
    assert detail.grounded is True


def test_guard_whitelists_structural_constants(reports):
    r = reports["BIZ-001"]
    text = "Scored 0-100; support resolved within 48h across up to 5 stars."
    detail = check_groundedness(text, r)
    assert detail.grounded is True


def test_explanation_mentions_shock_for_biz006(reports):
    r = reports["BIZ-006"]
    assert "recent" in r.explanation.lower() or "month" in r.explanation.lower()


def test_template_reports_missing_signals(reports):
    # BIZ-005 has three missing categories; the template must say data is missing.
    text = template_explanation(reports["BIZ-005"]).lower()
    assert "no data" in text or "missing" in text or "excluded" in text
