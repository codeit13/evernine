"""
Groundedness guard for the LLM explanation.

An LLM explanation is only trustworthy if it is faithful to the computed
numbers. This module verifies that automatically: it extracts every number the
model wrote and checks each one is actually present in (or trivially derivable
from) the numbers we computed, within a small tolerance. If the model invents a
figure, the guard fails and the explainer retries or falls back to a
deterministic template.

It is a *faithfulness* check (is the text supported by the provided facts?), not
a truth check. It is intentionally conservative: a handful of structural
constants (0-5, 48, 100) are whitelisted so ordinary phrasing like "resolved
within 48h" or "score out of 100" doesn't trip it.
"""
from __future__ import annotations

import re
from typing import Iterable, List, Set

from app.config import SETTINGS
from app.models import GroundednessDetail, ScoreReport

# Structural constants that are part of normal phrasing, not claims about data.
_WHITELIST: Set[float] = {0, 1, 2, 3, 4, 5, 48, 100}

# A leading '-' counts as a minus sign only at a word boundary, so a range like
# "0-100" is read as two numbers (0, 100), not (0, -100).
_NUMBER_RE = re.compile(r"(?<![\d.])-?\$?\d[\d,]*(?:\.\d+)?%?x?")


def _parse_numbers(text: str) -> List[float]:
    out: List[float] = []
    for m in _NUMBER_RE.findall(text or ""):
        token = m.replace("$", "").replace(",", "").rstrip("%x")
        try:
            out.append(float(token))
        except ValueError:
            continue
    return out


def _add(values: Set[float], x) -> None:
    """Add a number and its common representations (fraction/percent) to the set."""
    if x is None:
        return
    try:
        v = float(x)
    except (TypeError, ValueError):
        return
    values.add(round(v, 4))
    values.add(round(abs(v), 4))
    # If it looks like a fraction, also allow the percentage form and vice versa.
    if -1.0 <= v <= 1.0:
        values.add(round(v * 100, 4))
        values.add(round(abs(v) * 100, 4))


def _collect_from_drivers(values: Set[float], drivers: dict) -> None:
    for v in drivers.values():
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            _add(values, v)
        elif isinstance(v, dict):
            _collect_from_drivers(values, v)


def allowed_numbers(report: ScoreReport) -> Set[float]:
    values: Set[float] = set(_WHITELIST)
    _add(values, report.composite_score)
    _add(values, report.overall_confidence)   # also adds *100 percentage form
    _add(values, report.coverage)
    for r in report.signals.values():
        _add(values, r.subscore)
        _add(values, r.shrunk_subscore)
        _add(values, r.confidence)
        _add(values, r.base_weight)
        _add(values, r.effective_weight)
        _add(values, r.prior)
        _collect_from_drivers(values, r.drivers or {})
    return values


def _supported(x: float, allowed: Iterable[float], abs_tol: float) -> bool:
    for a in allowed:
        if abs(x - a) <= max(abs_tol, 0.02 * abs(a)):
            return True
    return False


def check_groundedness(text: str, report: ScoreReport) -> GroundednessDetail:
    allowed = allowed_numbers(report)
    abs_tol = SETTINGS.explanation.groundedness_abs_tol
    numbers = _parse_numbers(text)
    unsupported = [round(x, 4) for x in numbers if not _supported(x, allowed, abs_tol)]
    grounded = len(unsupported) == 0
    reason = (
        "all quoted numbers matched computed values"
        if grounded
        else f"unsupported numbers: {unsupported}"
    )
    return GroundednessDetail(
        grounded=grounded,
        checked_numbers=len(numbers),
        unsupported_numbers=unsupported,
        reason=reason,
    )
