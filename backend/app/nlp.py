"""
Review-text NLP: sentiment scoring and aspect (theme) extraction.

Two responsibilities, both feeding the *reviews* signal:

1. sentiment(texts) -> per-review P(positive) in [0,1].
   Primary path: a small local transformer (distilbert-base-uncased-finetuned-
   sst-2-english) run deterministically in eval mode. If torch/transformers are
   not installed or the model can't be loaded (offline, etc.), we fall back to a
   transparent lexicon scorer so the service *never* hard-fails on a missing
   optional dependency. Which path ran is reported via `sentiment_backend()`.

2. extract_aspects(reviews) -> counts of positive/negative mentions per theme
   (delivery, quality, support, website/ops, price). These are deterministic,
   keyword-driven, and become *grounded facts* for the LLM explanation -- e.g.
   they surface "website was down" and "arrived damaged" for BIZ-006, which a
   star average alone would miss.

The transformer is loaded lazily and cached process-wide; scoring stays
deterministic (no sampling, eval mode) so identical input -> identical output.
"""
from __future__ import annotations

import re
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Sentiment
# ---------------------------------------------------------------------------
_TRANSFORMER_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"
_backend_used = "uninitialised"


@lru_cache(maxsize=1)
def _load_transformer():
    """Return a callable(texts)->List[float] or None if unavailable."""
    try:
        import torch  # noqa: F401
        from transformers import (  # type: ignore
            AutoModelForSequenceClassification,
            AutoTokenizer,
        )
    except Exception:
        return None
    try:
        tok = AutoTokenizer.from_pretrained(_TRANSFORMER_MODEL)
        model = AutoModelForSequenceClassification.from_pretrained(_TRANSFORMER_MODEL)
        model.eval()

        def _run(texts: List[str]) -> List[float]:
            import torch
            with torch.no_grad():
                enc = tok(
                    texts, padding=True, truncation=True, max_length=128,
                    return_tensors="pt",
                )
                logits = model(**enc).logits
                probs = torch.softmax(logits, dim=-1)
                # SST-2 label order is [NEGATIVE, POSITIVE].
                return [float(p[1]) for p in probs]

        return _run
    except Exception:
        return None


# A compact, transparent sentiment lexicon for the offline fallback.
_POS_WORDS = {
    "great", "amazing", "love", "loved", "best", "excellent", "good", "nice",
    "lovely", "consistent", "fast", "well", "repeat", "reorder", "go-to",
    "favourite", "favorite", "wonderful", "perfect", "happy", "quality",
    "recommend", "smooth", "fresh",
}
_NEG_WORDS = {
    "bad", "broke", "broken", "slow", "pricey", "overpriced", "damaged",
    "faded", "ignored", "never", "down", "average", "unfortunately", "poor",
    "terrible", "awful", "disappointed", "disappointing", "late", "missing",
    "refund", "worst", "expensive",
}
_NEGATORS = {"not", "no", "never", "n't"}
_TOKEN_RE = re.compile(r"[a-z']+")


def _lexicon_sentiment(text: str) -> float:
    tokens = _TOKEN_RE.findall((text or "").lower())
    score = 0
    for i, tok in enumerate(tokens):
        w = 0
        if tok in _POS_WORDS:
            w = 1
        elif tok in _NEG_WORDS:
            w = -1
        if w and i > 0 and tokens[i - 1] in _NEGATORS:
            w = -w
        score += w
    # Squash the net polarity into a 0..1 pseudo-probability.
    return 1.0 / (1.0 + pow(2.71828, -0.9 * score))


def sentiment(texts: List[str]) -> List[float]:
    """Per-text P(positive) in [0,1]. Uses the transformer when available."""
    global _backend_used
    texts = [t or "" for t in texts]
    if not texts:
        _backend_used = "none"
        return []
    runner = _load_transformer()
    if runner is not None:
        try:
            out = runner(texts)
            _backend_used = "transformer"
            return out
        except Exception:
            pass  # fall through to lexicon
    _backend_used = "lexicon"
    return [_lexicon_sentiment(t) for t in texts]


def sentiment_backend() -> str:
    """Which sentiment backend was last used ('transformer' | 'lexicon')."""
    return _backend_used


# ---------------------------------------------------------------------------
# Aspect / theme extraction
# ---------------------------------------------------------------------------
_ASPECT_KEYWORDS: Dict[str, List[str]] = {
    "delivery": ["delivery", "shipping", "arrived", "arrive", "weeks", "ship",
                 "dispatch", "shipped"],
    "quality": ["quality", "texture", "faded", "broke", "damaged", "moisturizer",
                "blend", "aroma", "material"],
    "support": ["support", "customer service", "service", "responded",
                "response", "ignored", "reply"],
    "website_ops": ["website", "site", "down", "checkout", "check out", "outage",
                    "order", "app"],
    "price": ["pricey", "overpriced", "price", "expensive", "cheap", "value"],
}


def extract_aspects(
    reviews: List[Tuple[Optional[int], str]]
) -> Dict[str, Dict[str, int]]:
    """Count positive/negative mentions per theme.

    A theme mention inherits the review's polarity: a review is 'negative' if its
    rating <= 2 (or, when rating is missing, if lexicon sentiment < 0.5).
    Returns {theme: {"pos": int, "neg": int}} for themes that were mentioned.
    """
    result: Dict[str, Dict[str, int]] = {}
    for rating, text in reviews:
        low = (text or "").lower()
        if rating is not None:
            negative = rating <= 2
        else:
            negative = _lexicon_sentiment(text) < 0.5
        for theme, kws in _ASPECT_KEYWORDS.items():
            if any(kw in low for kw in kws):
                bucket = result.setdefault(theme, {"pos": 0, "neg": 0})
                bucket["neg" if negative else "pos"] += 1
    return result


def top_negative_theme(aspects: Dict[str, Dict[str, int]]) -> Optional[str]:
    worst: Optional[str] = None
    worst_n = 0
    for theme, counts in aspects.items():
        if counts.get("neg", 0) > worst_n:
            worst_n = counts["neg"]
            worst = theme
    return worst
