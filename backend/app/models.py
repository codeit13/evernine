"""
Pydantic models: tolerant input parsing and the structured score report.

The input models are intentionally permissive: every category can be absent,
null, or empty, because real-world business data is uneven by nature. We never
coerce "missing" into a zero -- missing stays missing and is handled by the
scoring layer.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# --------------------------------------------------------------------------- #
# Input models (mirror business_signals.json, tolerant of nulls/empties)      #
# --------------------------------------------------------------------------- #
class Review(BaseModel):
    rating: Optional[int] = None
    text: str = ""


class SupportTickets(BaseModel):
    total: int = 0
    resolved_within_48h: int = 0
    escalated: int = 0


class BusinessInput(BaseModel):
    business_id: str
    business_name: str
    category: Optional[str] = None
    revenue_by_month: Dict[str, float] = Field(default_factory=dict)
    customer_reviews: Optional[List[Review]] = None
    repeat_purchase_rate: Optional[float] = None
    customer_support_tickets: Optional[SupportTickets] = None
    ad_spend_by_month: Dict[str, float] = Field(default_factory=dict)

    @field_validator("revenue_by_month", "ad_spend_by_month", mode="before")
    @classmethod
    def _none_to_empty(cls, v):
        return v or {}


class Dataset(BaseModel):
    businesses: List[BusinessInput] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Output models (the API contract)                                            #
# --------------------------------------------------------------------------- #
class SignalResult(BaseModel):
    name: str
    present: bool
    subscore: Optional[float] = None            # raw 0..100 (None if absent)
    confidence: float = 0.0                      # 0..1
    shrunk_subscore: Optional[float] = None      # after credibility shrinkage
    base_weight: float = 0.0
    effective_weight: float = 0.0                # share of the composite it drove
    prior: Optional[float] = None
    drivers: Dict[str, object] = Field(default_factory=dict)  # grounded facts
    notes: List[str] = Field(default_factory=list)


class GroundednessDetail(BaseModel):
    grounded: bool
    checked_numbers: int = 0
    unsupported_numbers: List[float] = Field(default_factory=list)
    reason: str = ""


class ScoreReport(BaseModel):
    business_id: str
    business_name: str
    category: Optional[str] = None

    composite_score: float                       # 0..100
    overall_confidence: float                    # 0..1
    confidence_band: str                         # "high" | "medium" | "low"
    coverage: float                              # weighted fraction of signals present

    signals: Dict[str, SignalResult]
    flags: List[str] = Field(default_factory=list)

    explanation: str = ""
    explanation_source: str = "template"         # "llm" | "template"
    explanation_grounded: bool = True
    groundedness: Optional[GroundednessDetail] = None
