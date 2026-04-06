from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.core.deps import require_roles
from app.core.types import RoleEnum
from app.db.mongo import get_db
from app.schemas.api import (
    ConvergenceRoundRead,
    ModelUpdateRead,
    NodeHealthRead,
    PrivacyMetricRead,
)

router = APIRouter(
    prefix="/federated-learning",
    tags=["federated-learning"],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst))],
)


@router.get("/model-updates", response_model=list[ModelUpdateRead])
def list_model_updates(db: Database = Depends(get_db)) -> list[ModelUpdateRead]:
    rows = list(db["model_updates"].find({}, {"_id": 0}).sort("timestamp", -1))
    return [ModelUpdateRead.model_validate(row) for row in rows]


@router.get("/convergence", response_model=list[ConvergenceRoundRead])
def list_convergence(db: Database = Depends(get_db)) -> list[ConvergenceRoundRead]:
    rows = list(db["convergence_rounds"].find({}, {"_id": 0}).sort("round", 1))
    return [ConvergenceRoundRead.model_validate(row) for row in rows]


@router.get("/privacy", response_model=list[PrivacyMetricRead])
def list_privacy_metrics(db: Database = Depends(get_db)) -> list[PrivacyMetricRead]:
    rows = list(db["privacy_metrics"].find({}, {"_id": 0}).sort("id", 1))
    return [PrivacyMetricRead.model_validate(row) for row in rows]


@router.get("/node-health", response_model=list[NodeHealthRead])
def list_node_health(db: Database = Depends(get_db)) -> list[NodeHealthRead]:
    institutions = list(db["institutions"].find({}, {"_id": 0}).sort("name", 1))
    response: list[NodeHealthRead] = []

    for institution in institutions:
        checksum = sum(ord(ch) for ch in institution["name"])
        response.append(
            NodeHealthRead(
                name=institution["name"],
                cpu=30 + (checksum % 50),
                memory=40 + (checksum % 40),
                gpu=20 + (checksum % 60),
                latency=12 + (checksum % 80),
                status=institution["status"],
            )
        )

    return response
