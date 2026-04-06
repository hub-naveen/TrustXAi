export type BackendRole = "admin" | "analyst" | "viewer";

export interface BackendUser {
  id: number;
  email: string;
  name: string;
  institution: string;
  role: BackendRole;
  avatar: string;
}

export interface BackendLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: BackendUser;
}

export interface FederatedModelUpdate {
  id: string;
  institution: string;
  version: string;
  accuracy: number;
  timestamp: string;
  status: "merged" | "validating" | "rejected" | string;
  improvement: number;
}

export interface FederatedConvergencePoint {
  round: number;
  global_loss: number;
  accuracy: number;
}

export interface FederatedPrivacyMetric {
  id: number;
  metric: string;
  value: number;
  max_value: number;
  color: string;
}

export interface FederatedNodeHealth {
  name: string;
  cpu: number;
  memory: number;
  gpu: number;
  latency: number;
  status: string;
}

export interface FederatedSnapshot {
  modelUpdates: FederatedModelUpdate[];
  convergence: FederatedConvergencePoint[];
  privacy: FederatedPrivacyMetric[];
  nodeHealth: FederatedNodeHealth[];
}

export interface MlTrainingResult {
  pipeline: string;
  dataset: string;
  model_type: string;
  status: "success" | "failed" | string;
  rows: number;
  metrics: Record<string, unknown>;
  outputs: Record<string, unknown>;
  artifacts: string[];
  notes: string[];
}

export interface MlTrainingRun {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  requested_pipelines: string[];
  succeeded: number;
  failed: number;
  results: MlTrainingResult[];
}

export type BackendTransactionStatus = "approved" | "blocked" | "flagged" | "pending";

export interface BackendTransaction {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  timestamp: string;
  risk_score: number;
  status: BackendTransactionStatus;
  type: string;
  institution: string;
}

export interface BackendTransactionListResponse {
  items: BackendTransaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface BackendTransactionMetrics {
  total_transactions: number;
  blocked_count: number;
  flagged_count: number;
  average_risk: number;
  total_volume: number;
}

export interface BackendFraudDNA {
  id: string;
  hash: string;
  pattern: string;
  similarity: number;
  detected_at: string;
  source: string;
  category: string;
}

export interface BackendAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  timestamp: string;
  transaction_id: string;
  risk_score: number | null;
  model_confidence: number | null;
  rule_confidence: number | null;
  top_factors: BackendAlertFactor[];
  related_entities: string[];
}

export interface BackendAlertFactor {
  factor: string;
  score: number;
  rationale: string;
}

export type BackendWorkflowCasePriority = "low" | "medium" | "high" | "critical" | string;
export type BackendWorkflowCaseStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "resolved"
  | "closed"
  | "reopened"
  | string;

