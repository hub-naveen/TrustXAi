import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Shield,
  Brain,
  Network,
  Clock,
  AlertTriangle,
  X,
  Target,
  ScanSearch,
  Link2,
  ListTree,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import { fraudDNAs, transactions, type FraudDNA } from "@/data/mockData";
import {
  investigationCases,
  investigationCaseOptions,
  mergeInvestigationCases,
  type DetectionLabel,
} from "@/data/investigationData";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import MoneyTrailSpiderMap from "@/components/fraud-intel/MoneyTrailSpiderMap";
import EntityFilterPanel, {
  type InvestigationFilters,
  type ResolutionHint,
} from "@/components/fraud-intel/EntityFilterPanel";
import CaseLinkingPanel from "@/components/fraud-intel/CaseLinkingPanel";
import MoneyFlowTimeline from "@/components/fraud-intel/MoneyFlowTimeline";
import InvestigationReportGenerator from "@/components/fraud-intel/InvestigationReportGenerator";

const catColor: Record<string, string> = {
  "Transaction Layering": "bg-destructive/10 text-destructive",
  "Money Laundering": "bg-warning/10 text-warning",
  "Cryptocurrency Fraud": "bg-accent/10 text-accent",
  Structuring: "bg-primary/10 text-primary",
  "Identity Fraud": "bg-destructive/10 text-destructive",
};

const threatTimeline = [
  { time: "00:00", threats: 12, blocked: 12 },
  { time: "04:00", threats: 8, blocked: 8 },
  { time: "08:00", threats: 34, blocked: 33 },
  { time: "12:00", threats: 56, blocked: 54 },
  { time: "16:00", threats: 42, blocked: 41 },
  { time: "20:00", threats: 28, blocked: 27 },
  { time: "Now", threats: 19, blocked: 19 },
];

const radarData = [
  { subject: "Velocity", A: 92 },
  { subject: "Amount", A: 78 },
  { subject: "Geography", A: 65 },
  { subject: "Network", A: 88 },
  { subject: "Behavior", A: 95 },
  { subject: "Identity", A: 72 },
];

const riskFactors = [
  { label: "Velocity Stacking", score: 94, desc: "15 transactions in 2 min window" },
  { label: "Shell Entity Link", score: 97, desc: "Destination linked to known shell corp" },
  { label: "Cross-border Pattern", score: 82, desc: "Fiat to crypto to offshore routing" },
  { label: "Amount Structuring", score: 89, desc: "Split transactions below threshold" },
  { label: "New Account Risk", score: 76, desc: "Account age under 30 days with high volume" },
];

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

export default function FraudIntelligence() {
  const [selectedDNA, setSelectedDNA] = useState<FraudDNA | null>(null);
  const [activeTab, setActiveTab] = useState<"patterns" | "network" | "timeline">("patterns");
  const [investigationMode, setInvestigationMode] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([
    investigationCases[0]?.caseId ?? "",
  ]);
  const [filters, setFilters] = useState<InvestigationFilters>(defaultFilters);
  const [collapsedLayers, setCollapsedLayers] = useState<number[]>([]);
  const [timelineStep, setTimelineStep] = useState(1);

  const totalPatterns = useAnimatedCounter(fraudDNAs.length, 800);
  const avgSimilarity = useAnimatedCounter(92, 1200, 200);
  const activeThreats = useAnimatedCounter(19, 1000, 300);

  const mergedInvestigation = useMemo(
    () => mergeInvestigationCases(selectedCaseIds.filter(Boolean)),
    [selectedCaseIds],
  );

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

  const commonAccountLabels = useMemo(
    () => mergedInvestigation.commonNodeIds.map((id) => nodeLookup[id]?.label ?? id),
    [mergedInvestigation.commonNodeIds, nodeLookup],
  );

  const sortedPathRisks = useMemo(
    () => [...mergedInvestigation.pathRisks].sort((a, b) => b.riskScore - a.riskScore),
    [mergedInvestigation.pathRisks],
  );

  const highlightedNodeIds = useMemo(() => {
    if (hasFilterInput) return linkedNodeIds;
    return sortedPathRisks[0]?.chain ?? [];
  }, [hasFilterInput, linkedNodeIds, sortedPathRisks]);

  const linkedTransactions = useMemo(() => {
    const refs = new Set(mergedInvestigation.edges.map((edge) => edge.txRef));
    return transactions
      .filter((tx) => refs.has(tx.id))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 6);
  }, [mergedInvestigation.edges]);

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

  const updateCases = (caseIds: string[]) => {
    if (!caseIds.length) {
      const fallback = investigationCases[0]?.caseId;
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

  const graphStep = investigationMode ? timelineStep : Math.min(timelineStep, 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fraud Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered fraud DNA patterns, threat analysis, and money laundering investigation mapping
          </p>
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
        </div>
      </div>

      <SectionReveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Fingerprint, label: "Fraud DNAs", value: totalPatterns.toString(), color: "text-primary" },
            { icon: Target, label: "Avg Similarity", value: `${avgSimilarity}%`, color: "text-warning" },
            { icon: AlertTriangle, label: "Active Threats", value: activeThreats.toString(), color: "text-destructive" },
            { icon: Shield, label: "Block Rate", value: "99.2%", color: "text-success" },
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
          { key: "network" as const, label: "Money Trail Map", icon: Network },
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
                {fraudDNAs.map((dna, i) => (
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
            <div className="glass rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" /> Money Trail Spider Map
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Directional transaction flow with layer detection, case linking, and entity resolution.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-2 py-1 rounded-full bg-primary/15 text-primary font-semibold">
                  Total Layers: {totalLayers}
                </span>
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
                  options={investigationCaseOptions}
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
                  nodes={mergedInvestigation.nodes}
                  edges={mergedInvestigation.edges}
                  layerByNode={layerByNode}
                  collapsedLayers={collapsedLayers}
                  highlightedNodeIds={highlightedNodeIds}
                  commonNodeIds={mergedInvestigation.commonNodeIds}
                  sourceNodeIds={mergedInvestigation.sourceNodeIds}
                  destinationNodeIds={mergedInvestigation.destinationNodeIds}
                  activeStep={graphStep}
                />

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
              </div>

              <div className="xl:col-span-3 space-y-4">
                <div className="glass rounded-xl p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <ScanSearch className="w-4 h-4 text-primary" /> AI Layering Detection
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
                  <AreaChart data={threatTimeline}>
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
                  {[
                    { time: "14:24", event: "Layering Detected chain crossed offshore node", severity: "critical" },
                    { time: "14:18", event: "Circular Flow found in merged case CASE-ML-2026-0617", severity: "high" },
                    { time: "14:10", event: "Shell entity transfer linked through same IP cluster", severity: "critical" },
                    { time: "13:58", event: "Smurfing Pattern with threshold split detected", severity: "high" },
                    { time: "13:45", event: "Cross-border account relationship score exceeded 90", severity: "medium" },
                    { time: "13:30", event: "Velocity Stacking in mule layer confirmed", severity: "medium" },
                  ].map((entry, i) => (
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
