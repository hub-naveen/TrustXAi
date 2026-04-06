import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from pymongo.database import Database

from app.core.deps import require_roles
from app.core.types import InstitutionStatusEnum, RoleEnum
from app.db.csv_ingest import ingest_csv_datasets
from app.db.mongo import get_db
from app.schemas.api import AuditLogRead, InstitutionRead, ThreatFeedRead

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles(RoleEnum.admin))],
)


class InstitutionStatusUpdate(BaseModel):
    status: InstitutionStatusEnum


@router.get("/institutions", response_model=list[InstitutionRead])
def list_institutions(db: Database = Depends(get_db)) -> list[InstitutionRead]:
    rows = list(db["institutions"].find({}, {"_id": 0}).sort("name", 1))
    return [InstitutionRead.model_validate(row) for row in rows]


@router.patch("/institutions/{institution_id}", response_model=InstitutionRead)
def update_institution_status(
    institution_id: str,
    payload: InstitutionStatusUpdate,
    db: Database = Depends(get_db),
) -> InstitutionRead:
    institution = db["institutions"].find_one({"id": institution_id}, {"_id": 0})
    if not institution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    db["institutions"].update_one(
        {"id": institution_id},
        {"$set": {"status": payload.status.value}},
    )
    updated = db["institutions"].find_one({"id": institution_id}, {"_id": 0})
    return InstitutionRead.model_validate(updated)


@router.get("/audit-logs", response_model=list[AuditLogRead])
def list_audit_logs(
    db: Database = Depends(get_db),
    search: str | None = Query(default=None),
) -> list[AuditLogRead]:
    query: dict = {}
    if search:
        escaped = re.escape(search)
        query["$or"] = [
            {"actor": {"$regex": escaped, "$options": "i"}},
            {"action": {"$regex": escaped, "$options": "i"}},
            {"target": {"$regex": escaped, "$options": "i"}},
        ]
    rows = list(db["admin_audit_logs"].find(query, {"_id": 0}).sort("timestamp", -1))
    return [AuditLogRead.model_validate(row) for row in rows]


@router.get("/threat-feed", response_model=list[ThreatFeedRead])
def list_threat_feed(db: Database = Depends(get_db)) -> list[ThreatFeedRead]:
    rows = list(db["threat_feed"].find({}, {"_id": 0}).sort("id", 1))
    return [ThreatFeedRead.model_validate(row) for row in rows]


@router.get("/role-distribution")
def role_distribution(db: Database = Depends(get_db)) -> dict[str, int]:
    rows = list(
        db["users"].aggregate(
            [
                {"$group": {"_id": "$role", "count": {"$sum": 1}}},
            ]
        )
    )
    return {row["_id"]: row["count"] for row in rows if row.get("_id")}


@router.post("/import-csv-data")
def import_csv_data(
    db: Database = Depends(get_db),
    force: bool = Query(default=True),
) -> dict[str, object]:
    counts = ingest_csv_datasets(db, force=force)
    return {
        "message": "CSV datasets imported to MongoDB",
        "collection_counts": counts,
    }
