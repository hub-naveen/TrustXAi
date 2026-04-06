from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database

from app.api.endpoints._utils import clean_doc
from app.core.deps import normalize_case_ids, require_roles
from app.core.types import RoleEnum
from app.db.mongo import get_db
from app.schemas.api import (
    AlertRead,
    FraudDNARead,
    InvestigationCaseOption,
    InvestigationCaseRead,
    InvestigationMergedResponse,
    InvestigationNodeRead,
    InvestigationEdgeRead,
    InvestigationPathRiskRead,
)

router = APIRouter(
    prefix="/fraud-intelligence",
    tags=["fraud-intelligence"],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst))],
)


def serialize_case(case: dict) -> InvestigationCaseRead:
    nodes = [InvestigationNodeRead.model_validate(node) for node in case.get("nodes", [])]
    edges = sorted(case.get("edges", []), key=lambda edge: edge.get("timestamp"))
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
    rows = list(db["alerts"].find({}, {"_id": 0}).sort("timestamp", -1))
    return [AlertRead.model_validate(row) for row in rows]


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
