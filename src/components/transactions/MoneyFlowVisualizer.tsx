import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from "react-force-graph-2d";
import { Layers3, RotateCcw } from "lucide-react";
import type { Transaction } from "@/types/domain";
import type { AccountRiskScore } from "@/lib/accountRiskScoring";
import { cn } from "@/lib/utils";

interface MoneyFlowNode {
  id: string;
  accountId: string;
  institution: string;
  riskScore: number;
  transactionCount: number;
  blockedCount: number;
  flaggedCount: number;
  totalAmount: number;
  counterpartyCount: number;
}

interface MoneyFlowLink {
  id: string;
  source: string;
  target: string;
  txCount: number;
  totalAmount: number;
  riskTotal: number;
  avgRisk: number;
  layer?: number;
}

interface LayeredPath {
  key: string;
  hops: number;
  path: string[];
  flow: string;
  totalAmount: number;
  averageRisk: number;
}

type FlowDirection = "outbound" | "inbound" | "bidirectional";

interface TraversalEdge {
  next: string;
  link: MoneyFlowLink;
  direction: "outbound" | "inbound";
}

interface MoneyFlowVisualizerProps {
  transactions: Transaction[];
  accountScores: AccountRiskScore[];
  className?: string;
}

const toCurrency = (amount: number) => `Rs ${Math.round(amount).toLocaleString()}`;

const normalizeEdgeRiskColor = (risk: number): string => {
  if (risk >= 80) {
    return "rgba(239, 68, 68, 0.9)";
  }
  if (risk >= 65) {
    return "rgba(245, 158, 11, 0.75)";
  }
  return "rgba(212, 175, 55, 0.45)";
};

const normalizeNodeColor = (score: number): string => {
  if (score >= 80) {
    return "#ef4444";
  }
  if (score >= 70) {
    return "#f59e0b";
  }
  if (score >= 45) {
    return "#d4af37";
  }
  return "#22c55e";
};

const flowDirectionLabel: Record<FlowDirection, string> = {
  outbound: "Outbound",
  inbound: "Inbound",
  bidirectional: "Bidirectional",
};

const clampDepth = (value: number): number => Math.max(1, Math.min(4, value));

function resolveNodeId(node: string | number | MoneyFlowNode | undefined): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  return node?.id ?? "";
}

