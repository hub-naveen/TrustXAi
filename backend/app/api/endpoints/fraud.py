from __future__ import annotations

import asyncio
import csv
import hashlib
import hmac
import io
import json
import re
import textwrap
import zipfile
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import Response, StreamingResponse
from pymongo.database import Database

from app.api.endpoints._utils import clean_doc
from app.core.config import settings
from app.core.deps import get_current_user, normalize_case_ids, require_roles
from app.core.types import RoleEnum
from app.db.mongo import get_db
from app.schemas.api import (
    AlertRead,
    FraudDNARead,
    InvestigationCaseOption,
    InvestigationCaseRead,
    InvestigationAuditLogRead,
    InvestigationAuditVerifyResponse,
    InvestigationEdgeRead,
    InvestigationMergedResponse,
    InvestigationNodeRead,
    InvestigationPathRiskRead,
    WorkflowAssigneeRead,
    WorkflowCaseAssignRequest,
    WorkflowCaseCommentCreateRequest,
    WorkflowCaseCreateRequest,
    WorkflowCaseRead,
    WorkflowCaseStatusUpdateRequest,
)

router = APIRouter(
    prefix="/fraud-intelligence",
    tags=["fraud-intelligence"],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst))],
)

EVIDENCE_STORAGE_ROOT = Path(__file__).resolve().parents[3] / "uploads" / "evidence"
AUDIT_LOG_COLLECTION = "investigation_audit_logs"
SIGNATURE_ALGORITHM = "HMAC-SHA256"
VALID_WORKFLOW_PRIORITIES = {"low", "medium", "high", "critical"}
VALID_WORKFLOW_STATUSES = {
    "open",
    "assigned",
    "in_progress",
    "on_hold",
    "resolved",
    "closed",
    "reopened",
}
WORKFLOW_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "open": {"assigned", "in_progress", "closed"},
    "assigned": {"in_progress", "on_hold", "closed"},
    "in_progress": {"on_hold", "resolved", "closed"},
    "on_hold": {"in_progress", "resolved", "closed"},
    "resolved": {"closed", "reopened"},
    "closed": {"reopened"},
    "reopened": {"assigned", "in_progress", "closed"},
}


def _to_utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def _sha256_hex_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _sign_payload_bytes(payload: bytes, subject: str) -> dict[str, str]:
    digest = _sha256_hex_bytes(payload)
    signed_at = datetime.now(timezone.utc).isoformat()
    signable = f"{subject}:{digest}:{signed_at}".encode("utf-8")
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        signable,
        hashlib.sha256,
    ).hexdigest()
    return {
        "algorithm": SIGNATURE_ALGORITHM,
        "digest_sha256": digest,
        "signed_at": signed_at,
        "signature": signature,
    }


def _signature_headers(signature: dict[str, str]) -> dict[str, str]:
    return {
        "X-TrustXAi-Signature": signature["signature"],
        "X-TrustXAi-Signature-Alg": signature["algorithm"],
        "X-TrustXAi-Digest-Sha256": signature["digest_sha256"],
        "X-TrustXAi-Signed-At": signature["signed_at"],
    }


def _normalize_case_ids_or_422(case_ids: list[str]) -> list[str]:
    normalized = normalize_case_ids(case_ids)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one investigation case ID is required",
        )
    return normalized


def _load_selected_cases_or_404(db: Database, case_ids: list[str]) -> list[dict]:
    normalized_case_ids = _normalize_case_ids_or_422(case_ids)

    rows = list(
        db["investigation_cases"].find(
            {"case_id": {"$in": normalized_case_ids}},
            {"_id": 0},
        )
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No investigation cases found")

    indexed = {str(row["case_id"]): row for row in rows if row.get("case_id")}
    missing = [case_id for case_id in normalized_case_ids if case_id not in indexed]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case IDs not found: {', '.join(missing)}",
        )

    return [indexed[case_id] for case_id in normalized_case_ids]


def _compute_audit_hash(
    sequence: int,
    timestamp: datetime,
    actor_user_id: int,
    actor_name: str,
    action: str,
    entity_type: str,
    entity_id: str,
    case_id: str | None,
    payload: dict[str, Any],
    previous_hash: str,
) -> str:
    hash_payload = {
        "sequence": sequence,
        "timestamp": _to_utc(timestamp).isoformat(),
        "actor_user_id": actor_user_id,
        "actor_name": actor_name,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "case_id": case_id,
        "payload": payload,
        "previous_hash": previous_hash,
    }
    return hashlib.sha256(_canonical_json(hash_payload).encode("utf-8")).hexdigest()


