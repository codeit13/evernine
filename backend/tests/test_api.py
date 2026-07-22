"""API smoke tests via FastAPI's TestClient (offline: explain=false)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["businesses_loaded"] == 6


def test_list_businesses(client):
    resp = client.get("/businesses")
    assert resp.status_code == 200
    assert len(resp.json()) == 6


def test_score_one(client):
    resp = client.get("/businesses/BIZ-006/score", params={"explain": False})
    assert resp.status_code == 200
    body = resp.json()
    assert body["business_id"] == "BIZ-006"
    assert 0 <= body["composite_score"] <= 100
    assert "recent_revenue_shock" in body["flags"]
    assert set(body["signals"].keys()) == {
        "revenue", "reviews", "loyalty_ops", "ad_efficiency"
    }
    assert body["explanation"]  # always present (template when explain=false)


def test_score_all(client):
    resp = client.get("/score", params={"explain": False})
    assert resp.status_code == 200
    assert len(resp.json()) == 6


def test_unknown_business_404(client):
    resp = client.get("/businesses/NOPE/score", params={"explain": False})
    assert resp.status_code == 404


def test_score_arbitrary_payload(client):
    payload = {
        "business_id": "TEST-1",
        "business_name": "Test Co",
        "category": "Test",
        "revenue_by_month": {"2026-05": 100000, "2026-06": 110000},
        "customer_reviews": None,
        "repeat_purchase_rate": None,
        "customer_support_tickets": None,
        "ad_spend_by_month": {"2026-05": 10000, "2026-06": 11000},
    }
    resp = client.post("/score", params={"explain": False}, json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["business_id"] == "TEST-1"
    # Only revenue + ad present -> low coverage, low confidence.
    assert body["coverage"] <= 0.5
    assert body["confidence_band"] == "low"
