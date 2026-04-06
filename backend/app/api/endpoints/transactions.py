import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from app.api.endpoints._utils import clean_doc
from app.core.deps import require_roles
from app.core.types import RoleEnum, TransactionStatusEnum
from app.db.mongo import get_db
from app.schemas.api import TransactionListResponse, TransactionMetricsResponse, TransactionRead

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst, RoleEnum.viewer))],
)


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    db: Database = Depends(get_db),
    search: str | None = Query(default=None),
    status: TransactionStatusEnum | None = Query(default=None),
    tx_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=1000),
    sort_by: str = Query(default="timestamp", pattern="^(timestamp|risk_score|amount)$"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> TransactionListResponse:
    query: dict = {}

    if search:
        escaped = re.escape(search)
        query["$or"] = [
            {"id": {"$regex": escaped, "$options": "i"}},
            {"from_account": {"$regex": escaped, "$options": "i"}},
            {"to_account": {"$regex": escaped, "$options": "i"}},
            {"institution": {"$regex": escaped, "$options": "i"}},
        ]

    if status:
        query["status"] = status.value

    if tx_type:
        query["type"] = tx_type

    direction = ASCENDING if sort_dir == "asc" else DESCENDING
    skip = (page - 1) * page_size

    cursor = (
        db["transactions"]
        .find(query, {"_id": 0})
        .sort(sort_by, direction)
        .skip(skip)
        .limit(page_size)
    )

    items = [TransactionRead.model_validate(item) for item in cursor]
    total = db["transactions"].count_documents(query)

    return TransactionListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/metrics", response_model=TransactionMetricsResponse)
def transaction_metrics(db: Database = Depends(get_db)) -> TransactionMetricsResponse:
    rows = list(db["transactions"].find({}, {"_id": 0, "amount": 1, "risk_score": 1, "status": 1}))

    total_transactions = len(rows)
    blocked_count = sum(1 for row in rows if row.get("status") == "blocked")
    flagged_count = sum(1 for row in rows if row.get("status") == "flagged")
    average_risk = sum(float(row.get("risk_score", 0)) for row in rows) / total_transactions if rows else 0
    total_volume = sum(float(row.get("amount", 0)) for row in rows)

    return TransactionMetricsResponse(
        total_transactions=total_transactions,
        blocked_count=blocked_count,
        flagged_count=flagged_count,
        average_risk=round(average_risk, 2),
        total_volume=round(total_volume, 2),
    )


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: str, db: Database = Depends(get_db)) -> TransactionRead:
    tx = clean_doc(db["transactions"].find_one({"id": transaction_id}))
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return TransactionRead.model_validate(tx)
