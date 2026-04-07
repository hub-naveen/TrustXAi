import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Shield,
  Brain,
  Network,
  Clock,
  AlertTriangle,
  Loader,
  X,
  Target,
  ScanSearch,
  Link2,
  ListTree,
  RotateCcw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import { useAuth } from "@/contexts/AuthContext";
import {
  type FraudDNA,
  type Transaction,
} from "@/types/domain";
import {
  type DetectionLabel,
  type MergedInvestigationData,
  type InvestigationCase,
  type InvestigationNode,
  type InvestigationEdge,
  type InvestigationPathRisk,
} from "@/data/investigationData";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import MoneyTrailSpiderMap from "@/components/fraud-intel/MoneyTrailSpiderMap";
import EntityFilterPanel, {
  type InvestigationFilters,
  type ResolutionHint,
} from "@/components/fraud-intel/EntityFilterPanel";
import CaseLinkingPanel, { type CaseOption } from "@/components/fraud-intel/CaseLinkingPanel";
import MoneyFlowTimeline from "@/components/fraud-intel/MoneyFlowTimeline";
import InvestigationReportGenerator from "@/components/fraud-intel/InvestigationReportGenerator";
import InvestigationWorkflowPanel from "@/components/fraud-intel/InvestigationWorkflowPanel";
import {
  fetchAllTransactions,
  fetchFraudDNA,
  fetchInvestigationCaseOptions,
  fetchMergedInvestigation,
  fetchMlTrainingRuns,
  type BackendFraudDNA,
  type BackendInvestigationCase,
  type BackendInvestigationCaseOption,
  type BackendInvestigationEdge,
  type BackendInvestigationMergedResponse,
  type BackendInvestigationNode,
  type BackendInvestigationPathRisk,
  type BackendTransaction,
  type MlTrainingRun,
} from "@/lib/backendApi";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const catColor: Record<string, string> = {
  "Transaction Layering": "bg-destructive/10 text-destructive",
  "Money Laundering": "bg-warning/10 text-warning",
  "Cryptocurrency Fraud": "bg-accent/10 text-accent",
  Structuring: "bg-primary/10 text-primary",
  "Identity Fraud": "bg-destructive/10 text-destructive",
};

const defaultFilters: InvestigationFilters = {
  holderName: "",
  phone: "",
  ipAddress: "",
  email: "",
  bankName: "",
};

const detectionCatalog: DetectionLabel[] = [
  "Layering Detected",
  "Smurfing Pattern",
  "Circular Flow",
  "Velocity Stacking",
];

const layerLabel = (layer: number) => {
  if (layer === 1) return "Source Account";
  if (layer === 2) return "Mule Accounts";
  if (layer === 3) return "Shell Accounts";
  if (layer === 4) return "Offshore / Crypto";
  return `Layer ${layer}`;
};

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const normalizeStatus = (status: string): Transaction["status"] => {
  if (status === "approved" || status === "blocked" || status === "flagged" || status === "pending") {
    return status;
  }
  return "flagged";
};

const mapBackendTransaction = (row: BackendTransaction): Transaction => ({
  id: row.id,
  from: row.from_account,
  to: row.to_account,
  amount: row.amount,
  currency: row.currency,
  timestamp: row.timestamp,
  riskScore: row.risk_score,
  status: normalizeStatus(row.status),
  type: row.type,
  institution: row.institution,
});

const mapBackendFraudDNA = (row: BackendFraudDNA): FraudDNA => ({
  id: row.id,
  hash: row.hash,
  pattern: row.pattern,
  similarity: row.similarity,
  detectedAt: row.detected_at,
  source: row.source,
  category: row.category,
});

const toDetectionLabel = (value: string): DetectionLabel => {
  if (value === "Layering Detected") return "Layering Detected";
  if (value === "Smurfing Pattern") return "Smurfing Pattern";
  if (value === "Circular Flow") return "Circular Flow";
  if (value === "Velocity Stacking") return "Velocity Stacking";
  return "Layering Detected";
};

const mapInvestigationNode = (node: BackendInvestigationNode): InvestigationNode => ({
  id: node.id,
  label: node.label,
  nodeType:
    node.node_type === "bank-account" || node.node_type === "wallet" || node.node_type === "entity"
      ? node.node_type
      : "entity",
  role:
    node.role === "source" || node.role === "intermediate" || node.role === "destination"
      ? node.role
      : "intermediate",
  defaultLayer: node.default_layer,
  riskScore: node.risk_score,
  holderName: node.holder_name,
  phone: node.phone,
  ipAddress: node.ip_address,
  email: node.email,
  bankName: node.bank_name,
});

const mapInvestigationEdge = (edge: BackendInvestigationEdge): InvestigationEdge => ({
  id: edge.id,
  from: edge.from_node_id,
  to: edge.to_node_id,
  amount: edge.amount,
  currency: edge.currency,
  timestamp: edge.timestamp,
  txRef: edge.tx_ref,
});

const mapInvestigationPathRisk = (risk: BackendInvestigationPathRisk): InvestigationPathRisk => ({
  id: risk.id,
  label: toDetectionLabel(risk.label),
  riskScore: risk.risk_score,
  chain: risk.chain,
  explanation: risk.explanation,
});

const mapInvestigationCase = (entry: BackendInvestigationCase): InvestigationCase => ({
  caseId: entry.case_id,
  title: entry.title,
  leadAgency: entry.lead_agency,
  sourceNodeId: entry.source_node_id,
  destinationNodeIds: entry.destination_node_ids,
  nodes: entry.nodes.map(mapInvestigationNode),
  edges: entry.edges.map(mapInvestigationEdge),
  pathRisks: entry.path_risks.map(mapInvestigationPathRisk),
});

const mapMergedInvestigation = (
  response: BackendInvestigationMergedResponse,
): MergedInvestigationData => ({
  selectedCases: response.selected_cases.map(mapInvestigationCase),
  nodes: response.nodes.map(mapInvestigationNode),
  edges: response.edges.map(mapInvestigationEdge),
  sourceNodeIds: response.source_node_ids,
  destinationNodeIds: response.destination_node_ids,
  pathRisks: response.path_risks.map(mapInvestigationPathRisk),
  commonNodeIds: response.common_node_ids,
  sharedPatternLabels: response.shared_pattern_labels.map(toDetectionLabel),
});

const mapCaseOption = (option: BackendInvestigationCaseOption): CaseOption => ({
  caseId: option.case_id,
  title: option.title,
  leadAgency: option.lead_agency,
});

const isSameCaseSelection = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const EMPTY_MERGED_INVESTIGATION: MergedInvestigationData = {
  selectedCases: [],
  nodes: [],
  edges: [],
  sourceNodeIds: [],
  destinationNodeIds: [],
  pathRisks: [],
  commonNodeIds: [],
  sharedPatternLabels: [],
};

