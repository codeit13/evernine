# Core service image (offline scoring + API + LLM explanation).
# The optional transformer sentiment deps (requirements-ml.txt) are intentionally
# NOT installed here to keep the image small; the reviews signal falls back to
# the built-in lexicon scorer. Add them if you want the transformer in-container.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data

EXPOSE 8000
# OPENAI_API_KEY is provided at runtime (docker run -e OPENAI_API_KEY=...);
# without it the service still runs and uses the template explanation.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
