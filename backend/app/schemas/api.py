from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    name: str
    institution: str
    role: str
    avatar: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class DashboardCard(BaseModel):
    label: str
    value: str
    hint: str | None = None


class DashboardResponse(BaseModel):
    role: str
    title: str
    summary: str
    cards: list[DashboardCard]
    actions: list[dict[str, str]]


class TransactionRead(ORMModel):
    id: str
    from_account: str
    to_account: str
    amount: float
    currency: str
    timestamp: datetime
    risk_score: int
    status: str
    type: str
    institution: str


class TransactionListResponse(BaseModel):
    items: list[TransactionRead]
    total: int
    page: int
    page_size: int


class TransactionMetricsResponse(BaseModel):
    total_transactions: int
    blocked_count: int
    flagged_count: int
    average_risk: float
    total_volume: float


class AlertRead(ORMModel):
    id: str
    title: str
    description: str
    severity: str
    timestamp: datetime
    transaction_id: str


class FraudDNARead(ORMModel):
    id: str
    hash: str
    pattern: str
    similarity: float
    detected_at: datetime
    source: str
    category: str


class InvestigationNodeRead(ORMModel):
    id: str
    label: str
    node_type: str
    role: str
    default_layer: int
    risk_score: int
    holder_name: str
    phone: str
    ip_address: str
    email: str
    bank_name: str


class InvestigationEdgeRead(ORMModel):
    id: str
    case_id: str
    from_node_id: str
    to_node_id: str
    amount: float
    currency: str
    timestamp: datetime
    tx_ref: str


class InvestigationPathRiskRead(ORMModel):
    id: str
    case_id: str
    label: str
    risk_score: int
    chain: list[str]
    explanation: str


class InvestigationCaseRead(BaseModel):
    case_id: str
    title: str
    lead_agency: str
    source_node_id: str
    destination_node_ids: list[str]
    nodes: list[InvestigationNodeRead]
    edges: list[InvestigationEdgeRead]
    path_risks: list[InvestigationPathRiskRead]


class InvestigationCaseOption(BaseModel):
    case_id: str
    title: str
    lead_agency: str


class InvestigationMergedResponse(BaseModel):
    selected_cases: list[InvestigationCaseRead]
    nodes: list[InvestigationNodeRead]
    edges: list[InvestigationEdgeRead]
    source_node_ids: list[str]
    destination_node_ids: list[str]
    path_risks: list[InvestigationPathRiskRead]
    common_node_ids: list[str]
    shared_pattern_labels: list[str]


class BlockchainEntryRead(ORMModel):
    id: int
    tx_hash: str
    block_number: int
    timestamp: datetime
    action: str
    fraud_dna_hash: str
    status: str
    gas_used: int


class SmartContractRead(ORMModel):
    id: int
    name: str
    address: str
    calls: int
    status: str


class BlockchainMetricsResponse(BaseModel):
    confirmation_rate: int
    confirmed_count: int
    pending_count: int
    average_gas: int
    active_contract_count: int


class InstitutionRead(ORMModel):
    id: str
    name: str
    type: str
    trust_score: int
    status: str
    nodes_count: int
    last_sync: datetime


class ModelUpdateRead(ORMModel):
    id: str
    institution: str
    version: str
    accuracy: float
    timestamp: datetime
    status: str
    improvement: float


class ConvergenceRoundRead(ORMModel):
    round: int
    global_loss: float
    accuracy: float


class PrivacyMetricRead(ORMModel):
    id: int
    metric: str
    value: int
    max_value: int
    color: str


class NodeHealthRead(BaseModel):
    name: str
    cpu: int
    memory: int
    gpu: int
    latency: int
    status: str


class AuditLogRead(ORMModel):
    id: int
    actor: str
    action: str
    target: str
    timestamp: datetime
    severity: str


class ThreatFeedRead(ORMModel):
    id: int
    threat_type: str
    source: str
    severity: str
    time_label: str
    description: str


class NotificationsRead(BaseModel):
    critical_alerts: bool
    high_risk_alerts: bool
    weekly_summary: bool
    model_updates: bool


class NotificationsUpdate(BaseModel):
    critical_alerts: bool
    high_risk_alerts: bool
    weekly_summary: bool
    model_updates: bool


class ApiKeyRead(ORMModel):
    key_id: str
    name: str
    key_masked: str
    last_used: str
    is_active: bool
    created_at: datetime


class ApiKeyCreate(BaseModel):
    name: str


class GenericMessage(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str


class ErrorResponse(BaseModel):
    detail: str


class QuerySummary(BaseModel):
    filters: dict[str, Any]
    total: int