export interface BackendWorkflowAssignee {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

export interface BackendWorkflowComment {
  id: string;
  author_user_id: number;
  author_name: string;
  message: string;
  created_at: string;
}

export interface BackendWorkflowEvidence {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_user_id: number;
  uploaded_by_name: string;
  uploaded_at: string;
  storage_path: string;
}

export interface BackendWorkflowCase {
  workflow_case_id: string;
  investigation_case_id: string | null;
  title: string;
  summary: string | null;
  priority: BackendWorkflowCasePriority;
  status: BackendWorkflowCaseStatus;
  created_at: string;
  updated_at: string;
  created_by_user_id: number;
  created_by_name: string;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  due_at: string;
  sla_remaining_seconds: number;
  sla_breached: boolean;
  related_alert_ids: string[];
  related_transaction_ids: string[];
  comments: BackendWorkflowComment[];
  evidence: BackendWorkflowEvidence[];
}

export interface WorkflowCaseCreatePayload {
  title: string;
  summary?: string;
  investigation_case_id?: string;
  priority?: BackendWorkflowCasePriority;
  assigned_to_user_id?: number;
  related_alert_ids?: string[];
  related_transaction_ids?: string[];
  sla_hours?: number;
}

export interface FraudAlertStreamHandlers {
  onAlert: (alert: BackendAlert, eventType: "snapshot" | "alert") => void;
  onHeartbeat?: (payload: unknown) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
}

export interface BackendInvestigationAuditLog {
  log_id: string;
  sequence: number;
  timestamp: string;
  actor_user_id: number;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  case_id: string | null;
  payload: Record<string, unknown>;
  previous_hash: string;
  hash: string;
}

export interface BackendInvestigationAuditVerifyResponse {
  valid: boolean;
  checked_records: number;
  reason: string;
  latest_hash: string | null;
}

export interface SignedExportReceipt {
  filename: string;
  signature: string | null;
  signatureAlgorithm: string | null;
  digestSha256: string | null;
  signedAt: string | null;
}

export interface BackendInvestigationCaseOption {
  case_id: string;
  title: string;
  lead_agency: string;
}

export interface BackendInvestigationNode {
  id: string;
  label: string;
  node_type: string;
  role: string;
  default_layer: number;
  risk_score: number;
  holder_name: string;
  phone: string;
  ip_address: string;
  email: string;
  bank_name: string;
}

export interface BackendInvestigationEdge {
  id: string;
  case_id: string;
  from_node_id: string;
  to_node_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  tx_ref: string;
}

export interface BackendInvestigationPathRisk {
  id: string;
  case_id: string;
  label: string;
  risk_score: number;
  chain: string[];
  explanation: string;
}

export interface BackendInvestigationCase {
  case_id: string;
  title: string;
  lead_agency: string;
  source_node_id: string;
  destination_node_ids: string[];
  nodes: BackendInvestigationNode[];
  edges: BackendInvestigationEdge[];
  path_risks: BackendInvestigationPathRisk[];
}

export interface BackendInvestigationMergedResponse {
  selected_cases: BackendInvestigationCase[];
  nodes: BackendInvestigationNode[];
  edges: BackendInvestigationEdge[];
  source_node_ids: string[];
  destination_node_ids: string[];
  path_risks: BackendInvestigationPathRisk[];
  common_node_ids: string[];
  shared_pattern_labels: string[];
}

export interface BackendBlockchainEntry {
  id: number;
  tx_hash: string;
  block_number: number;
  timestamp: string;
  action: string;
  fraud_dna_hash: string;
  status: "confirmed" | "pending" | string;
  gas_used: number;
}

export interface BackendSmartContract {
  id: number;
  name: string;
  address: string;
  calls: number;
  status: string;
}

export interface BackendBlockchainMetrics {
  confirmation_rate: number;
  confirmed_count: number;
  pending_count: number;
  average_gas: number;
  active_contract_count: number;
}

export interface BackendInstitution {
  id: string;
  name: string;
  type: string;
  trust_score: number;
  status: "active" | "suspended" | "pending" | string;
  nodes_count: number;
  last_sync: string;
}

export interface BackendAuditLog {
  id: number;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  severity: string;
}

export interface BackendThreatFeed {
  id: number;
  threat_type: string;
  source: string;
  severity: string;
  time_label: string;
  description: string;
}

export interface BackendDashboardCard {
  label: string;
  value: string;
  hint: string | null;
}

export interface BackendDashboardAction {
  label: string;
  path: string;
}

export interface BackendDashboardSummary {
  role: string;
  title: string;
  summary: string;
  cards: BackendDashboardCard[];
  actions: BackendDashboardAction[];
}

export type BackendRoleDistribution = Record<string, number>;

export interface TransactionQueryParams {
  search?: string;
  status?: BackendTransactionStatus;
  txType?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "timestamp" | "risk_score" | "amount";
  sortDir?: "asc" | "desc";
}

export interface BlockchainEntriesQueryParams {
  status?: string;
  action?: string;
  search?: string;
}

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";
const TOKEN_STORAGE_KEY = "tc_token";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

function withPath(path: string): string {
  if (!path.startsWith("/")) return `${apiBaseUrl}/${path}`;
  return `${apiBaseUrl}${path}`;
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, ...requestInit } = options;
  const headers = new Headers(requestInit.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    requestInit.body &&
    !(requestInit.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getStoredAuthToken();
    if (!token) {
      throw new Error("Please sign in again to access backend data.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(withPath(path), {
      ...requestInit,
      headers,
    });
  } catch {
    throw new Error("Backend is unreachable. Start the API server and try again.");
  }

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const errorPayload = (await response.json()) as { detail?: string };
      if (typeof errorPayload.detail === "string" && errorPayload.detail.trim()) {
        detail = errorPayload.detail;
      }
    } catch {
      // Keep fallback detail when response body is not valid JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function extractFilenameFromDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ? plainMatch[1] : null;
}

async function downloadFile(
  path: string,
  fallbackFilename: string,
  accept: string,
): Promise<SignedExportReceipt> {
  const token = getStoredAuthToken();
  if (!token) {
    throw new Error("Please sign in again to access backend data.");
  }

  let response: Response;
  try {
    response = await fetch(withPath(path), {
      method: "GET",
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Backend is unreachable. Start the API server and try again.");
  }

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const errorPayload = (await response.json()) as { detail?: string };
      if (typeof errorPayload.detail === "string" && errorPayload.detail.trim()) {
        detail = errorPayload.detail;
      }
    } catch {
      // Keep fallback detail when response body is not valid JSON.
    }
    throw new Error(detail);
  }

  const blob = await response.blob();
  const filename =
    extractFilenameFromDisposition(response.headers.get("Content-Disposition")) || fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);