def _record_audit_log(
    db: Database,
    *,
    actor_user: dict,
    action: str,
    entity_type: str,
    entity_id: str,
    case_id: str | None,
    payload: dict[str, Any],
) -> dict:
    logs = db[AUDIT_LOG_COLLECTION]
    last_log = logs.find_one({}, {"_id": 0, "sequence": 1, "hash": 1}, sort=[("sequence", -1)])

    sequence = int(last_log["sequence"]) + 1 if last_log else 1
    previous_hash = str(last_log.get("hash") if last_log else "0")
    now_raw = datetime.now(timezone.utc)
    # MongoDB stores datetime at millisecond precision, so normalize before hashing.
    now = now_raw.replace(microsecond=(now_raw.microsecond // 1000) * 1000)

    normalized_payload = jsonable_encoder(payload)
    current_hash = _compute_audit_hash(
        sequence=sequence,
        timestamp=now,
        actor_user_id=int(actor_user["id"]),
        actor_name=str(actor_user["full_name"]),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        case_id=case_id,
        payload=normalized_payload,
        previous_hash=previous_hash,
    )

    document = {
        "log_id": f"AUD-{now.strftime('%Y%m%d')}-{uuid4().hex[:8].upper()}",
        "sequence": sequence,
        "hash_version": 2,
        "timestamp": now,
        "actor_user_id": int(actor_user["id"]),
        "actor_name": str(actor_user["full_name"]),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "case_id": case_id,
        "payload": normalized_payload,
        "previous_hash": previous_hash,
        "hash": current_hash,
    }
    logs.insert_one(document)
    return document


def _verify_audit_log_chain(rows: list[dict]) -> dict[str, Any]:
    if not rows:
        return {
            "valid": True,
            "checked_records": 0,
            "reason": "No activity logs found for supplied filters",
            "latest_hash": None,
        }

    previous_hash = "0"
    checked = 0

    for row in rows:
        checked += 1
        expected_previous = previous_hash
        actual_previous = str(row.get("previous_hash") or "")
        if actual_previous != expected_previous:
            return {
                "valid": False,
                "checked_records": checked,
                "reason": f"Previous hash mismatch at sequence {row.get('sequence')}",
                "latest_hash": previous_hash,
            }

        hash_version = int(row.get("hash_version") or 1)
        if hash_version >= 2:
            computed = _compute_audit_hash(
                sequence=int(row.get("sequence") or 0),
                timestamp=_to_utc(row.get("timestamp")),
                actor_user_id=int(row.get("actor_user_id") or 0),
                actor_name=str(row.get("actor_name") or ""),
                action=str(row.get("action") or ""),
                entity_type=str(row.get("entity_type") or ""),
                entity_id=str(row.get("entity_id") or ""),
                case_id=str(row.get("case_id")) if row.get("case_id") else None,
                payload=row.get("payload") or {},
                previous_hash=actual_previous,
            )
            if str(row.get("hash") or "") != computed:
                return {
                    "valid": False,
                    "checked_records": checked,
                    "reason": f"Hash mismatch at sequence {row.get('sequence')}",
                    "latest_hash": previous_hash,
                }
        elif not row.get("hash"):
            return {
                "valid": False,
                "checked_records": checked,
                "reason": f"Missing hash at sequence {row.get('sequence')}",
                "latest_hash": previous_hash,
            }

        previous_hash = str(row.get("hash") or "")

    return {
        "valid": True,
        "checked_records": checked,
        "reason": "Activity log hash chain verified",
        "latest_hash": previous_hash,
    }


def _format_amount(amount: float) -> str:
    if amount >= 10000000:
        return f"Rs {amount / 10000000:.2f}Cr"
    if amount >= 100000:
        return f"Rs {amount / 100000:.2f}L"
    return f"Rs {amount:,.0f}"


def _wrap_report_line(text: str, width: int = 100) -> list[str]:
    if not text:
        return [""]
    return textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False) or [text]


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_simple_pdf(lines: list[str]) -> bytes:
    max_lines = 52
    prepared: list[str] = []
    for line in lines:
        prepared.extend(_wrap_report_line(line))

    if len(prepared) > max_lines:
        prepared = prepared[: max_lines - 1] + ["... report truncated for single-page export ..."]

    content_lines = [
        "BT",
        "/F1 10 Tf",
        "14 TL",
        "50 790 Td",
    ]
    for line in prepared:
        content_lines.append(f"({_escape_pdf_text(line)}) Tj")
        content_lines.append("T*")
    content_lines.append("ET")

    stream = "\n".join(content_lines).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(b"trailer\n")
    pdf.extend(f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode("ascii"))
    pdf.extend(b"startxref\n")
    pdf.extend(f"{xref_offset}\n".encode("ascii"))
    pdf.extend(b"%%EOF")
    return bytes(pdf)


def _build_export_payload(db: Database, case_ids: list[str]) -> dict[str, Any]:
    selected_cases = _load_selected_cases_or_404(db, case_ids)
    normalized_case_ids = [str(case["case_id"]) for case in selected_cases]

    serialized_cases = [serialize_case(case) for case in selected_cases]

    all_edges: list[dict[str, Any]] = []
    all_path_risks: list[dict[str, Any]] = []
    node_lookup: dict[str, str] = {}
    for case in serialized_cases:
        for node in case.nodes:
            node_lookup[node.id] = node.label
        for edge in case.edges:
            all_edges.append(
                {
                    "case_id": case.case_id,
                    "edge_id": edge.id,
                    "from_node_id": edge.from_node_id,
                    "to_node_id": edge.to_node_id,
                    "from_label": node_lookup.get(edge.from_node_id, edge.from_node_id),
                    "to_label": node_lookup.get(edge.to_node_id, edge.to_node_id),
                    "amount": float(edge.amount),
                    "currency": edge.currency,
                    "timestamp": _to_utc(edge.timestamp).isoformat(),
                    "tx_ref": edge.tx_ref,
                }
            )
        for risk in case.path_risks:
            all_path_risks.append(
                {
                    "case_id": case.case_id,
                    "risk_id": risk.id,
                    "label": risk.label,
                    "risk_score": int(risk.risk_score),
                    "chain": [node_lookup.get(node_id, node_id) for node_id in risk.chain],
                    "explanation": risk.explanation,
                }
            )

    tx_refs = sorted({edge["tx_ref"] for edge in all_edges if edge.get("tx_ref")})
    transaction_rows = list(
        db["transactions"].find(
            {"id": {"$in": tx_refs}},
            {"_id": 0},
        )
    ) if tx_refs else []

    transaction_lookup = _build_transaction_lookup(db)
    alert_rows = list(
        db["alerts"].find(
            {"transaction_id": {"$in": tx_refs}},
            {"_id": 0},
        ).sort("timestamp", -1)
    ) if tx_refs else []
    enriched_alerts = [_enrich_alert_row(row, transaction_lookup) for row in alert_rows]

    workflow_rows = list(
        db["investigation_workflow_cases"].find(
            {"investigation_case_id": {"$in": normalized_case_ids}},
            {"_id": 0},
        ).sort("updated_at", -1)
    )
    serialized_workflows = [_serialize_workflow_case(row).model_dump(mode="json") for row in workflow_rows]

    case_summaries: list[dict[str, Any]] = []
    for case in serialized_cases:
        case_edges = [edge for edge in all_edges if edge["case_id"] == case.case_id]
        case_risks = [risk for risk in all_path_risks if risk["case_id"] == case.case_id]
        average_risk = round(
            sum(risk["risk_score"] for risk in case_risks) / max(len(case_risks), 1),
            1,
        )
        case_summaries.append(
            {
                "case_id": case.case_id,
                "title": case.title,
                "lead_agency": case.lead_agency,
                "node_count": len(case.nodes),
                "edge_count": len(case_edges),
                "path_risk_average": average_risk,
                "path_risk_max": max((risk["risk_score"] for risk in case_risks), default=0),
                "total_amount": round(sum(edge["amount"] for edge in case_edges), 2),
            }
        )

    total_amount = round(sum(edge["amount"] for edge in all_edges), 2)
    total_nodes = sum(len(case.nodes) for case in serialized_cases)
    highest_risk = max((risk["risk_score"] for risk in all_path_risks), default=0)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "case_ids": normalized_case_ids,
        "totals": {
            "case_count": len(serialized_cases),
            "total_nodes": total_nodes,
            "total_edges": len(all_edges),
            "total_amount": total_amount,
            "highest_risk": highest_risk,
            "linked_alerts": len(enriched_alerts),
            "workflow_items": len(serialized_workflows),
        },
        "cases": case_summaries,
        "edges": all_edges,
        "path_risks": sorted(all_path_risks, key=lambda item: item["risk_score"], reverse=True),
        "transactions": sorted(transaction_rows, key=lambda item: item.get("timestamp"), reverse=True),
        "alerts": enriched_alerts,
        "workflow_cases": serialized_workflows,
    }


