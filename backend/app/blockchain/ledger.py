from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from pymongo.database import Database


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def calculate_block_hash(index: int, timestamp: str, previous_hash: str, records: list[dict[str, Any]], nonce: int) -> str:
    payload = canonical_json(
        {
            "index": index,
            "timestamp": timestamp,
            "previous_hash": previous_hash,
            "records": records,
            "nonce": nonce,
        }
    )
    return sha256_hex(payload)


def ensure_genesis_block(db: Database) -> None:
    blocks = db["data_chain_blocks"]
    if blocks.count_documents({}) > 0:
        return

    timestamp = now_iso()
    genesis_records = [{"type": "genesis", "message": "TrustXAi data chain initialized"}]
    nonce = 0
    block_hash = calculate_block_hash(0, timestamp, "0", genesis_records, nonce)

    blocks.insert_one(
        {
            "index": 0,
            "timestamp": timestamp,
            "previous_hash": "0",
            "records": genesis_records,
            "nonce": nonce,
            "hash": block_hash,
            "miner": "system",
        }
    )


def add_pending_record(db: Database, record_type: str, operation: str, payload: dict[str, Any]) -> None:
    db["data_chain_pending"].insert_one(
        {
            "type": record_type,
            "operation": operation,
            "payload": payload,
            "record_hash": sha256_hex(canonical_json(payload)),
            "timestamp": now_iso(),
        }
    )


def mine_pending_records(db: Database, miner: str = "trustxai-node") -> dict[str, Any] | None:
    pending_docs = list(db["data_chain_pending"].find({}, {"_id": 0}).sort("timestamp", 1))
    if not pending_docs:
        return None

    blocks = db["data_chain_blocks"]
    last_block = blocks.find_one(sort=[("index", -1)])
    if not last_block:
        ensure_genesis_block(db)
        last_block = blocks.find_one(sort=[("index", -1)])

    assert last_block is not None

    index = int(last_block["index"]) + 1
    previous_hash = str(last_block["hash"])
    timestamp = now_iso()

    nonce = 0
    while True:
        block_hash = calculate_block_hash(index, timestamp, previous_hash, pending_docs, nonce)
        # Lightweight proof-of-work for demo purposes.
        if block_hash.startswith("000"):
            break
        nonce += 1

    block = {
        "index": index,
        "timestamp": timestamp,
        "previous_hash": previous_hash,
        "records": pending_docs,
        "nonce": nonce,
        "hash": block_hash,
        "miner": miner,
    }
    blocks.insert_one(block)
    db["data_chain_pending"].delete_many({})
    return block


def verify_chain(db: Database) -> dict[str, Any]:
    blocks = list(db["data_chain_blocks"].find({}, {"_id": 0}).sort("index", 1))
    if not blocks:
        return {"valid": False, "reason": "No blocks present", "checked_blocks": 0}

    for i, block in enumerate(blocks):
        recalculated = calculate_block_hash(
            int(block["index"]),
            str(block["timestamp"]),
            str(block["previous_hash"]),
            list(block["records"]),
            int(block["nonce"]),
        )
        if recalculated != block["hash"]:
            return {
                "valid": False,
                "reason": f"Hash mismatch at block {block['index']}",
                "checked_blocks": i + 1,
            }

        if i > 0 and block["previous_hash"] != blocks[i - 1]["hash"]:
            return {
                "valid": False,
                "reason": f"Previous hash mismatch at block {block['index']}",
                "checked_blocks": i + 1,
            }

    return {"valid": True, "reason": "Chain verified", "checked_blocks": len(blocks)}


def list_blocks(db: Database, limit: int = 50) -> list[dict[str, Any]]:
    rows = list(
        db["data_chain_blocks"]
        .find({}, {"_id": 0})
        .sort("index", -1)
        .limit(max(1, min(limit, 500)))
    )
    return rows


def anchor_document(db: Database, collection: str, operation: str, document: dict[str, Any]) -> dict[str, Any] | None:
    payload = {
        "collection": collection,
        "operation": operation,
        "document_id": document.get("id") or document.get("case_id") or document.get("key_id"),
        "document_hash": sha256_hex(canonical_json(document)),
    }
    add_pending_record(db, record_type="data-anchor", operation=operation, payload=payload)
    return mine_pending_records(db)