  return {
    filename,
    signature: response.headers.get("X-TrustXAi-Signature"),
    signatureAlgorithm: response.headers.get("X-TrustXAi-Signature-Alg"),
    digestSha256: response.headers.get("X-TrustXAi-Digest-Sha256"),
    signedAt: response.headers.get("X-TrustXAi-Signed-At"),
  };
}

function withCaseIds(path: string, caseIds: string[]): string {
  const search = new URLSearchParams();
  for (const caseId of caseIds) {
    const normalized = caseId.trim();
    if (normalized) {
      search.append("case_ids", normalized);
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function loginWithBackend(email: string, password: string): Promise<BackendLoginResponse> {
  return requestJson<BackendLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchFederatedSnapshot(): Promise<FederatedSnapshot> {
  const [modelUpdates, convergence, privacy, nodeHealth] = await Promise.all([
    requestJson<FederatedModelUpdate[]>("/federated-learning/model-updates", { auth: true }),
    requestJson<FederatedConvergencePoint[]>("/federated-learning/convergence", { auth: true }),
    requestJson<FederatedPrivacyMetric[]>("/federated-learning/privacy", { auth: true }),
    requestJson<FederatedNodeHealth[]>("/federated-learning/node-health", { auth: true }),
  ]);

  return {
    modelUpdates,
    convergence,
    privacy,
    nodeHealth,
  };
}

export async function fetchMlTrainingRuns(limit = 10): Promise<MlTrainingRun[]> {
  return requestJson<MlTrainingRun[]>(`/ml/train/runs?limit=${limit}`, { auth: true });
}

export async function triggerMlTrainingAll(): Promise<MlTrainingRun> {
  return requestJson<MlTrainingRun>("/ml/train/all", {
    method: "POST",
    auth: true,
  });
}

export async function triggerMlTrainingPipeline(pipeline: string): Promise<MlTrainingRun> {
  return requestJson<MlTrainingRun>(`/ml/train/${pipeline}`, {
    method: "POST",
    auth: true,
  });
}

function toQueryString(params: TransactionQueryParams): string {
  const search = new URLSearchParams();

  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.txType) search.set("tx_type", params.txType);
  if (typeof params.page === "number") search.set("page", String(params.page));
  if (typeof params.pageSize === "number") search.set("page_size", String(params.pageSize));
  if (params.sortBy) search.set("sort_by", params.sortBy);
  if (params.sortDir) search.set("sort_dir", params.sortDir);

  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export async function fetchTransactions(params: TransactionQueryParams = {}): Promise<BackendTransactionListResponse> {
  return requestJson<BackendTransactionListResponse>(`/transactions${toQueryString(params)}`, {
    auth: true,
  });
}

export async function fetchAllTransactions(
  params: Omit<TransactionQueryParams, "page" | "pageSize"> & { maxRecords?: number } = {},
): Promise<BackendTransaction[]> {
  const maxRecords = Math.max(1000, params.maxRecords ?? 20000);
  const pageSize = 1000;
  const all: BackendTransaction[] = [];

  for (let page = 1; all.length < maxRecords; page += 1) {
    const response = await fetchTransactions({
      ...params,
      page,
      pageSize,
    });

    all.push(...response.items);

    const reachedTotal = all.length >= response.total;
    const emptyPage = response.items.length === 0;
    if (reachedTotal || emptyPage) {
      break;
    }
  }

  return all.slice(0, maxRecords);
}

export async function fetchTransactionMetrics(): Promise<BackendTransactionMetrics> {
  return requestJson<BackendTransactionMetrics>("/transactions/metrics", { auth: true });
}

export async function fetchFraudDNA(): Promise<BackendFraudDNA[]> {
  return requestJson<BackendFraudDNA[]>("/fraud-intelligence/dna", { auth: true });
}

export async function fetchFraudAlerts(): Promise<BackendAlert[]> {
  return requestJson<BackendAlert[]>("/fraud-intelligence/alerts", { auth: true });
}

export function subscribeFraudAlertStream(handlers: FraudAlertStreamHandlers): () => void {
  const token = getStoredAuthToken();
  if (!token) {
    throw new Error("Please sign in again to access backend data.");
  }

  const controller = new AbortController();

  const parseSseEvent = (rawEvent: string) => {
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of rawEvent.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!dataLines.length) return;
    const payloadText = dataLines.join("\n");

    if (eventName === "heartbeat") {
      if (!handlers.onHeartbeat) return;
      try {
        handlers.onHeartbeat(JSON.parse(payloadText));
      } catch {
        handlers.onHeartbeat(payloadText);
      }
      return;
    }

    if (eventName === "snapshot" || eventName === "alert") {
      const alert = JSON.parse(payloadText) as BackendAlert;
      handlers.onAlert(alert, eventName);
    }
  };

  void (async () => {
    try {
      const response = await fetch(withPath("/fraud-intelligence/alerts/stream"), {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Unable to subscribe to alert stream (${response.status} ${response.statusText})`);
      }
      if (!response.body) {
        throw new Error("Alert stream is unavailable in this browser.");
      }

      handlers.onOpen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const rawEvent = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          if (rawEvent) {
            parseSseEvent(rawEvent);
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      handlers.onError?.(
        error instanceof Error ? error : new Error("Fraud alert stream disconnected unexpectedly."),
      );
    }
  })();

  return () => {
    controller.abort();
  };
}

export async function fetchInvestigationCaseOptions(): Promise<BackendInvestigationCaseOption[]> {
  return requestJson<BackendInvestigationCaseOption[]>("/fraud-intelligence/investigation/options", {
    auth: true,
  });
}

export async function fetchInvestigationCases(): Promise<BackendInvestigationCase[]> {
  return requestJson<BackendInvestigationCase[]>("/fraud-intelligence/investigation/cases", {
    auth: true,
  });
}

export async function fetchMergedInvestigation(caseIds: string[]): Promise<BackendInvestigationMergedResponse> {
  const search = new URLSearchParams();
  for (const caseId of caseIds) {
    const normalized = caseId.trim();
    if (normalized) {
      search.append("case_ids", normalized);
    }
  }

  const query = search.toString();
  const path = query
    ? `/fraud-intelligence/investigation/merge?${query}`
    : "/fraud-intelligence/investigation/merge";

  return requestJson<BackendInvestigationMergedResponse>(path, { auth: true });
}

export async function fetchWorkflowAssignees(): Promise<BackendWorkflowAssignee[]> {
  return requestJson<BackendWorkflowAssignee[]>("/fraud-intelligence/investigation/workflow/assignees", {
    auth: true,
  });
}

export async function fetchInvestigationAuditLogs(
  caseIds: string[] = [],
  limit = 250,
): Promise<BackendInvestigationAuditLog[]> {
  const search = new URLSearchParams();
  for (const caseId of caseIds) {
    const normalized = caseId.trim();
    if (normalized) {
      search.append("case_ids", normalized);
    }
  }
  search.set("limit", String(Math.max(1, Math.min(5000, limit))));
  return requestJson<BackendInvestigationAuditLog[]>(
    `/fraud-intelligence/investigation/audit/logs?${search.toString()}`,
    { auth: true },
  );
}

export async function verifyInvestigationAuditLogs(
  caseIds: string[] = [],
): Promise<BackendInvestigationAuditVerifyResponse> {
  const path = withCaseIds("/fraud-intelligence/investigation/audit/logs/verify", caseIds);
  return requestJson<BackendInvestigationAuditVerifyResponse>(path, { auth: true });
}

export async function downloadSignedInvestigationReportPdf(
  caseIds: string[],
): Promise<SignedExportReceipt> {
  const path = withCaseIds("/fraud-intelligence/investigation/reports/export/pdf", caseIds);
  return downloadFile(path, "trustxai-investigation-report.pdf", "application/pdf");
}

export async function downloadSignedInvestigationReportCsv(
  caseIds: string[],
): Promise<SignedExportReceipt> {
  const path = withCaseIds("/fraud-intelligence/investigation/reports/export/csv", caseIds);
  return downloadFile(path, "trustxai-investigation-report.csv", "text/csv");
}

export async function downloadRegulatorExportBundle(
  caseIds: string[],
): Promise<SignedExportReceipt> {
  const path = withCaseIds("/fraud-intelligence/investigation/reports/export/bundle", caseIds);
  return downloadFile(path, "trustxai-regulator-export-bundle.zip", "application/zip");
}

export async function fetchWorkflowCases(investigationCaseId?: string): Promise<BackendWorkflowCase[]> {
  const normalizedCaseId = investigationCaseId?.trim();
  const path = normalizedCaseId
    ? `/fraud-intelligence/investigation/workflow/cases?investigation_case_id=${encodeURIComponent(normalizedCaseId)}`
    : "/fraud-intelligence/investigation/workflow/cases";

  return requestJson<BackendWorkflowCase[]>(path, { auth: true });
}

export async function fetchWorkflowCase(workflowCaseId: string): Promise<BackendWorkflowCase> {
  return requestJson<BackendWorkflowCase>(
    `/fraud-intelligence/investigation/workflow/cases/${encodeURIComponent(workflowCaseId)}`,
    { auth: true },
  );
}

export async function createWorkflowCase(payload: WorkflowCaseCreatePayload): Promise<BackendWorkflowCase> {
  return requestJson<BackendWorkflowCase>("/fraud-intelligence/investigation/workflow/cases", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function assignWorkflowCase(
  workflowCaseId: string,
  assigneeUserId: number,
): Promise<BackendWorkflowCase> {
  return requestJson<BackendWorkflowCase>(
    `/fraud-intelligence/investigation/workflow/cases/${encodeURIComponent(workflowCaseId)}/assign`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ assignee_user_id: assigneeUserId }),
    },
  );
}

export async function updateWorkflowCaseStatus(
  workflowCaseId: string,
  statusValue: BackendWorkflowCaseStatus,
): Promise<BackendWorkflowCase> {
  return requestJson<BackendWorkflowCase>(
    `/fraud-intelligence/investigation/workflow/cases/${encodeURIComponent(workflowCaseId)}/status`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ status: statusValue }),
    },
  );
}

export async function addWorkflowCaseComment(
  workflowCaseId: string,
  message: string,
): Promise<BackendWorkflowCase> {
  return requestJson<BackendWorkflowCase>(
    `/fraud-intelligence/investigation/workflow/cases/${encodeURIComponent(workflowCaseId)}/comments`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ message }),
    },
  );
}

export async function uploadWorkflowEvidence(
  workflowCaseId: string,
  file: File,
): Promise<BackendWorkflowCase> {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<BackendWorkflowCase>(
    `/fraud-intelligence/investigation/workflow/cases/${encodeURIComponent(workflowCaseId)}/evidence`,
    {
      method: "POST",
      auth: true,
      body: formData,
    },
  );
}

export async function fetchBlockchainEntries(
  params: BlockchainEntriesQueryParams = {},
): Promise<BackendBlockchainEntry[]> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.action) search.set("action", params.action);
  if (params.search) search.set("search", params.search);
  const query = search.toString();
  const path = query ? `/blockchain/entries?${query}` : "/blockchain/entries";

  return requestJson<BackendBlockchainEntry[]>(path, { auth: true });
}

export async function fetchBlockchainContracts(): Promise<BackendSmartContract[]> {
  return requestJson<BackendSmartContract[]>("/blockchain/contracts", { auth: true });
}

export async function fetchBlockchainMetrics(): Promise<BackendBlockchainMetrics> {
  return requestJson<BackendBlockchainMetrics>("/blockchain/metrics", { auth: true });
}

export async function fetchAdminInstitutions(): Promise<BackendInstitution[]> {
  return requestJson<BackendInstitution[]>("/admin/institutions", { auth: true });
}

export async function fetchAdminAuditLogs(search?: string): Promise<BackendAuditLog[]> {
  const encoded = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return requestJson<BackendAuditLog[]>(`/admin/audit-logs${encoded}`, { auth: true });
}

export async function fetchAdminThreatFeed(): Promise<BackendThreatFeed[]> {
  return requestJson<BackendThreatFeed[]>("/admin/threat-feed", { auth: true });
}

export async function fetchAdminRoleDistribution(): Promise<BackendRoleDistribution> {
  return requestJson<BackendRoleDistribution>("/admin/role-distribution", { auth: true });
}

export async function fetchAdminDashboardSummary(): Promise<BackendDashboardSummary> {
  return requestJson<BackendDashboardSummary>("/dashboard/admin", { auth: true });
}

export async function fetchDashboardOverview(): Promise<BackendDashboardSummary> {
  return requestJson<BackendDashboardSummary>("/dashboard/overview", { auth: true });
}

export async function fetchAnalystDashboardSummary(): Promise<BackendDashboardSummary> {
  return requestJson<BackendDashboardSummary>("/dashboard/analyst", { auth: true });
}

export async function fetchViewerDashboardSummary(): Promise<BackendDashboardSummary> {
  return requestJson<BackendDashboardSummary>("/dashboard/viewer", { auth: true });
}
