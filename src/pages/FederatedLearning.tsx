import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, CheckCircle, XCircle, Loader, Play, Pause, RotateCcw,
  Shield, Lock, Eye, TrendingUp, Cpu, Wifi, Server,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { modelUpdates, institutions } from "@/data/mockData";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const statusIcon: Record<string, JSX.Element> = {
  merged: <CheckCircle className="w-4 h-4 text-success" />,
  validating: <Loader className="w-4 h-4 text-warning animate-spin" />,
  rejected: <XCircle className="w-4 h-4 text-destructive" />,
};

const accuracyData = [
  { institution: "HDFC", accuracy: 97.8, prevAccuracy: 96.6 },
  { institution: "SBI", accuracy: 96.4, prevAccuracy: 95.6 },
  { institution: "Axis", accuracy: 95.9, prevAccuracy: 95.4 },
  { institution: "ICICI", accuracy: 97.1, prevAccuracy: 95.6 },
  { institution: "PNB", accuracy: 93.2, prevAccuracy: 93.5 },
];

const convergenceData = Array.from({ length: 20 }, (_, i) => ({
  round: i + 1,
  globalLoss: +(2.4 * Math.exp(-0.18 * i) + 0.08 + Math.random() * 0.05).toFixed(3),
  accuracy: +(100 - 14 * Math.exp(-0.22 * i) - Math.random() * 0.5).toFixed(1),
}));

const privacyMetrics = [
  { metric: "ε-Budget Used", value: 72, max: 100, color: "bg-warning" },
  { metric: "Noise Multiplier", value: 45, max: 100, color: "bg-accent" },
  { metric: "Gradient Clipping", value: 88, max: 100, color: "bg-success" },
  { metric: "Secure Aggregation", value: 100, max: 100, color: "bg-primary" },
  { metric: "Data Isolation", value: 100, max: 100, color: "bg-success" },
];

const nodeHealth = institutions.map((inst) => ({
  name: inst.name,
  cpu: Math.floor(30 + Math.random() * 50),
  memory: Math.floor(40 + Math.random() * 40),
  gpu: Math.floor(20 + Math.random() * 60),
  latency: Math.floor(12 + Math.random() * 80),
  status: inst.status,
}));

const radarData = [
  { subject: "Precision", HDFC: 97, SBI: 95, Axis: 94, fullMark: 100 },
  { subject: "Recall", HDFC: 96, SBI: 94, Axis: 93, fullMark: 100 },
  { subject: "F1-Score", HDFC: 96.5, SBI: 94.5, Axis: 93.5, fullMark: 100 },
  { subject: "AUC-ROC", HDFC: 98, SBI: 97, Axis: 95, fullMark: 100 },
  { subject: "Specificity", HDFC: 99, SBI: 98, Axis: 97, fullMark: 100 },
  { subject: "Speed", HDFC: 92, SBI: 88, Axis: 90, fullMark: 100 },
];

export default function FederatedLearning() {
  const [isTraining, setIsTraining] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [trainingLog, setTrainingLog] = useState<string[]>([]);

  const currentConvergence = convergenceData[Math.max(0, Math.min(currentRound - 1, convergenceData.length - 1))] ?? convergenceData[0];
  const privacyStrength = Math.round(
    privacyMetrics.reduce((sum, metric) => sum + metric.value, 0) / Math.max(privacyMetrics.length, 1),
  );
  const onlineNodeCount = institutions.filter((inst) => inst.status === "active").length;

  const federationTrend = convergenceData
    .slice(0, Math.max(currentRound, 8))
    .map((entry) => ({
      label: `R${entry.round}`,
      value: entry.accuracy,
    }));

  useEffect(() => {
    if (!isTraining) return;
    if (currentRound >= 20) {
      setIsTraining(false);
      setTrainingLog((p) => [...p, "✅ Training complete — Global model converged"]);
      return;
    }
    const id = setTimeout(() => {
      setCurrentRound((r) => r + 1);
      const msgs = [
        `Round ${currentRound + 1}: Distributing model to ${institutions.length} nodes...`,
        `Round ${currentRound + 1}: Local training complete (${(Math.random() * 2 + 1).toFixed(1)}s avg)`,
        `Round ${currentRound + 1}: Aggregating gradients with SecAgg protocol`,
        `Round ${currentRound + 1}: Global loss = ${convergenceData[currentRound]?.globalLoss} | Acc = ${convergenceData[currentRound]?.accuracy}%`,
      ];
      setTrainingLog((p) => [...p, msgs[currentRound % msgs.length]]);
    }, 800);
    return () => clearTimeout(id);
  }, [isTraining, currentRound]);

  const resetTraining = () => {
    setCurrentRound(0);
    setTrainingLog([]);
    setIsTraining(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Federated Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">Decentralized model training across institutional nodes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTraining(!isTraining)}
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
          chartPlacement="left"
          metrics={[
            {
              label: "Current Round",
              value: `${currentRound}/20`,
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
              value: `${onlineNodeCount}/${institutions.length}`,
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

      {/* Training Progress Bar */}
      <SectionReveal>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className={`w-4 h-4 ${isTraining ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
              <h3 className="text-sm font-semibold">Training Progress</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Round {currentRound}/20</span>
          </div>
          <Progress value={(currentRound / 20) * 100} className="h-2 mb-4" />
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Global Accuracy", value: currentRound > 0 ? `${convergenceData[Math.min(currentRound - 1, 19)]?.accuracy}%` : "—", icon: TrendingUp },
              { label: "Global Loss", value: currentRound > 0 ? convergenceData[Math.min(currentRound - 1, 19)]?.globalLoss : "—", icon: Cpu },
              { label: "Active Nodes", value: `${institutions.length}/${institutions.length}`, icon: Server },
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
                  <BarChart data={accuracyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                    <XAxis dataKey="institution" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <YAxis domain={[90, 100]} stroke="hsl(220, 10%, 50%)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="prevAccuracy" fill="hsl(220, 16%, 25%)" radius={[4, 4, 0, 0]} name="Previous" />
                    <Bar dataKey="accuracy" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} name="Current" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Model Quality Radar</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(220, 16%, 14%)" />
                    <PolarAngleAxis dataKey="subject" stroke="hsl(220, 10%, 50%)" fontSize={10} />
                    <PolarRadiusAxis domain={[80, 100]} stroke="hsl(220, 16%, 14%)" fontSize={9} />
                    <Radar name="HDFC" dataKey="HDFC" stroke="hsl(48, 96%, 53%)" fill="hsl(48, 96%, 53%)" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="SBI" dataKey="SBI" stroke="hsl(210, 100%, 60%)" fill="hsl(210, 100%, 60%)" fillOpacity={0.1} strokeWidth={2} />
                    <Radar name="Axis" dataKey="Axis" stroke="hsl(142, 72%, 45%)" fill="hsl(142, 72%, 45%)" fillOpacity={0.1} strokeWidth={2} />
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
                  <AreaChart data={convergenceData.slice(0, Math.max(currentRound, 1))}>
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
                  <LineChart data={convergenceData.slice(0, Math.max(currentRound, 1))}>
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
                  {privacyMetrics.map((m) => (
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
                    {nodeHealth.map((node, i) => (
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
            {modelUpdates.map((update, i) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="shrink-0">{statusIcon[update.status]}</div>
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
