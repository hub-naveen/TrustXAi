from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from pymongo.database import Database

from app.core.config import settings

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent

CSV_FILES = [
    "transactions.csv",
    "layered_transactions.csv",
    "entities.csv",
    "bank_A.csv",
    "bank_B.csv",
    "aml_patterns.csv",
    "time_series.csv",
    "complaints.csv",
    "fraud_detection_financial.csv",
]

HIGH_RISK_TYPES = {"rtgs", "swift", "wire", "transfer"}
ELEVATED_RISK_TYPES = {"imps", "neft", "online", "upi"}


def resolve_data_dir() -> Path:
    raw = Path(settings.DATA_DIR).expanduser()
    if raw.is_absolute():
        return raw

    repo_candidate = (REPO_ROOT / raw).resolve()
    if repo_candidate.exists():
        return repo_candidate

    return (BACKEND_ROOT / raw).resolve()


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_timestamp(value: Any) -> datetime:
    ts = pd.to_datetime(value, utc=True, errors="coerce")
    if pd.isna(ts):
        return datetime.now(timezone.utc)
    return ts.to_pydatetime()


def _safe_string(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, float) and pd.isna(value):
        return default
    return str(value)


def _to_builtin(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _to_builtin(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_builtin(item) for item in value]
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    if pd.isna(value):
        return None
    return value


def _read_csv_records(path: Path) -> list[dict[str, Any]]:
    frame = pd.read_csv(path)
    frame = frame.where(pd.notnull(frame), None)
    records = frame.to_dict(orient="records")
    return [_to_builtin(record) for record in records]


def _infer_institution(account_id: str) -> str:
    normalized = account_id.strip().upper()
    if normalized.startswith("A"):
        return "Bank A Network"
    if normalized.startswith("B"):
        return "Bank B Network"
    if normalized.startswith(("CRYPTO", "WALLET", "MIXER", "EXCHANGE")):
        return "Crypto Network"
    return "External Network"


def _derive_risk_score(is_fraud: int, amount: float, tx_type: str) -> int:
    normalized_type = tx_type.lower()

    score = 10
    score += min(int(amount / 25000), 20)
    score += 52 if is_fraud == 1 else 0

    if normalized_type in HIGH_RISK_TYPES:
        score += 13
    elif normalized_type in ELEVATED_RISK_TYPES:
        score += 6

    if amount >= 50000:
        score += 8
    if amount >= 200000:
        score += 10
    if amount >= 700000:
        score += 6

    return max(1, min(score, 99))


def _derive_status(risk_score: int) -> str:
    if risk_score >= 85:
        return "blocked"
    if risk_score >= 60:
        return "flagged"
    return "approved"


def _normalize_transaction_records(path: Path) -> list[dict[str, Any]]:
    rows = _read_csv_records(path)
    normalized: list[dict[str, Any]] = []

    for row in rows:
        tx_id = _safe_string(row.get("transaction_id"), "")
        from_account = _safe_string(row.get("from_account"), "UNKNOWN")
        to_account = _safe_string(row.get("to_account"), "UNKNOWN")
        amount = round(_safe_float(row.get("amount"), 0.0), 2)
        tx_type = _safe_string(row.get("transaction_type"), "UNKNOWN").upper()
        is_fraud = _safe_int(row.get("is_fraud"), 0)

        risk_score = _derive_risk_score(is_fraud, amount, tx_type)
        status = "blocked" if is_fraud == 1 and risk_score >= 70 else _derive_status(risk_score)

        normalized.append(
            {
                "id": tx_id,
                "from_account": from_account,
                "to_account": to_account,
                "amount": amount,
                "currency": "INR",
                "timestamp": _parse_timestamp(row.get("timestamp")),
                "risk_score": risk_score,
                "status": status,
                "type": tx_type,
                "institution": _infer_institution(from_account),
                "is_fraud_label": is_fraud,
                "source_dataset": "transactions.csv",
            }
        )

    return normalized


def _replace_collection(db: Database, collection_name: str, docs: list[dict[str, Any]], batch_size: int = 2000) -> int:
    collection = db[collection_name]
    collection.delete_many({})

    if not docs:
        return 0

    for start in range(0, len(docs), batch_size):
        collection.insert_many(docs[start : start + batch_size], ordered=False)

    return len(docs)


def ingest_csv_datasets(db: Database, *, force: bool = False) -> dict[str, int]:
    data_dir = resolve_data_dir()
    signatures = {
        file_name: int((data_dir / file_name).stat().st_mtime_ns)
        for file_name in CSV_FILES
        if (data_dir / file_name).exists()
    }

    state_collection = db["dataset_ingestion_state"]
    state_key = "csv_data_ingestion_v1"
    state = state_collection.find_one({"key": state_key}, {"_id": 0})

    if not force and state and state.get("signatures") == signatures:
        previous = state.get("collection_counts") or {}
        return {str(key): int(value) for key, value in previous.items()}

    counts: dict[str, int] = {}

    for file_name in CSV_FILES:
        path = data_dir / file_name
        if not path.exists():
            counts[f"raw_{path.stem}"] = 0
            continue

        raw_records = _read_csv_records(path)
        raw_collection = f"raw_{path.stem}"
        counts[raw_collection] = _replace_collection(db, raw_collection, raw_records)

        if file_name == "transactions.csv":
            normalized_transactions = _normalize_transaction_records(path)
            counts["transactions"] = _replace_collection(db, "transactions", normalized_transactions)

    db["transactions"].create_index("id")
    db["transactions"].create_index("timestamp")
    db["transactions"].create_index("status")
    db["transactions"].create_index("type")
    db["transactions"].create_index("risk_score")

    state_collection.update_one(
        {"key": state_key},
        {
            "$set": {
                "key": state_key,
                "signatures": signatures,
                "collection_counts": counts,
                "updated_at": datetime.now(timezone.utc),
                "data_dir": str(data_dir),
            }
        },
        upsert=True,
    )

    return counts