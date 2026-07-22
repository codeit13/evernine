<div align="center">

# Evernine

**Confidence-aware business health intelligence for D2C portfolios.**

Turn several noisy, unevenly-available signals about a business into a single,
explainable health score (0–100) — with an honest confidence attached to every number.

</div>

---

Evernine scores the health of direct-to-consumer businesses from their operating
signals — revenue, customer reviews, loyalty & support, and ad efficiency — and
produces a composite **health score**, a **confidence** level, and a plain-language,
**grounded** explanation of what's driving it. The hard part isn't the average; it's
handling data that's rich for one business and barely there for another. Evernine
never treats missing data as zero — thin signals are down-weighted and shrunk toward
a sensible prior, and the score always ships with its confidence.

## Highlights

- **Confidence-aware scoring** — a three-layer mechanism (credibility shrinkage →
  weighted aggregation over present signals → separately-reported confidence) so a
  business with two months of data is never scored like one with two years.
- **Four pluggable signals** — revenue momentum, loyalty & ops, review sentiment, and
  ad efficiency. Adding a fifth is a ~30-line change.
- **Transformer review sentiment** — a local model reads the actual review text to
  surface operational issues a star average hides (with a lexicon fallback so it
  always runs).
- **Grounded AI explanations** — every explanation is generated from the computed
  numbers and automatically cross-checked by a groundedness guard; unverifiable text
  is regenerated or replaced with a deterministic summary.
- **Interactive dashboard** — portfolio overview, per-business drill-down with charts,
  and an analyze tool to score any business by editing or uploading its data.

## Architecture

```
evernine/
├── backend/          FastAPI service (scoring engine + API)
│   ├── app/
│   │   ├── signals/      pluggable signal scorers (revenue, reviews, loyalty_ops, ad_efficiency)
│   │   ├── scoring…      stats.py, aggregate.py — the confidence-weighting mechanism
│   │   ├── explain/      LLM explanation + groundedness guard + deterministic fallback
│   │   ├── nlp.py        transformer sentiment + aspect extraction
│   │   └── main.py       FastAPI app
│   ├── scripts/         CLI + robustness/sensitivity analysis
│   ├── tests/           offline test suite
│   └── data/portfolio.json
├── frontend/         React + Vite + Tailwind + shadcn-style UI, Recharts
└── deploy/           nginx + systemd + deploy notes
```

## Quick start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # core
pip install -r requirements-ml.txt        # optional: local transformer sentiment
cp .env.example .env                       # add OPENAI_API_KEY for live explanations (optional)
uvicorn app.main:app --port 8010 --reload
```

The API runs with **zero configuration**: without `OPENAI_API_KEY` the explanation
falls back to a deterministic template; without the ML deps the review sentiment
falls back to a lexicon. Neither ever fails the request.

API: `GET /health` · `GET /businesses` · `GET /businesses/{id}` ·
`GET /businesses/{id}/score` · `GET /score` · `POST /score`
(`?explain=false` skips the live model call).

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173  (proxies /api → http://127.0.0.1:8010)
npm run build    # production build → dist/
```

### Tests & analysis

```bash
cd backend
pytest -q                       # offline test suite
python -m scripts.score_all     # score the sample portfolio
python -m scripts.robustness    # weight-sensitivity / robustness analysis
```

## How scoring works

Two quantities are computed separately for every signal, because they answer
different questions:

| Quantity | Question | Range |
|---|---|---|
| **sub-score** | *How good* is this signal? | 0–100 |
| **confidence** | *How much do we trust it*, given data volume, recency, consistency? | 0–1 |

The composite falls out of three layers:

1. **Credibility shrinkage** — `q* = c·q + (1−c)·prior`. Thin/noisy signals are pulled
   toward a neutral prior instead of trusted at face value.
2. **Weighted aggregation over present signals** — missing signals are *excluded*,
   never scored as zero; weights renormalise over what's available.
3. **Confidence, reported separately** — overall confidence and coverage travel with
   the score, so "how healthy" and "how sure" are never conflated.

See the in-app **How it works** page for the full breakdown.

## License

Proprietary — all rights reserved.