export default function FraudIntelligence() {
  const { authToken } = useAuth();
  const [selectedDNA, setSelectedDNA] = useState<FraudDNA | null>(null);
  const [activeTab, setActiveTab] = useState<"patterns" | "network" | "timeline">("patterns");
  const [investigationMode, setInvestigationMode] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<InvestigationFilters>(defaultFilters);
  const [collapsedLayers, setCollapsedLayers] = useState<number[]>([]);
  const [timelineStep, setTimelineStep] = useState(1);
  const [bankAccountOnly, setBankAccountOnly] = useState(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [minHopAmountLakh, setMinHopAmountLakh] = useState(0);
  const [focusRiskRoute, setFocusRiskRoute] = useState(false);
  const [showAdvancedNetworkPanels, setShowAdvancedNetworkPanels] = useState(false);
  const [fraudDnaRows, setFraudDnaRows] = useState<FraudDNA[] | null>(null);
  const [investigationOptionsRows, setInvestigationOptionsRows] = useState<CaseOption[] | null>(null);
  const [mergedInvestigationRows, setMergedInvestigationRows] = useState<MergedInvestigationData | null>(null);
  const [transactionRows, setTransactionRows] = useState<Transaction[] | null>(null);
  const [intelSyncLoading, setIntelSyncLoading] = useState(false);
  const [intelSyncMessage, setIntelSyncMessage] = useState<string | null>(null);
  const [latestTrainingRun, setLatestTrainingRun] = useState<MlTrainingRun | null>(null);
  const [mlSyncError, setMlSyncError] = useState<string | null>(null);
  const [mlSyncLoading, setMlSyncLoading] = useState(false);

  const fraudDNAData = useMemo(() => fraudDnaRows ?? [], [fraudDnaRows]);
  const caseOptions = useMemo(() => investigationOptionsRows ?? [], [investigationOptionsRows]);
  const transactionData = useMemo(() => transactionRows ?? [], [transactionRows]);

  const avgSimilarityValue = Math.round(
    fraudDNAData.reduce((sum, entry) => sum + entry.similarity, 0) / Math.max(fraudDNAData.length, 1),
  );

  const totalPatterns = useAnimatedCounter(fraudDNAData.length, 800);
  const avgSimilarity = useAnimatedCounter(avgSimilarityValue, 1200, 200);
  const activeThreatValue = mergedInvestigationRows?.pathRisks.filter((path) => path.riskScore >= 75).length ?? 0;
  const activeThreats = useAnimatedCounter(activeThreatValue, 1000, 300);

  const syncInvestigationWorkspace = useCallback(async () => {
    if (!authToken) {
      setFraudDnaRows([]);
      setInvestigationOptionsRows([]);
      setMergedInvestigationRows(null);
      setTransactionRows([]);
      setIntelSyncMessage("Backend auth token unavailable. Sign in to load investigation telemetry.");
      return;
    }

    setIntelSyncLoading(true);
    setIntelSyncMessage("Syncing fraud intelligence from MongoDB...");

    try {
      const [dnaRows, caseOptionRows, transactionResults] = await Promise.all([
        fetchFraudDNA(),
        fetchInvestigationCaseOptions(),
        fetchAllTransactions({
          sortBy: "timestamp",
          sortDir: "desc",
          maxRecords: 20000,
        }),
      ]);

      const mappedDna = dnaRows.map(mapBackendFraudDNA);
      const mappedCaseOptions = caseOptionRows.map(mapCaseOption);
      const mappedTransactions = transactionResults.map(mapBackendTransaction);

      setFraudDnaRows(mappedDna);
      setInvestigationOptionsRows(mappedCaseOptions);
      setTransactionRows(mappedTransactions);

      setIntelSyncMessage(
        `Loaded ${mappedDna.length} DNA signatures, ${mappedCaseOptions.length} cases, and ${mappedTransactions.length.toLocaleString()} transactions from MongoDB.`,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Failed to load backend fraud-intelligence data.";
      setFraudDnaRows([]);
      setInvestigationOptionsRows([]);
      setMergedInvestigationRows(null);
      setTransactionRows([]);
      setIntelSyncMessage(detail);
    } finally {
      setIntelSyncLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void syncInvestigationWorkspace();
  }, [syncInvestigationWorkspace]);

  useEffect(() => {
    if (!caseOptions.length) {
      setSelectedCaseIds([]);
      return;
    }

    setSelectedCaseIds((previous) => {
      const valid = previous.filter((caseId) => caseOptions.some((option) => option.caseId === caseId));
      const next = valid.length ? valid : [caseOptions[0].caseId];
      return isSameCaseSelection(previous, next) ? previous : next;
    });
  }, [caseOptions]);

  useEffect(() => {
    if (!authToken) {
      setMergedInvestigationRows(null);
      return;
    }

    const normalizedCaseIds = selectedCaseIds.filter(Boolean);
    if (!normalizedCaseIds.length) {
      setMergedInvestigationRows(null);
      return;
    }

    let cancelled = false;

    const loadMergedInvestigation = async () => {
      try {
        const merged = await fetchMergedInvestigation(normalizedCaseIds);
        if (!cancelled) {
          setMergedInvestigationRows(mapMergedInvestigation(merged));
        }
      } catch {
        if (!cancelled) {
          setMergedInvestigationRows(null);
        }
      }
    };

    void loadMergedInvestigation();

    return () => {
      cancelled = true;
    };
  }, [authToken, selectedCaseIds]);

  useEffect(() => {
    if (!authToken) {
      setLatestTrainingRun(null);
      setMlSyncError("Sign in with backend auth to view live ML outputs.");
      return;
    }

    let cancelled = false;

    const loadLatestTrainingRun = async () => {
      setMlSyncLoading(true);
      setMlSyncError(null);
      try {
        const runs = await fetchMlTrainingRuns(1);
        if (!cancelled) {
          setLatestTrainingRun(runs[0] ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setMlSyncError(error instanceof Error ? error.message : "Failed to load ML training output.");
        }
      } finally {
        if (!cancelled) {
          setMlSyncLoading(false);
        }
      }
    };

    void loadLatestTrainingRun();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const pipelineResults = useMemo(() => {
    const resultMap = new Map<string, MlTrainingRun["results"][number]>();
    for (const result of latestTrainingRun?.results ?? []) {
      resultMap.set(result.pipeline, result);
    }
    return resultMap;
  }, [latestTrainingRun]);

  const amlAlertCount = asNumber(pipelineResults.get("aml_patterns")?.metrics?.total_alerts);
  const linkedPairCount = asNumber(pipelineResults.get("entities")?.metrics?.linked_pair_count);
  const suspiciousNodeCount = asNumber(
    pipelineResults.get("layered_transactions")?.metrics?.suspicious_node_count,
  );
  const advancedAuc = asNumber(
    pipelineResults.get("fraud_detection_financial")?.metrics?.best_auc,
  );

  const mergedInvestigation = mergedInvestigationRows ?? EMPTY_MERGED_INVESTIGATION;

  const nodeLookup = useMemo(
    () => Object.fromEntries(mergedInvestigation.nodes.map((node) => [node.id, node])),
    [mergedInvestigation.nodes],
  );

  const layerByNode = useMemo(() => {
    const unresolved = 99;
    const levels: Record<string, number> = {};

    for (const node of mergedInvestigation.nodes) {
      levels[node.id] = unresolved;
    }

    const adjacency = new Map<string, string[]>();
    for (const edge of mergedInvestigation.edges) {
      const list = adjacency.get(edge.from) ?? [];
      list.push(edge.to);
      adjacency.set(edge.from, list);
    }

    const sources = mergedInvestigation.sourceNodeIds.length
      ? mergedInvestigation.sourceNodeIds
      : mergedInvestigation.nodes.filter((node) => node.role === "source").map((node) => node.id);

    const queue: string[] = [];
    for (const source of sources) {
      levels[source] = 1;
      queue.push(source);
    }

    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;

      const currentLevel = levels[current];
      const nextLevel = Math.min(4, currentLevel + 1);

      for (const target of adjacency.get(current) ?? []) {
        if (levels[target] > nextLevel) {
          levels[target] = nextLevel;
          if (nextLevel < 4) queue.push(target);
        }
      }
    }

    for (const node of mergedInvestigation.nodes) {
      if (levels[node.id] === unresolved) {
        levels[node.id] = node.defaultLayer;
      }
      levels[node.id] = Math.max(1, Math.min(4, levels[node.id]));
    }

    return levels;
  }, [mergedInvestigation.edges, mergedInvestigation.nodes, mergedInvestigation.sourceNodeIds]);

  const allLayers = Object.values(layerByNode);
  const totalLayers = allLayers.length ? Math.max(...allLayers) : 1;

  const layerSummary = useMemo(
    () =>
      Array.from({ length: totalLayers }, (_, index) => {
        const layer = index + 1;
        const members = mergedInvestigation.nodes.filter(
          (node) => (layerByNode[node.id] ?? node.defaultLayer) === layer,
        );
        return {
          layer,
          members,
        };
      }),
    [layerByNode, mergedInvestigation.nodes, totalLayers],
  );

  useEffect(() => {
    setCollapsedLayers((previous) => previous.filter((layer) => layer <= totalLayers));
  }, [totalLayers]);

  const selectedCaseKey = selectedCaseIds.join("|");
  useEffect(() => {
    if (!mergedInvestigation.edges.length) {
      setTimelineStep(0);
      return;
    }
    setTimelineStep(mergedInvestigation.edges.length);
  }, [mergedInvestigation.edges.length, selectedCaseKey]);

  useEffect(() => {
    const max = mergedInvestigation.edges.length;
    if (!max) return;
    if (timelineStep < 1) setTimelineStep(1);
    if (timelineStep > max) setTimelineStep(max);
  }, [timelineStep, mergedInvestigation.edges.length]);

  const hasFilterInput = useMemo(
    () => Object.values(filters).some((value) => value.trim().length > 0),
    [filters],
  );

  const directMatchIds = useMemo(() => {
    if (!hasFilterInput) return [];

    const normalized = {
      holderName: filters.holderName.trim().toLowerCase(),
      phone: filters.phone.trim().toLowerCase(),
      ipAddress: filters.ipAddress.trim().toLowerCase(),
      email: filters.email.trim().toLowerCase(),
      bankName: filters.bankName.trim().toLowerCase(),
    };

    return mergedInvestigation.nodes
      .filter((node) => {
        if (normalized.holderName && !node.holderName.toLowerCase().includes(normalized.holderName)) return false;
        if (normalized.phone && !node.phone.toLowerCase().includes(normalized.phone)) return false;
        if (normalized.ipAddress && !node.ipAddress.toLowerCase().includes(normalized.ipAddress)) return false;
        if (normalized.email && !node.email.toLowerCase().includes(normalized.email)) return false;
        if (normalized.bankName && !node.bankName.toLowerCase().includes(normalized.bankName)) return false;
        return true;
      })
      .map((node) => node.id);
  }, [filters, hasFilterInput, mergedInvestigation.nodes]);

  const linkedNodeIds = useMemo(() => {
    if (!directMatchIds.length) return [];

    const directSet = new Set(directMatchIds);
    const directNodes = mergedInvestigation.nodes.filter((node) => directSet.has(node.id));
    const linked = new Set<string>(directMatchIds);

    for (const node of mergedInvestigation.nodes) {
      for (const direct of directNodes) {
        const samePhone = node.phone === direct.phone;
        const sameIp = node.ipAddress === direct.ipAddress;
        const sameEmail = node.email === direct.email;
        const sameBank = node.bankName === direct.bankName;
        if (samePhone || sameIp || sameEmail || sameBank) {
          linked.add(node.id);
          break;
        }
      }
    }

    return Array.from(linked);
  }, [directMatchIds, mergedInvestigation.nodes]);

  const linkedIdentityScore = useMemo(() => {
    if (!directMatchIds.length) return 0;

    const directSet = new Set(directMatchIds);
    const linkedSet = new Set(linkedNodeIds);
    const directNodes = mergedInvestigation.nodes.filter((node) => directSet.has(node.id));
    const linkedNodes = mergedInvestigation.nodes.filter((node) => linkedSet.has(node.id));

    let evidence = 0;
    for (const linked of linkedNodes) {
      for (const direct of directNodes) {
        if (linked.id === direct.id) continue;
        if (linked.phone === direct.phone) evidence += 11;
        if (linked.ipAddress === direct.ipAddress) evidence += 13;
        if (linked.email === direct.email) evidence += 15;
        if (linked.bankName === direct.bankName) evidence += 7;
      }
    }

    const spreadBoost = Math.max(0, linkedNodes.length - directNodes.length) * 4;
    return Math.min(99, Math.round(52 + evidence / Math.max(linkedNodes.length, 1) + spreadBoost));
  }, [directMatchIds, linkedNodeIds, mergedInvestigation.nodes]);

  const resolutionHints = useMemo<ResolutionHint[]>(() => {
    const candidateIds = linkedNodeIds.length
      ? linkedNodeIds
      : mergedInvestigation.nodes.map((node) => node.id);

    const candidates = mergedInvestigation.nodes.filter((node) => candidateIds.includes(node.id));
    const hints: ResolutionHint[] = [];

    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const a = candidates[i];
        const b = candidates[j];
        const evidence: string[] = [];

        if (a.phone === b.phone) evidence.push("same phone");
        if (a.ipAddress === b.ipAddress) evidence.push("same IP");
        if (a.email === b.email) evidence.push("same email");
        if (a.bankName === b.bankName) evidence.push("same bank");

        if (!evidence.length) continue;

        const probability = Math.min(98, 62 + evidence.length * 12 + (a.holderName === b.holderName ? 8 : 0));
        if (probability < 70) continue;

        hints.push({
          leftLabel: a.label,
          rightLabel: b.label,
          probability,
          evidence,
        });
      }
    }

    return hints.sort((a, b) => b.probability - a.probability).slice(0, 8);
  }, [linkedNodeIds, mergedInvestigation.nodes]);

  const sortedPathRisks = useMemo(
    () => [...mergedInvestigation.pathRisks].sort((a, b) => b.riskScore - a.riskScore),
    [mergedInvestigation.pathRisks],
  );

  const highlightedNodeIds = useMemo(() => {
    if (hasFilterInput) return linkedNodeIds;
    return sortedPathRisks[0]?.chain ?? [];
  }, [hasFilterInput, linkedNodeIds, sortedPathRisks]);

  const commonAccountLabels = useMemo(
    () =>
      mergedInvestigation.commonNodeIds
        .filter((id) => nodeLookup[id]?.nodeType === "bank-account")
        .map((id) => nodeLookup[id]?.label ?? id),
    [mergedInvestigation.commonNodeIds, nodeLookup],
  );

  const commonGraphNodeIds = useMemo(
    () =>
      bankAccountOnly
        ? mergedInvestigation.commonNodeIds.filter((id) => nodeLookup[id]?.nodeType === "bank-account")
        : mergedInvestigation.commonNodeIds,
    [bankAccountOnly, mergedInvestigation.commonNodeIds, nodeLookup],
  );

  const baseGraphNodes = useMemo(
    () =>
      bankAccountOnly
        ? mergedInvestigation.nodes.filter((node) => node.nodeType === "bank-account")
        : mergedInvestigation.nodes,
    [bankAccountOnly, mergedInvestigation.nodes],
  );

  const maxHopAmountLakh = useMemo(() => {
    const maxAmount = mergedInvestigation.edges.reduce((max, edge) => Math.max(max, edge.amount), 0);
    return Math.max(5, Math.ceil(maxAmount / 100000));
  }, [mergedInvestigation.edges]);

  useEffect(() => {
    if (minHopAmountLakh > maxHopAmountLakh) {
      setMinHopAmountLakh(maxHopAmountLakh);
    }
  }, [maxHopAmountLakh, minHopAmountLakh]);

  const riskRouteNodeSet = useMemo(
    () =>
      new Set([
        ...highlightedNodeIds,
        ...mergedInvestigation.sourceNodeIds,
        ...mergedInvestigation.destinationNodeIds,
        ...commonGraphNodeIds,
      ]),
    [
      commonGraphNodeIds,
      highlightedNodeIds,
      mergedInvestigation.destinationNodeIds,
      mergedInvestigation.sourceNodeIds,
    ],
  );

  const graphNodes = useMemo(() => {
    const query = nodeSearchQuery.trim().toLowerCase();

    return baseGraphNodes.filter((node) => {
      const matchesSearch = !query
        || node.label.toLowerCase().includes(query)
        || node.holderName.toLowerCase().includes(query)
        || node.bankName.toLowerCase().includes(query)
        || node.phone.toLowerCase().includes(query);

      const matchesRiskFocus = !focusRiskRoute || riskRouteNodeSet.has(node.id);
      return matchesSearch && matchesRiskFocus;
    });
  }, [baseGraphNodes, focusRiskRoute, nodeSearchQuery, riskRouteNodeSet]);

  const graphNodeIdSet = useMemo(
    () => new Set(graphNodes.map((node) => node.id)),
    [graphNodes],
  );

  const graphEdges = useMemo(() => {
    const minAmount = minHopAmountLakh * 100000;
    return mergedInvestigation.edges.filter(
      (edge) => graphNodeIdSet.has(edge.from) && graphNodeIdSet.has(edge.to) && edge.amount >= minAmount,
    );
  }, [graphNodeIdSet, mergedInvestigation.edges, minHopAmountLakh]);

  const graphCoveragePct = Math.round(
    (graphNodes.length / Math.max(baseGraphNodes.length, 1)) * 100,
  );

  const sourceAccountDetails = useMemo(
    () =>
      mergedInvestigation.sourceNodeIds.flatMap((id) => {
        const node = nodeLookup[id];
        return node ? [node] : [];
      }),
    [mergedInvestigation.sourceNodeIds, nodeLookup],
  );

  const destinationAccountDetails = useMemo(
    () =>
      mergedInvestigation.destinationNodeIds.flatMap((id) => {
        const node = nodeLookup[id];
        return node ? [node] : [];
      }),
    [mergedInvestigation.destinationNodeIds, nodeLookup],
  );

  const caseLayerLanes = useMemo(
    () =>
      mergedInvestigation.selectedCases.map((entry) => {
        const bankLayerGroups = Array.from({ length: 4 }, (_, index) => {
          const layer = index + 1;
          return entry.nodes
            .filter(
              (node) =>
                node.nodeType === "bank-account" &&
                (layerByNode[node.id] ?? node.defaultLayer) === layer,
            )
            .map((node) => node.label);
        });

        const linkedCount = entry.nodes.filter(
          (node) =>
            node.nodeType === "bank-account" &&
            mergedInvestigation.commonNodeIds.includes(node.id),
        ).length;

        return {
          caseId: entry.caseId,
          title: entry.title,
          sourceLabel: nodeLookup[entry.sourceNodeId]?.label ?? entry.sourceNodeId,
          destinationLabels: entry.destinationNodeIds.map((id) => nodeLookup[id]?.label ?? id),
          bankLayerGroups,
          linkedCount,
        };
      }),
    [layerByNode, mergedInvestigation.commonNodeIds, mergedInvestigation.selectedCases, nodeLookup],
  );

  const txByRef = useMemo(() => new Map(transactionData.map((tx) => [tx.id, tx])), [transactionData]);

  const visibleTrailValue = useMemo(
    () => graphEdges.reduce((sum, edge) => sum + edge.amount, 0),
    [graphEdges],
  );

  const avgHopRisk = useMemo(() => {
    const riskScores = graphEdges
      .map((edge) => txByRef.get(edge.txRef)?.riskScore)
      .filter((value): value is number => typeof value === "number");

    if (!riskScores.length) return 0;
    return Math.round(riskScores.reduce((sum, value) => sum + value, 0) / riskScores.length);
  }, [graphEdges, txByRef]);

  const blockedHopCount = useMemo(
    () => graphEdges.filter((edge) => txByRef.get(edge.txRef)?.status === "blocked").length,
    [graphEdges, txByRef],
  );

  const destinationCoveragePct = Math.round(
    (destinationAccountDetails.filter((node) => graphNodeIdSet.has(node.id)).length
      / Math.max(destinationAccountDetails.length, 1))
      * 100,
  );

  const layerFlowMetrics = useMemo(
    () =>
      Array.from({ length: totalLayers }, (_, index) => {
        const layer = index + 1;
        const layerNodes = graphNodes.filter((node) => (layerByNode[node.id] ?? node.defaultLayer) === layer);
        const layerEdges = graphEdges.filter(
          (edge) => (layerByNode[edge.from] ?? 0) === layer || (layerByNode[edge.to] ?? 0) === layer,
        );

        const amountLakh = Math.max(
          0,
          Math.round(layerEdges.reduce((sum, edge) => sum + edge.amount, 0) / 100000),
        );
        const avgRisk = Math.round(
          layerEdges.reduce((sum, edge) => sum + (txByRef.get(edge.txRef)?.riskScore ?? 0), 0)
            / Math.max(layerEdges.length, 1),
        );

        return {
          layer: `L${layer}`,
          nodeCount: layerNodes.length,
          hopCount: layerEdges.length,
          amountLakh,
          avgRisk,
        };
      }),
    [graphEdges, graphNodes, layerByNode, totalLayers, txByRef],
  );

  const caseRiskSnapshot = useMemo(
    () =>
      mergedInvestigation.selectedCases
        .map((entry) => {
          const totalAmountLakh = Math.round(
            entry.edges.reduce((sum, edge) => sum + edge.amount, 0) / 100000,
          );
          const riskMax = Math.max(...entry.pathRisks.map((path) => path.riskScore), 0);
          const riskAvg = Math.round(
            entry.pathRisks.reduce((sum, path) => sum + path.riskScore, 0) / Math.max(entry.pathRisks.length, 1),
          );

          return {
            caseId: entry.caseId,
            riskMax,
            riskAvg,
            totalAmountLakh,
          };
        })
        .sort((left, right) => right.riskMax - left.riskMax),
    [mergedInvestigation.selectedCases],
  );

  const linkedTransactions = useMemo(() => {
    const refs = new Set(mergedInvestigation.edges.map((edge) => edge.txRef));
    return transactionData
      .filter((tx) => refs.has(tx.id))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 6);
  }, [mergedInvestigation.edges, transactionData]);

  const replaySortedEdges = useMemo(
    () => [...mergedInvestigation.edges].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [mergedInvestigation.edges],
  );

  const replayActiveEdges = useMemo(() => {
    if (!replaySortedEdges.length) return [];
    const max = Math.max(0, Math.min(timelineStep, replaySortedEdges.length));
    return replaySortedEdges.slice(0, max);
  }, [replaySortedEdges, timelineStep]);

  const aiDetectionSummary = useMemo(
    () =>
      detectionCatalog.map((label) => {
        const matching = sortedPathRisks.filter((entry) => entry.label === label);
        const score = matching.length ? Math.max(...matching.map((entry) => entry.riskScore)) : 0;
        return {
          label,
          score,
          explanation: matching[0]?.explanation ?? "No active chain in selected cases.",
        };
      }),
    [sortedPathRisks],
  );

  const investigationTrend = useMemo(
    () =>
      graphEdges
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-12)
        .map((edge, index) => ({
          label: `H${index + 1}`,
          value: Math.max(1, Math.round(edge.amount / 100000)),
        })),
    [graphEdges],
  );

  const riskFactors = useMemo(
    () =>
      sortedPathRisks.slice(0, 5).map((entry) => ({
        label: entry.label,
        score: entry.riskScore,
        desc: entry.explanation,
      })),
    [sortedPathRisks],
  );

  const radarData = useMemo(
    () =>
      aiDetectionSummary.map((entry) => ({
        subject: entry.label,
        A: entry.score,
      })),
    [aiDetectionSummary],
  );

  const threatTimeline = useMemo(() => {
    const txStatusById = new Map(transactionData.map((tx) => [tx.id, tx.status]));
    const grouped = new Map<string, { threats: number; blocked: number }>();

    for (const edge of replayActiveEdges) {
      const key = new Date(edge.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const row = grouped.get(key) ?? { threats: 0, blocked: 0 };
      row.threats += 1;
      const status = txStatusById.get(edge.txRef);
      if (status === "blocked") {
        row.blocked += 1;
      }
      grouped.set(key, row);
    }

    const rows = Array.from(grouped.entries()).map(([time, metrics]) => ({
      time,
      threats: metrics.threats,
      blocked: metrics.blocked,
    }));

    return rows.slice(-8);
  }, [replayActiveEdges, transactionData]);

  const recentThreatEvents = useMemo(
    () =>
      replayActiveEdges
        .slice()
        .reverse()
        .slice(0, 6)
        .map((edge) => {
          const tx = txByRef.get(edge.txRef);
          const fromLabel = nodeLookup[edge.from]?.label ?? edge.from;
          const toLabel = nodeLookup[edge.to]?.label ?? edge.to;
          const riskScore = tx?.riskScore ?? 0;

          return {
            time: new Date(edge.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            event: `${fromLabel} -> ${toLabel} | ${formatAmount(edge.amount)} | ${edge.txRef}`,
            severity: riskScore >= 90 ? "critical" : riskScore >= 75 ? "high" : "medium",
          };
        }),
    [nodeLookup, replayActiveEdges, txByRef],
  );

  const updateCases = (caseIds: string[]) => {
    if (!caseIds.length) {
      const fallback = caseOptions[0]?.caseId;
      setSelectedCaseIds(fallback ? [fallback] : []);
      return;
    }
    setSelectedCaseIds(caseIds);
  };

  const toggleLayer = (layer: number) => {
    if (!investigationMode) return;
    setCollapsedLayers((previous) =>
      previous.includes(layer) ? previous.filter((entry) => entry !== layer) : [...previous, layer],
    );
  };

  const resetNetworkView = () => {
    setNodeSearchQuery("");
    setMinHopAmountLakh(0);
    setFocusRiskRoute(false);
    setCollapsedLayers([]);
    setBankAccountOnly(false);
    setShowAdvancedNetworkPanels(false);
  };

  const graphStep = investigationMode ? timelineStep : Math.min(timelineStep, 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fraud Intelligence and Bank Account Layering</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Law-enforcement-ready workspace for layered account tracing, inter-case spider maps, and source-to-destination money trail analysis
          </p>
          {intelSyncMessage ? (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {intelSyncMessage}
            </p>
          ) : null}
        </div>

        <div className="glass rounded-xl p-3 w-full sm:w-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Investigation Mode</p>
          <div className="flex items-center justify-between gap-3 mt-1.5">
            <span className="text-xs font-medium">
              {investigationMode ? "Investigation Mode" : "Bank Mode"}
            </span>
            <button
              onClick={() => setInvestigationMode((prev) => !prev)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                investigationMode ? "bg-primary/40" : "bg-secondary"
              }`}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className={`absolute top-1 w-5 h-5 rounded-full ${
                  investigationMode ? "left-8 bg-primary" : "left-1 bg-muted-foreground"
                }`}
              />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {investigationMode
              ? "Full graph access, deep tracing, and case linking enabled"
              : "Reduced tracing mode for standard bank operations"}
          </p>
          <button
            type="button"
            onClick={() => void syncInvestigationWorkspace()}
            disabled={intelSyncLoading}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
          >
            <RotateCcw className={`h-3 w-3 ${intelSyncLoading ? "animate-spin" : ""}`} />
            {intelSyncLoading ? "Syncing" : "Sync MongoDB"}
          </button>
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Investigation Intelligence Pulse"
          subtitle="Layered case telemetry across spider maps, identity linking, and source to destination movement"
          variant="investigation"
          chartType="donut"
          chartPlacement="right"
          metrics={[
            {
              label: "Cases Active",
              value: `${selectedCaseIds.length}`,
              hint: "inter-case merge scope",
              icon: Fingerprint,
              tone: "primary",
            },
            {
              label: "Graph Accounts",
              value: `${graphNodes.length}`,
              hint: bankAccountOnly ? "bank accounts only" : "all linked entities",
              icon: Network,
              tone: "accent",
            },
            {
              label: "Money Hops",
              value: `${graphEdges.length}`,
              hint: "transaction trail edges",
              icon: Link2,
              tone: graphEdges.length > 12 ? "warning" : "primary",
            },
            {
              label: "Identity Links",
              value: `${linkedNodeIds.length}`,
              hint: "linked by phone/IP/email",
              icon: ScanSearch,
              tone: linkedNodeIds.length > 6 ? "warning" : "success",
            },
            {
              label: "Src -> Dest",
              value: `${sourceAccountDetails.length} -> ${destinationAccountDetails.length}`,
              hint: "investigation entry and exit",
              icon: Target,
              tone: "destructive",
            },
          ]}
          chartData={investigationTrend}
          chartLabel="Hop Value (x100k INR)"
          chartColor="hsl(48, 96%, 53%)"
          badges={[
            investigationMode ? "Mode: INVESTIGATION" : "Mode: BANK",
            bankAccountOnly ? "View: BANK ACCOUNTS" : "View: FULL GRAPH",
            `Linked Identity Score: ${linkedIdentityScore}%`,
          ]}
        />
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-4 border border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Live Backend ML Output</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Snapshot from latest /ml/train/runs result for AML, layering, and entity-linking intelligence.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              {mlSyncLoading ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                  <Loader className="w-3 h-3 animate-spin" /> Syncing
                </span>
              ) : latestTrainingRun ? (
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Run {latestTrainingRun.run_id.slice(0, 8)}
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground">No Run Data</span>
              )}
            </div>
          </div>

          {mlSyncError && (
            <p className="text-xs text-warning mt-3">{mlSyncError}</p>
          )}

          {latestTrainingRun && (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-4">
                <div className="rounded-lg bg-secondary/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AML Alerts</p>
                  <p className="text-sm font-mono font-semibold mt-1">{amlAlertCount}</p>
                </div>
                <div className="rounded-lg bg-secondary/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entity Links</p>
                  <p className="text-sm font-mono font-semibold mt-1">{linkedPairCount}</p>
                </div>
                <div className="rounded-lg bg-secondary/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suspicious Nodes</p>
                  <p className="text-sm font-mono font-semibold mt-1">{suspiciousNodeCount}</p>
                </div>
                <div className="rounded-lg bg-secondary/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Advanced AUC</p>
                  <p className="text-sm font-mono font-semibold mt-1">{advancedAuc.toFixed(3)}</p>
                </div>
              </div>

              <div className="mt-3 grid lg:grid-cols-2 gap-2">
                {latestTrainingRun.results.map((result) => (
                  <div key={result.pipeline} className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{result.pipeline}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          result.status === "success"
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      rows: {result.rows} | model: {result.model_type}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { icon: Fingerprint, label: "Fraud DNAs", value: totalPatterns.toString(), color: "text-primary" },
            { icon: Target, label: "Avg Similarity", value: `${avgSimilarity}%`, color: "text-warning" },
            { icon: AlertTriangle, label: "Active Threats", value: activeThreats.toString(), color: "text-destructive" },
            { icon: Shield, label: "Block Rate", value: "99.2%", color: "text-success" },
            { icon: Link2, label: "Visible Trail Value", value: `${Math.max(0, Math.round(visibleTrailValue / 100000))}L`, color: "text-accent" },
            { icon: Network, label: "Graph Coverage", value: `${graphCoveragePct}%`, color: "text-primary" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary w-fit">
        {[
          { key: "patterns" as const, label: "DNA Patterns", icon: Fingerprint },
          { key: "network" as const, label: "Bank Layer Spider Map", icon: Network },
          { key: "timeline" as const, label: "Timeline Replay", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "patterns" && (
          <motion.div
            key="patterns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                {fraudDNAData.map((dna, i) => (
                  <motion.div
                    key={dna.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="glass rounded-xl p-5 hover:border-primary/20 transition-colors duration-300 cursor-pointer"
                    onClick={() => setSelectedDNA(dna)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Fingerprint className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold">{dna.pattern}</h3>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                catColor[dna.category] || "bg-muted text-muted-foreground"
                              }`}
                            >
                              {dna.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{dna.hash}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Source: {dna.source} | {new Date(dna.detectedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold font-mono text-primary">{dna.similarity}%</div>
                        <p className="text-[10px] text-muted-foreground">match</p>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${dna.similarity}%` }}
                        transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" /> AI Risk Factors
                  </h3>
                  <div className="space-y-3">
                    {riskFactors.map((factor, i) => (
                      <motion.div
                        key={factor.label}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{factor.label}</span>
                          <span
                            className={`text-xs font-mono font-bold ${
                              factor.score >= 90
                                ? "text-destructive"
                                : factor.score >= 70
                                ? "text-warning"
                                : "text-success"
                            }`}
                          >
                            {factor.score}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              factor.score >= 90
                                ? "bg-destructive"
                                : factor.score >= 70
                                ? "bg-warning"
                                : "bg-success"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${factor.score}%` }}
                            transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{factor.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4">Detection Radar</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(220, 16%, 14%)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }}
                      />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar
                        name="Score"
                        dataKey="A"
                        stroke="hsl(48, 96%, 53%)"
                        fill="hsl(48, 96%, 53%)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "network" && (
          <motion.div
            key="network"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" /> Bank Account Layering Spider Map
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Interactive nodal map for how money moved from one bank account to another with inter-case layer linking.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-2 py-1 rounded-full bg-primary/15 text-primary font-semibold">
                    Total Layers: {totalLayers}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground font-semibold">
                    Cases Selected: {selectedCaseIds.length}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground font-semibold">
                    Visible Nodes: {graphNodes.length}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground font-semibold">
                    Visible Hops: {graphEdges.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBankAccountOnly((prev) => !prev)}
                    className={`px-2 py-1 rounded-full font-semibold transition-colors ${
                      bankAccountOnly
                        ? "bg-accent/20 text-accent"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {bankAccountOnly ? "Bank Accounts Only" : "All Nodes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedNetworkPanels((prev) => !prev)}
                    className={`px-2 py-1 rounded-full font-semibold transition-colors ${
                      showAdvancedNetworkPanels
                        ? "bg-warning/20 text-warning"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {showAdvancedNetworkPanels ? "Advanced Panels ON" : "Advanced Panels OFF"}
                  </button>
                  <button
                    type="button"
                    onClick={resetNetworkView}
                    className="px-2 py-1 rounded-full font-semibold bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset View
                  </button>
                  <span
                    className={`px-2 py-1 rounded-full font-semibold ${
                      investigationMode
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {investigationMode ? "Deep tracing enabled" : "Limited trace (Bank Mode)"}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-2">
                <label className="rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Account Search</span>
                  <input
                    value={nodeSearchQuery}
                    onChange={(event) => setNodeSearchQuery(event.target.value)}
                    placeholder="holder, bank, label, phone"
                    className="mt-1 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                </label>

                <div className="rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min Hop Amount</span>
                    <span className="text-[10px] font-mono text-foreground">{minHopAmountLakh}L</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxHopAmountLakh}
                    value={minHopAmountLakh}
                    onChange={(event) => setMinHopAmountLakh(Number(event.target.value))}
                    className="mt-1 w-full accent-primary"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFocusRiskRoute((prev) => !prev)}
                  className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    focusRiskRoute
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-secondary/40 hover:border-primary/40"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Route Focus</p>
                  <p className="text-xs mt-1 font-medium">
                    {focusRiskRoute ? "Top risk route only" : "All visible routes"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Focuses the spider map on suspicious chain nodes.
                  </p>
                </button>
              </div>
            </div>

            <div className="glass rounded-xl p-4 border border-primary/25">
              <p className="text-xs font-semibold text-primary">Layering Problem Alignment</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Integrates different bank accounts into layers, links inter-case spider maps, filters by holder and digital identity details, and exposes source and destination accounts for police investigation.
              </p>
            </div>

            {!investigationMode && (
              <div className="glass rounded-xl p-4 border border-warning/40">
                <p className="text-xs text-warning font-medium">
                  Investigation Mode is OFF. Turn it ON to unlock full graph access, case linking, deep tracing, and report generation.
                </p>
              </div>
            )}

            <div className="grid xl:grid-cols-12 gap-4">
              <div className="xl:col-span-3 space-y-4">
                <CaseLinkingPanel
                  options={caseOptions}
                  selectedCaseIds={selectedCaseIds}
                  onSelectedCaseIdsChange={updateCases}
                  commonAccountLabels={commonAccountLabels}
                  sharedPatternLabels={mergedInvestigation.sharedPatternLabels}
                  disabled={!investigationMode}
                />

                <EntityFilterPanel
                  filters={filters}
                  onFiltersChange={setFilters}
                  linkedIdentityScore={linkedIdentityScore}
                  directMatchCount={directMatchIds.length}
                  linkedCount={linkedNodeIds.length}
                  resolutionHints={resolutionHints}
                  disabled={!investigationMode}
                />
              </div>

              <div className="xl:col-span-6 space-y-4">
                <MoneyTrailSpiderMap
                  nodes={graphNodes}
                  edges={graphEdges}
                  layerByNode={layerByNode}
                  collapsedLayers={collapsedLayers}
                  highlightedNodeIds={highlightedNodeIds}
                  commonNodeIds={commonGraphNodeIds}
                  sourceNodeIds={mergedInvestigation.sourceNodeIds}
                  destinationNodeIds={mergedInvestigation.destinationNodeIds}
                  activeStep={graphStep}
                />

                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="glass rounded-xl p-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <ListTree className="w-4 h-4 text-primary" /> Layer Flow Metrics
                    </h4>
                    <p className="text-[10px] text-muted-foreground mb-3">
                      Per-layer hop intensity, moved value, and average risk profile.
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={layerFlowMetrics} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" opacity={0.45} />
                        <XAxis dataKey="layer" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar yAxisId="left" dataKey="amountLakh" name="Amount (L)" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="avgRisk" name="Avg Risk" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 2 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass rounded-xl p-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning" /> Case Risk Snapshot
                    </h4>
                    <p className="text-[10px] text-muted-foreground mb-3">
                      Quick comparison of max and average risk across selected cases.
                    </p>
                    {caseRiskSnapshot.length ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={caseRiskSnapshot.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 6, left: 6, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" opacity={0.45} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                          <YAxis dataKey="caseId" type="category" width={68} tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="riskMax" name="Max Risk" fill="hsl(14, 100%, 57%)" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="riskAvg" name="Avg Risk" fill="hsl(48, 96%, 53%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[220px] rounded-lg border border-dashed border-border bg-secondary/20 flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">No case risk data available.</p>
                      </div>
                    )}
                  </div>
                </div>

                {showAdvancedNetworkPanels ? (
                  <>
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <ListTree className="w-4 h-4 text-primary" /> Layer Detection System
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          Total Layers: {totalLayers}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2">
                        {layerSummary.map((entry) => {
                          const collapsed = collapsedLayers.includes(entry.layer);
                          return (
                            <button
                              key={entry.layer}
                              type="button"
                              onClick={() => toggleLayer(entry.layer)}
                              disabled={!investigationMode}
                              className={`text-left rounded-lg border p-3 transition-colors disabled:cursor-not-allowed ${
                                collapsed
                                  ? "border-warning/50 bg-warning/10"
                                  : "border-border bg-secondary/40 hover:border-primary/40"
                              }`}
                            >
                              <p className="text-xs font-semibold">
                                Layer {entry.layer}: {layerLabel(entry.layer)}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {entry.members.length} nodes | {collapsed ? "Collapsed" : "Expanded"}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                {entry.members.map((member) => member.label).join(" | ") || "No nodes"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="glass rounded-xl p-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Network className="w-4 h-4 text-primary" /> Inter-Case Spider Map Lanes
                      </h4>
                      <p className="text-[10px] text-muted-foreground mb-3">
                        Selected cases are lined by bank-account layers L1 to L4 for cross-case comparison.
                      </p>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {caseLayerLanes.map((lane) => (
                          <div key={lane.caseId} className="rounded-lg border border-border bg-secondary/40 p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold">{lane.caseId}</p>
                                <p className="text-[10px] text-muted-foreground">{lane.title}</p>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">
                                {lane.linkedCount} linked
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Source: <span className="text-foreground">{lane.sourceLabel}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Destination: <span className="text-foreground">{lane.destinationLabels.join(" | ") || "none"}</span>
                            </p>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 mt-2">
                              {lane.bankLayerGroups.map((group, index) => (
                                <div key={`${lane.caseId}-L${index + 1}`} className="rounded-md border border-border bg-background/60 p-1.5">
                                  <p className="text-[10px] font-semibold text-primary">L{index + 1}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {group.length ? group.slice(0, 2).join(" / ") : "none"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass rounded-xl p-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                        <Link2 className="w-4 h-4 text-primary" /> Integrated Transactions Module Signals
                      </h4>
                      <div className="space-y-2">
                        {linkedTransactions.length ? (
                          linkedTransactions.map((tx) => (
                            <div key={tx.id} className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-mono">{tx.id}</p>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    tx.riskScore >= 85
                                      ? "bg-destructive/15 text-destructive"
                                      : tx.riskScore >= 60
                                      ? "bg-warning/15 text-warning"
                                      : "bg-success/15 text-success"
                                  }`}
                                >
                                  Risk {tx.riskScore}
                                </span>
                              </div>
                              <p className="text-[11px] mt-1">
                                {tx.from} {"->"} {tx.to}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No direct transaction IDs matched from current case selection.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass rounded-xl p-4 border border-dashed border-border">
                    <p className="text-xs text-muted-foreground">
                      Advanced network panels are hidden to keep focus on required visuals and core metrics.
                    </p>
                  </div>
                )}
              </div>

              <div className="xl:col-span-3 space-y-4">
                <div className="glass rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-3">Source and Destination Accounts</h4>

                  <div className="space-y-2">
                    <div className="rounded-lg border border-border bg-secondary/40 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Source Accounts</p>
                      <div className="space-y-1.5 mt-1.5">
                        {sourceAccountDetails.length ? (
                          sourceAccountDetails.map((node) => (
                            <div key={node.id}>
                              <p className="text-[11px] font-mono">{node.label}</p>
                              <p className="text-[10px] text-muted-foreground">{node.holderName} | {node.bankName}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-muted-foreground">No source account identified.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/40 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Destination Accounts</p>
                      <div className="space-y-1.5 mt-1.5">
                        {destinationAccountDetails.length ? (
                          destinationAccountDetails.map((node) => (
                            <div key={node.id}>
                              <p className="text-[11px] font-mono">{node.label}</p>
                              <p className="text-[10px] text-muted-foreground">{node.holderName} | {node.bankName}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-muted-foreground">No destination account identified.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-3">Operational Network Metrics</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="rounded-md border border-border bg-secondary/40 px-2 py-1.5">
                      <p className="text-muted-foreground uppercase tracking-wider">Avg Hop Risk</p>
                      <p className="font-semibold text-warning mt-0.5">{avgHopRisk}%</p>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/40 px-2 py-1.5">
                      <p className="text-muted-foreground uppercase tracking-wider">Blocked Hops</p>
                      <p className="font-semibold text-destructive mt-0.5">{blockedHopCount}</p>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/40 px-2 py-1.5">
                      <p className="text-muted-foreground uppercase tracking-wider">Dest Coverage</p>
                      <p className="font-semibold text-primary mt-0.5">{destinationCoveragePct}%</p>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/40 px-2 py-1.5">
                      <p className="text-muted-foreground uppercase tracking-wider">Active Filter</p>
                      <p className="font-semibold text-foreground mt-0.5">{minHopAmountLakh}L floor</p>
                    </div>
                  </div>
                </div>

                <InvestigationReportGenerator
                  selectedCaseIds={selectedCaseIds}
                  nodes={mergedInvestigation.nodes}
                  edges={mergedInvestigation.edges}
                  layerByNode={layerByNode}
                  pathRisks={mergedInvestigation.pathRisks}
                  sourceNodeIds={mergedInvestigation.sourceNodeIds}
                  destinationNodeIds={mergedInvestigation.destinationNodeIds}
                  disabled={!investigationMode}
                />

                {showAdvancedNetworkPanels ? (
                  <>
                    <div className="glass rounded-xl p-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                        <ScanSearch className="w-4 h-4 text-primary" /> AI Layering Detection Labels
                      </h4>

                      <div className="space-y-2.5">
                        {aiDetectionSummary.map((entry) => {
                          const tone =
                            entry.score >= 90
                              ? "bg-destructive text-destructive"
                              : entry.score >= 75
                              ? "bg-warning text-warning"
                              : "bg-muted text-muted-foreground";

                          return (
                            <div key={entry.label} className="rounded-lg border border-border bg-secondary/40 p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold">{entry.label}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${tone}`}>
                                  {entry.score ? `${entry.score}%` : "No signal"}
                                </span>
                              </div>
                              <div className="h-1.5 mt-2 rounded-full bg-background overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    entry.score >= 90
                                      ? "bg-destructive"
                                      : entry.score >= 75
                                      ? "bg-warning"
                                      : "bg-muted"
                                  }`}
                                  style={{ width: `${Math.max(entry.score, 4)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">{entry.explanation}</p>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-3">
                        Risk score per path is computed from layer depth, identity overlap, and transaction velocity.
                      </p>
                    </div>

                    <InvestigationWorkflowPanel
                      selectedCaseIds={selectedCaseIds}
                      disabled={!investigationMode}
                    />

                    <div className="glass rounded-xl p-4">
                      <h4 className="text-sm font-semibold mb-3">Suspicious Chain Focus</h4>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {sortedPathRisks.length ? (
                          sortedPathRisks.slice(0, 5).map((chain) => (
                            <div key={chain.id} className="rounded-lg border border-border bg-secondary/40 p-2.5">
                              <p className="text-xs font-semibold text-warning">
                                {chain.label} ({chain.riskScore}%)
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {chain.chain.map((id) => nodeLookup[id]?.label ?? id).join(" -> ")}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No suspicious chain data for selected case.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground px-1">
                    Enable advanced panels for AI labels, workflow actions, and suspicious-chain diagnostics.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <MoneyFlowTimeline
              edges={mergedInvestigation.edges}
              nodes={mergedInvestigation.nodes}
              activeStep={Math.max(timelineStep, 1)}
              onActiveStepChange={setTimelineStep}
              disabled={!investigationMode}
            />

            <div className="grid xl:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">24h Threat Timeline</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={threatTimeline.length ? threatTimeline : [{ time: "-", threats: 0, blocked: 0 }]}>
                    <defs>
                      <linearGradient id="gradThreats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradBlk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                    <XAxis dataKey="time" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <YAxis stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(220, 18%, 8%)",
                        border: "1px solid hsl(220, 16%, 14%)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="threats"
                      stroke="hsl(0, 72%, 51%)"
                      strokeWidth={2}
                      fill="url(#gradThreats)"
                    />
                    <Area
                      type="monotone"
                      dataKey="blocked"
                      stroke="hsl(142, 72%, 45%)"
                      strokeWidth={2}
                      fill="url(#gradBlk)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Recent Threat Events</h3>
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                  {recentThreatEvents.map((entry, i) => (
                    <motion.div
                      key={entry.time}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="relative"
                    >
                      <div
                        className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 border-background ${
                          entry.severity === "critical"
                            ? "bg-destructive"
                            : entry.severity === "high"
                            ? "bg-warning"
                            : "bg-accent"
                        }`}
                      />
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">
                          {entry.time}
                        </span>
                        <div>
                          <p className="text-xs">{entry.event}</p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                              entry.severity === "critical"
                                ? "bg-destructive/10 text-destructive"
                                : entry.severity === "high"
                                ? "bg-warning/10 text-warning"
                                : "bg-accent/10 text-accent"
                            }`}
                          >
                            {entry.severity}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {!recentThreatEvents.length ? (
                    <p className="text-xs text-muted-foreground">No threat events were generated for the current case selection.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDNA && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setSelectedDNA(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-50 bg-card border border-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedDNA.pattern}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{selectedDNA.hash}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDNA(null)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  ["Category", selectedDNA.category],
                  ["Similarity", `${selectedDNA.similarity}%`],
                  ["Source", selectedDNA.source],
                  ["Detected", new Date(selectedDNA.detectedAt).toLocaleString()],
                ].map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-mono font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">AI Insight: </span>
                  This fraud DNA pattern shows {selectedDNA.similarity}% match with known {selectedDNA.category.toLowerCase()} signatures.
                  Cross-institutional correlation confirms multi-hop transaction layering involving
                  {selectedDNA.source.includes("Multi") ? " 3+ institutions." : " the monitored institution."}
                  Recommend escalation to compliance team for SAR filing.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
