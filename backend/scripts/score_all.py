"""
CLI: score every business in the dataset and print a readable summary.

Usage:
  python -m scripts.score_all                 # scores + template explanations
  python -m scripts.score_all --explain       # scores + live LLM explanations
  python -m scripts.score_all --json          # full JSON reports

Offline by default (no LLM call) so it always runs; pass --explain to use the
live OpenAI path (needs OPENAI_API_KEY).
"""
from __future__ import annotations

import argparse
import json

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from app.service import ScoringService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--explain", action="store_true", help="use the live LLM")
    parser.add_argument("--json", action="store_true", help="dump full JSON")
    parser.add_argument("--data", default=None, help="path to dataset json")
    args = parser.parse_args()

    svc = ScoringService(data_path=args.data)
    reports = svc.score_all(use_llm=args.explain)

    if args.json:
        print(json.dumps([r.model_dump() for r in reports], indent=2, default=str))
        return

    print(f"reference_month={svc.context.reference_month}  "
          f"review_prior_score={svc.context.review_prior_score:.1f}\n")
    header = f"{'business':<26}{'score':>7}{'conf':>7}{'band':>8}{'cover':>7}  signals"
    print(header)
    print("-" * len(header))
    for r in reports:
        sig = " ".join(
            f"{n.split('_')[0]}:{(s.shrunk_subscore if s.present else None)}"
            for n, s in r.signals.items()
        )
        print(
            f"{r.business_name:<26}{r.composite_score:>7.1f}"
            f"{r.overall_confidence:>7.2f}{r.confidence_band:>8}{r.coverage:>7.2f}  {sig}"
        )
    print()
    for r in reports:
        print(f"### {r.business_name}  ({r.composite_score:.1f}/100, "
              f"{r.confidence_band} conf, flags={r.flags})")
        print(f"    {r.explanation}")
        print()


if __name__ == "__main__":
    main()
