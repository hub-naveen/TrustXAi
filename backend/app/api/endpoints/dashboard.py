from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.core.deps import get_current_user, require_roles
from app.core.types import RoleEnum
from app.db.mongo import get_db
from app.schemas.api import DashboardCard, DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def build_common_metrics(db: Database) -> dict[str, int]:
    total_transactions = db["transactions"].count_documents({})
    blocked_transactions = db["transactions"].count_documents({"status": "blocked"})
    critical_alerts = db["alerts"].count_documents({"severity": "critical"})
    active_institutions = db["institutions"].count_documents({"status": "active"})
    fraud_patterns = db["fraud_dna"].count_documents({})
    merged_models = db["model_updates"].count_documents({"status": "merged"})

    return {
        "total_transactions": total_transactions,
        "blocked_transactions": blocked_transactions,
        "critical_alerts": critical_alerts,
        "active_institutions": active_institutions,
        "fraud_patterns": fraud_patterns,
        "merged_models": merged_models,
    }


@router.get("/overview", response_model=DashboardResponse)
def dashboard_overview(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> DashboardResponse:
    metrics = build_common_metrics(db)

    cards = [
        DashboardCard(label="Transactions", value=str(metrics["total_transactions"]), hint="current ledger scope"),
        DashboardCard(label="Blocked", value=str(metrics["blocked_transactions"]), hint="automated interventions"),
        DashboardCard(label="Critical Alerts", value=str(metrics["critical_alerts"]), hint="requires immediate review"),
        DashboardCard(label="Fraud Patterns", value=str(metrics["fraud_patterns"]), hint="known detection signatures"),
    ]

    return DashboardResponse(
        role=current_user["role"],
        title=f"{current_user['role'].title()} Dashboard",
        summary="Unified role-aware snapshot generated from the operational backend.",
        cards=cards,
        actions=[
            {"label": "Transactions", "path": "/transactions"},
            {"label": "Blockchain", "path": "/blockchain"},
        ],
    )


@router.get(
    "/admin",
    response_model=DashboardResponse,
    dependencies=[Depends(require_roles(RoleEnum.admin))],
)
def admin_dashboard(db: Database = Depends(get_db)) -> DashboardResponse:
    metrics = build_common_metrics(db)
    cards = [
        DashboardCard(label="Institutions Active", value=str(metrics["active_institutions"]), hint="federated institutions online"),
        DashboardCard(label="Critical Alerts", value=str(metrics["critical_alerts"]), hint="high-priority incidents"),
        DashboardCard(label="Merged Models", value=str(metrics["merged_models"]), hint="federated rounds accepted"),
        DashboardCard(label="Blocked Transactions", value=str(metrics["blocked_transactions"]), hint="global intervention count"),
    ]
    return DashboardResponse(
        role="admin",
        title="Admin Dashboard",
        summary="Governance and policy command surface for cross-institution operations.",
        cards=cards,
        actions=[
            {"label": "Admin Panel", "path": "/admin"},
            {"label": "Federated Learning", "path": "/federated-learning"},
            {"label": "Settings", "path": "/settings"},
        ],
    )


@router.get(
    "/analyst",
    response_model=DashboardResponse,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst))],
)
def analyst_dashboard(db: Database = Depends(get_db)) -> DashboardResponse:
    metrics = build_common_metrics(db)
    cards = [
        DashboardCard(label="High-Risk Signals", value=str(metrics["blocked_transactions"] + metrics["critical_alerts"]), hint="triage queue"),
        DashboardCard(label="Critical Alerts", value=str(metrics["critical_alerts"]), hint="open investigations"),
        DashboardCard(label="Fraud Patterns", value=str(metrics["fraud_patterns"]), hint="detection references"),
        DashboardCard(label="Transactions", value=str(metrics["total_transactions"]), hint="observable flow"),
    ]
    return DashboardResponse(
        role="analyst",
        title="Analyst Dashboard",
        summary="Case triage and forensic intelligence controls for investigation teams.",
        cards=cards,
        actions=[
            {"label": "Fraud Intelligence", "path": "/fraud-intelligence"},
            {"label": "Transactions", "path": "/transactions"},
            {"label": "Blockchain", "path": "/blockchain"},
        ],
    )


@router.get(
    "/viewer",
    response_model=DashboardResponse,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst, RoleEnum.viewer))],
)
def viewer_dashboard(db: Database = Depends(get_db)) -> DashboardResponse:
    metrics = build_common_metrics(db)
    cards = [
        DashboardCard(label="Transactions", value=str(metrics["total_transactions"]), hint="read-only portfolio view"),
        DashboardCard(label="Blocked", value=str(metrics["blocked_transactions"]), hint="security interventions"),
        DashboardCard(label="Active Institutions", value=str(metrics["active_institutions"]), hint="network participation"),
        DashboardCard(label="Fraud Patterns", value=str(metrics["fraud_patterns"]), hint="known intelligence set"),
    ]
    return DashboardResponse(
        role="viewer",
        title="Viewer Dashboard",
        summary="Read-only executive visibility across fraud and network health telemetry.",
        cards=cards,
        actions=[
            {"label": "Transactions", "path": "/transactions"},
            {"label": "Blockchain", "path": "/blockchain"},
        ],
    )