def _build_report_pdf_bytes(report: dict[str, Any]) -> bytes:
    lines: list[str] = [
        "TrustXAi Regulator Investigation Report",
        f"Generated at: {report['generated_at']}",
        f"Cases: {', '.join(report['case_ids'])}",
        (
            "Totals: "
            f"nodes={report['totals']['total_nodes']}, "
            f"hops={report['totals']['total_edges']}, "
            f"alerts={report['totals']['linked_alerts']}, "
            f"workflow={report['totals']['workflow_items']}"
        ),
        f"Total observed value: {_format_amount(float(report['totals']['total_amount']))}",
        "",
        "Case Summary:",
    ]

    for case in report["cases"]:
        lines.append(
            (
                f"- {case['case_id']} | {case['title']} | agency={case['lead_agency']} | "
                f"nodes={case['node_count']} hops={case['edge_count']} "
                f"risk(avg/max)={case['path_risk_average']}/{case['path_risk_max']} "
                f"amount={_format_amount(float(case['total_amount']))}"
            )
        )

    lines.extend(["", "Top Suspicious Chains:"])
    for risk in report["path_risks"][:8]:
        chain = " -> ".join(risk["chain"])
        lines.append(f"- {risk['case_id']} | {risk['label']} ({risk['risk_score']}%): {chain}")

    lines.extend(["", "Linked Alerts (Top 8):"])
    for alert in report["alerts"][:8]:
        lines.append(
            (
                f"- {alert['id']} [{alert['severity']}] tx={alert['transaction_id']} "
                f"risk={alert.get('risk_score') or 0} "
                f"model={int(round((alert.get('model_confidence') or 0) * 100))}% "
                f"rules={int(round((alert.get('rule_confidence') or 0) * 100))}%"
            )
        )

    lines.extend(["", "Workflow Snapshot:"])
    for workflow in report["workflow_cases"][:8]:
        lines.append(
            (
                f"- {workflow['workflow_case_id']} {workflow['status']} "
                f"priority={workflow['priority']} assignee={workflow.get('assigned_to_name') or 'unassigned'} "
                f"sla_breached={workflow['sla_breached']}"
            )
        )

    return _build_simple_pdf(lines)


def _build_report_csv_bytes(report: dict[str, Any]) -> bytes:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)

    writer.writerow(["report_generated_at", report["generated_at"]])
    writer.writerow(["case_ids", "|".join(report["case_ids"])])
    writer.writerow(["total_cases", report["totals"]["case_count"]])
    writer.writerow(["total_nodes", report["totals"]["total_nodes"]])
    writer.writerow(["total_edges", report["totals"]["total_edges"]])
    writer.writerow(["total_amount", report["totals"]["total_amount"]])
    writer.writerow(["highest_risk", report["totals"]["highest_risk"]])
    writer.writerow([])

    writer.writerow([
        "section",
        "case_id",
        "title",
        "lead_agency",
        "node_count",
        "edge_count",
        "path_risk_average",
        "path_risk_max",
        "total_amount",
    ])
    for case in report["cases"]:
        writer.writerow([
            "case_summary",
            case["case_id"],
            case["title"],
            case["lead_agency"],
            case["node_count"],
            case["edge_count"],
            case["path_risk_average"],
            case["path_risk_max"],
            case["total_amount"],
        ])

    writer.writerow([])
    writer.writerow([
        "section",
        "case_id",
        "edge_id",
        "from_label",
        "to_label",
        "amount",
        "currency",
        "timestamp",
        "tx_ref",
    ])
    for edge in report["edges"]:
        writer.writerow([
            "edge",
            edge["case_id"],
            edge["edge_id"],
            edge["from_label"],
            edge["to_label"],
            edge["amount"],
            edge["currency"],
            edge["timestamp"],
            edge["tx_ref"],
        ])

    writer.writerow([])
    writer.writerow([
        "section",
        "case_id",
        "risk_id",
        "label",
        "risk_score",
        "chain",
        "explanation",
    ])
    for risk in report["path_risks"]:
        writer.writerow([
            "path_risk",
            risk["case_id"],
            risk["risk_id"],
            risk["label"],
            risk["risk_score"],
            " -> ".join(risk["chain"]),
            risk["explanation"],
        ])

    return buffer.getvalue().encode("utf-8")


def _build_audit_csv_bytes(rows: list[dict]) -> bytes:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow([
        "log_id",
        "sequence",
        "timestamp",
        "actor_user_id",
        "actor_name",
        "action",
        "entity_type",
        "entity_id",
        "case_id",
        "payload",
        "previous_hash",
        "hash",
    ])
    for row in rows:
        writer.writerow([
            row.get("log_id"),
            row.get("sequence"),
            _to_utc(row.get("timestamp")).isoformat(),
            row.get("actor_user_id"),
            row.get("actor_name"),
            row.get("action"),
            row.get("entity_type"),
            row.get("entity_id"),
            row.get("case_id") or "",
            _canonical_json(row.get("payload") or {}),
            row.get("previous_hash"),
            row.get("hash"),
        ])
    return buffer.getvalue().encode("utf-8")


def _normalize_priority(priority: str) -> str:
    normalized = priority.strip().lower()
    return normalized if normalized in VALID_WORKFLOW_PRIORITIES else "medium"


def _normalize_status_or_422(status_value: str) -> str:
    normalized = status_value.strip().lower()
    if normalized not in VALID_WORKFLOW_STATUSES:
        allowed = ", ".join(sorted(VALID_WORKFLOW_STATUSES))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{status_value}'. Allowed values: {allowed}",
        )
    return normalized


def _sanitize_string_ids(values: list[str] | None) -> list[str]:
    if not values:
        return []

    seen: set[str] = set()
    normalized: list[str] = []
    for value in values:
        item = value.strip()
        if not item or item in seen:
            continue
        seen.add(item)
        normalized.append(item)
    return normalized


def _build_transaction_lookup(db: Database) -> dict[str, dict]:
    projection = {
        "_id": 0,
        "id": 1,
        "from_account": 1,
        "to_account": 1,
        "amount": 1,
        "risk_score": 1,
        "type": 1,
        "status": 1,
        "institution": 1,
    }
    rows = list(db["transactions"].find({}, projection))
    return {str(row["id"]): row for row in rows if row.get("id")}


