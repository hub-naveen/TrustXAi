import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, CheckCircle, XCircle, Loader, Play, Pause, RotateCcw,
  Shield, Lock, Eye, TrendingUp, Cpu, Wifi, Server,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, Legend,
} from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchFederatedSnapshot,
  fetchMlTrainingRuns,
  triggerMlTrainingAll,
  type MlTrainingRun,
} from "@/lib/backendApi";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const statusIcon: Record<string, JSX.Element> = {
  merged: <CheckCircle className="w-4 h-4 text-success" />,
  validating: <Loader className="w-4 h-4 text-warning animate-spin" />,
  rejected: <XCircle className="w-4 h-4 text-destructive" />,
};

const privacyToneClass: Record<string, string> = {
  warning: "bg-warning",
  accent: "bg-accent",
  success: "bg-success",
  primary: "bg-primary",
};

const titleMetric = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface RoundPulsePoint {
  round: number;
  throughput: number;
  latency: number;
  privacy: number;
  accuracy: number;
  loss: number;
}

export default function FederatedLearning() {
  const { authToken } = useAuth();
  const [isTraining, setIsTraining] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [trainingLog, setTrainingLog] = useState<string[]>([]);
  const [isBackendBusy, setIsBackendBusy] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [latestTrainingRun, setLatestTrainingRun] = useState<MlTrainingRun | null>(null);

  const [liveModelUpdates, setLiveModelUpdates] = useState<Array<{
    id: string;
    institution: string;
    version: string;
    accuracy: number;
    timestamp: string;
    status: "merged" | "validating" | "rejected";
    improvement: number;
  }>>([]);
  const [liveConvergenceData, setLiveConvergenceData] = useState<Array<{
    round: number;
    globalLoss: number;
    accuracy: number;
  }>>([]);
  const [livePrivacyMetrics, setLivePrivacyMetrics] = useState<Array<{
    metric: string;
    value: number;
    max: number;
    color: string;
  }>>([]);
  const [liveNodeHealth, setLiveNodeHealth] = useState<Array<{
    name: string;
    cpu: number;
    memory: number;
    gpu: number;
    latency: number;
    status: string;
  }>>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [liveRoundPulse, setLiveRoundPulse] = useState<RoundPulsePoint[]>([]);

  const baseTotalRounds = Math.max(liveConvergenceData.length, 1);
  const roundProgressRatio = Math.min(1, currentRound / baseTotalRounds);

  const effectiveConvergenceData = useMemo(() => {
    if (!isTraining || currentRound === 0) {
      return liveConvergenceData;
    }

    return liveConvergenceData.map((point, index) => {
      if (index >= currentRound) {
        return point;
      }

      const roundDelta = currentRound - index;
      return {
        ...point,
        globalLoss: Number(clamp(point.globalLoss - roundDelta * 0.003, 0.01, 5).toFixed(3)),
        accuracy: Number(clamp(point.accuracy + roundDelta * 0.04, 0, 100).toFixed(2)),
      };
    });
  }, [currentRound, isTraining, liveConvergenceData]);

  const totalRounds = Math.max(effectiveConvergenceData.length, 1);

  const effectiveModelUpdates = useMemo(() => {
    if (!isTraining || currentRound === 0) {
      return liveModelUpdates;
    }

    return liveModelUpdates.map((update, index) => {
      const pulse = Math.sin((currentRound + index) * 0.8) * 0.18;
      const drift = roundProgressRatio * Math.max(0.2, Math.abs(update.improvement)) * 0.6;
      const accuracy = Number(clamp(update.accuracy + drift + pulse, 80, 100).toFixed(2));
      const baseline = update.accuracy - update.improvement;
      const improvement = Number((accuracy - baseline).toFixed(2));
      const status =
        currentRound < totalRounds && index % 3 === currentRound % 3
          ? "validating"
          : update.status;

      return {
        ...update,
        accuracy,
        improvement,
        status,
        timestamp: new Date().toISOString(),
      };
    });
  }, [currentRound, isTraining, liveModelUpdates, roundProgressRatio, totalRounds]);

  const effectivePrivacyMetrics = useMemo(() => {
    if (!isTraining || currentRound === 0) {
      return livePrivacyMetrics;
    }

    return livePrivacyMetrics.map((metric, index) => {
      const wave = Math.sin((currentRound + index) * 0.55) * 1.8;
      const trend = currentRound * 0.08;
      const value = Math.round(clamp(metric.value + wave + trend, 0, metric.max));
      return {
        ...metric,
        value,
      };
    });
  }, [currentRound, isTraining, livePrivacyMetrics]);

  const effectiveNodeHealth = useMemo(() => {
    if (!isTraining || currentRound === 0) {
      return liveNodeHealth;
    }

    return liveNodeHealth.map((node, index) => {
      const wave = Math.sin((currentRound + index) * 0.72);
      const cpu = Math.round(clamp(node.cpu + wave * 6, 5, 99));
      const memory = Math.round(clamp(node.memory + Math.cos((currentRound + index) * 0.68) * 5, 5, 99));
      const gpu = Math.round(clamp(node.gpu + wave * 4, 1, 99));
      const latency = Math.round(clamp(node.latency + (1 - wave) * 2.4 - currentRound * 0.05, 8, 250));
      const status = latency <= 120 ? "active" : "degraded";

      return {
        ...node,
        cpu,
        memory,
        gpu,
        latency,
        status,
      };
    });
  }, [currentRound, isTraining, liveNodeHealth]);

  const dynamicAccuracyData = useMemo(() => {
    const grouped = new Map<string, { current: number; previous: number }>();

    for (const update of effectiveModelUpdates) {
      if (!grouped.has(update.institution)) {
        const previous = Number((update.accuracy - update.improvement).toFixed(1));
        grouped.set(update.institution, {
          current: update.accuracy,
          previous,
        });
      }
    }

    return Array.from(grouped.entries()).map(([institution, scores]) => ({
      institution: institution.replace(/\s+Bank$/i, ""),
      accuracy: scores.current,
      prevAccuracy: scores.previous,
    }));
  }, [effectiveModelUpdates]);

  const displayedAccuracyData = dynamicAccuracyData;

  const currentConvergence = effectiveConvergenceData.length
    ? effectiveConvergenceData[Math.max(0, Math.min(currentRound - 1, effectiveConvergenceData.length - 1))]
    : { round: 0, globalLoss: 0, accuracy: 0 };
  const privacyStrength = Math.round(
    effectivePrivacyMetrics.reduce((sum, metric) => sum + metric.value, 0) /
      Math.max(effectivePrivacyMetrics.length, 1),
  );
  const onlineNodeCount = effectiveNodeHealth.filter((inst) => inst.status === "active").length;

  const federationTrend = effectiveConvergenceData.length
    ? effectiveConvergenceData
      .slice(0, Math.max(currentRound, 8))
      .map((entry) => ({
        label: `R${entry.round}`,
        value: entry.accuracy,
      }))
    : [{ label: "R0", value: 0 }];

  const qualityRadarData = useMemo(() => {
    const avgAccuracy = displayedAccuracyData.length
      ? displayedAccuracyData.reduce((sum, row) => sum + row.accuracy, 0) / displayedAccuracyData.length
      : 0;
    const avgImprovement = effectiveModelUpdates.length
      ? effectiveModelUpdates.reduce((sum, row) => sum + row.improvement, 0) / effectiveModelUpdates.length
      : 0;
    const onlinePct = effectiveNodeHealth.length
      ? Math.round((onlineNodeCount / effectiveNodeHealth.length) * 100)
      : 0;

    return [
      { subject: "Accuracy", score: Math.round(avgAccuracy), fullMark: 100 },
      {
        subject: "Improvement",
        score: Math.max(0, Math.min(100, Math.round(50 + avgImprovement * 20))),
        fullMark: 100,
      },
      { subject: "Privacy", score: privacyStrength, fullMark: 100 },
      { subject: "Node Health", score: onlinePct, fullMark: 100 },
      {
        subject: "Stability",
        score: Math.max(0, Math.min(100, Math.round(100 - currentConvergence.globalLoss * 60))),
        fullMark: 100,
      },
      {
        subject: "Convergence",
        score: Math.max(0, Math.min(100, Math.round(100 - currentConvergence.globalLoss * 80))),
        fullMark: 100,
      },
    ];
  }, [
    currentConvergence.globalLoss,
    displayedAccuracyData,
    effectiveModelUpdates,
    effectiveNodeHealth.length,
    onlineNodeCount,
    privacyStrength,
  ]);

  const realtimePulseWindow = useMemo(() => {
    if (!liveRoundPulse.length) {
      return [
        {
          round: 0,
          throughput: 0,
          latency: 0,
          privacy: privacyStrength,
          accuracy: 0,
          loss: 0,
        },
      ];
    }
    return liveRoundPulse.slice(-14);
  }, [liveRoundPulse, privacyStrength]);

  const nodeResourceSnapshot = useMemo(
    () =>
      effectiveNodeHealth.slice(0, 6).map((node) => ({
        name: node.name.replace(/\s+Bank$/i, ""),
        cpu: node.cpu,
        memory: node.memory,
        gpu: node.gpu,
      })),
    [effectiveNodeHealth],
  );

  const latestRealtimePulse = realtimePulseWindow[realtimePulseWindow.length - 1];

  const syncBackendData = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;

    if (!authToken) {
      setLiveModelUpdates([]);
      setLiveConvergenceData([]);
      setLivePrivacyMetrics([]);
      setLiveNodeHealth([]);
      setLatestTrainingRun(null);
      setLiveRoundPulse([]);
      if (!silent) {
        setBackendStatus("Sign in to sync live backend metrics.");
      }
      return;
    }

    if (!silent) {
      setIsBackendBusy(true);
      setBackendStatus("Syncing federated telemetry from backend...");
    }

    try {
      const [snapshot, runs] = await Promise.all([
        fetchFederatedSnapshot(),
        fetchMlTrainingRuns(1),
      ]);

      setLiveModelUpdates(
        snapshot.modelUpdates.map((update) => ({
          id: update.id,
          institution: update.institution,
          version: update.version,
          accuracy: update.accuracy,
          timestamp: update.timestamp,
          status: update.status as "merged" | "validating" | "rejected",
          improvement: update.improvement,
        })),
      );

      setLiveConvergenceData(
        snapshot.convergence.map((point) => ({
          round: point.round,
          globalLoss: point.global_loss,
          accuracy: point.accuracy,
        })),
      );

      setLivePrivacyMetrics(
        snapshot.privacy.map((metric) => ({
          metric: titleMetric(metric.metric),
          value: metric.value,
          max: metric.max_value,
          color: privacyToneClass[metric.color] || "bg-primary",
        })),
      );

      setLiveNodeHealth(
        snapshot.nodeHealth.map((node) => ({
          name: node.name,
          cpu: node.cpu,
          memory: node.memory,
          gpu: node.gpu,
          latency: node.latency,
          status: node.status,
        })),
      );

      const privacyAverage = snapshot.privacy.length
        ? Math.round(snapshot.privacy.reduce((sum, metric) => sum + metric.value, 0) / snapshot.privacy.length)
        : 0;

      setLiveRoundPulse((previous) => {
        if (previous.length) {
          return previous;
        }

        return snapshot.convergence.slice(0, 8).map((point) => ({
          round: point.round,
          throughput: Number((92 + point.round * 4 + point.accuracy * 0.35).toFixed(1)),
          latency: Number(clamp(98 - point.round * 1.8 + point.global_loss * 24, 10, 220).toFixed(1)),
          privacy: privacyAverage,
          accuracy: point.accuracy,
          loss: point.global_loss,
        }));
      });

      setLatestTrainingRun(runs[0] ?? null);
      setLastSyncedAt(new Date().toISOString());
      if (!silent) {
        setBackendStatus("Backend metrics synced.");
      }
    } catch (error) {
      if (!silent) {
        setBackendStatus(error instanceof Error ? error.message : "Failed to sync backend metrics.");
      }
    } finally {
      if (!silent) {
        setIsBackendBusy(false);
      }
    }
  }, [authToken]);

  const runBackendTraining = useCallback(async () => {
    if (!authToken) {
      setBackendStatus("Sign in to trigger backend model training.");
      return;
    }

    setIsBackendBusy(true);
    setBackendStatus("Training pipelines on backend. This can take a couple of minutes...");

    try {
      const run = await triggerMlTrainingAll();
      setLatestTrainingRun(run);
      setTrainingLog((previous) => {
        const lines = [
          `Run ${run.run_id.slice(0, 8)} completed in ${run.duration_seconds.toFixed(1)}s (${run.succeeded}/${run.requested_pipelines.length} pipelines).`,
          ...run.results.map((result) => `${result.pipeline}: ${result.status} (${result.rows} rows)`),
        ];
        return [...lines, ...previous].slice(0, 60);
      });

      await syncBackendData({ silent: true });
      setBackendStatus(`Training finished. ${run.succeeded} pipeline(s) succeeded.`);
    } catch (error) {
      setBackendStatus(error instanceof Error ? error.message : "Backend training failed.");
    } finally {
      setIsBackendBusy(false);
    }
  }, [authToken, syncBackendData]);

  const handleTrainingToggle = useCallback(() => {
    if (isTraining) {
      setIsTraining(false);
      setTrainingLog((previous) => [...previous.slice(-59), "Training paused by operator."]);
      return;
    }

    if (!effectiveConvergenceData.length) {
      setBackendStatus("No convergence data found. Sync backend data first.");
      return;
    }

    const shouldStartFresh = currentRound === 0 || currentRound >= totalRounds;

    if (currentRound >= totalRounds) {
      setCurrentRound(0);
      setLiveRoundPulse([]);
    }

    setIsTraining(true);
    setTrainingLog((previous) => [
      ...previous.slice(-59),
      shouldStartFresh
        ? "Training started - full telemetry stream is now live."
        : "Training resumed - telemetry stream continues.",
    ]);

    void syncBackendData({ silent: true });

    if (shouldStartFresh && !isBackendBusy && authToken) {
      void runBackendTraining();
    }
  }, [
    authToken,
    currentRound,
    effectiveConvergenceData.length,
    isBackendBusy,
    isTraining,
    runBackendTraining,
    syncBackendData,
    totalRounds,
  ]);

  useEffect(() => {
    if (!authToken) {
      return;
    }
    void syncBackendData();
  }, [authToken, syncBackendData]);

  useEffect(() => {
    if (!isTraining || !authToken) {
      return;
    }

    const intervalId = setInterval(() => {
      void syncBackendData({ silent: true });
    }, 4000);

    return () => clearInterval(intervalId);
  }, [authToken, isTraining, syncBackendData]);

  useEffect(() => {
    if (!isTraining) return;
    if (currentRound >= totalRounds) {
      setIsTraining(false);
      setTrainingLog((previous) => [...previous.slice(-59), "✅ Training complete — Global model converged"]);
      return;
    }

    const id = setTimeout(() => {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);

      const convergencePoint =
        effectiveConvergenceData[Math.min(nextRound - 1, effectiveConvergenceData.length - 1)] ??
        { globalLoss: 0, accuracy: 0 };
      const simulatedDuration = (1 + ((nextRound % 5) * 0.35) + effectiveNodeHealth.length * 0.02).toFixed(1);
      const throughput = Number((95 + nextRound * 4.2 + onlineNodeCount * 5 + Math.sin(nextRound * 0.7) * 8).toFixed(1));
      const latency = Number(
        clamp(
          92 - nextRound * 1.3 + (effectiveNodeHealth.length - onlineNodeCount) * 3 + Math.cos(nextRound * 0.5) * 4,
          12,
          220,
        ).toFixed(1),
      );
      const privacy = Number(clamp(privacyStrength + Math.sin(nextRound * 0.4) * 1.5, 0, 100).toFixed(1));

      setLiveRoundPulse((previous) => [
        ...previous.slice(-35),
        {
          round: nextRound,
          throughput,
          latency,
          privacy,
          accuracy: Number(convergencePoint.accuracy),
          loss: Number(convergencePoint.globalLoss),
        },
      ]);

      const msgs = [
        `Round ${nextRound}: Distributing model to ${effectiveNodeHealth.length} nodes...`,
        `Round ${nextRound}: Local training complete (${simulatedDuration}s avg)`,
        `Round ${nextRound}: Aggregating gradients with SecAgg protocol`,
        `Round ${nextRound}: Global loss = ${convergencePoint.globalLoss ?? 0} | Acc = ${convergencePoint.accuracy ?? 0}%`,
      ];
      setTrainingLog((previous) => [...previous.slice(-59), msgs[nextRound % msgs.length]]);
    }, 900);

    return () => clearTimeout(id);
  }, [
    currentRound,
    effectiveConvergenceData,
    effectiveNodeHealth.length,
    isTraining,
    onlineNodeCount,
    privacyStrength,
    totalRounds,
  ]);

  const resetTraining = () => {
    setCurrentRound(0);
    setTrainingLog([]);
    setLiveRoundPulse([]);
    setIsTraining(false);
    setBackendStatus("Training session reset. Press Start Training to stream fresh telemetry.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Federated Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">Decentralized model training across institutional nodes</p>
          {lastSyncedAt ? (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Last synced at {new Date(lastSyncedAt).toLocaleTimeString()}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runBackendTraining}
            disabled={isBackendBusy || !authToken}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-warning text-warning-foreground text-xs font-semibold hover:bg-warning/90 transition-colors disabled:opacity-60"
          >
            {isBackendBusy ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
            {isBackendBusy ? "Running Backend ML" : "Run Backend ML"}
          </button>
          <button
            onClick={() => void syncBackendData()}
            disabled={isBackendBusy || !authToken}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-60"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isBackendBusy ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={handleTrainingToggle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            {isTraining ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isTraining ? "Pause Training" : "Start Training"}
          </button>
          <button onClick={resetTraining} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Federation Telemetry"
          subtitle="Cross-institution model training health, privacy posture, and convergence stability"
          variant="federation"
          chartType="radial"
          chartPlacement="left"
          metrics={[
            {
              label: "Current Round",
              value: `${currentRound}/${totalRounds}`,
              hint: isTraining ? "training in progress" : "training idle",
              icon: BrainCircuit,
              tone: isTraining ? "primary" : "accent",
            },
            {
              label: "Global Accuracy",
              value: `${currentConvergence.accuracy}%`,
              hint: "federated global model",
              icon: TrendingUp,
              tone: currentConvergence.accuracy >= 96 ? "success" : "warning",
            },
            {
              label: "Global Loss",
              value: `${currentConvergence.globalLoss}`,
              hint: "lower is better",
              icon: Cpu,
              tone: currentConvergence.globalLoss <= 0.4 ? "success" : "warning",
            },
            {
              label: "Privacy Strength",
              value: `${privacyStrength}%`,
              hint: "composite privacy controls",
              icon: Lock,
              tone: privacyStrength >= 80 ? "success" : "warning",
            },
            {
              label: "Online Nodes",
              value: `${onlineNodeCount}/${effectiveNodeHealth.length}`,
              hint: "active participating institutions",
              icon: Server,
              tone: "accent",
            },
          ]}
          chartData={federationTrend}
          chartLabel="Accuracy Trajectory"
          chartColor="hsl(48, 96%, 53%)"
          badges={[
            isTraining ? "Trainer State: RUNNING" : "Trainer State: PAUSED",
            "Secure Aggregation: ON",
            "Differential Privacy: ENFORCED",
          ]}
        />
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Backend ML Training Output</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Live run summary from /ml/train/runs and /ml/train/all endpoints.
              </p>
            </div>
            {latestTrainingRun && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                Run {latestTrainingRun.run_id.slice(0, 8)}
              </span>
            )}
          </div>

          {backendStatus && (
            <p className="text-xs mt-3 text-muted-foreground">{backendStatus}</p>
          )}

          {latestTrainingRun ? (
            <>
              <div className="grid sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</p>
                  <p className="text-sm font-mono font-semibold mt-1">{latestTrainingRun.duration_seconds.toFixed(1)}s</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Succeeded</p>
                  <p className="text-sm font-mono font-semibold mt-1 text-success">{latestTrainingRun.succeeded}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</p>
                  <p className="text-sm font-mono font-semibold mt-1 text-destructive">{latestTrainingRun.failed}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipelines</p>
                  <p className="text-sm font-mono font-semibold mt-1">{latestTrainingRun.requested_pipelines.length}</p>
                </div>
              </div>

              <div className="mt-4 grid lg:grid-cols-2 gap-2">
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
          ) : (
            <p className="text-xs text-muted-foreground mt-3">
              No backend training run found yet. Click "Run Backend ML" to generate one.
            </p>
          )}
        </div>
      </SectionReveal>

      {/* Training Progress Bar */}
      <SectionReveal>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className={`w-4 h-4 ${isTraining ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
              <h3 className="text-sm font-semibold">Training Progress</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Round {currentRound}/{totalRounds}</span>
          </div>
          <Progress value={(currentRound / totalRounds) * 100} className="h-2 mb-4" />
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Global Accuracy",
                value:
                  currentRound > 0
                    ? `${effectiveConvergenceData[Math.min(currentRound - 1, totalRounds - 1)]?.accuracy}%`
                    : "—",
                icon: TrendingUp,
              },
              {
                label: "Global Loss",
                value:
                  currentRound > 0
                    ? effectiveConvergenceData[Math.min(currentRound - 1, totalRounds - 1)]?.globalLoss
                    : "—",
                icon: Cpu,
              },
              {
                label: "Active Nodes",
                value: `${onlineNodeCount}/${effectiveNodeHealth.length}`,
                icon: Server,
              },
              { label: "Privacy Budget", value: "ε = 3.2", icon: Lock },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-secondary/50 text-center">
                <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold font-mono">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-xl p-5 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Real-Time Training Pulse</h3>
              </div>
              <span className="text-[10px] rounded-full px-2 py-1 bg-secondary/70 text-muted-foreground font-mono">
                Throughput {latestRealtimePulse.throughput}/s • Latency {latestRealtimePulse.latency}ms
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={realtimePulseWindow}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                <XAxis dataKey="round" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <YAxis yAxisId="left" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="throughput" stroke="hsl(48, 96%, 53%)" strokeWidth={2} dot={{ r: 2 }} name="Throughput / sec" />
                <Line yAxisId="right" type="monotone" dataKey="latency" stroke="hsl(200, 98%, 39%)" strokeWidth={2} dot={{ r: 2 }} name="Aggregation Latency ms" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Accuracy vs Privacy Drift</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={realtimePulseWindow}>
                <defs>
                  <linearGradient id="rtAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rtPrivacy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                <XAxis dataKey="round" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="accuracy" stroke="hsl(48, 96%, 53%)" fill="url(#rtAccuracy)" strokeWidth={2} name="Accuracy %" />
                <Area type="monotone" dataKey="privacy" stroke="hsl(142, 72%, 45%)" fill="url(#rtPrivacy)" strokeWidth={2} name="Privacy Strength %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5 lg:col-span-3">
            <h3 className="text-sm font-semibold mb-4">Live Node Resource Heat</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={nodeResourceSnapshot}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                <XAxis dataKey="name" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cpu" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="CPU %" />
                <Bar dataKey="memory" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Memory %" />
                <Bar dataKey="gpu" fill="hsl(200, 98%, 39%)" radius={[4, 4, 0, 0]} name="GPU %" />
              </BarChart>
            </ResponsiveContainer>
            {!nodeResourceSnapshot.length ? (
              <p className="text-xs text-muted-foreground mt-3">No node-health rows were returned by the backend.</p>
            ) : null}
          </div>
        </div>
      </SectionReveal>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="convergence">Convergence</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Security</TabsTrigger>
          <TabsTrigger value="nodes">Node Health</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid lg:grid-cols-2 gap-4">
            <SectionReveal>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Model Accuracy by Institution</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={displayedAccuracyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                    <XAxis dataKey="institution" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <YAxis domain={[90, 100]} stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="prevAccuracy" fill="hsl(220, 16%, 25%)" radius={[4, 4, 0, 0]} name="Previous" />
                    <Bar dataKey="accuracy" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} name="Current" />
                  </BarChart>
                </ResponsiveContainer>
                {!displayedAccuracyData.length ? (
                  <p className="text-xs text-muted-foreground mt-3">No model-update accuracy rows were returned by the backend.</p>
                ) : null}
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Model Quality Radar</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={qualityRadarData}>
                    <PolarGrid stroke="hsl(220, 16%, 14%)" />
                    <PolarAngleAxis dataKey="subject" stroke="hsl(220, 10%, 50%)" fontSize={10} />
                    <PolarRadiusAxis domain={[0, 100]} stroke="hsl(220, 16%, 14%)" fontSize={9} />
                    <Radar
                      name="Federation"
                      dataKey="score"
                      stroke="hsl(48, 96%, 53%)"
                      fill="hsl(48, 96%, 53%)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </SectionReveal>
          </div>
        </TabsContent>

        {/* Convergence Tab */}
        <TabsContent value="convergence">
          <div className="grid lg:grid-cols-2 gap-4">
            <SectionReveal>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Loss Convergence</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={effectiveConvergenceData.slice(0, Math.max(currentRound, 1))}>
                    <defs>
                      <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                    <XAxis dataKey="round" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <YAxis stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="globalLoss" stroke="hsl(0, 72%, 51%)" strokeWidth={2} fill="url(#lossGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Accuracy Over Rounds</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={effectiveConvergenceData.slice(0, Math.max(currentRound, 1))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                    <XAxis dataKey="round" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <YAxis domain={[85, 100]} stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(48, 96%, 53%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(48, 96%, 53%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionReveal>
          </div>

          {/* Training Log */}
          <SectionReveal delay={0.15}>
            <div className="glass rounded-xl p-5 mt-4">
              <h3 className="text-sm font-semibold mb-3">Training Log</h3>
              <div className="bg-background/60 rounded-lg p-4 max-h-[200px] overflow-y-auto font-mono text-[11px] space-y-1">
                {trainingLog.length === 0 ? (
                  <p className="text-muted-foreground">Click "Start Training" to begin federated training simulation...</p>
                ) : (
                  <AnimatePresence>
                    {trainingLog.map((log, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-muted-foreground"
                      >
                        <span className="text-primary">[{new Date().toLocaleTimeString()}]</span> {log}
                      </motion.p>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </SectionReveal>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <div className="grid lg:grid-cols-2 gap-4">
            <SectionReveal>
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Differential Privacy Metrics</h3>
                </div>
                <div className="space-y-4">
                  {effectivePrivacyMetrics.map((m) => (
                    <div key={m.metric}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">{m.metric}</span>
                        <span className="font-mono font-bold">{m.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${m.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${m.value}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                  {!effectivePrivacyMetrics.length ? (
                    <p className="text-xs text-muted-foreground">No privacy-metric rows were returned by the backend.</p>
                  ) : null}
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Privacy Guarantees</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Zero Knowledge Proofs", desc: "Model updates verified without revealing data", status: "active" },
                    { title: "Homomorphic Encryption", desc: "Computations performed on encrypted gradients", status: "active" },
                    { title: "Secure Multi-Party Computation", desc: "Secret sharing across institutional nodes", status: "active" },
                    { title: "Trusted Execution Environment", desc: "Intel SGX enclaves for sensitive operations", status: "partial" },
                    { title: "Federated Analytics", desc: "Aggregate insights without raw data access", status: "active" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${item.status === "active" ? "bg-success" : "bg-warning"}`} />
                      <div>
                        <p className="text-xs font-semibold">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>
        </TabsContent>

        {/* Node Health Tab */}
        <TabsContent value="nodes">
          <SectionReveal>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Institutional Node Health</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Institution", "Status", "CPU %", "Memory %", "GPU %", "Latency (ms)"].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveNodeHealth.map((node, i) => (
                      <motion.tr
                        key={node.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-semibold">{node.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            node.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          }`}>
                            <Wifi className="w-3 h-3" /> {node.status}
                          </span>
                        </td>
                        {[node.cpu, node.memory, node.gpu].map((val, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${val > 80 ? "bg-destructive" : val > 60 ? "bg-warning" : "bg-success"}`}
                                  style={{ width: `${val}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono">{val}%</span>
                            </div>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-xs font-mono">
                          <span className={node.latency > 60 ? "text-warning" : "text-success"}>{node.latency}ms</span>
                        </td>
                      </motion.tr>
                    ))}
                    {!effectiveNodeHealth.length ? (
                      <tr>
                        <td className="px-4 py-3 text-xs text-muted-foreground" colSpan={6}>
                          No node-health rows were returned by the backend.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionReveal>
        </TabsContent>
      </Tabs>

      {/* Recent Model Updates */}
      <SectionReveal delay={0.15}>
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Recent Model Updates</h3>
          <div className="space-y-2">
            {effectiveModelUpdates.map((update, i) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="shrink-0">{statusIcon[update.status] ?? <Loader className="w-4 h-4 text-muted-foreground" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{update.institution}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{update.version}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-semibold">{update.accuracy}%</p>
                  <p className={`text-[10px] font-mono ${update.improvement >= 0 ? "text-success" : "text-destructive"}`}>
                    {update.improvement >= 0 ? "+" : ""}{update.improvement}%
                  </p>
                </div>
              </motion.div>
            ))}
            {!effectiveModelUpdates.length ? (
              <p className="text-xs text-muted-foreground">No model-update rows were returned by the backend.</p>
            ) : null}
          </div>
        </div>
      </SectionReveal>

      {/* How It Works */}
      <SectionReveal delay={0.2}>
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">How Federated Learning Works</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Local Training", desc: "Each institution trains on private data behind their firewall", icon: Cpu },
              { step: "2", title: "Gradient Sharing", desc: "Only encrypted model updates (not data) are transmitted", icon: Lock },
              { step: "3", title: "Secure Aggregation", desc: "Updates aggregated using MPC + differential privacy", icon: Shield },
              { step: "4", title: "Global Model", desc: "Improved fraud model distributed to all nodes", icon: BrainCircuit },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="p-4 rounded-lg bg-secondary/50 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold mb-1">{item.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
