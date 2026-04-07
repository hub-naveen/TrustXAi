import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  ArrowRight,
  ArrowLeftRight,
  Boxes,
  CheckCircle2,
  Building2,
  Activity,
  RotateCcw,
  ShieldAlert,
  Landmark,
  Clock3,
  Filter,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllTransactions,
  fetchBlockchainEntries,
  fetchBlockchainContracts,
  fetchBlockchainMetrics,
  fetchTransactionMetrics,
  fetchViewerDashboardSummary,
  type BackendBlockchainEntry,
  type BackendBlockchainMetrics,
  type BackendDashboardSummary,
  type BackendSmartContract,
  type BackendTransaction,
  type BackendTransactionMetrics,
} from "@/lib/backendApi";

const defaultQuickViews = [
  { label: "Transactions", path: "/transactions" },
  { label: "Blockchain", path: "/blockchain" },
];

const actionMeta: Record<string, { description: string; icon: typeof Eye }> = {
  "/transactions": {
    description: "Browse live and historical transaction stream summaries.",
    icon: ArrowLeftRight,
  },
  "/blockchain": {
    description: "Inspect immutable fraud ledger updates and confirmations.",
    icon: Boxes,
  },
};

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)}L`;
  return `Rs ${amount.toLocaleString()}`;
};

const statusClass = (status: string) => {
  if (status === "blocked") return "bg-destructive/10 text-destructive";
  if (status === "flagged") return "bg-warning/10 text-warning";
  if (status === "pending") return "bg-primary/10 text-primary";
  if (status === "active") return "bg-success/10 text-success";
  return "bg-secondary text-muted-foreground";
};

const signed = (value: number) => {
  if (value > 0) return `+${value}`;
  return `${value}`;
};

interface SnapshotDelta {
  transactions: number;
  blocked: number;
  pendingChain: number;
}

export default function ViewerDashboard() {
  const { authToken } = useAuth();
  const [transactionRows, setTransactionRows] = useState<BackendTransaction[]>([]);
  const [blockchainRows, setBlockchainRows] = useState<BackendBlockchainEntry[]>([]);
  const [contractRows, setContractRows] = useState<BackendSmartContract[]>([]);
  const [blockchainMetrics, setBlockchainMetrics] = useState<BackendBlockchainMetrics | null>(null);
  const [transactionMetrics, setTransactionMetrics] = useState<BackendTransactionMetrics | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<BackendDashboardSummary | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [riskFloor, setRiskFloor] = useState(80);
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [snapshotDelta, setSnapshotDelta] = useState<SnapshotDelta | null>(null);

  const previousSnapshotRef = useRef<SnapshotDelta | null>(null);
  const syncInFlightRef = useRef(false);

  const syncViewerData = useCallback(async () => {
    if (syncInFlightRef.current) return;

    if (!authToken) {
      setTransactionRows([]);
      setBlockchainRows([]);
      setContractRows([]);
      setBlockchainMetrics(null);
      setTransactionMetrics(null);
      setDashboardSummary(null);
      setLastSyncedAt(null);
      setSnapshotDelta(null);
      setSyncMessage("Backend auth token unavailable. Sign in to load live viewer telemetry.");
      return;
    }

    syncInFlightRef.current = true;
    setSyncLoading(true);
    setSyncMessage("Syncing viewer dashboard from backend...");

    try {
      const [summary, transactions, txMetrics, blockchainEntries, metrics, contracts] = await Promise.all([
        fetchViewerDashboardSummary(),
        fetchAllTransactions({ sortBy: "timestamp", sortDir: "desc", maxRecords: 20000 }),
        fetchTransactionMetrics(),
        fetchBlockchainEntries(),
        fetchBlockchainMetrics(),
        fetchBlockchainContracts(),
      ]);

      const currentSnapshot: SnapshotDelta = {
        transactions: transactions.length,
        blocked: txMetrics.blocked_count,
        pendingChain: metrics.pending_count,
      };

      if (previousSnapshotRef.current) {
        setSnapshotDelta({
          transactions: currentSnapshot.transactions - previousSnapshotRef.current.transactions,
          blocked: currentSnapshot.blocked - previousSnapshotRef.current.blocked,
          pendingChain: currentSnapshot.pendingChain - previousSnapshotRef.current.pendingChain,
        });
      }

      previousSnapshotRef.current = currentSnapshot;

      setDashboardSummary(summary);
      setTransactionRows(transactions);
      setTransactionMetrics(txMetrics);
      setBlockchainRows(blockchainEntries);
      setBlockchainMetrics(metrics);
      setContractRows(contracts);
      setLastSyncedAt(new Date().toISOString());
      setSyncMessage(
        `Loaded ${transactions.length.toLocaleString()} transactions, ${blockchainEntries.length} chain entries, and ${contracts.length} smart contracts from backend.`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to sync viewer dashboard.";
      setDashboardSummary(null);
      setTransactionRows([]);
      setBlockchainRows([]);
      setContractRows([]);
      setBlockchainMetrics(null);
      setTransactionMetrics(null);
      setSyncMessage(detail);
    } finally {
      setSyncLoading(false);
      syncInFlightRef.current = false;
    }
  }, [authToken]);

  useEffect(() => {
    void syncViewerData();
  }, [syncViewerData]);

  useEffect(() => {
    if (!autoRefreshEnabled || !authToken) return;

    const timer = window.setInterval(() => {
      void syncViewerData();
    }, 45000);

    return () => {
      window.clearInterval(timer);
    };
  }, [authToken, autoRefreshEnabled, syncViewerData]);

  const institutions = useMemo(
    () => Array.from(new Set(transactionRows.map((transaction) => transaction.institution))).sort(),
    [transactionRows],
  );

  const scopedTransactions = useMemo(
    () =>
      transactionRows.filter((transaction) => {
        if (institutionFilter === "all") return true;
        return transaction.institution === institutionFilter;
      }),
    [institutionFilter, transactionRows],
  );

  const watchlistRows = useMemo(
    () => scopedTransactions.filter((transaction) => transaction.risk_score >= riskFloor).slice(0, 8),
    [riskFloor, scopedTransactions],
  );

  const totalTransactions = transactionMetrics?.total_transactions ?? transactionRows.length;
  const blockedTx =
    transactionMetrics?.blocked_count ??
    transactionRows.filter((transaction) => transaction.status === "blocked").length;
  const flaggedTx =
    transactionMetrics?.flagged_count ??
    transactionRows.filter((transaction) => transaction.status === "flagged").length;
  const approvedTx = transactionRows.filter((transaction) => transaction.status === "approved").length;
  const pendingTx = transactionRows.filter((transaction) => transaction.status === "pending").length;

  const approvedRate = Math.round((approvedTx / Math.max(totalTransactions, 1)) * 100);
  const blockedRate = Math.round((blockedTx / Math.max(totalTransactions, 1)) * 100);

  const confirmedOnChain =
    blockchainMetrics?.confirmed_count ?? blockchainRows.filter((entry) => entry.status === "confirmed").length;
  const chainRate =
    blockchainMetrics?.confirmation_rate ??
    Math.round((confirmedOnChain / Math.max(blockchainRows.length, 1)) * 100);
  const trackedInstitutions = institutions.length;
  const totalVolume =
    transactionMetrics?.total_volume ??
    transactionRows.reduce((sum, transaction) => sum + transaction.amount, 0);
  const activeContracts =
    blockchainMetrics?.active_contract_count ??
    contractRows.filter((contract) => contract.status === "active").length;
  const avgRisk = Math.round(
    transactionRows.reduce((sum, transaction) => sum + transaction.risk_score, 0) /
      Math.max(transactionRows.length, 1),
  );

  const confidenceTrend = useMemo(
    () =>
      transactionRows
        .slice(0, 12)
        .reverse()
        .map((transaction, index) => ({
          label: `V${index + 1}`,
          value: Math.max(0, 100 - transaction.risk_score),
        })),
    [transactionRows],
  );

  const quickViews = useMemo(() => {
    const actions = dashboardSummary?.actions?.length ? dashboardSummary.actions : defaultQuickViews;

    return actions.map((action) => {
      const meta = actionMeta[action.path] ?? {
        description: "Open read-only operational insights.",
        icon: Eye,
      };

      return {
        title: action.label,
        description: meta.description,
        to: action.path,
        icon: meta.icon,
      };
    });
  }, [dashboardSummary]);

  const statusMix = useMemo(() => {
    const tally = {
      approved: 0,
      blocked: 0,
      flagged: 0,
      pending: 0,
    };

    for (const transaction of scopedTransactions) {
      tally[transaction.status] += 1;
    }

    return [
      { status: "Approved", count: tally.approved, fill: "hsl(142, 72%, 45%)" },
      { status: "Blocked", count: tally.blocked, fill: "hsl(0, 72%, 51%)" },
      { status: "Flagged", count: tally.flagged, fill: "hsl(38, 92%, 50%)" },
      { status: "Pending", count: tally.pending, fill: "hsl(205, 75%, 52%)" },
    ];
  }, [scopedTransactions]);

  const riskBandDistribution = useMemo(() => {
    const bands = [
      { band: "0-39", count: 0, fill: "hsl(142, 72%, 45%)" },
      { band: "40-59", count: 0, fill: "hsl(205, 75%, 52%)" },
      { band: "60-79", count: 0, fill: "hsl(38, 92%, 50%)" },
      { band: "80-100", count: 0, fill: "hsl(0, 72%, 51%)" },
    ];

    for (const transaction of scopedTransactions) {
      const risk = transaction.risk_score;
      if (risk < 40) bands[0].count += 1;
      else if (risk < 60) bands[1].count += 1;
      else if (risk < 80) bands[2].count += 1;
      else bands[3].count += 1;
    }

    return bands;
  }, [scopedTransactions]);

  const transactionPulse = useMemo(
    () =>
      scopedTransactions
        .slice(0, 18)
        .reverse()
        .map((transaction, index) => ({
          slot: `T${index + 1}`,
          risk: transaction.risk_score,
          volumeLakh: Number((transaction.amount / 100000).toFixed(2)),
        })),
    [scopedTransactions],
  );

  const institutionExposure = useMemo(() => {
    const matrix = new Map<
      string,
      {
        volume: number;
        totalRisk: number;
        count: number;
      }
    >();

    for (const transaction of scopedTransactions) {
      const row = matrix.get(transaction.institution) ?? { volume: 0, totalRisk: 0, count: 0 };
      row.volume += transaction.amount;
      row.totalRisk += transaction.risk_score;
      row.count += 1;
      matrix.set(transaction.institution, row);
    }

    return Array.from(matrix.entries())
      .map(([institution, row]) => ({
        institution,
        volumeLakh: Number((row.volume / 100000).toFixed(1)),
        avgRisk: Math.round(row.totalRisk / Math.max(row.count, 1)),
      }))
      .sort((left, right) => right.volumeLakh - left.volumeLakh)
      .slice(0, 6);
  }, [scopedTransactions]);

  const blockchainCadence = useMemo(() => {
    const rows = blockchainRows.slice(0, 18).reverse();
    let runningConfirmed = 0;
    let runningPending = 0;

    return rows.map((entry, index) => {
      if (entry.status === "confirmed") runningConfirmed += 1;
      if (entry.status === "pending") runningPending += 1;

      return {
        slot: `B${index + 1}`,
        confirmed: runningConfirmed,
        pending: runningPending,
        gasK: Number((entry.gas_used / 1000).toFixed(1)),
      };
    });
  }, [blockchainRows]);

  const summaryCards = dashboardSummary?.cards ?? [];

  const title = dashboardSummary?.title || "Viewer Dashboard";
  const summary =
    dashboardSummary?.summary ||
    "Read-only operational snapshot for cross-bank fraud monitoring";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{summary}</p>
          {syncMessage ? <p className="text-[11px] text-muted-foreground mt-1.5">{syncMessage}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
            <Eye className="w-3.5 h-3.5" />
            Read-Only Mode
          </div>
          <button
            onClick={() => setAutoRefreshEnabled((previous) => !previous)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              autoRefreshEnabled
                ? "bg-success/10 text-success"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock3 className="w-3.5 h-3.5" />
            Auto Refresh {autoRefreshEnabled ? "On" : "Off"}
          </button>
          <button
            onClick={() => void syncViewerData()}
            disabled={syncLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
            {syncLoading ? "Syncing" : "Sync MongoDB"}
          </button>
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Executive Visibility Pulse"
          subtitle="Viewer-safe telemetry spanning transactions, institution exposure, and blockchain finality"
          variant="chain"
          chartType="radar"
          chartPlacement="left"
          metrics={[
            {
              label: "Transactions",
              value: totalTransactions.toLocaleString(),
              hint: "observable ledger volume",
              icon: ArrowLeftRight,
              tone: "primary",
            },
            {
              label: "Blocked Rate",
              value: `${blockedRate}%`,
              hint: `${blockedTx.toLocaleString()} blocked`,
              icon: ShieldAlert,
              tone: blockedRate >= 15 ? "warning" : "success",
            },
            {
              label: "Approval Rate",
              value: `${approvedRate}%`,
              hint: `${approvedTx.toLocaleString()} approved`,
              icon: CheckCircle2,
              tone: approvedRate >= 70 ? "success" : "warning",
            },
            {
              label: "Chain Confirmation",
              value: `${chainRate}%`,
              hint: `${confirmedOnChain.toLocaleString()} finalized`,
              icon: Boxes,
              tone: chainRate >= 80 ? "success" : "warning",
            },
            {
              label: "Institutions Tracked",
              value: `${trackedInstitutions}`,
              hint: "active sources in feed",
              icon: Building2,
              tone: "accent",
            },
            {
              label: "Total Volume",
              value: formatAmount(totalVolume),
              hint: "transactional throughput",
              icon: Landmark,
              tone: "primary",
            },
            {
              label: "Active Contracts",
              value: `${activeContracts}`,
              hint: "chain infrastructure online",
              icon: Boxes,
              tone: activeContracts > 0 ? "success" : "warning",
            },
            {
              label: "Average Risk",
              value: `${avgRisk}`,
              hint: `${flaggedTx.toLocaleString()} flagged`,
              icon: Activity,
              tone: avgRisk >= 60 ? "warning" : "primary",
            },
          ]}
          chartData={confidenceTrend}
          chartLabel="Confidence Trend"
          badges={[
            "Access: VIEW ONLY",
            "Data: LIVE SNAPSHOT",
            `Chain Confirmed: ${confirmedOnChain}`,
            `Pending Tx: ${pendingTx.toLocaleString()}`,
            lastSyncedAt
              ? `Synced: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Synced: --",
          ]}
        />
      </SectionReveal>

      {summaryCards.length ? (
        <SectionReveal>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="glass rounded-xl p-4 border border-border/70">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
                <p className="text-xl font-semibold mt-1">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{card.hint ?? "live backend summary"}</p>
              </div>
            ))}
          </div>
        </SectionReveal>
      ) : null}

      <SectionReveal>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quickViews.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass rounded-xl p-5 border border-border/70"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <item.icon className="w-4.5 h-4.5 text-accent" />
              </div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.description}</p>
              <Link
                to={item.to}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/90"
              >
                Open view
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}

          <div className="glass rounded-xl p-5 border border-border/70">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">Sync Delta</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                <span className="text-muted-foreground">Transactions</span>
                <span className="font-semibold">{snapshotDelta ? signed(snapshotDelta.transactions) : "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                <span className="text-muted-foreground">Blocked</span>
                <span className="font-semibold">{snapshotDelta ? signed(snapshotDelta.blocked) : "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                <span className="text-muted-foreground">Pending Chain</span>
                <span className="font-semibold">{snapshotDelta ? signed(snapshotDelta.pendingChain) : "--"}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Delta values compare the latest sync with the previous backend refresh.
            </p>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5 border border-border/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Viewer Lens Controls</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Focus institution scope and risk floor without changing any underlying data.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                Institution
              </div>
              <select
                value={institutionFilter}
                onChange={(event) => setInstitutionFilter(event.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="all">All Institutions</option>
                {institutions.map((institution) => (
                  <option key={institution} value={institution}>
                    {institution}
                  </option>
                ))}
              </select>
              <select
                value={riskFloor}
                onChange={(event) => setRiskFloor(Number(event.target.value))}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value={70}>Risk Floor 70+</option>
                <option value={80}>Risk Floor 80+</option>
                <option value={90}>Risk Floor 90+</option>
              </select>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5 border border-border/70 xl:col-span-2">
            <h3 className="text-sm font-semibold mb-3">Transaction Pulse (Risk vs Volume)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={transactionPulse}>
                  <defs>
                    <linearGradient id="viewerRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="viewerVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="slot" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} width={30} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="hsl(var(--warning))"
                    fill="url(#viewerRisk)"
                    name="Risk"
                  />
                  <Area
                    type="monotone"
                    dataKey="volumeLakh"
                    stroke="hsl(var(--primary))"
                    fill="url(#viewerVolume)"
                    name="Volume (L)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/70">
            <h3 className="text-sm font-semibold mb-3">Status Mix</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusMix}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} width={26} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusMix.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5 border border-border/70 xl:col-span-2">
            <h3 className="text-sm font-semibold mb-3">Institution Exposure Matrix</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={institutionExposure}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="institution" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} width={26} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="volumeLakh" name="Volume (L)" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgRisk" name="Avg Risk" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/70">
            <h3 className="text-sm font-semibold mb-3">Risk Band Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskBandDistribution}
                    dataKey="count"
                    nameKey="band"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {riskBandDistribution.map((entry) => (
                      <Cell key={entry.band} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5 border border-border/70 xl:col-span-2">
            <h3 className="text-sm font-semibold mb-3">Blockchain Finality Cadence</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={blockchainCadence}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="slot" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} width={26} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="confirmed" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pending" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gasK" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/70">
            <h3 className="text-sm font-semibold mb-3">Smart Contract Activity</h3>
            <div className="space-y-2">
              {contractRows.slice(0, 5).map((contract) => (
                <div key={contract.id} className="rounded-lg bg-secondary/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium truncate">{contract.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusClass(contract.status)}`}>
                      {contract.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{contract.address}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Calls: {contract.calls.toLocaleString()}</p>
                </div>
              ))}
              {!contractRows.length ? (
                <p className="text-xs text-muted-foreground">No contract telemetry available from backend.</p>
              ) : null}
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid xl:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5 border border-border/70">
            <h3 className="text-sm font-semibold mb-3">High-Risk Watchlist (Read-Only)</h3>
            <div className="space-y-2">
              {watchlistRows.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium">{transaction.id}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {transaction.from_account} to {transaction.to_account}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold">{formatAmount(transaction.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">Risk {transaction.risk_score}</p>
                  </div>
                </div>
              ))}
              {!watchlistRows.length ? (
                <p className="text-xs text-muted-foreground">
                  No transactions match the active filters and selected risk floor.
                </p>
              ) : null}
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/70">
            <h3 className="text-sm font-semibold mb-3">Latest Ledger Highlights</h3>
            <div className="space-y-2">
              {blockchainRows.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-lg bg-secondary/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium truncate">{entry.action}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusClass(entry.status)}`}>
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{entry.tx_hash}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Block {entry.block_number} | Gas {entry.gas_used.toLocaleString()} |{" "}
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              {!blockchainRows.length ? (
                <p className="text-xs text-muted-foreground">No blockchain highlights available from backend.</p>
              ) : null}
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5 border border-border/70">
          <h3 className="text-sm font-semibold mb-3">Viewer Operations Guidance</h3>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-lg bg-secondary/40 px-3 py-2 text-muted-foreground">
              Data in this dashboard is read-only by design. Use Analyst or Admin roles for triage and enforcement operations.
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2 text-muted-foreground">
              Auto refresh runs every 45 seconds when enabled, with delta tracking shown in the Sync Delta panel.
            </div>
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
