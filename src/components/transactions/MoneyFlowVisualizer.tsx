import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from "react-force-graph-2d";
import { Layers3, RotateCcw } from "lucide-react";
import type { Transaction } from "@/data/mockData";
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
  totalAmount: number;
  averageRisk: number;
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

  const depthMap = useMemo(() => {
    const depth = new Map<string, number>();
    if (!focusNodeId) {
      for (const node of baseGraph.nodes) {
        depth.set(node.id, 0);
      }
      return depth;
    }

    const adjacency = new Map<string, Set<string>>();
    for (const link of baseGraph.links) {
      const source = resolveNodeId(link.source);
      const target = resolveNodeId(link.target);

      if (!adjacency.has(source)) {
        adjacency.set(source, new Set<string>());
      }
      if (!adjacency.has(target)) {
        adjacency.set(target, new Set<string>());
      }

      adjacency.get(source)?.add(target);
      adjacency.get(target)?.add(source);
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

      for (const neighbor of adjacency.get(current.id) ?? []) {
        if (depth.has(neighbor)) {
          continue;
        }

        const neighborDepth = current.depth + 1;
        depth.set(neighbor, neighborDepth);
        queue.push({ id: neighbor, depth: neighborDepth });
      }
    }

    return depth;
  }, [baseGraph.links, baseGraph.nodes, focusNodeId, depthLimit]);

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
      .filter((link) => visibleNodeIds.has(resolveNodeId(link.source)) && visibleNodeIds.has(resolveNodeId(link.target)))
      .map((link) => {
        const sourceDepth = depthMap.get(resolveNodeId(link.source)) ?? 0;
        const targetDepth = depthMap.get(resolveNodeId(link.target)) ?? 0;
        return {
          ...link,
          layer: Math.max(sourceDepth, targetDepth),
        };
      });

    return { nodes, links };
  }, [baseGraph.links, baseGraph.nodes, depthLimit, depthMap, focusNodeId]);

  const layeredPaths = useMemo(() => {
    if (!focusNodeId) {
      return [] as LayeredPath[];
    }

    const outgoing = new Map<string, MoneyFlowLink[]>();
    for (const link of baseGraph.links) {
      const source = resolveNodeId(link.source);
      const bucket = outgoing.get(source) ?? [];
      bucket.push(link);
      outgoing.set(source, bucket);
    }

    const maxHops = Math.max(2, Math.min(5, depthLimit + 2));
    const results = new Map<string, LayeredPath>();

    const walk = (
      current: string,
      path: string[],
      visited: Set<string>,
      hops: number,
      totalAmount: number,
      weightedRisk: number,
      txCount: number,
    ) => {
      if (hops >= maxHops) {
        return;
      }

      for (const link of outgoing.get(current) ?? []) {
        const next = resolveNodeId(link.target);
        if (!next || visited.has(next)) {
          continue;
        }

        const nextPath = [...path, next];
        const nextVisited = new Set(visited);
        nextVisited.add(next);

        const nextHops = hops + 1;
        const nextAmount = totalAmount + link.totalAmount;
        const nextWeightedRisk = weightedRisk + link.avgRisk * link.txCount;
        const nextTxCount = txCount + link.txCount;

        if (nextHops >= 2) {
          const key = nextPath.join(" -> ");
          const averageRisk = nextWeightedRisk / Math.max(nextTxCount, 1);
          results.set(key, {
            key,
            hops: nextHops,
            path: nextPath,
            totalAmount: nextAmount,
            averageRisk,
          });
        }

        walk(next, nextPath, nextVisited, nextHops, nextAmount, nextWeightedRisk, nextTxCount);
      }
    };

    walk(focusNodeId, [focusNodeId], new Set([focusNodeId]), 0, 0, 0, 0);

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
  }, [baseGraph.links, depthLimit, focusNodeId]);

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

    setDepthLimit((current) => Math.min(current + 1, 4));
  };

  const resetFocus = () => {
    setFocusNodeId(highestRiskNode);
    setDepthLimit(1);
  };

  return (
    <div className={cn("rounded-xl border border-warning/25 bg-[#070b12] p-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-warning">Money Flow Visualizer</h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Click a node to focus. Click the same node again to expand one more hop layer.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-1 rounded-full bg-warning/10 text-warning font-semibold">
            Focus: {focusNodeId ?? "All Accounts"}
          </span>
          <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground font-semibold">
            Layer Depth: {depthLimit}
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

      <div className="h-[420px] rounded-lg border border-warning/20 bg-[#02050b]">
        <ForceGraph2D
          ref={graphRef}
          graphData={visibleGraph}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={6}
          linkDirectionalArrowLength={3.8}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={(link) => ((link as MoneyFlowLink).avgRisk >= 80 ? 2.2 : 1.1)}
          linkColor={(link) => normalizeEdgeRiskColor((link as MoneyFlowLink).avgRisk)}
          linkWidth={(link) => {
            const typed = link as MoneyFlowLink;
            const base = typed.avgRisk >= 80 ? 2.6 : typed.avgRisk >= 60 ? 1.8 : 1.2;
            return base + Math.min(typed.txCount * 0.12, 1.2);
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node, context, globalScale) => {
            const account = node as NodeObject<MoneyFlowNode>;
            const typedNode = account as unknown as MoneyFlowNode;
            const radius = Math.max(4.5, 4 + Math.min(typedNode.transactionCount, 8) * 0.6);
            const isFocused = typedNode.id === focusNodeId;

            context.beginPath();
            context.arc(account.x ?? 0, account.y ?? 0, radius, 0, 2 * Math.PI, false);
            context.fillStyle = normalizeNodeColor(typedNode.riskScore);
            context.fill();

            context.lineWidth = isFocused ? 2.2 : 1;
            context.strokeStyle = isFocused ? "#facc15" : "rgba(148, 163, 184, 0.35)";
            context.stroke();

            const fontSize = 10 / globalScale;
            context.font = `${fontSize}px Inter, sans-serif`;
            context.fillStyle = "rgba(245, 245, 245, 0.9)";
            context.textAlign = "left";
            context.textBaseline = "middle";

            const label = typedNode.accountId.length > 18
              ? `${typedNode.accountId.slice(0, 18)}...`
              : typedNode.accountId;
            context.fillText(label, (account.x ?? 0) + radius + 2, account.y ?? 0);
          }}
          nodeLabel={(node) => {
            const typedNode = node as unknown as MoneyFlowNode;
            return `
              <div style="padding:8px 10px;background:#080f1b;border:1px solid #7a5d0d;border-radius:8px;color:#f8fafc;font-size:11px;line-height:1.4;max-width:240px;">
                <div style="font-weight:700;color:#facc15;margin-bottom:3px;">${typedNode.accountId}</div>
                <div>Risk score: <b>${typedNode.riskScore}</b></div>
                <div>Transaction count: <b>${typedNode.transactionCount}</b></div>
                <div>Institution: <b>${typedNode.institution}</b></div>
              </div>
            `;
          }}
          onNodeClick={onNodeClick}
          showPointerCursor
          cooldownTicks={120}
          d3AlphaDecay={0.03}
        />
      </div>

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
                  <p className="text-[10px] text-foreground truncate">{path.path.join(" -> ")}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {path.hops} hops • Avg risk {Math.round(path.averageRisk)} • {toCurrency(path.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">No multi-hop path in current filter. Expand node layers or widen filters.</p>
          )}
        </div>

        <div className="rounded-lg border border-warning/15 bg-secondary/20 px-3 py-2">
          <p className="text-[11px] font-semibold mb-2">Legend</p>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
            <p><span className="inline-block w-2 h-2 rounded-full bg-destructive mr-1" />High-risk node</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-warning mr-1" />Elevated-risk node</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Medium-risk node</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-success mr-1" />Low-risk node</p>
          </div>
        </div>
      </div>
    </div>
  );
}