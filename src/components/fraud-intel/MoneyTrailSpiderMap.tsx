import { useMemo } from "react";
import { motion } from "framer-motion";
import type { InvestigationEdge, InvestigationNode } from "@/data/investigationData";

interface MoneyTrailSpiderMapProps {
  nodes: InvestigationNode[];
  edges: InvestigationEdge[];
  layerByNode: Record<string, number>;
  collapsedLayers: number[];
  highlightedNodeIds: string[];
  commonNodeIds: string[];
  sourceNodeIds: string[];
  destinationNodeIds: string[];
  activeStep: number;
}

interface Point {
  x: number;
  y: number;
}

const formatCompactAmount = (amount: number) => {
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)}L`;
  return `Rs ${amount.toLocaleString()}`;
};

const roleFill = (isSource: boolean, isDestination: boolean) => {
  if (isSource) return "hsl(142, 72%, 45%)";
  if (isDestination) return "hsl(0, 72%, 51%)";
  return "hsl(48, 96%, 53%)";
};

export default function MoneyTrailSpiderMap({
  nodes,
  edges,
  layerByNode,
  collapsedLayers,
  highlightedNodeIds,
  commonNodeIds,
  sourceNodeIds,
  destinationNodeIds,
  activeStep,
}: MoneyTrailSpiderMapProps) {
  const collapsedSet = useMemo(() => new Set(collapsedLayers), [collapsedLayers]);
  const highlightSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const commonSet = useMemo(() => new Set(commonNodeIds), [commonNodeIds]);
  const sourceSet = useMemo(() => new Set(sourceNodeIds), [sourceNodeIds]);
  const destinationSet = useMemo(() => new Set(destinationNodeIds), [destinationNodeIds]);

  const visibleNodes = useMemo(
    () => nodes.filter((node) => !collapsedSet.has(layerByNode[node.id] ?? node.defaultLayer)),
    [collapsedSet, layerByNode, nodes],
  );

  const nodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)).slice(0, Math.max(activeStep, 0)),
    [activeStep, edges, nodeIds],
  );

  const layout = useMemo(() => {
    const width = 980;
    const height = 470;
    const xPadding = 90;
    const yPadding = 56;

    const groups = new Map<number, InvestigationNode[]>();
    for (const node of visibleNodes) {
      const layer = layerByNode[node.id] ?? node.defaultLayer;
      const list = groups.get(layer) ?? [];
      list.push(node);
      groups.set(layer, list);
    }

    const sortedLayers = Array.from(groups.keys()).sort((a, b) => a - b);
    const positions: Record<string, Point> = {};

    sortedLayers.forEach((layer, layerIndex) => {
      const group = (groups.get(layer) ?? []).sort((a, b) => b.riskScore - a.riskScore);
      const layerRatio = sortedLayers.length > 1 ? layerIndex / (sortedLayers.length - 1) : 0.5;
      const x = xPadding + layerRatio * (width - xPadding * 2);

      group.forEach((node, nodeIndex) => {
        const y = yPadding + ((nodeIndex + 1) / (group.length + 1)) * (height - yPadding * 2);
        positions[node.id] = { x, y };
      });
    });

    return { width, height, positions, layers: sortedLayers };
  }, [layerByNode, visibleNodes]);

  const buildPath = (start: Point, end: Point) => {
    const isForward = end.x >= start.x;
    const distance = Math.max(Math.abs(end.x - start.x), 120);
    const curve = Math.min(210, distance * 0.45);
    const c1x = start.x + (isForward ? curve : -curve);
    const c2x = end.x - (isForward ? curve : -curve);
    return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
  };

  if (!visibleNodes.length) {
    return (
      <div className="h-[420px] rounded-xl border border-border bg-secondary/30 flex items-center justify-center text-sm text-muted-foreground">
        No visible nodes. Expand layers or select at least one case.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 overflow-x-auto">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full min-h-[420px]">
        <defs>
          <linearGradient id="gold-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(48, 96%, 53%)" stopOpacity="0.28" />
            <stop offset="50%" stopColor="hsl(48, 96%, 63%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity="0.45" />
          </linearGradient>
          <marker
            id="money-trail-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="hsl(48, 96%, 53%)" />
          </marker>
        </defs>

        {layout.layers.map((layer) => {
          const x = layout.positions[visibleNodes.find((node) => (layerByNode[node.id] ?? node.defaultLayer) === layer)?.id ?? ""]?.x;
          if (!x) return null;
          return (
            <g key={`layer-${layer}`}>
              <line x1={x} y1={24} x2={x} y2={layout.height - 24} stroke="hsl(220, 16%, 14%)" strokeDasharray="5 5" />
              <text x={x} y={18} textAnchor="middle" fill="hsl(220, 10%, 56%)" fontSize={10} fontFamily="JetBrains Mono, monospace">
                Layer {layer}
              </text>
            </g>
          );
        })}

        {visibleEdges.map((edge, index) => {
          const start = layout.positions[edge.from];
          const end = layout.positions[edge.to];
          if (!start || !end) return null;

          const path = buildPath(start, end);
          const txTime = new Date(edge.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;

          return (
            <g key={edge.id}>
              <motion.path
                d={path}
                fill="none"
                stroke="url(#gold-edge)"
                strokeWidth={2}
                strokeDasharray="9 6"
                markerEnd="url(#money-trail-arrow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.95, strokeDashoffset: [0, -30] }}
                transition={{
                  pathLength: { duration: 0.55, delay: index * 0.05 },
                  opacity: { duration: 0.35, delay: index * 0.05 },
                  strokeDashoffset: { duration: 1.8, repeat: Infinity, ease: "linear", delay: index * 0.1 },
                }}
              />
              <motion.circle
                r={3.2}
                fill="hsl(48, 96%, 53%)"
                initial={{ cx: start.x, cy: start.y, opacity: 0 }}
                animate={{ cx: [start.x, end.x], cy: [start.y, end.y], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.28, repeatDelay: 1.2 }}
              />
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                fill="hsl(220, 10%, 60%)"
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
              >
                {formatCompactAmount(edge.amount)} - {txTime}
              </text>
            </g>
          );
        })}

        {visibleNodes.map((node, index) => {
          const position = layout.positions[node.id];
          if (!position) return null;

          const layer = layerByNode[node.id] ?? node.defaultLayer;
          const isSource = sourceSet.has(node.id) || node.role === "source";
          const isDestination = destinationSet.has(node.id) || node.role === "destination";
          const fill = roleFill(isSource, isDestination);
          const hasFilterHighlight = highlightSet.has(node.id);
          const isCommonAccount = commonSet.has(node.id);

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
            >
              <circle cx={position.x} cy={position.y} r={30} fill={fill} opacity={0.1} />
              <circle
                cx={position.x}
                cy={position.y}
                r={20}
                fill={fill}
                opacity={0.95}
                stroke={hasFilterHighlight ? "hsl(48, 96%, 53%)" : isCommonAccount ? "hsl(210, 100%, 60%)" : "hsl(220, 20%, 4%)"}
                strokeWidth={hasFilterHighlight || isCommonAccount ? 3 : 2}
              />
              {(hasFilterHighlight || isCommonAccount) && (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={24}
                  fill="none"
                  stroke={hasFilterHighlight ? "hsl(48, 96%, 53%)" : "hsl(210, 100%, 60%)"}
                  strokeOpacity={0.85}
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                />
              )}

              <circle cx={position.x + 16} cy={position.y - 16} r={10} fill="hsl(220, 18%, 10%)" stroke="hsl(48, 96%, 53%)" strokeWidth={1.5} />
              <text x={position.x + 16} y={position.y - 13} textAnchor="middle" fill="hsl(48, 96%, 53%)" fontSize={10} fontWeight={700}>
                L{layer}
              </text>

              <text
                x={position.x}
                y={position.y + 4}
                textAnchor="middle"
                fill="hsl(220, 20%, 4%)"
                fontSize={10}
                fontWeight={700}
                fontFamily="JetBrains Mono, monospace"
              >
                {node.nodeType === "bank-account" ? "BANK" : node.nodeType === "wallet" ? "WALLET" : "ENTITY"}
              </text>
              <text
                x={position.x}
                y={position.y + 40}
                textAnchor="middle"
                fill="hsl(220, 10%, 62%)"
                fontSize={11}
                fontWeight={600}
                fontFamily="JetBrains Mono, monospace"
              >
                {node.label}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Source account</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> Intermediate layers</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Destination / suspicious</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent" /> Shared across selected cases</span>
      </div>
    </div>
  );
}
