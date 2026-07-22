"""
Robustness / sensitivity analysis of the composite score.

Following the OECD 'Handbook on Constructing Composite Indicators', a composite
is only credible if its conclusions survive reasonable changes to the weights.
This script:

  1. Monte-Carlo: perturbs the base signal weights by +/- a percentage (seeded,
     reproducible), renormalises, re-scores every business offline, and reports
     the score spread and rank stability.
  2. One-at-a-time: sweeps each signal's weight and reports how much each
     business's composite moves.

A tight spread + stable ranking is the evidence that the score is driven by the
data, not by the exact weight choices. Run:  python -m scripts.robustness
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np

from app.aggregate import score_business
from app.config import SETTINGS
from app.data_loader import build_context, load_dataset


def _normalise(weights: Dict[str, float]) -> Dict[str, float]:
    total = sum(weights.values())
    return {k: v / total for k, v in weights.items()}


def _score_all(businesses, ctx, weights) -> Dict[str, float]:
    return {
        b.business_id: score_business(b, ctx, weights=weights).composite_score
        for b in businesses
    }


def monte_carlo(businesses, ctx, pct=0.20, trials=500, seed=42):
    rng = np.random.default_rng(seed)
    base = SETTINGS.base_weights
    baseline = _score_all(businesses, ctx, base)
    baseline_rank = _rank(baseline)

    samples: Dict[str, List[float]] = {b.business_id: [] for b in businesses}
    kept_rank = 0
    for _ in range(trials):
        perturbed = _normalise({
            k: max(1e-6, v * (1 + rng.uniform(-pct, pct))) for k, v in base.items()
        })
        scores = _score_all(businesses, ctx, perturbed)
        for bid, s in scores.items():
            samples[bid].append(s)
        if _rank(scores) == baseline_rank:
            kept_rank += 1

    print(f"Monte-Carlo weight sensitivity  (+/-{int(pct*100)}%, {trials} trials)\n")
    print(f"{'business':<26}{'base':>7}{'mean':>7}{'std':>7}{'p5':>7}{'p95':>7}")
    print("-" * 61)
    for b in businesses:
        arr = np.array(samples[b.business_id])
        print(f"{b.business_name:<26}{baseline[b.business_id]:>7.1f}"
              f"{arr.mean():>7.1f}{arr.std():>7.2f}"
              f"{np.percentile(arr,5):>7.1f}{np.percentile(arr,95):>7.1f}")
    print(f"\nExact ranking preserved in {kept_rank}/{trials} trials "
          f"({100*kept_rank/trials:.1f}%).")
    return samples


def one_at_a_time(businesses, ctx, lo=0.5, hi=1.5, steps=5):
    print("\nOne-at-a-time: composite range as each weight scales "
          f"x{lo}..x{hi}\n")
    base = SETTINGS.base_weights
    print(f"{'business':<26}" + "".join(f"{k[:8]:>10}" for k in base))
    print("-" * (26 + 10 * len(base)))
    ranges: Dict[str, Dict[str, float]] = {b.business_id: {} for b in businesses}
    for signal in base:
        for factor in np.linspace(lo, hi, steps):
            w = dict(base)
            w[signal] = base[signal] * factor
            w = _normalise(w)
            scores = _score_all(businesses, ctx, w)
            for bid, s in scores.items():
                d = ranges[bid].setdefault(signal, {"min": s, "max": s})
                d["min"] = min(d["min"], s)
                d["max"] = max(d["max"], s)
    for b in businesses:
        cells = "".join(
            f"{ranges[b.business_id][s]['max']-ranges[b.business_id][s]['min']:>10.1f}"
            for s in base
        )
        print(f"{b.business_name:<26}{cells}")
    print("\n(values = max-min composite swing attributable to that one weight)")


def _rank(scores: Dict[str, float]) -> List[str]:
    return [k for k, _ in sorted(scores.items(), key=lambda kv: kv[1], reverse=True)]


def main():
    businesses = load_dataset()
    ctx = build_context(businesses)
    monte_carlo(businesses, ctx)
    one_at_a_time(businesses, ctx)


if __name__ == "__main__":
    main()
