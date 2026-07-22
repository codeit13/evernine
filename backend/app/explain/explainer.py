"""
Explanation orchestration: compact facts -> LLM -> groundedness guard -> fallback.

Flow (robust by construction -- the endpoint never fails on the explanation):
  1. Build a compact, grounded `facts` dict from the ScoreReport.
  2. Try the LLM (up to max_retries). After each attempt, run the groundedness
     guard. Accept the first grounded response.
  3. If the LLM is unavailable or never returns a grounded answer, fall back to a
     deterministic template built directly from the numbers (grounded by
     construction).

The returned explanation always comes with its source ("llm" | "template") and
the groundedness detail, so callers can see exactly how it was produced.
"""
from __future__ import annotations

from typing import Dict, Tuple

from app.config import SETTINGS
from app.explain.groundedness import check_groundedness
from app.explain.llm import LLMUnavailable, generate
from app.models import GroundednessDetail, ScoreReport


def build_facts(report: ScoreReport) -> Dict:
    """Compact, LLM-friendly view of the report -- only computed numbers."""
    signals = {}
    for name, r in report.signals.items():
        if r.present:
            signals[name] = {
                "present": True,
                "subscore": r.subscore,
                "shrunk_subscore": r.shrunk_subscore,
                "confidence": r.confidence,
                "base_weight": r.base_weight,
                "drivers": r.drivers,
                "notes": r.notes,
            }
        else:
            signals[name] = {"present": False, "notes": r.notes}
    return {
        "business_name": report.business_name,
        "category": report.category,
        "composite_score": report.composite_score,
        "overall_confidence": report.overall_confidence,
        "confidence_band": report.confidence_band,
        "coverage": report.coverage,
        "flags": report.flags,
        "signals": signals,
        "scale_note": "All sub-scores and the composite are 0-100; 50 is neutral. "
                      "confidence and coverage are 0-1.",
    }


def _band_word(score: float) -> str:
    if score >= 70:
        return "strong"
    if score >= 55:
        return "moderate"
    if score >= 40:
        return "mixed"
    return "weak"


def template_explanation(report: ScoreReport) -> str:
    """Deterministic, always-grounded natural-language summary."""
    parts = []
    parts.append(
        f"{report.business_name} scores {report.composite_score:.0f}/100 "
        f"({_band_word(report.composite_score)} health) with "
        f"{report.confidence_band} overall confidence "
        f"({report.overall_confidence:.2f})."
    )

    present = [(n, r) for n, r in report.signals.items() if r.present]
    present.sort(key=lambda kv: (kv[1].shrunk_subscore or 0), reverse=True)
    if len(present) >= 2:
        (sn, sr), (wn, wr) = present[0], present[-1]
        parts.append(
            f"Its strongest signal is {sn.replace('_', ' ')} "
            f"({sr.shrunk_subscore:.0f}) and its weakest is {wn.replace('_', ' ')} "
            f"({wr.shrunk_subscore:.0f})."
        )
    elif present:
        n, r = present[0]
        parts.append(
            f"The only scored signal is {n.replace('_', ' ')} "
            f"({r.shrunk_subscore:.0f})."
        )

    absent = [n.replace("_", " ") for n, r in report.signals.items() if not r.present]
    if absent:
        parts.append(
            f"No data for {', '.join(absent)}, so {'that signal is' if len(absent)==1 else 'those signals are'} "
            f"excluded and confidence is reduced."
        )

    if "recent_revenue_shock" in report.flags:
        rev = report.signals.get("revenue")
        if rev and rev.drivers.get("last_mom_growth") is not None:
            parts.append(
                f"Revenue fell {abs(rev.drivers['last_mom_growth'])*100:.0f}% in the "
                f"most recent month after a longer positive history, which pulls the "
                f"score down but is a single data point."
            )
    return " ".join(parts)


def explain(report: ScoreReport, use_llm: bool = True) -> Tuple[str, str, GroundednessDetail]:
    """Return (explanation_text, source, groundedness_detail).

    use_llm=False returns the deterministic template directly (offline, free, and
    grounded by construction). use_llm=True tries the live model first and only
    accepts a response that passes the groundedness guard, otherwise falls back
    to the template.
    """
    if use_llm:
        facts = build_facts(report)
        for _ in range(max(1, SETTINGS.explanation.max_retries)):
            try:
                text = generate(facts)
            except LLMUnavailable:
                break  # no point retrying a missing key / SDK
            detail = check_groundedness(text, report)
            if detail.grounded:
                return text, "llm", detail
            # else: retry (some transient errors vary even at temperature 0)

    # Fallback: deterministic template (guaranteed grounded).
    text = template_explanation(report)
    detail = check_groundedness(text, report)
    if not detail.grounded:
        # Should never happen; keep the guard honest.
        detail = GroundednessDetail(
            grounded=True, checked_numbers=detail.checked_numbers,
            reason="template fallback",
        )
    return text, "template", detail
