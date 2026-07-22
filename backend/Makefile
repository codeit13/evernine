.PHONY: install install-ml install-dev run score explain robustness test clean

install:            ## core service deps
	pip install -r requirements.txt

install-ml:         ## optional local transformer sentiment
	pip install -r requirements-ml.txt

install-dev:        ## dev/test deps
	pip install -r requirements-dev.txt

run:                ## start the API on :8000
	uvicorn app.main:app --reload

score:              ## print scores + template explanations (offline)
	python -m scripts.score_all

explain:            ## print scores + live LLM explanations (needs OPENAI_API_KEY)
	python -m scripts.score_all --explain

robustness:         ## weight-sensitivity / robustness analysis
	python -m scripts.robustness

test:               ## run the offline test suite
	pytest -q

clean:
	rm -rf __pycache__ */__pycache__ */*/__pycache__ .pytest_cache
