import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BellRing,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import SectionReveal from "@/components/shared/SectionReveal";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchFraudAlerts,
  subscribeFraudAlertStream,
  type BackendAlert,
} from "@/lib/backendApi";

interface AlertRow {
  id: string;
  title: string;
  description: string;
  severity: string;
  timestamp: string;
  transactionId: string;
  riskScore: number;
  modelConfidence: number;
  ruleConfidence: number;
  topFactors: Array<{
    factor: string;
    score: number;
    rationale: string;
  }>;
  relatedEntities: string[];
}

const severityClass: Record<string, string> = {
  critical: "border-l-destructive bg-destructive/5",
  high: "border-l-warning bg-warning/5",
  medium: "border-l-accent bg-accent/5",
  low: "border-l-muted-foreground bg-muted/50",
};

const severityOptions = ["all", "critical", "high", "medium", "low"] as const;
type SeverityFilter = (typeof severityOptions)[number];

const mapAlert = (entry: BackendAlert): AlertRow => ({
  id: entry.id,
  title: entry.title,
  description: entry.description,
  severity: entry.severity,
  timestamp: entry.timestamp,
  transactionId: entry.transaction_id,
  riskScore: entry.risk_score ?? 0,
  modelConfidence: entry.model_confidence ?? 0,
  ruleConfidence: entry.rule_confidence ?? 0,
  topFactors: entry.top_factors ?? [],
  relatedEntities: entry.related_entities ?? [],
});

export default function Alerts() {
  const { authToken } = useAuth();
  const [alertRows, setAlertRows] = useState<BackendAlert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const syncAlerts = useCallback(
    async (background = false) => {
      if (!authToken) {
        if (!background) {
          setAlertRows([]);
          setSyncMessage("Backend auth token unavailable. Sign in to load live alerts.");
        }
        return;
      }

      if (!background) {
        setIsSyncing(true);
        setSyncMessage("Syncing alerts from backend...");
      }

      try {
        const alerts = await fetchFraudAlerts();
        setAlertRows(alerts);
        if (!background) {
          setSyncMessage(`Loaded ${alerts.length} alerts from backend.`);
        }
      } catch (error) {
        if (!background) {
          const detail = error instanceof Error ? error.message : "Failed to sync alerts.";
          setAlertRows([]);
          setSyncMessage(detail);
        }
      } finally {
        if (!background) {
          setIsSyncing(false);
        }
      }
    },
    [authToken],
  );

  useEffect(() => {
    void syncAlerts();
  }, [syncAlerts]);

  useEffect(() => {
    if (!isLive || !authToken) return;
    const intervalId = setInterval(() => {
      void syncAlerts(true);
    }, 15000);
    return () => clearInterval(intervalId);
  }, [authToken, isLive, syncAlerts]);

  useEffect(() => {
    if (!isLive || !authToken) return;

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
            return next.slice(0, 500);
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

    return () => unsubscribe();
  }, [authToken, isLive]);

  const alerts = useMemo(() => alertRows.map(mapAlert), [alertRows]);

  const filteredAlerts = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return alerts
      .filter((alert) => {
        const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;

        if (!search) return matchesSeverity;

        const entityText = alert.relatedEntities.join(" ").toLowerCase();
        const matchesSearch =
          alert.title.toLowerCase().includes(search) ||
          alert.description.toLowerCase().includes(search) ||
          alert.transactionId.toLowerCase().includes(search) ||
          entityText.includes(search);

        return matchesSeverity && matchesSearch;
      })
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  }, [alerts, searchQuery, severityFilter]);

  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const highAlerts = alerts.filter((alert) => alert.severity === "high").length;
  const avgRiskScore = Math.round(
    alerts.reduce((sum, alert) => sum + alert.riskScore, 0) / Math.max(alerts.length, 1),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live fraud signals with explainability context and investigation-ready details
          </p>
          {syncMessage ? <p className="mt-1.5 text-[11px] text-muted-foreground">{syncMessage}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive((previous) => !previous)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isLive
                ? "bg-success/10 text-success hover:bg-success/15"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${isLive ? "animate-pulse" : ""}`} />
            {isLive ? "Live ON" : "Live OFF"}
          </button>
          <button
            onClick={() => void syncAlerts()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing" : "Sync MongoDB"}
          </button>
        </div>
      </div>

      <SectionReveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active Alerts</p>
            <p className="mt-2 text-2xl font-bold font-mono">{totalAlerts}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Critical</p>
            <p className="mt-2 text-2xl font-bold font-mono text-destructive">{criticalAlerts}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">High</p>
            <p className="mt-2 text-2xl font-bold font-mono text-warning">{highAlerts}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Risk</p>
            <p className="mt-2 text-2xl font-bold font-mono text-primary">{avgRiskScore}</p>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by alert title, transaction ID, or related entity"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground"
            >
              {severityOptions.map((severity) => (
                <option key={severity} value={severity}>
                  {severity === "all" ? "All severities" : severity[0].toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </p>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Alert Feed</h3>
          </div>

          <div className="space-y-2">
            {filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className={`rounded-lg border-l-2 p-3 ${severityClass[alert.severity] || severityClass.low}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">{alert.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{alert.description}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {alert.severity}
                  </span>
                </div>

                <div className="mt-2 grid gap-1 text-[10px] text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <p className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Risk {alert.riskScore}
                  </p>
                  <p>Model {(alert.modelConfidence * 100).toFixed(0)}%</p>
                  <p>Rules {(alert.ruleConfidence * 100).toFixed(0)}%</p>
                  <p>{new Date(alert.timestamp).toLocaleString()}</p>
                </div>

                {alert.topFactors.length ? (
                  <div className="mt-2 grid gap-1 md:grid-cols-2">
                    {alert.topFactors.slice(0, 2).map((factor, factorIndex) => (
                      <div key={`${alert.id}-factor-${factorIndex}`} className="rounded-md bg-secondary/40 px-2 py-1">
                        <p className="text-[10px] font-semibold">
                          {factor.factor} ({factor.score})
                        </p>
                        <p className="text-[10px] text-muted-foreground">{factor.rationale}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1">
                    <AlertTriangle className="h-3 w-3" />
                    {alert.transactionId}
                  </span>
                  {alert.relatedEntities.slice(0, 3).map((entity) => (
                    <span key={`${alert.id}-${entity}`} className="rounded-md bg-secondary/50 px-2 py-1">
                      {entity}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}

            {!filteredAlerts.length ? (
              <p className="rounded-lg border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
                No alerts match the selected filters.
              </p>
            ) : null}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
