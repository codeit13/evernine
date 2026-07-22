"""
FastAPI application exposing the business-health score.

Endpoints:
  GET /health                         -- liveness
  GET /businesses                     -- list businesses in the dataset
  GET /businesses/{id}/score          -- full score report for one business
  GET /score                          -- score reports for all businesses
  POST /score                         -- score an arbitrary business payload

`explain=false` skips the LLM call (fast, fully offline) and returns the
deterministic template explanation instead.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import List

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.models import BusinessInput, ScoreReport
from app.service import ScoringService

try:  # load .env for local dev if python-dotenv is present
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

_service: ScoringService = None  # initialised on startup


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _service
    _service = ScoringService(data_path=os.getenv("DATA_PATH"))
    yield


app = FastAPI(
    title="Evernine Health Intelligence",
    version="1.0.0",
    description="Confidence-aware composite health scoring for D2C businesses.",
    lifespan=lifespan,
)

# Same-origin in production (nginx serves the SPA and proxies /api); permissive
# here so the Vite dev server can call the API during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def service() -> ScoringService:
    global _service
    if _service is None:  # e.g. imported without the lifespan having run
        _service = ScoringService(os.getenv("DATA_PATH"))
    return _service


@app.get("/health")
def health() -> dict:
    svc = service()
    return {
        "status": "ok",
        "businesses_loaded": len(svc.businesses),
        "reference_month": svc.context.reference_month,
        "review_prior_score": svc.context.review_prior_score,
    }


@app.get("/businesses")
def businesses() -> List[dict]:
    return service().list_businesses()


@app.get("/businesses/{business_id}", response_model=BusinessInput)
def business_detail(business_id: str) -> BusinessInput:
    """Raw input data for a business (used by the UI to plot trend charts)."""
    biz = service().get(business_id)
    if biz is None:
        raise HTTPException(status_code=404, detail=f"Unknown business_id: {business_id}")
    return biz


@app.get("/businesses/{business_id}/score", response_model=ScoreReport)
def score_one(
    business_id: str,
    explain: bool = Query(True, description="Generate the live LLM explanation"),
) -> ScoreReport:
    report = service().score_by_id(business_id, use_llm=explain)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Unknown business_id: {business_id}")
    return report


@app.get("/score", response_model=List[ScoreReport])
def score_all(
    explain: bool = Query(True, description="Generate the live LLM explanation"),
) -> List[ScoreReport]:
    return service().score_all(use_llm=explain)


@app.post("/score", response_model=ScoreReport)
def score_payload(
    business: BusinessInput = Body(...),
    explain: bool = Query(True, description="Generate the live LLM explanation"),
) -> ScoreReport:
    return service().score(business, use_llm=explain)