def _severity_to_risk(severity: str) -> int:
    mapping = {
        "critical": 95,
        "high": 82,
        "medium": 64,
        "low": 38,
    }
    return mapping.get(severity.lower(), 60)


def _derive_alert_explainability(alert: dict, transaction: dict | None) -> dict:
    text = f"{alert.get('title', '')} {alert.get('description', '')}".lower()
    severity = str(alert.get("severity", "medium")).lower()
    risk_score = _severity_to_risk(severity)
    top_factors: list[dict] = []
    related_entities: list[str] = []

    if transaction:
        tx_risk = int(transaction.get("risk_score") or risk_score)
        risk_score = max(risk_score, tx_risk)
        top_factors.append(
            {
                "factor": "Transaction risk score",
                "score": min(99, max(1, tx_risk)),
                "rationale": "Transaction risk score from fraud-scoring pipeline exceeded baseline.",
            }
        )

        amount = float(transaction.get("amount") or 0)
        amount_score = min(99, max(24, int(amount / 20000)))
        top_factors.append(
            {
                "factor": "Transfer amount anomaly",
                "score": amount_score,
                "rationale": "Transfer amount diverged from sender historical profile.",
            }
        )

        from_account = str(transaction.get("from_account") or "")
        to_account = str(transaction.get("to_account") or "")
        institution = str(transaction.get("institution") or "")
        related_entities.extend([from_account, to_account, institution])

        destination_text = f"{from_account} {to_account}".lower()
        if any(keyword in destination_text for keyword in ("wallet", "crypto", "exchange", "offshore", "international")):
            top_factors.append(
                {
                    "factor": "Destination risk profile",
                    "score": 90,
                    "rationale": "Counterparty pattern indicates elevated laundering or cross-border risk.",
                }
            )

    keyword_factor_map: list[tuple[str, str, int, str]] = [
        (
            "velocity",
            "Transaction velocity",
            95,
            "Burst transaction frequency crossed velocity rule threshold.",
        ),
        (
            "shell",
            "Shell entity exposure",
            97,
            "Beneficiary maps to shell-company indicators with weak economic footprint.",
        ),
        (
            "layer",
            "Layering behavior",
            92,
            "Multi-hop movement suggests intent to obfuscate source of funds.",
        ),
        (
            "smurf",
            "Structuring pattern",
            89,
            "Transaction splitting resembles structuring to avoid reporting controls.",
        ),
        (
            "crypto",
            "Crypto conversion path",
            88,
            "Fiat-to-crypto path matched known laundering bridge signatures.",
        ),
    ]
    for keyword, label, score, rationale in keyword_factor_map:
        if keyword in text:
            top_factors.append(
                {
                    "factor": label,
                    "score": score,
                    "rationale": rationale,
                }
            )

    if not top_factors:
        top_factors.append(
            {
                "factor": "Anomalous transaction pattern",
                "score": risk_score,
                "rationale": "Composite fraud controls flagged this activity as anomalous.",
            }
        )

    deduped: dict[str, dict] = {}
    for factor in sorted(top_factors, key=lambda item: item.get("score", 0), reverse=True):
        key = str(factor.get("factor", "")).strip().lower()
        if key and key not in deduped:
            deduped[key] = factor

    factors = list(deduped.values())[:4]
    average_factor = sum(item["score"] for item in factors) / max(len(factors), 1)

    return {
        "risk_score": risk_score,
        "model_confidence": round(min(0.99, max(0.5, (risk_score + 6) / 100)), 2),
        "rule_confidence": round(min(0.99, max(0.55, average_factor / 100)), 2),
        "top_factors": factors,
        "related_entities": [item for item in dict.fromkeys(related_entities) if item][:6],
    }


def _enrich_alert_row(alert: dict, transaction_lookup: dict[str, dict]) -> dict:
    row = dict(alert)
    transaction_id = str(row.get("transaction_id") or "")
    explainability = _derive_alert_explainability(row, transaction_lookup.get(transaction_id))

    if row.get("risk_score") is None:
        row["risk_score"] = explainability["risk_score"]
    if row.get("model_confidence") is None:
        row["model_confidence"] = explainability["model_confidence"]
    if row.get("rule_confidence") is None:
        row["rule_confidence"] = explainability["rule_confidence"]
    if not row.get("top_factors"):
        row["top_factors"] = explainability["top_factors"]
    if not row.get("related_entities"):
        row["related_entities"] = explainability["related_entities"]
    return row


def _build_generated_alert(transaction: dict) -> dict:
    tx_id = str(transaction.get("id") or uuid4().hex[:8].upper())
    risk_score = int(transaction.get("risk_score") or 0)
    status_value = str(transaction.get("status") or "").lower()

    if risk_score >= 90 or status_value == "blocked":
        severity = "critical"
    elif risk_score >= 80:
        severity = "high"
    else:
        severity = "medium"

    from_account = str(transaction.get("from_account") or "Unknown source")
    to_account = str(transaction.get("to_account") or "Unknown destination")
    tx_type = str(transaction.get("type") or "transfer")

    title = "Suspicious Transaction Update"
    if "crypto" in f"{from_account} {to_account} {tx_type}".lower():
        title = "Real-Time Crypto Exposure Alert"
    elif "offshore" in f"{from_account} {to_account}".lower():
        title = "Real-Time Offshore Transfer Alert"
    elif status_value == "blocked":
        title = "Real-Time Blocked Transaction Alert"

    alert = {
        "id": f"ALT-AUTO-{re.sub(r'[^A-Za-z0-9]', '', tx_id)}",
        "title": title,
        "description": f"Auto-generated suspicious update for {tx_type}: {from_account} -> {to_account}",
        "severity": severity,
        "timestamp": datetime.now(timezone.utc),
        "transaction_id": tx_id,
    }
    alert.update(_derive_alert_explainability(alert, transaction))
    return alert


def _upsert_generated_alerts(db: Database, max_new: int = 2) -> list[dict]:
    if max_new <= 0:
        return []

    existing_tx_ids = {
        str(row.get("transaction_id"))
        for row in db["alerts"].find({}, {"_id": 0, "transaction_id": 1})
        if row.get("transaction_id")
    }

    suspicious_rows = list(
        db["transactions"]
        .find(
            {
                "$or": [
                    {"risk_score": {"$gte": 85}},
                    {"status": {"$in": ["blocked", "flagged"]}},
                ]
            },
            {"_id": 0},
        )
        .sort("timestamp", -1)
        .limit(200)
    )

    created: list[dict] = []
    for transaction in reversed(suspicious_rows):
        tx_id = str(transaction.get("id") or "").strip()
        if not tx_id or tx_id in existing_tx_ids:
            continue

        alert = _build_generated_alert(transaction)
        db["alerts"].insert_one(alert)
        created.append(alert)
        existing_tx_ids.add(tx_id)

        if len(created) >= max_new:
            break

    return created


