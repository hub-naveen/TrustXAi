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