export default function MoneyFlowVisualizer({
  transactions,
  accountScores,
  className,
}: MoneyFlowVisualizerProps) {
  const graphRef = useRef<ForceGraphMethods<MoneyFlowNode, MoneyFlowLink>>();
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [depthLimit, setDepthLimit] = useState(1);
  const [flowDirection, setFlowDirection] = useState<FlowDirection>("bidirectional");
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  const scoreMap = useMemo(() => {
    return new Map(accountScores.map((score) => [score.accountId, score]));
  }, [accountScores]);

  const baseGraph = useMemo(() => {
    const nodeMap = new Map<string, MoneyFlowNode>();
    const counterpartyMap = new Map<string, Set<string>>();
    const linkMap = new Map<string, MoneyFlowLink>();

    const ensureNode = (id: string, institution: string) => {
      const existing = nodeMap.get(id);
      if (existing) {
        if (existing.institution === "External Counterparty" && institution) {
          existing.institution = institution;
        }
        return existing;
      }

      const score = scoreMap.get(id);
      const created: MoneyFlowNode = {
        id,
        accountId: id,
        institution: score?.institution ?? institution ?? "External Counterparty",
        riskScore: score?.score ?? 20,
        transactionCount: 0,
        blockedCount: 0,
        flaggedCount: 0,
        totalAmount: 0,
        counterpartyCount: 0,
      };
      nodeMap.set(id, created);
      return created;
    };

    const connectCounterparties = (left: string, right: string) => {
      const leftSet = counterpartyMap.get(left) ?? new Set<string>();
      leftSet.add(right);
      counterpartyMap.set(left, leftSet);

      const rightSet = counterpartyMap.get(right) ?? new Set<string>();
      rightSet.add(left);
      counterpartyMap.set(right, rightSet);
    };

    for (const transaction of transactions) {
      const source = ensureNode(transaction.from, transaction.institution);
      const target = ensureNode(transaction.to, "External Counterparty");

      source.transactionCount += 1;
      target.transactionCount += 1;
      source.totalAmount += transaction.amount;
      target.totalAmount += transaction.amount;

      if (transaction.status === "blocked") {
        source.blockedCount += 1;
        target.blockedCount += 1;
      }

      if (transaction.status === "flagged") {
        source.flaggedCount += 1;
        target.flaggedCount += 1;
      }

      connectCounterparties(source.id, target.id);

      const linkKey = `${source.id}__${target.id}`;
      const existingLink = linkMap.get(linkKey);
      if (existingLink) {
        existingLink.txCount += 1;
        existingLink.totalAmount += transaction.amount;
        existingLink.riskTotal += transaction.riskScore;
        continue;
      }

      linkMap.set(linkKey, {
        id: linkKey,
        source: source.id,
        target: target.id,
        txCount: 1,
        totalAmount: transaction.amount,
        riskTotal: transaction.riskScore,
        avgRisk: transaction.riskScore,
      });
    }

    const nodes = Array.from(nodeMap.values()).map((node) => {
      const score = scoreMap.get(node.id);
      const finalScore = score?.score ?? node.riskScore;
      return {
        ...node,
        riskScore: finalScore,
        counterpartyCount: counterpartyMap.get(node.id)?.size ?? 0,
      };
    });

    const links = Array.from(linkMap.values()).map((link) => ({
      ...link,
      avgRisk: link.riskTotal / Math.max(link.txCount, 1),
    }));

    return { nodes, links };
  }, [transactions, scoreMap]);

  const highestRiskNode = useMemo(() => {
    return [...baseGraph.nodes].sort((left, right) => right.riskScore - left.riskScore)[0]?.id ?? null;
  }, [baseGraph.nodes]);

  const mostConnectedNode = useMemo(() => {
    return [...baseGraph.nodes].sort((left, right) => right.counterpartyCount - left.counterpartyCount)[0]?.id ?? null;
  }, [baseGraph.nodes]);

  const highestVolumeNode = useMemo(() => {
    return [...baseGraph.nodes].sort((left, right) => right.totalAmount - left.totalAmount)[0]?.id ?? null;
  }, [baseGraph.nodes]);

  useEffect(() => {
    if (!focusNodeId && highestRiskNode) {
      setFocusNodeId(highestRiskNode);
      setDepthLimit(1);
    }
  }, [focusNodeId, highestRiskNode]);

  useEffect(() => {
    if (!focusNodeId) {
      return;
    }

    const exists = baseGraph.nodes.some((node) => node.id === focusNodeId);
    if (!exists) {
      setFocusNodeId(highestRiskNode);
      setDepthLimit(1);
    }
  }, [baseGraph.nodes, focusNodeId, highestRiskNode]);

  const traversalMap = useMemo(() => {
    const map = new Map<string, TraversalEdge[]>();

    const register = (
      from: string,
      next: string,
      link: MoneyFlowLink,
      direction: "outbound" | "inbound",
    ) => {
      const bucket = map.get(from) ?? [];
      bucket.push({ next, link, direction });
      map.set(from, bucket);
    };

    for (const link of baseGraph.links) {
      const source = resolveNodeId(link.source);
      const target = resolveNodeId(link.target);
      if (!source || !target || source === target) {
        continue;
      }

      if (flowDirection !== "inbound") {
        register(source, target, link, "outbound");
      }
      if (flowDirection !== "outbound") {
        register(target, source, link, "inbound");
      }
    }

    return map;
  }, [baseGraph.links, flowDirection]);

  const depthMap = useMemo(() => {
    const depth = new Map<string, number>();
    if (!focusNodeId) {
      for (const node of baseGraph.nodes) {
        depth.set(node.id, 0);
      }
      return depth;
    }

    const queue: Array<{ id: string; depth: number }> = [{ id: focusNodeId, depth: 0 }];
    depth.set(focusNodeId, 0);

    while (queue.length) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      if (current.depth >= depthLimit) {
        continue;
      }

      for (const edge of traversalMap.get(current.id) ?? []) {
        const neighbor = edge.next;
        if (depth.has(neighbor)) {
          continue;
        }

        const neighborDepth = current.depth + 1;
        depth.set(neighbor, neighborDepth);
        queue.push({ id: neighbor, depth: neighborDepth });
      }
    }

    return depth;
  }, [baseGraph.nodes, focusNodeId, depthLimit, traversalMap]);

  const visibleGraph = useMemo(() => {
    const visibleNodeIds = new Set<string>();

    if (focusNodeId) {
      for (const [nodeId, nodeDepth] of depthMap.entries()) {
        if (nodeDepth <= depthLimit) {
          visibleNodeIds.add(nodeId);
        }
      }
    } else {
      for (const node of baseGraph.nodes) {
        visibleNodeIds.add(node.id);
      }
    }

    const nodes = baseGraph.nodes.filter((node) => visibleNodeIds.has(node.id));
    const links = baseGraph.links
      .filter((link) => {
        const source = resolveNodeId(link.source);
        const target = resolveNodeId(link.target);
        if (!visibleNodeIds.has(source) || !visibleNodeIds.has(target)) {
          return false;
        }

        if (!focusNodeId) {
          return true;
        }

        const sourceDepth = depthMap.get(source);
        const targetDepth = depthMap.get(target);
        if (sourceDepth === undefined || targetDepth === undefined) {
          return false;
        }

        if (flowDirection === "outbound") {
          return sourceDepth < targetDepth;
        }
        if (flowDirection === "inbound") {
          return targetDepth < sourceDepth;
        }
        return true;
      })
      .map((link) => {
        const sourceDepth = depthMap.get(resolveNodeId(link.source)) ?? 0;
        const targetDepth = depthMap.get(resolveNodeId(link.target)) ?? 0;
        return {
          ...link,
          layer: Math.max(sourceDepth, targetDepth),
        };
      });

    return { nodes, links };
  }, [baseGraph.links, baseGraph.nodes, depthLimit, depthMap, focusNodeId, flowDirection]);

  const neighborIdsByNode = useMemo(() => {
    const map = new Map<string, Set<string>>();

    const register = (left: string, right: string) => {
      const bucket = map.get(left) ?? new Set<string>();
      bucket.add(right);
      map.set(left, bucket);
    };

    for (const link of visibleGraph.links) {
      const source = resolveNodeId(link.source);
      const target = resolveNodeId(link.target);
      register(source, target);
      register(target, source);
    }

    return map;
  }, [visibleGraph.links]);

  const visibleMetrics = useMemo(() => {
    const totalVolume = visibleGraph.links.reduce((sum, link) => sum + link.totalAmount, 0);
    const highRiskAccounts = visibleGraph.nodes.filter((node) => node.riskScore >= 80).length;
    const elevatedRiskLinks = visibleGraph.links.filter((link) => link.avgRisk >= 65).length;

    return {
      nodeCount: visibleGraph.nodes.length,
      linkCount: visibleGraph.links.length,
      totalVolume,
      highRiskAccounts,
      elevatedRiskLinks,
    };
  }, [visibleGraph.links, visibleGraph.nodes]);

  const focusedNode = useMemo(() => {
    if (!focusNodeId) {
      return null;
    }
    return baseGraph.nodes.find((node) => node.id === focusNodeId) ?? null;
  }, [baseGraph.nodes, focusNodeId]);

  const focusedNodeConnections = useMemo(() => {
    if (!focusNodeId) {
      return [] as MoneyFlowLink[];
    }

    return baseGraph.links
      .filter((link) => {
        const source = resolveNodeId(link.source);
        const target = resolveNodeId(link.target);
        return source === focusNodeId || target === focusNodeId;
      })
      .sort((left, right) => {
        if (right.avgRisk !== left.avgRisk) {
          return right.avgRisk - left.avgRisk;
        }
        return right.totalAmount - left.totalAmount;
      })
      .slice(0, 4);
  }, [baseGraph.links, focusNodeId]);

  const layeredPaths = useMemo(() => {
    if (!focusNodeId) {
      return [] as LayeredPath[];
    }

    const maxHops = Math.max(2, Math.min(5, depthLimit + 2));
    const results = new Map<string, LayeredPath>();

    const walk = (
      current: string,
      path: string[],
      directions: Array<"outbound" | "inbound">,
      visited: Set<string>,
      hops: number,
      totalAmount: number,
      weightedRisk: number,
      txCount: number,
    ) => {
      if (hops >= maxHops) {
        return;
      }

      for (const step of traversalMap.get(current) ?? []) {
        const next = step.next;
        if (!next || visited.has(next)) {
          continue;
        }

        const nextPath = [...path, next];
        const nextDirections = [...directions, step.direction];
        const nextVisited = new Set(visited);
        nextVisited.add(next);

        const nextHops = hops + 1;
        const nextAmount = totalAmount + step.link.totalAmount;
        const nextWeightedRisk = weightedRisk + step.link.avgRisk * step.link.txCount;
        const nextTxCount = txCount + step.link.txCount;

        if (nextHops >= 2) {
          const key = `${nextPath.join("|")}::${nextDirections.join("|")}`;
          const averageRisk = nextWeightedRisk / Math.max(nextTxCount, 1);
          const flow = nextPath
            .map((nodeId, index) => {
              if (index === 0) {
                return nodeId;
              }
              const direction = nextDirections[index - 1];
              const arrow = direction === "outbound" ? "->" : "<-";
              return `${arrow} ${nodeId}`;
            })
            .join(" ");

          results.set(key, {
            key,
            hops: nextHops,
            path: nextPath,
            flow,
            totalAmount: nextAmount,
            averageRisk,
          });
        }

        walk(next, nextPath, nextDirections, nextVisited, nextHops, nextAmount, nextWeightedRisk, nextTxCount);
      }
    };

    walk(focusNodeId, [focusNodeId], [], new Set([focusNodeId]), 0, 0, 0, 0);

    return Array.from(results.values())
      .sort((left, right) => {
        if (right.hops !== left.hops) {
          return right.hops - left.hops;
        }
        if (right.averageRisk !== left.averageRisk) {
          return right.averageRisk - left.averageRisk;
        }
        return right.totalAmount - left.totalAmount;
      })
      .slice(0, 8);
  }, [depthLimit, focusNodeId, traversalMap]);

  useEffect(() => {
    if (!graphRef.current || !visibleGraph.nodes.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      graphRef.current?.zoomToFit(450, 60);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [visibleGraph.nodes.length, visibleGraph.links.length, focusNodeId, depthLimit]);

  const onNodeClick = (node: NodeObject<MoneyFlowNode>) => {
    const nodeId = String(node.id ?? "");
    if (!nodeId) {
      return;
    }

    if (focusNodeId !== nodeId) {
      setFocusNodeId(nodeId);
      setDepthLimit(1);
      return;
    }

    setDepthLimit((current) => clampDepth(current + 1));
  };

  const applyFocusPreset = (nextFocus: string | null) => {
    if (!nextFocus) {
      return;
    }
    setFocusNodeId(nextFocus);
    setDepthLimit(1);
    setHoverNodeId(null);
  };

  const resetFocus = () => {
    setFocusNodeId(highestRiskNode);
    setDepthLimit(1);
    setHoverNodeId(null);
    setFlowDirection("bidirectional");
  };

  const isLinkConnectedToHover = (link: MoneyFlowLink) => {
    if (!hoverNodeId) {
      return true;
    }
    const source = resolveNodeId(link.source);
    const target = resolveNodeId(link.target);
    return source === hoverNodeId || target === hoverNodeId;
  };

  return (
    <div className={cn("rounded-xl border border-warning/25 bg-[#070b12] p-4 overflow-hidden", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-warning">Money Flow Visualizer</h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Click a node to focus. Toggle inbound/outbound direction and tune hop depth to inspect layered flow.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-1 rounded-full bg-warning/10 text-warning font-semibold">
            Focus: {focusNodeId ?? "All Accounts"}
          </span>
          <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground font-semibold">
            Layer Depth: {depthLimit}
          </span>
          <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground font-semibold">
            Flow: {flowDirectionLabel[flowDirection]}
          </span>
          <button
            type="button"
            onClick={resetFocus}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="text-muted-foreground mr-1">Quick focus:</span>
        <button
          type="button"
          onClick={() => applyFocusPreset(highestRiskNode)}
          className="px-2 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          Highest risk
        </button>
        <button
          type="button"
          onClick={() => applyFocusPreset(mostConnectedNode)}
          className="px-2 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          Most connected
        </button>
        <button
          type="button"
          onClick={() => applyFocusPreset(highestVolumeNode)}
          className="px-2 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          Highest volume
        </button>
      </div>

      <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="inline-flex items-center rounded-full bg-secondary/70 p-1 text-[10px]">
          {(["outbound", "bidirectional", "inbound"] as FlowDirection[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFlowDirection(mode)}
              className={cn(
                "px-2.5 py-1 rounded-full transition-colors",
                flowDirection === mode
                  ? "bg-warning/20 text-warning font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {flowDirectionLabel[mode]}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Hop depth</span>
          <input
            type="range"
            min={1}
            max={4}
            value={depthLimit}
            onChange={(event) => setDepthLimit(clampDepth(Number(event.target.value)))}
            className="w-28 accent-warning"
          />
          <span className="font-semibold text-foreground">{depthLimit}</span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 xl:grid-cols-5 gap-2 text-[10px]">
        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-2.5 py-2">
          <p className="text-muted-foreground">Visible Accounts</p>
          <p className="text-foreground font-semibold mt-1">{visibleMetrics.nodeCount}</p>
        </div>
        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-2.5 py-2">
          <p className="text-muted-foreground">Visible Connections</p>
          <p className="text-foreground font-semibold mt-1">{visibleMetrics.linkCount}</p>
        </div>
        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-2.5 py-2">
          <p className="text-muted-foreground">Visible Volume</p>
          <p className="text-foreground font-semibold mt-1">{toCurrency(visibleMetrics.totalVolume)}</p>
        </div>
        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-2.5 py-2">
          <p className="text-muted-foreground">High-risk Accounts</p>
          <p className="text-destructive font-semibold mt-1">{visibleMetrics.highRiskAccounts}</p>
        </div>
        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-2.5 py-2">
          <p className="text-muted-foreground">Elevated-risk Links</p>
          <p className="text-warning font-semibold mt-1">{visibleMetrics.elevatedRiskLinks}</p>
        </div>
      </div>

      <div className="h-[420px] rounded-lg border border-warning/20 bg-[#02050b] relative overflow-hidden isolate">
        <ForceGraph2D
          ref={graphRef}
          graphData={visibleGraph}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={6}
          linkDirectionalArrowLength={3.8}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={(link) => {
            const typed = link as MoneyFlowLink;
            if (!isLinkConnectedToHover(typed)) {
              return 0;
            }
            return typed.avgRisk >= 80 ? 2 : 1;
          }}
          linkDirectionalParticleWidth={(link) => ((link as MoneyFlowLink).avgRisk >= 80 ? 2.2 : 1.1)}
          linkColor={(link) => {
            const typed = link as MoneyFlowLink;
            if (!isLinkConnectedToHover(typed)) {
              return "rgba(100, 116, 139, 0.2)";
            }
            return normalizeEdgeRiskColor(typed.avgRisk);
          }}
          linkWidth={(link) => {
            const typed = link as MoneyFlowLink;
            const base = typed.avgRisk >= 80 ? 2.6 : typed.avgRisk >= 60 ? 1.8 : 1.2;
            if (!isLinkConnectedToHover(typed)) {
              return Math.max(0.8, base * 0.45);
            }
            return base + Math.min(typed.txCount * 0.12, 1.2);
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node, context, globalScale) => {
            const account = node as NodeObject<MoneyFlowNode>;
            const typedNode = account as unknown as MoneyFlowNode;
            const radius = Math.max(4.5, 4 + Math.min(typedNode.transactionCount, 8) * 0.6);
            const isFocused = typedNode.id === focusNodeId;
            const isHoverRoot = typedNode.id === hoverNodeId;
            const isNeighbor = hoverNodeId
              ? (neighborIdsByNode.get(hoverNodeId)?.has(typedNode.id) ?? false)
              : false;
            const isDimmed = hoverNodeId !== null && !isHoverRoot && !isNeighbor;

            context.globalAlpha = isDimmed ? 0.28 : 1;

            context.beginPath();
            context.arc(account.x ?? 0, account.y ?? 0, radius, 0, 2 * Math.PI, false);
            context.fillStyle = normalizeNodeColor(typedNode.riskScore);
            context.fill();

            context.lineWidth = isFocused || isHoverRoot ? 2.4 : 1;
            context.strokeStyle = isFocused || isHoverRoot ? "#facc15" : "rgba(148, 163, 184, 0.35)";
            context.stroke();

            const fontSize = 10 / globalScale;
            context.font = `${fontSize}px JetBrains Mono, monospace`;
            context.fillStyle = "rgba(245, 245, 245, 0.9)";
            context.textAlign = "left";
            context.textBaseline = "middle";

            const label = typedNode.accountId.length > 18
              ? `${typedNode.accountId.slice(0, 18)}...`
              : typedNode.accountId;
            context.fillText(label, (account.x ?? 0) + radius + 2, account.y ?? 0);

            context.globalAlpha = 1;
          }}
          nodeLabel={(node) => {
            const typedNode = node as unknown as MoneyFlowNode;
            return `
              <div style="padding:8px 10px;background:#080f1b;border:1px solid #7a5d0d;border-radius:8px;color:#f8fafc;font-size:11px;line-height:1.4;max-width:240px;">
                <div style="font-weight:700;color:#facc15;margin-bottom:3px;">${typedNode.accountId}</div>
                <div>Risk score: <b>${typedNode.riskScore}</b></div>
                <div>Transaction count: <b>${typedNode.transactionCount}</b></div>
                <div>Blocked / Flagged: <b>${typedNode.blockedCount} / ${typedNode.flaggedCount}</b></div>
                <div>Total amount: <b>${toCurrency(typedNode.totalAmount)}</b></div>
                <div>Counterparties: <b>${typedNode.counterpartyCount}</b></div>
                <div>Institution: <b>${typedNode.institution}</b></div>
              </div>
            `;
          }}
          onNodeClick={onNodeClick}
          onNodeHover={(node) => {
            if (!node) {
              setHoverNodeId(null);
              return;
            }
            const nodeId = String((node as NodeObject<MoneyFlowNode>).id ?? "");
            setHoverNodeId(nodeId || null);
          }}
          onBackgroundClick={() => setHoverNodeId(null)}
          onEngineTick={() => {
            const graph = graphRef.current;
            if (!graph) {
              return;
            }

            const width = typeof graph.width === "function" ? graph.width() : 0;
            const height = typeof graph.height === "function" ? graph.height() : 0;
            if (!width || !height) {
              return;
            }

            const margin = 18;
            for (const node of visibleGraph.nodes as unknown as Array<NodeObject<MoneyFlowNode>>) {
              if (typeof node.x !== "number" || typeof node.y !== "number") {
                continue;
              }

              if (node.x < margin) {
                node.x = margin;
                node.vx = 0;
              } else if (node.x > width - margin) {
                node.x = width - margin;
                node.vx = 0;
              }

              if (node.y < margin) {
                node.y = margin;
                node.vy = 0;
              } else if (node.y > height - margin) {
                node.y = height - margin;
                node.vy = 0;
              }
            }
          }}
          showPointerCursor
          cooldownTicks={120}
          d3AlphaDecay={0.03}
        />
      </div>

      {focusedNode ? (
        <div className="mt-3 rounded-lg border border-warning/15 bg-secondary/20 px-3 py-2">
          <p className="text-[11px] font-semibold">Focused Account Summary</p>
          <div className="mt-2 grid grid-cols-2 xl:grid-cols-5 gap-2 text-[10px] text-muted-foreground">
            <p>
              Account
              <span className="block text-foreground font-semibold mt-0.5 truncate">{focusedNode.accountId}</span>
            </p>
            <p>
              Risk score
              <span className="block text-foreground font-semibold mt-0.5">{focusedNode.riskScore}</span>
            </p>
            <p>
              Total amount
              <span className="block text-foreground font-semibold mt-0.5">{toCurrency(focusedNode.totalAmount)}</span>
            </p>
            <p>
              Blocked / Flagged
              <span className="block text-foreground font-semibold mt-0.5">{focusedNode.blockedCount} / {focusedNode.flaggedCount}</span>
            </p>
            <p>
              Counterparties
              <span className="block text-foreground font-semibold mt-0.5">{focusedNode.counterpartyCount}</span>
            </p>
          </div>

          <div className="mt-2 space-y-1 max-h-20 overflow-y-auto pr-1">
            {focusedNodeConnections.length ? (
              focusedNodeConnections.map((link) => {
                const source = resolveNodeId(link.source);
                const target = resolveNodeId(link.target);
                const counterparty = source === focusNodeId ? target : source;
                return (
                  <p key={link.id} className="text-[10px] text-muted-foreground">
                    {counterparty} | {toCurrency(link.totalAmount)} | avg risk {Math.round(link.avgRisk)} | {link.txCount} tx
                  </p>
                );
              })
            ) : (
              <p className="text-[10px] text-muted-foreground">No direct counterparty connections in current graph.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid xl:grid-cols-2 gap-3">
        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            <Layers3 className="w-3.5 h-3.5 text-warning" />
            <p className="text-[11px] font-semibold">Layered Transactions (Multi-hop Paths)</p>
          </div>
          {layeredPaths.length ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {layeredPaths.map((path) => (
                <div key={path.key} className="rounded-md bg-background/50 border border-border/50 px-2 py-1.5">
                  <p className="text-[10px] text-foreground truncate">{path.flow}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {path.hops} hops • Avg risk {Math.round(path.averageRisk)} • {toCurrency(path.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">No multi-hop path in current direction/depth. Try Bidirectional or increase hop depth.</p>
          )}
        </div>

        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-3 py-2">
          <p className="text-[11px] font-semibold mb-2">Legend</p>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
            <p><span className="inline-block w-2 h-2 rounded-full bg-destructive mr-1" />High-risk node</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-warning mr-1" />Elevated-risk node</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Medium-risk node</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-success mr-1" />Low-risk node</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-accent mr-1" />Hover to isolate neighborhood</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-secondary mr-1" />Click focused node to expand</p>
          </div>
        </div>
      </div>
    </div>
  );
}