import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { InvestigationEdge, InvestigationNode } from "@/data/investigationData";

interface MoneyFlowTimelineProps {
  edges: InvestigationEdge[];
  nodes: InvestigationNode[];
  activeStep: number;
  onActiveStepChange: (step: number) => void;
  disabled?: boolean;
}

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)}L`;
  return `Rs ${amount.toLocaleString()}`;
};

export default function MoneyFlowTimeline({
  edges,
  nodes,
  activeStep,
  onActiveStepChange,
  disabled,
}: MoneyFlowTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);

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

  useEffect(() => {
    if (!isPlaying || disabled || !maxStep) return;

    if (safeStep >= maxStep) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      onActiveStepChange(Math.min(safeStep + 1, maxStep));
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [disabled, isPlaying, maxStep, onActiveStepChange, safeStep]);

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

  return (
    <div className={`glass rounded-xl p-4 space-y-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Money Flow Timeline</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Replay laundering hops step-by-step</p>
        </div>
        <button
          type="button"
          onClick={() => setIsPlaying((value) => !value)}
          disabled={disabled || !maxStep}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isPlaying ? "Pause" : "Replay"}
        </button>
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
          return (
            <div
              key={edge.id}
              className={`rounded-lg border px-3 py-2 transition-colors ${
                isActive ? "border-primary/60 bg-primary/10" : "border-border bg-secondary/30"
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
