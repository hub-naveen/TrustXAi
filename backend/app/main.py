from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.blockchain.ledger import ensure_genesis_block
from app.core.config import settings
from app.db.csv_ingest import ingest_csv_datasets
from app.db.seed import seed_database
from app.db.mongo import get_database
from app.schemas.api import HealthResponse


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = get_database()
    seed_database(db)
    ingest_csv_datasets(db)
    ensure_genesis_block(db)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="FastAPI backend for TrustXAi fraud intelligence platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", app=settings.APP_NAME, version="1.0.0")


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