def _get_workflow_case_or_404(db: Database, workflow_case_id: str) -> dict:
    case = clean_doc(
        db["investigation_workflow_cases"].find_one(
            {"workflow_case_id": workflow_case_id},
            {"_id": 0},
        )
    )
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow case not found")
    return case


def _serialize_workflow_case(case: dict) -> WorkflowCaseRead:
    now = datetime.now(timezone.utc)
    due_at = _to_utc(case.get("due_at"))
    status_value = str(case.get("status") or "open").strip().lower()
    normalized_status = status_value if status_value in VALID_WORKFLOW_STATUSES else "open"
    remaining_seconds = int((due_at - now).total_seconds())

    payload = {
        **case,
        "priority": _normalize_priority(str(case.get("priority") or "medium")),
        "status": normalized_status,
        "created_at": _to_utc(case.get("created_at")),
        "updated_at": _to_utc(case.get("updated_at")),
        "due_at": due_at,
        "related_alert_ids": _sanitize_string_ids(case.get("related_alert_ids")),
        "related_transaction_ids": _sanitize_string_ids(case.get("related_transaction_ids")),
        "comments": case.get("comments") or [],
        "evidence": case.get("evidence") or [],
        "sla_remaining_seconds": remaining_seconds,
        "sla_breached": remaining_seconds < 0 and normalized_status not in {"resolved", "closed"},
    }
    return WorkflowCaseRead.model_validate(payload)


def _resolve_assignee_or_404(db: Database, assignee_user_id: int) -> dict:
    assignee = clean_doc(
        db["users"].find_one(
            {
                "id": assignee_user_id,
                "is_active": True,
                "role": {"$in": [RoleEnum.admin.value, RoleEnum.analyst.value]},
            },
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1},
        )
    )
    if not assignee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
    return assignee


def _validate_transition_or_409(current_status: str, next_status: str) -> None:
    if current_status == next_status:
        return
    allowed = WORKFLOW_STATUS_TRANSITIONS.get(current_status, set())
    if next_status not in allowed:
        allowed_list = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid status transition from '{current_status}' to '{next_status}'. Allowed: {allowed_list}",
        )


def serialize_case(case: dict) -> InvestigationCaseRead:
    nodes = [InvestigationNodeRead.model_validate(node) for node in case.get("nodes", [])]
    edges = sorted(case.get("edges", []), key=lambda edge: _to_utc(edge.get("timestamp")))
    path_risks = sorted(case.get("path_risks", []), key=lambda risk: risk.get("risk_score", 0), reverse=True)

    return InvestigationCaseRead(
        case_id=case["case_id"],
        title=case["title"],
        lead_agency=case["lead_agency"],
        source_node_id=case["source_node_id"],
        destination_node_ids=case.get("destination_node_ids", []),
        nodes=nodes,
        edges=[InvestigationEdgeRead.model_validate(edge) for edge in edges],
        path_risks=[InvestigationPathRiskRead.model_validate(risk) for risk in path_risks],
    )


@router.get("/dna", response_model=list[FraudDNARead])
def list_fraud_dna(db: Database = Depends(get_db)) -> list[FraudDNARead]:
    rows = list(db["fraud_dna"].find({}, {"_id": 0}).sort("detected_at", -1))
    return [FraudDNARead.model_validate(row) for row in rows]


@router.get("/alerts", response_model=list[AlertRead])
def list_fraud_alerts(db: Database = Depends(get_db)) -> list[AlertRead]:
    _upsert_generated_alerts(db, max_new=3)

    transaction_lookup = _build_transaction_lookup(db)
    rows = list(db["alerts"].find({}, {"_id": 0}).sort("timestamp", -1))
    return [AlertRead.model_validate(_enrich_alert_row(row, transaction_lookup)) for row in rows]


@router.get("/alerts/stream")
async def stream_fraud_alerts(
    request: Request,
    db: Database = Depends(get_db),
) -> StreamingResponse:
    async def event_generator():
        yield "retry: 4000\n\n"
        _upsert_generated_alerts(db, max_new=6)

        transaction_lookup = _build_transaction_lookup(db)
        initial_rows = list(db["alerts"].find({}, {"_id": 0}).sort("timestamp", -1).limit(10))

        seen_alert_ids: set[str] = set()
        last_seen_timestamp = datetime.now(timezone.utc) - timedelta(days=3650)

        for row in reversed(initial_rows):
            enriched = _enrich_alert_row(row, transaction_lookup)
            alert_id = str(enriched.get("id") or "")
            if alert_id:
                seen_alert_ids.add(alert_id)

            timestamp_value = enriched.get("timestamp")
            if isinstance(timestamp_value, datetime):
                last_seen_timestamp = max(last_seen_timestamp, _to_utc(timestamp_value))

            payload = json.dumps(jsonable_encoder(enriched), separators=(",", ":"))
            yield f"event: snapshot\ndata: {payload}\n\n"

        heartbeat_ticks = 0

        while True:
            if await request.is_disconnected():
                break

            _upsert_generated_alerts(db, max_new=1)

            transaction_lookup = _build_transaction_lookup(db)
            rows = list(
                db["alerts"]
                .find({"timestamp": {"$gte": last_seen_timestamp}}, {"_id": 0})
                .sort("timestamp", 1)
                .limit(120)
            )

            emitted = False
            for row in rows:
                enriched = _enrich_alert_row(row, transaction_lookup)
                alert_id = str(enriched.get("id") or "")
                if not alert_id or alert_id in seen_alert_ids:
                    continue

                seen_alert_ids.add(alert_id)

                timestamp_value = enriched.get("timestamp")
                if isinstance(timestamp_value, datetime):
                    last_seen_timestamp = max(last_seen_timestamp, _to_utc(timestamp_value))

                payload = json.dumps(jsonable_encoder(enriched), separators=(",", ":"))
                yield f"event: alert\ndata: {payload}\n\n"
                emitted = True

            if emitted:
                heartbeat_ticks = 0
            else:
                heartbeat_ticks += 1
                if heartbeat_ticks >= 3:
                    heartbeat = json.dumps({"status": "ok", "ts": datetime.now(timezone.utc).isoformat()})
                    yield f"event: heartbeat\ndata: {heartbeat}\n\n"
                    heartbeat_ticks = 0

            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/investigation/options", response_model=list[InvestigationCaseOption])
