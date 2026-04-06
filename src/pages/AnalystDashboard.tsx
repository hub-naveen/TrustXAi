import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Fingerprint,
  ArrowLeftRight,
  Boxes,
  BrainCircuit,
  ShieldAlert,
  Target,
  Activity,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Database,
  Landmark,
  Sigma,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllTransactions,
  fetchAnalystDashboardSummary,
  fetchFraudAlerts,
  fetchFraudDNA,
  subscribeFraudAlertStream,
  type BackendAlert,
  type BackendDashboardSummary,
  type BackendFraudDNA,
  type BackendTransaction,
} from "@/lib/backendApi";

const analystActions = [
  {
    title: "Investigation Workbench",
    description: "Open layering trails, entity links, and case timelines.",
    to: "/fraud-intelligence",
    icon: Fingerprint,
  },
  {
    title: "Transaction Hunt",
    description: "Filter high-risk activity and trace suspicious velocity windows.",
    to: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Blockchain Trace",
    description: "Validate fraud DNA commits and chain confirmation status.",
    to: "/blockchain",
    icon: Boxes,
  },
  {
    title: "Federated Signals",
    description: "Track model convergence and privacy-preserving drift indicators.",
    to: "/federated-learning",
    icon: BrainCircuit,
  },
];

export default function AnalystDashboard() {
  const { authToken } = useAuth();
  const [transactionRows, setTransactionRows] = useState<BackendTransaction[]>([]);
  const [alertRows, setAlertRows] = useState<BackendAlert[]>([]);
  const [fraudDnaRows, setFraudDnaRows] = useState<BackendFraudDNA[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<BackendDashboardSummary | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const syncAnalystData = useCallback(async () => {
    if (!authToken) {
      setTransactionRows([]);
      setAlertRows([]);
      setFraudDnaRows([]);
      setDashboardSummary(null);
      setSyncMessage("Backend auth token unavailable. Sign in to load analyst telemetry.");
      return;
    }

    setSyncLoading(true);
    setSyncMessage("Syncing analyst dashboard from backend...");

    try {
      const [summary, transactions, alerts, dna] = await Promise.all([
        fetchAnalystDashboardSummary(),
        fetchAllTransactions({ sortBy: "timestamp", sortDir: "desc", maxRecords: 20000 }),
        fetchFraudAlerts(),
        fetchFraudDNA(),
      ]);

      setDashboardSummary(summary);
      setTransactionRows(transactions);
      setAlertRows(alerts);
      setFraudDnaRows(dna);
      setSyncMessage(
        `Loaded ${transactions.length.toLocaleString()} transactions, ${alerts.length} alerts, and ${dna.length} fraud DNA signatures.`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to sync analyst dashboard.";
      setDashboardSummary(null);
      setTransactionRows([]);
      setAlertRows([]);
      setFraudDnaRows([]);
      setSyncMessage(detail);
    } finally {
      setSyncLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void syncAnalystData();
  }, [syncAnalystData]);

  useEffect(() => {
    if (!authToken) return;

    let unsubscribe = () => undefined;

    try {
      unsubscribe = subscribeFraudAlertStream({
        onAlert: (alert) => {
          setAlertRows((previous) => {
            const next = [alert, ...previous.filter((entry) => entry.id !== alert.id)];
            next.sort(
              (left, right) =>
                new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
            );
            return next.slice(0, 300);
          });
        },
        onError: (error) => {
          setSyncMessage(`Live alert stream disconnected: ${error.message}`);
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to start live alert stream.";
      setSyncMessage(detail);
    }

    return () => {
      unsubscribe();
    };
  }, [authToken]);

  const highRiskTx = transactionRows.filter((transaction) => transaction.risk_score >= 80).length;
  const blockedTx = transactionRows.filter((transaction) => transaction.status === "blocked").length;
  const activeAlerts = alertRows.length;
  const criticalAlerts = alertRows.filter((alert) => alert.severity === "critical").length;
  const avgSimilarity = Math.round(
    fraudDnaRows.reduce((sum, dna) => sum + dna.similarity, 0) / Math.max(fraudDnaRows.length, 1),
  );

  const totalVolume = transactionRows.reduce((sum, transaction) => sum + transaction.amount, 0);
  const avgRisk = Math.round(
    transactionRows.reduce((sum, transaction) => sum + transaction.risk_score, 0) /
      Math.max(transactionRows.length, 1),
  );
  const avgModelConfidence = Math.round(
    (alertRows.reduce((sum, alert) => sum + (alert.model_confidence ?? 0), 0) /
      Math.max(alertRows.length, 1)) *
      100,
  );
  const institutionCount = new Set(transactionRows.map((transaction) => transaction.institution)).size;
  const highRiskExposure = transactionRows
    .filter((transaction) => transaction.risk_score >= 80)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const riskTrend = useMemo(
    () =>
      transactionRows
        .slice(0, 10)
        .reverse()
        .map((transaction, index) => ({
          label: `A${index + 1}`,
          value: transaction.risk_score,
        })),
    [transactionRows],
  );

  const alertSeverityDistribution = useMemo(() => {
    const tally = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const alert of alertRows) {
      if (alert.severity === "critical") tally.critical += 1;
      else if (alert.severity === "high") tally.high += 1;
      else if (alert.severity === "medium") tally.medium += 1;
      else tally.low += 1;
    }

    return [
      { name: "Critical", value: tally.critical, fill: "hsl(0, 72%, 51%)" },
      { name: "High", value: tally.high, fill: "hsl(38, 92%, 50%)" },
      { name: "Medium", value: tally.medium, fill: "hsl(205, 75%, 52%)" },
      { name: "Low", value: tally.low, fill: "hsl(142, 72%, 45%)" },
    ];
  }, [alertRows]);

  const riskVolumeTimeline = useMemo(() => {
    return transactionRows
      .slice(0, 16)
      .reverse()
      .map((transaction, index) => ({
        slot: `T${index + 1}`,
        risk: transaction.risk_score,
        volumeLakh: Math.max(1, Math.round(transaction.amount / 100000)),
      }));
  }, [transactionRows]);

  const institutionRiskMatrix = useMemo(() => {
    const map = new Map<
      string,
      {
        transactions: number;
        blocked: number;
        totalRisk: number;
        totalVolume: number;
      }
    >();

    for (const transaction of transactionRows) {
      const row = map.get(transaction.institution) ?? {
        transactions: 0,
        blocked: 0,
        totalRisk: 0,
        totalVolume: 0,
      };

      row.transactions += 1;
      row.totalRisk += transaction.risk_score;
      row.totalVolume += transaction.amount;
      if (transaction.status === "blocked") {
        row.blocked += 1;
      }

      map.set(transaction.institution, row);
    }

    return Array.from(map.entries())
      .map(([institution, row]) => ({
        institution,
        avgRisk: Math.round(row.totalRisk / Math.max(row.transactions, 1)),
        blockedRate: Math.round((row.blocked / Math.max(row.transactions, 1)) * 100),
        totalVolume: row.totalVolume,
        transactions: row.transactions,
      }))
      .sort((left, right) => right.avgRisk - left.avgRisk)
      .slice(0, 6);
  }, [transactionRows]);

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)}L`;
    return `Rs ${amount.toLocaleString()}`;
  };

  const title = dashboardSummary?.title || "Analyst Dashboard";
  const summary =
    dashboardSummary?.summary ||
    "Investigation-first console for fraud detection, triage, and evidence linking";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summary}
          </p>
          {syncMessage ? <p className="text-[11px] text-muted-foreground mt-1.5">{syncMessage}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">
            <Target className="w-3.5 h-3.5" />
            Active Investigation Mode
          </div>
          <button
            onClick={() => void syncAnalystData()}
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
          title="Analyst Hunt Pulse"
          subtitle="Operational signal stack for case triage and suspicious flow prioritization"
          variant="investigation"
          chartType="donut"
          chartPlacement="right"
          metrics={[
            {
              label: "High Risk TX",
              value: `${highRiskTx}`,
              hint: "risk >= 80",
              icon: ShieldAlert,
              tone: highRiskTx >= 3 ? "destructive" : "warning",
            },
            {
              label: "Blocked TX",
              value: `${blockedTx}`,
              hint: "automated intervention",
              icon: AlertTriangle,
              tone: blockedTx >= 2 ? "warning" : "primary",
            },
            {
              label: "Active Alerts",
              value: `${activeAlerts}`,
              hint: "pending analyst review",
              icon: Activity,
              tone: activeAlerts >= 4 ? "warning" : "primary",
            },
            {
              label: "Critical Alerts",
              value: `${criticalAlerts}`,
              hint: "priority now",
              icon: AlertTriangle,
              tone: criticalAlerts >= 1 ? "destructive" : "success",
            },
            {
              label: "DNA Similarity",
              value: `${avgSimilarity}%`,
              hint: "avg pattern confidence",
              icon: Fingerprint,
              tone: avgSimilarity >= 90 ? "success" : "warning",
            },
          ]}
          chartData={riskTrend}
          chartLabel="Risk Signal"
          badges={[
            "Role: ANALYST",
            "Scope: CASE TRIAGE",
            `Signals: ${activeAlerts} Alerts`,
          ]}
        />
      </SectionReveal>

      <SectionReveal>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 border border-border/70">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Volume</p>
            <p className="text-lg font-bold mt-1">{formatAmount(totalVolume)}</p>
            <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> Mongo-backed transaction aggregate
            </p>
          </div>
          <div className="glass rounded-xl p-4 border border-border/70">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Risk Baseline</p>
            <p className="text-lg font-bold mt-1">{avgRisk}</p>
            <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
              <Sigma className="w-3.5 h-3.5" /> Mean risk across live feed
            </p>
          </div>
          <div className="glass rounded-xl p-4 border border-border/70">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Model Confidence</p>
            <p className="text-lg font-bold mt-1">{avgModelConfidence}%</p>
            <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Alert explainability confidence
            </p>
          </div>
          <div className="glass rounded-xl p-4 border border-border/70">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Institution Spread</p>
            <p className="text-lg font-bold mt-1">{institutionCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5" /> High-risk exposure {formatAmount(highRiskExposure)}
            </p>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5 border border-border/70 xl:col-span-2">
            <h3 className="text-sm font-semibold mb-3">Risk and Volume Timeline</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={riskVolumeTimeline.length ? riskVolumeTimeline : [{ slot: "-", risk: 0, volumeLakh: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                <XAxis dataKey="slot" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <YAxis yAxisId="left" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(220, 18%, 8%)",
                    border: "1px solid hsl(220, 16%, 14%)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="risk" stroke="hsl(38, 92%, 50%)" strokeWidth={2.2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="volumeLakh" stroke="hsl(205, 75%, 52%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground mt-2">Risk score and transaction amount trajectory from latest indexed MongoDB records.</p>
          </div>

          <div className="glass rounded-xl p-5 border border-border/70">
            <h3 className="text-sm font-semibold mb-3">Alert Severity Mix</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={alertSeverityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={84}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {alertSeverityDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(220, 18%, 8%)",
                    border: "1px solid hsl(220, 16%, 14%)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {alertSeverityDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: entry.fill }} />
                    {entry.name}
                  </span>
                  <span className="font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5 border border-border/70">
          <h3 className="text-sm font-semibold mb-3">Institution Risk Matrix</h3>
          <div className="space-y-2">
            {institutionRiskMatrix.map((row) => (
              <div key={row.institution} className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{row.institution}</p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      row.avgRisk >= 85
                        ? "bg-destructive/15 text-destructive"
                        : row.avgRisk >= 65
                          ? "bg-warning/15 text-warning"
                          : "bg-success/15 text-success"
                    }`}
                  >
                    Avg Risk {row.avgRisk}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-muted-foreground">
                  <p>TX: {row.transactions}</p>
                  <p>Blocked: {row.blockedRate}%</p>
                  <p>Volume: {formatAmount(row.totalVolume)}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      row.avgRisk >= 85
                        ? "bg-destructive"
                        : row.avgRisk >= 65
                          ? "bg-warning"
                          : "bg-success"
                    }`}
                    style={{ width: `${Math.max(4, row.avgRisk)}%` }}
                  />
                </div>
              </div>
            ))}
            {!institutionRiskMatrix.length ? (
              <p className="text-xs text-muted-foreground">No institution metrics available from backend.</p>
            ) : null}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid md:grid-cols-2 gap-4">
          {analystActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="glass rounded-xl p-5 border border-border/70"
            >
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
                <action.icon className="w-4.5 h-4.5 text-warning" />
              </div>
              <h3 className="text-sm font-semibold">{action.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{action.description}</p>
              <Link
                to={action.to}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-warning hover:text-warning/90"
              >
                Open module
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5 border border-border/70">
          <h3 className="text-sm font-semibold mb-3">Priority Alert Queue</h3>
          <div className="space-y-2">
            {alertRows.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground">{alert.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Risk {alert.risk_score ?? 0} | Model {((alert.model_confidence ?? 0) * 100).toFixed(0)}% | Rules {((alert.rule_confidence ?? 0) * 100).toFixed(0)}%
                  </p>
                  {alert.top_factors?.length ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Why flagged: {alert.top_factors.slice(0, 2).map((factor) => `${factor.factor} (${factor.score})`).join(" | ")}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    alert.severity === "critical"
                      ? "bg-destructive/15 text-destructive"
                      : alert.severity === "high"
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            ))}
            {!alertRows.length ? (
              <p className="text-xs text-muted-foreground">No active alerts available from backend.</p>
            ) : null}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
