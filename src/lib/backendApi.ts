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

export interface TransactionQueryParams {
  search?: string;
  status?: BackendTransactionStatus;
  txType?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "timestamp" | "risk_score" | "amount";
  sortDir?: "asc" | "desc";
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