def list_investigation_options(db: Database = Depends(get_db)) -> list[InvestigationCaseOption]:
    rows = list(db["investigation_cases"].find({}, {"_id": 0, "case_id": 1, "title": 1, "lead_agency": 1}).sort("case_id", 1))
    return [InvestigationCaseOption.model_validate(row) for row in rows]


@router.get("/investigation/cases", response_model=list[InvestigationCaseRead])
def list_investigation_cases(db: Database = Depends(get_db)) -> list[InvestigationCaseRead]:
    rows = list(db["investigation_cases"].find({}, {"_id": 0}).sort("case_id", 1))
    return [serialize_case(row) for row in rows]


@router.get("/investigation/cases/{case_id}", response_model=InvestigationCaseRead)
def get_investigation_case(case_id: str, db: Database = Depends(get_db)) -> InvestigationCaseRead:
    case = clean_doc(db["investigation_cases"].find_one({"case_id": case_id}))
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return serialize_case(case)


@router.get("/investigation/merge", response_model=InvestigationMergedResponse)
def merge_cases(
    case_ids: list[str] = Query(default=[]),
    db: Database = Depends(get_db),
) -> InvestigationMergedResponse:
    normalized_case_ids = normalize_case_ids(case_ids)
    if not normalized_case_ids:
        return InvestigationMergedResponse(
            selected_cases=[],
            nodes=[],
            edges=[],
            source_node_ids=[],
            destination_node_ids=[],
            path_risks=[],
            common_node_ids=[],
            shared_pattern_labels=[],
        )

    case_rows = list(db["investigation_cases"].find({"case_id": {"$in": normalized_case_ids}}, {"_id": 0}))
    selected_cases = [serialize_case(case) for case in case_rows]

    node_map: dict[str, InvestigationNodeRead] = {}
    edge_map: dict[str, InvestigationEdgeRead] = {}
    risk_map: dict[str, InvestigationPathRiskRead] = {}
    source_node_ids: list[str] = []
    destination_node_ids: list[str] = []
    node_frequency: Counter[str] = Counter()
    label_frequency: Counter[str] = Counter()

    for case in selected_cases:
        source_node_ids.append(case.source_node_id)
        destination_node_ids.extend(case.destination_node_ids)

        labels_in_case = set()
        for node in case.nodes:
            node_map[node.id] = node
            node_frequency[node.id] += 1

        for edge in case.edges:
            edge_map[edge.id] = edge

        for risk in case.path_risks:
            risk_map[risk.id] = risk
            labels_in_case.add(risk.label)

        for label in labels_in_case:
            label_frequency[label] += 1

    return InvestigationMergedResponse(
        selected_cases=selected_cases,
        nodes=list(node_map.values()),
        edges=sorted(edge_map.values(), key=lambda edge: edge.timestamp),
        source_node_ids=sorted(set(source_node_ids)),
        destination_node_ids=sorted(set(destination_node_ids)),
        path_risks=list(risk_map.values()),
        common_node_ids=sorted([node_id for node_id, count in node_frequency.items() if count > 1]),
        shared_pattern_labels=sorted([label for label, count in label_frequency.items() if count > 1]),
    )


@router.get("/investigation/workflow/assignees", response_model=list[WorkflowAssigneeRead])
def list_workflow_assignees(db: Database = Depends(get_db)) -> list[WorkflowAssigneeRead]:
    rows = list(
        db["users"]
        .find(
            {
                "is_active": True,
                "role": {"$in": [RoleEnum.admin.value, RoleEnum.analyst.value]},
            },
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1},
        )
        .sort("id", 1)
    )

    return [
        WorkflowAssigneeRead(
            user_id=row["id"],
            name=row["full_name"],
            email=row["email"],
            role=row["role"],
        )
        for row in rows
    ]


@router.get("/investigation/workflow/cases", response_model=list[WorkflowCaseRead])
def list_workflow_cases(
    investigation_case_id: str | None = Query(default=None),
    db: Database = Depends(get_db),
) -> list[WorkflowCaseRead]:
    query: dict = {}
    normalized_case_id = (investigation_case_id or "").strip()
    if normalized_case_id:
        query["investigation_case_id"] = normalized_case_id

    rows = list(
        db["investigation_workflow_cases"]
        .find(query, {"_id": 0})
        .sort("updated_at", -1)
    )
    return [_serialize_workflow_case(row) for row in rows]


