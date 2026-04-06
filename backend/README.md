# TrustXAi FastAPI Backend

Production-style backend for TrustXAi, built with FastAPI + MongoDB.

## Features

- JWT authentication with role-aware access control (`admin`, `analyst`, `viewer`)
- MongoDB persistence via PyMongo with startup seeding
- Local fallback to mongomock when MongoDB is unavailable
- REST APIs for:
  - auth
  - role dashboards
  - transactions
  - fraud intelligence + investigation case merge
  - blockchain explorer + internal data-chain ledger
  - federated learning telemetry
  - admin governance
  - user settings + API keys

## Project Layout

```text
backend/
  app/
    api/
      endpoints/
    core/
    db/
    schemas/
    main.py
  requirements.txt
  .env.example
```

## Quick Start

1. Create and activate virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy env file:

```bash
copy .env.example .env
```

4. Run API:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Health check:

- http://localhost:8000/health

## Demo Accounts

All seeded users use password: `demo1234`

- admin@rbi.gov.in
- analyst@sbi.co.in
- viewer@hdfc.com

## Notes

- Database is configured with `MONGODB_URL` and `MONGODB_DB_NAME` in `.env`.
- If MongoDB is not reachable, a mongomock in-memory database is used for development continuity.
- Seeding runs automatically on app startup if no users exist.
- Viewer role is restricted from admin, fraud-intelligence, federated-learning, and settings APIs by default.

## CSV Data Ingestion

On startup, backend ingests CSV files from `DATA_DIR` (default: `data/`) into MongoDB.

- Raw CSV datasets are loaded into `raw_*` collections.
- `transactions.csv` is additionally normalized into the `transactions` collection used by `/api/v1/transactions` endpoints.
- Ingestion is idempotent and only re-runs when source CSV file signatures change.

Admin can force a re-import at runtime:

- `POST /api/v1/admin/import-csv-data?force=true`

## ML Training Pipelines

The backend now includes dataset-driven training endpoints under `/api/v1/ml`.

- `GET /api/v1/ml/pipelines` - list available pipelines
- `POST /api/v1/ml/train/all` - train every pipeline in one run
- `POST /api/v1/ml/train/{pipeline_name}` - train one pipeline
- `GET /api/v1/ml/train/runs` - fetch recent training runs

Implemented pipelines:

- `transactions` (`transactions.csv`): Isolation Forest + RandomForest/XGBoost hybrid fraud scoring
- `layered_transactions` (`layered_transactions.csv`): NetworkX graph analysis for layering and money trails
- `entities` (`entities.csv`): cosine similarity + record linkage for identity linking
- `time_series` (`time_series.csv`): ARIMA with optional LSTM anomaly detection
- `complaints` (`complaints.csv`): TF-IDF + logistic regression complaint classification
- `federated` (`bank_A.csv` + `bank_B.csv`): federated averaging style global fraud model
- `aml_patterns` (`aml_patterns.csv` + transaction graph data): rule-based AML alerts (smurfing/circular/layering)
- `fraud_detection_financial` (`fraud_detection_financial.csv`): advanced tabular fraud classifier

Training artifacts are written to `backend/model_artifacts` by default and can be configured via:

- `DATA_DIR`
- `MODEL_ARTIFACTS_DIR`
- `MAX_TRAINING_ROWS`
