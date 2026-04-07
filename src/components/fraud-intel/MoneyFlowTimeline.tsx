import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { InvestigationEdge, InvestigationNode } from "@/data/investigationData";

interface MoneyFlowTimelineProps {
  edges: InvestigationEdge[];
  nodes: InvestigationNode[];
  activeStep: number;
  onActiveStepChange: (step: number) => void;
  disabled?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)}L`;
  return `Rs ${amount.toLocaleString()}`;
};

const toTimestampMs = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatClock = (timestampMs: number) => {
  if (!timestampMs) return "--:--:--";
  return new Date(timestampMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export default function MoneyFlowTimeline({
  edges,
  nodes,
  activeStep,
  onActiveStepChange,
  disabled,
}: MoneyFlowTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(8);

  const sortedEdges = useMemo(
    () => [...edges].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [edges],
  );

  const nodeLabel = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node.label])),
    [nodes],
  );

  const maxStep = sortedEdges.length;
  const safeStep = maxStep ? Math.min(Math.max(activeStep, 1), maxStep) : 0;

  const edgeTimestamps = useMemo(
    () => sortedEdges.map((edge) => toTimestampMs(edge.timestamp)),
    [sortedEdges],
  );

  const timelineStartMs = edgeTimestamps[0] ?? 0;
  const timelineEndMs = edgeTimestamps[edgeTimestamps.length - 1] ?? timelineStartMs;
  const totalTimelineMs = Math.max(0, timelineEndMs - timelineStartMs);
  const currentStepMs = safeStep ? edgeTimestamps[safeStep - 1] ?? timelineStartMs : timelineStartMs;
  const elapsedReplayMs = Math.max(0, currentStepMs - timelineStartMs);

  const nextDelayMs = useMemo(() => {
    if (!maxStep || safeStep >= maxStep) return 0;

    const currentMs = edgeTimestamps[safeStep - 1] ?? 0;
    const nextMs = edgeTimestamps[safeStep] ?? currentMs;
    const gapMs = nextMs > currentMs ? nextMs - currentMs : 12000;

    return clamp(Math.round(gapMs / playbackSpeed), 240, 4200);
  }, [edgeTimestamps, maxStep, playbackSpeed, safeStep]);

  const handleTogglePlayback = () => {
    if (disabled || !maxStep) return;

    if (!isPlaying && safeStep >= maxStep) {
      onActiveStepChange(1);
    }

    setIsPlaying((value) => !value);
  };

  const handleRestart = () => {
    if (disabled || !maxStep) return;
    setIsPlaying(false);
    onActiveStepChange(1);
  };

  useEffect(() => {
    if (!isPlaying || disabled || !maxStep) return;

    if (safeStep >= maxStep) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      onActiveStepChange(Math.min(safeStep + 1, maxStep));
    }, nextDelayMs || 900);

    return () => window.clearTimeout(timer);
  }, [disabled, isPlaying, maxStep, nextDelayMs, onActiveStepChange, safeStep]);

  useEffect(() => {
    if (!maxStep) {
      setIsPlaying(false);
      return;
    }
    if (activeStep > maxStep) {
      onActiveStepChange(maxStep);
    }
    if (activeStep <= 0) {
      onActiveStepChange(1);
    }
  }, [activeStep, maxStep, onActiveStepChange]);

  const current = safeStep ? sortedEdges[safeStep - 1] : null;
  const speedOptions = [1, 4, 8, 16];

  return (
    <div className={`glass rounded-xl p-4 space-y-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Bank Account Money Flow Timeline</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real timestamp replay using actual transfer-time gaps across the selected investigation path
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestart}
            disabled={disabled || !maxStep}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3 h-3" /> Restart
          </button>
          <button
            type="button"
            onClick={handleTogglePlayback}
            disabled={disabled || !maxStep}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? "Pause" : "Replay"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-secondary/40 p-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Replay speed</span>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackSpeed(speed)}
              disabled={disabled || !maxStep}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                playbackSpeed === speed
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <p>Range: {formatClock(timelineStartMs)} {"->"} {formatClock(timelineEndMs)}</p>
          <p>Elapsed: {formatDuration(elapsedReplayMs)} / {formatDuration(totalTimelineMs)}</p>
          <p>Cadence: real-time gaps scaled by {playbackSpeed}x</p>
          <p>Next jump: {safeStep >= maxStep ? "completed" : `${(nextDelayMs / 1000).toFixed(1)}s`}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Timeline step</span>
          <span className="font-mono text-foreground">{safeStep}/{maxStep || 0}</span>
        </div>
        <input
          type="range"
          min={maxStep ? 1 : 0}
          max={maxStep || 0}
          value={safeStep}
          onChange={(event) => onActiveStepChange(Number(event.target.value))}
          disabled={disabled || !maxStep}
          className="w-full accent-primary"
        />
        {current ? (
          <p className="text-xs">
            t{safeStep} {"->"} <span className="font-mono">{nodeLabel[current.from] ?? current.from}</span> {"->"} {" "}
            <span className="font-mono">{nodeLabel[current.to] ?? current.to}</span>
            <span className="text-muted-foreground"> ({formatAmount(current.amount)} at {new Date(current.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No transfer steps available for current case selection.</p>
        )}
      </div>

      <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
        {sortedEdges.map((edge, index) => {
          const isActive = index < safeStep;
          const isCurrent = index === safeStep - 1;
          return (
            <div
              key={edge.id}
              className={`rounded-lg border px-3 py-2 transition-colors ${
                isCurrent
                  ? "border-warning/70 bg-warning/10"
                  : isActive
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-secondary/30"
              }`}
            >
              <p className="text-[11px] font-medium">
                t{index + 1} {"->"} {nodeLabel[edge.from] ?? edge.from} {"->"} {nodeLabel[edge.to] ?? edge.to}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatAmount(edge.amount)} | TX: {edge.txRef} | {new Date(edge.timestamp).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