@router.post(
    "/investigation/workflow/cases",
    response_model=WorkflowCaseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_workflow_case(
    payload: WorkflowCaseCreateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> WorkflowCaseRead:
    now = datetime.now(timezone.utc)
    normalized_case_id = payload.investigation_case_id.strip() if payload.investigation_case_id else None

    if normalized_case_id:
        exists = db["investigation_cases"].find_one(
            {"case_id": normalized_case_id},
            {"_id": 1, "case_id": 1},
        )
        if not exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked investigation case not found")

    assignee_user_id: int | None = None
    assignee_name: str | None = None
    workflow_status = "open"

    if payload.assigned_to_user_id is not None:
        assignee = _resolve_assignee_or_404(db, payload.assigned_to_user_id)
        assignee_user_id = int(assignee["id"])
        assignee_name = str(assignee["full_name"])
        workflow_status = "assigned"

    workflow_case = {
        "workflow_case_id": f"WFC-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}",
        "investigation_case_id": normalized_case_id,
        "title": payload.title.strip(),
        "summary": payload.summary.strip() if payload.summary else None,
        "priority": _normalize_priority(payload.priority),
        "status": workflow_status,
        "created_at": now,
        "updated_at": now,
        "created_by_user_id": int(current_user["id"]),
        "created_by_name": str(current_user["full_name"]),
        "assigned_to_user_id": assignee_user_id,
        "assigned_to_name": assignee_name,
        "due_at": now + timedelta(hours=payload.sla_hours),
        "related_alert_ids": _sanitize_string_ids(payload.related_alert_ids),
        "related_transaction_ids": _sanitize_string_ids(payload.related_transaction_ids),
        "comments": [],
        "evidence": [],
    }

    db["investigation_workflow_cases"].insert_one(workflow_case)

    _record_audit_log(
        db,
        actor_user=current_user,
        action="workflow_case_created",
        entity_type="workflow_case",
        entity_id=workflow_case["workflow_case_id"],
        case_id=workflow_case.get("investigation_case_id"),
        payload={
            "priority": workflow_case["priority"],
            "status": workflow_case["status"],
            "assigned_to_user_id": workflow_case.get("assigned_to_user_id"),
            "sla_hours": payload.sla_hours,
            "related_alert_ids": workflow_case["related_alert_ids"],
            "related_transaction_ids": workflow_case["related_transaction_ids"],
        },
    )

    return _serialize_workflow_case(workflow_case)


@router.get("/investigation/workflow/cases/{workflow_case_id}", response_model=WorkflowCaseRead)
def get_workflow_case(
    workflow_case_id: str,
    db: Database = Depends(get_db),
) -> WorkflowCaseRead:
    case = _get_workflow_case_or_404(db, workflow_case_id)
    return _serialize_workflow_case(case)


@router.post("/investigation/workflow/cases/{workflow_case_id}/assign", response_model=WorkflowCaseRead)
def assign_workflow_case(
    workflow_case_id: str,
    payload: WorkflowCaseAssignRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> WorkflowCaseRead:
    case = _get_workflow_case_or_404(db, workflow_case_id)
    assignee = _resolve_assignee_or_404(db, payload.assignee_user_id)

    next_status = str(case.get("status") or "open").strip().lower()
    if next_status in {"open", "reopened"}:
        next_status = "assigned"

    db["investigation_workflow_cases"].update_one(
        {"workflow_case_id": workflow_case_id},
        {
            "$set": {
                "assigned_to_user_id": int(assignee["id"]),
                "assigned_to_name": str(assignee["full_name"]),
                "status": next_status,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated_case = _get_workflow_case_or_404(db, workflow_case_id)

    _record_audit_log(
        db,
        actor_user=current_user,
        action="workflow_case_assigned",
        entity_type="workflow_case",
        entity_id=workflow_case_id,
        case_id=updated_case.get("investigation_case_id"),
        payload={
            "assigned_to_user_id": int(assignee["id"]),
            "assigned_to_name": str(assignee["full_name"]),
            "status": next_status,
        },
    )

    return _serialize_workflow_case(updated_case)


@router.post("/investigation/workflow/cases/{workflow_case_id}/status", response_model=WorkflowCaseRead)
def update_workflow_case_status(
    workflow_case_id: str,
    payload: WorkflowCaseStatusUpdateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> WorkflowCaseRead:
    case = _get_workflow_case_or_404(db, workflow_case_id)
    current_status = _normalize_status_or_422(str(case.get("status") or "open"))
    next_status = _normalize_status_or_422(payload.status)
    _validate_transition_or_409(current_status, next_status)

    db["investigation_workflow_cases"].update_one(
        {"workflow_case_id": workflow_case_id},
        {
            "$set": {
                "status": next_status,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated_case = _get_workflow_case_or_404(db, workflow_case_id)

    _record_audit_log(
        db,
        actor_user=current_user,
        action="workflow_status_changed",
        entity_type="workflow_case",
        entity_id=workflow_case_id,
        case_id=updated_case.get("investigation_case_id"),
        payload={
            "from_status": current_status,
            "to_status": next_status,
        },
    )

    return _serialize_workflow_case(updated_case)


@router.post("/investigation/workflow/cases/{workflow_case_id}/comments", response_model=WorkflowCaseRead)
def add_workflow_case_comment(
    workflow_case_id: str,
    payload: WorkflowCaseCommentCreateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> WorkflowCaseRead:
    _get_workflow_case_or_404(db, workflow_case_id)

    message = payload.message.strip()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Comment cannot be empty",
        )

    comment = {
        "id": f"CMT-{uuid4().hex[:10].upper()}",
        "author_user_id": int(current_user["id"]),
        "author_name": str(current_user["full_name"]),
        "message": message,
        "created_at": datetime.now(timezone.utc),
    }

    db["investigation_workflow_cases"].update_one(
        {"workflow_case_id": workflow_case_id},
        {
            "$push": {"comments": comment},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    updated_case = _get_workflow_case_or_404(db, workflow_case_id)

    _record_audit_log(
        db,
        actor_user=current_user,
        action="workflow_comment_added",
        entity_type="workflow_case",
        entity_id=workflow_case_id,
        case_id=updated_case.get("investigation_case_id"),
        payload={
            "comment_id": comment["id"],
            "message": message,
        },
    )

    return _serialize_workflow_case(updated_case)


@router.post("/investigation/workflow/cases/{workflow_case_id}/evidence", response_model=WorkflowCaseRead)
async def upload_workflow_evidence(
    workflow_case_id: str,
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> WorkflowCaseRead:
    _get_workflow_case_or_404(db, workflow_case_id)

    original_name = (file.filename or "").strip()
    if not original_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Evidence file name is required")

    content = await file.read()
    await file.close()

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Evidence file is empty")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Evidence file exceeds 10 MB")

    sanitized_name = re.sub(r"[^A-Za-z0-9._-]", "_", original_name)
    storage_dir = EVIDENCE_STORAGE_ROOT / workflow_case_id
    storage_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid4().hex[:10]}_{sanitized_name}"
    disk_path = storage_dir / stored_name
    disk_path.write_bytes(content)

    evidence_entry = {
        "id": f"EVD-{uuid4().hex[:10].upper()}",
        "filename": original_name,
        "content_type": file.content_type or "application/octet-stream",
        "size_bytes": len(content),
        "uploaded_by_user_id": int(current_user["id"]),
        "uploaded_by_name": str(current_user["full_name"]),
        "uploaded_at": datetime.now(timezone.utc),
        "storage_path": f"uploads/evidence/{workflow_case_id}/{stored_name}",
    }

    db["investigation_workflow_cases"].update_one(
        {"workflow_case_id": workflow_case_id},
        {
            "$push": {"evidence": evidence_entry},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    updated_case = _get_workflow_case_or_404(db, workflow_case_id)

    _record_audit_log(
        db,
        actor_user=current_user,
        action="workflow_evidence_uploaded",
        entity_type="workflow_case",
        entity_id=workflow_case_id,
        case_id=updated_case.get("investigation_case_id"),
        payload={
            "evidence_id": evidence_entry["id"],
            "filename": evidence_entry["filename"],
            "size_bytes": evidence_entry["size_bytes"],
            "content_type": evidence_entry["content_type"],
        },
    )

    return _serialize_workflow_case(updated_case)


@router.get("/investigation/audit/logs/verify", response_model=InvestigationAuditVerifyResponse)
def verify_investigation_audit_logs(
    case_ids: list[str] = Query(default=[]),
    db: Database = Depends(get_db),
) -> InvestigationAuditVerifyResponse:
    normalized_case_ids = normalize_case_ids(case_ids)
    full_rows = list(
        db[AUDIT_LOG_COLLECTION]
        .find({}, {"_id": 0})
        .sort("sequence", 1)
    )
    verification = _verify_audit_log_chain(full_rows)

    if normalized_case_ids:
        filtered_count = db[AUDIT_LOG_COLLECTION].count_documents({"case_id": {"$in": normalized_case_ids}})
        verification["reason"] = f"{verification['reason']}; filtered_case_logs={filtered_count}"

    return InvestigationAuditVerifyResponse.model_validate(verification)


@router.get("/investigation/audit/logs", response_model=list[InvestigationAuditLogRead])
def list_investigation_audit_logs(
    case_ids: list[str] = Query(default=[]),
    limit: int = Query(default=200, ge=1, le=5000),
    db: Database = Depends(get_db),
) -> list[InvestigationAuditLogRead]:
    normalized_case_ids = normalize_case_ids(case_ids)
    query: dict[str, Any] = {}
    if normalized_case_ids:
        query["case_id"] = {"$in": normalized_case_ids}

    rows = list(
        db[AUDIT_LOG_COLLECTION]
        .find(query, {"_id": 0})
        .sort("sequence", -1)
        .limit(limit)
    )
    return [InvestigationAuditLogRead.model_validate(row) for row in rows]


@router.get("/investigation/reports/export/pdf")
def export_investigation_report_pdf(
    case_ids: list[str] = Query(default=[]),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Response:
    report = _build_export_payload(db, case_ids)
    pdf_bytes = _build_report_pdf_bytes(report)
    case_ref = "|".join(report["case_ids"])
    signature = _sign_payload_bytes(pdf_bytes, f"investigation-report-pdf:{case_ref}")

    timestamp_label = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"trustxai-investigation-report-{timestamp_label}.pdf"

    _record_audit_log(
        db,
        actor_user=current_user,
        action="compliance_report_pdf_exported",
        entity_type="regulator_export",
        entity_id=filename,
        case_id=report["case_ids"][0] if len(report["case_ids"]) == 1 else None,
        payload={
            "case_ids": report["case_ids"],
            "digest_sha256": signature["digest_sha256"],
            "signature_algorithm": signature["algorithm"],
            "totals": report["totals"],
        },
    )

    headers = {
        **_signature_headers(signature),
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get("/investigation/reports/export/csv")
def export_investigation_report_csv(
    case_ids: list[str] = Query(default=[]),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Response:
    report = _build_export_payload(db, case_ids)
    csv_bytes = _build_report_csv_bytes(report)
    case_ref = "|".join(report["case_ids"])
    signature = _sign_payload_bytes(csv_bytes, f"investigation-report-csv:{case_ref}")

    timestamp_label = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"trustxai-investigation-report-{timestamp_label}.csv"

    _record_audit_log(
        db,
        actor_user=current_user,
        action="compliance_report_csv_exported",
        entity_type="regulator_export",
        entity_id=filename,
        case_id=report["case_ids"][0] if len(report["case_ids"]) == 1 else None,
        payload={
            "case_ids": report["case_ids"],
            "digest_sha256": signature["digest_sha256"],
            "signature_algorithm": signature["algorithm"],
            "totals": report["totals"],
        },
    )

    headers = {
        **_signature_headers(signature),
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
    return Response(content=csv_bytes, media_type="text/csv", headers=headers)


@router.get("/investigation/reports/export/bundle")
def export_investigation_regulator_bundle(
    case_ids: list[str] = Query(default=[]),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Response:
    report = _build_export_payload(db, case_ids)
    case_ref = "|".join(report["case_ids"])

    pdf_bytes = _build_report_pdf_bytes(report)
    csv_bytes = _build_report_csv_bytes(report)

    case_audit_rows = list(
        db[AUDIT_LOG_COLLECTION]
        .find({"case_id": {"$in": report["case_ids"]}}, {"_id": 0})
        .sort("sequence", 1)
        .limit(10000)
    )
    full_audit_rows = list(
        db[AUDIT_LOG_COLLECTION]
        .find({}, {"_id": 0})
        .sort("sequence", 1)
    )
    audit_verification = _verify_audit_log_chain(full_audit_rows)
    audit_verification["reason"] = (
        f"{audit_verification['reason']}; filtered_case_logs={len(case_audit_rows)}"
    )
    audit_csv_bytes = _build_audit_csv_bytes(case_audit_rows)
    report_json_bytes = json.dumps(jsonable_encoder(report), indent=2).encode("utf-8")

    artifact_signatures = {
        "reports/investigation_report.pdf": _sign_payload_bytes(
            pdf_bytes,
            f"bundle-pdf:{case_ref}",
        ),
        "reports/investigation_report.csv": _sign_payload_bytes(
            csv_bytes,
            f"bundle-csv:{case_ref}",
        ),
        "audit/immutable_activity_logs.csv": _sign_payload_bytes(
            audit_csv_bytes,
            f"bundle-audit-csv:{case_ref}",
        ),
        "report/report_payload.json": _sign_payload_bytes(
            report_json_bytes,
            f"bundle-report-json:{case_ref}",
        ),
    }

    manifest_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "case_ids": report["case_ids"],
        "totals": report["totals"],
        "artifacts": artifact_signatures,
        "audit_chain_verification": audit_verification,
        "export_profile": "regulator-ready",
    }
    manifest_bytes = json.dumps(manifest_payload, indent=2).encode("utf-8")

    bundle_stream = io.BytesIO()
    with zipfile.ZipFile(bundle_stream, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("reports/investigation_report.pdf", pdf_bytes)
        archive.writestr("reports/investigation_report.csv", csv_bytes)
        archive.writestr("audit/immutable_activity_logs.csv", audit_csv_bytes)
        archive.writestr("report/report_payload.json", report_json_bytes)
        archive.writestr("manifest/signature_manifest.json", manifest_bytes)

    bundle_bytes = bundle_stream.getvalue()
    bundle_signature = _sign_payload_bytes(bundle_bytes, f"regulator-bundle:{case_ref}")

    timestamp_label = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"trustxai-regulator-export-bundle-{timestamp_label}.zip"

    _record_audit_log(
        db,
        actor_user=current_user,
        action="compliance_bundle_exported",
        entity_type="regulator_export",
        entity_id=filename,
        case_id=report["case_ids"][0] if len(report["case_ids"]) == 1 else None,
        payload={
            "case_ids": report["case_ids"],
            "digest_sha256": bundle_signature["digest_sha256"],
            "signature_algorithm": bundle_signature["algorithm"],
            "artifact_count": len(artifact_signatures) + 1,
            "audit_chain_verification": audit_verification,
        },
    )

    headers = {
        **_signature_headers(bundle_signature),
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
    return Response(content=bundle_bytes, media_type="application/zip", headers=headers)
