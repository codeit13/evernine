"""
Thin, provider-focused LLM client for generating the explanation (OpenAI).

Isolated here so the rest of the system has no OpenAI dependency and stays fully
testable offline. The API key is read from the environment (OPENAI_API_KEY) at
call time -- never stored, never logged. Failures (missing key, timeout, network,
rate limit) raise LLMUnavailable, which the explainer catches to fall back to a
deterministic template.
"""
from __future__ import annotations

import json
import os
from typing import Dict

from app.config import SETTINGS


class LLMUnavailable(RuntimeError):
    """Raised when the LLM cannot produce an explanation for any reason."""


SYSTEM_PROMPT = (
    "You are a financial/operations analyst writing a short, factual explanation "
    "of a computed business-health score. You will receive a JSON object of "
    "already-computed figures. Follow these rules strictly:\n"
    "1. Use ONLY numbers that appear in the JSON. Never invent or estimate a "
    "number that is not present.\n"
    "2. Lead with the composite score and whether it is strong/moderate/weak.\n"
    "3. Name the 1-3 signals driving the score most, citing their sub-scores.\n"
    "4. Explicitly mention confidence: if overall_confidence is low or a signal "
    "is missing or based on little data, say so plainly.\n"
    "5. If a flag such as recent_revenue_shock is present, mention it.\n"
    "6. 3-5 sentences, plain prose, no bullet points, no markdown, no headings.\n"
    "Return a JSON object: {\"explanation\": \"...\"}."
)


def _build_client(timeout: float):
    try:
        from openai import OpenAI  # type: ignore
    except Exception as exc:  # SDK not installed
        raise LLMUnavailable(f"openai SDK not available: {exc}")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LLMUnavailable("OPENAI_API_KEY not set")
    return OpenAI(api_key=api_key, timeout=timeout)


def generate(facts: Dict) -> str:
    """Call the LLM once and return the explanation text. Raises LLMUnavailable."""
    cfg = SETTINGS.explanation
    client = _build_client(cfg.timeout_seconds)
    try:
        resp = client.chat.completions.create(
            model=cfg.model,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(facts, default=str)},
            ],
        )
        content = resp.choices[0].message.content or ""
    except Exception as exc:
        raise LLMUnavailable(f"LLM call failed: {exc}")

    try:
        parsed = json.loads(content)
        text = parsed.get("explanation", "").strip()
    except json.JSONDecodeError:
        text = content.strip()
    if not text:
        raise LLMUnavailable("LLM returned empty explanation")
    return text
