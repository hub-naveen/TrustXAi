from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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


class AlertFactorRead(BaseModel):
    factor: str
    score: int
    rationale: str


class AlertRead(ORMModel):
    id: str
    title: str
    description: str
    severity: str
    timestamp: datetime
    transaction_id: str
    risk_score: int | None = None
    model_confidence: float | None = None
    rule_confidence: float | None = None
    top_factors: list[AlertFactorRead] = Field(default_factory=list)
    related_entities: list[str] = Field(default_factory=list)


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


class WorkflowAssigneeRead(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    role: str


class WorkflowCaseCommentRead(ORMModel):
    id: str
    author_user_id: int
    author_name: str
    message: str
    created_at: datetime


class WorkflowCaseEvidenceRead(ORMModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    uploaded_by_user_id: int
    uploaded_by_name: str
    uploaded_at: datetime
    storage_path: str


class WorkflowCaseRead(ORMModel):
    workflow_case_id: str
    investigation_case_id: str | None = None
    title: str
    summary: str | None = None
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime
    created_by_user_id: int
    created_by_name: str
    assigned_to_user_id: int | None = None
    assigned_to_name: str | None = None
    due_at: datetime
    sla_remaining_seconds: int
    sla_breached: bool
    related_alert_ids: list[str] = Field(default_factory=list)
    related_transaction_ids: list[str] = Field(default_factory=list)
    comments: list[WorkflowCaseCommentRead] = Field(default_factory=list)
    evidence: list[WorkflowCaseEvidenceRead] = Field(default_factory=list)


class WorkflowCaseCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    summary: str | None = Field(default=None, max_length=2000)
    investigation_case_id: str | None = Field(default=None, max_length=80)
    priority: str = "medium"
    assigned_to_user_id: int | None = None
    related_alert_ids: list[str] = Field(default_factory=list)
    related_transaction_ids: list[str] = Field(default_factory=list)
    sla_hours: int = Field(default=24, ge=1, le=240)


class WorkflowCaseAssignRequest(BaseModel):
    assignee_user_id: int


class WorkflowCaseStatusUpdateRequest(BaseModel):
    status: str


class WorkflowCaseCommentCreateRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class InvestigationAuditLogRead(ORMModel):
    log_id: str
    sequence: int
    timestamp: datetime
    actor_user_id: int
    actor_name: str
    action: str
    entity_type: str
    entity_id: str
    case_id: str | None = None
    payload: dict[str, Any]
    previous_hash: str
    hash: str


class InvestigationAuditVerifyResponse(BaseModel):
    valid: bool
    checked_records: int
    reason: str
    latest_hash: str | None = None


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


class ModelPipelineCatalog(BaseModel):
    pipelines: list[str]


class ModelTrainingResult(BaseModel):
    pipeline: str
    dataset: str
    model_type: str
    status: str
    rows: int
    metrics: dict[str, Any]
    outputs: dict[str, Any]
    artifacts: list[str]
    notes: list[str]


class ModelTrainingRunRead(BaseModel):
    run_id: str
    started_at: datetime
    completed_at: datetime
    duration_seconds: float
    requested_pipelines: list[str]
    succeeded: int
    failed: int
    results: list[ModelTrainingResult]


class QuerySummary(BaseModel):
    filters: dict[str, Any]
    total: int
