import re

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.blockchain.ledger import (
    add_pending_record,
    list_blocks,
    mine_pending_records,
    verify_chain,
)
from app.core.deps import require_roles
from app.core.types import RoleEnum
from app.db.mongo import get_db
from app.schemas.api import (
    BlockchainEntryRead,
    BlockchainMetricsResponse,
    GenericMessage,
    SmartContractRead,
)

router = APIRouter(prefix="/blockchain", tags=["blockchain"])


@router.get(
    "/entries",
    response_model=list[BlockchainEntryRead],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst, RoleEnum.viewer))],
)
def list_entries(
    db: Database = Depends(get_db),
    status: str | None = Query(default=None),
    action: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> list[BlockchainEntryRead]:
    query: dict = {}

    if status:
        query["status"] = status
    if action:
        query["action"] = action
    if search:
        escaped = re.escape(search)
        query["$or"] = [
            {"tx_hash": {"$regex": escaped, "$options": "i"}},
            {"fraud_dna_hash": {"$regex": escaped, "$options": "i"}},
        ]

    rows = list(db["blockchain_entries"].find(query, {"_id": 0}).sort("timestamp", -1))
    return [BlockchainEntryRead.model_validate(row) for row in rows]


@router.get(
    "/contracts",
    response_model=list[SmartContractRead],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst, RoleEnum.viewer))],
)
def list_contracts(db: Database = Depends(get_db)) -> list[SmartContractRead]:
    rows = list(db["smart_contracts"].find({}, {"_id": 0}).sort("calls", -1))
    return [SmartContractRead.model_validate(row) for row in rows]


@router.get(
    "/metrics",
    response_model=BlockchainMetricsResponse,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst, RoleEnum.viewer))],
)
def blockchain_metrics(db: Database = Depends(get_db)) -> BlockchainMetricsResponse:
    total_entries = db["blockchain_entries"].count_documents({})
    confirmed_count = db["blockchain_entries"].count_documents({"status": "confirmed"})
    pending_count = db["blockchain_entries"].count_documents({"status": "pending"})
    active_contract_count = db["smart_contracts"].count_documents({"status": "active"})

    rows = list(db["blockchain_entries"].find({}, {"_id": 0, "gas_used": 1}))
    average_gas = int(round(sum(row.get("gas_used", 0) for row in rows) / len(rows))) if rows else 0

    confirmation_rate = round((confirmed_count / total_entries) * 100) if total_entries else 0
    return BlockchainMetricsResponse(
        confirmation_rate=confirmation_rate,
        confirmed_count=confirmed_count,
        pending_count=pending_count,
        average_gas=average_gas,
        active_contract_count=active_contract_count,
    )


@router.get(
    "/ledger/blocks",
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst, RoleEnum.viewer))],
)
def blockchain_blocks(
    db: Database = Depends(get_db),
    limit: int = Query(default=25, ge=1, le=200),
) -> dict:
    return {"items": list_blocks(db, limit=limit), "total": db["data_chain_blocks"].count_documents({})}


@router.get(
    "/ledger/verify",
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst, RoleEnum.viewer))],
)
def blockchain_verify(db: Database = Depends(get_db)) -> dict:
    return verify_chain(db)


@router.post(
    "/ledger/mine",
    response_model=GenericMessage,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst))],
)
def blockchain_mine(db: Database = Depends(get_db)) -> GenericMessage:
    block = mine_pending_records(db, miner="api-miner")
    if not block:
        return GenericMessage(message="No pending records to mine")
    return GenericMessage(message=f"Mined block #{block['index']} with {len(block['records'])} records")


@router.post(
    "/ledger/anchor",
    response_model=GenericMessage,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst))],
)
def blockchain_anchor_demo(db: Database = Depends(get_db)) -> GenericMessage:
    payload = {
        "source": "manual-anchor",
        "timestamp": db["blockchain_entries"].find_one(sort=[("timestamp", -1)], projection={"timestamp": 1, "_id": 0}),
    }
    add_pending_record(db, "manual", "anchor", payload)
    block = mine_pending_records(db, miner="manual-anchor")
    if block:
        return GenericMessage(message=f"Anchored to block #{block['index']}")
    return GenericMessage(message="Record queued")
