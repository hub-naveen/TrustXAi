import { useState, useEffect } from "react";
import {
  ShieldAlert, TrendingDown, Activity, Zap, AlertTriangle, Radio, Pause, Play,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import SectionReveal from "@/components/shared/SectionReveal";
import FraudHeatmap from "@/components/dashboard/FraudHeatmap";
import { transactions, alerts, fraudTrendData, riskDistribution } from "@/data/mockData";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import AnomalyPulse from "@/components/dashboard/AnomalyPulse";
import ThreatPredictor from "@/components/dashboard/ThreatPredictor";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const riskColor = (score: number) =>
  score >= 80 ? "text-destructive" : score >= 50 ? "text-warning" : "text-success";

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-success/10 text-success",
    blocked: "bg-destructive/10 text-destructive",
    flagged: "bg-warning/10 text-warning",
    pending: "bg-muted text-muted-foreground",
  };
  return map[status] || map.pending;
};

const severityColor: Record<string, string> = {
  critical: "border-l-destructive bg-destructive/5",
  high: "border-l-warning bg-warning/5",
  medium: "border-l-accent bg-accent/5",
  low: "border-l-muted-foreground bg-muted/50",
};

function AnimatedStat({ icon: Icon, label, targetValue, displayValue, change, changeType = "neutral", delay = 0 }: {
  icon: any; label: string; targetValue: number; displayValue: (v: number) => string; change: string; changeType?: string; delay?: number;
}) {
  const count = useAnimatedCounter(targetValue, 1800, delay * 1000);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-xl p-5 hover:border-primary/20 transition-colors duration-300 group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight font-mono">{displayValue(count)}</p>
      <p className={`text-xs mt-1 font-medium ${
        changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground"
      }`}>{change}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { liveTxs, isLive, toggleLive } = useLiveTransactions(transactions, 3500);

  const liveRiskAverage = Math.round(
    liveTxs.reduce((total, tx) => total + tx.riskScore, 0) / Math.max(liveTxs.length, 1),
  );
  const liveBlockedCount = liveTxs.filter((tx) => tx.status === "blocked").length;
  const liveHighRiskCount = liveTxs.filter((tx) => tx.riskScore >= 80).length;
  const avgTicketSize = Math.round(
    liveTxs.reduce((total, tx) => total + tx.amount, 0) / Math.max(liveTxs.length, 1),
  );

  const pulseTrend = liveTxs.slice(0, 10).reverse().map((tx, index) => ({
    label: `T${index + 1}`,
    value: tx.riskScore,
  }));

  // Animated alert count
  const [alertPulse, setAlertPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { setAlertPulse(true); setTimeout(() => setAlertPulse(false), 600); }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analyst Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time investigation and fraud intelligence workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
          <span className="text-xs font-mono text-muted-foreground">{isLive ? "LIVE" : "PAUSED"}</span>
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Live Operations Pulse"
          subtitle="High-frequency platform telemetry for fraud response and transaction surveillance"
          variant="pulse"
          chartPlacement="right"
          metrics={[
            {
              label: "Live Risk Avg",
              value: `${liveRiskAverage}`,
              hint: "last 10 streamed txns",
              icon: Activity,
              tone: liveRiskAverage >= 75 ? "warning" : "primary",
            },
            {
              label: "Blocked In Feed",
              value: `${liveBlockedCount}`,
              hint: "active rolling window",
              icon: ShieldAlert,
              tone: liveBlockedCount > 4 ? "destructive" : "success",
            },
            {
              label: "High Risk Active",
              value: `${liveHighRiskCount}`,
              hint: "risk score >= 80",
              icon: AlertTriangle,
              tone: liveHighRiskCount > 5 ? "destructive" : "warning",
            },
            {
              label: "Avg Ticket",
              value: `Rs ${avgTicketSize.toLocaleString()}`,
              hint: "real-time ticket size",
              icon: Zap,
              tone: "accent",
            },
          ]}
          chartData={pulseTrend}
          chartLabel="Risk Volatility"
          chartColor="hsl(210, 100%, 60%)"
          badges={[
            isLive ? "Stream Status: LIVE" : "Stream Status: PAUSED",
            `Alerts Open: ${alerts.length}`,
            "Model v3.2.1",
          ]}
        />
      </SectionReveal>

      {/* Animated Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStat icon={ShieldAlert} label="Threats Blocked" targetValue={311} displayValue={(v) => v.toLocaleString()} change="+23 today" changeType="positive" delay={0} />
        <AnimatedStat icon={TrendingDown} label="Loss Prevented" targetValue={42} displayValue={(v) => `₹${v / 10}Cr`} change="+18% vs last week" changeType="positive" delay={0.08} />
        <AnimatedStat icon={Activity} label="Active Monitors" targetValue={1847} displayValue={(v) => v.toLocaleString()} change="All systems nominal" changeType="neutral" delay={0.16} />
        <AnimatedStat icon={Zap} label="Avg Response" targetValue={187} displayValue={(v) => `${v}ms`} change="-12ms improvement" changeType="positive" delay={0.24} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionReveal className="lg:col-span-2">
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Fraud Detection Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={fraudTrendData}>
                <defs>
                  <linearGradient id="gradDetected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                <XAxis dataKey="date" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <YAxis stroke="hsl(220, 10%, 50%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="detected" stroke="hsl(48, 96%, 53%)" strokeWidth={2} fill="url(#gradDetected)" />
                <Area type="monotone" dataKey="blocked" stroke="hsl(142, 72%, 45%)" strokeWidth={2} fill="url(#gradBlocked)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.1}>
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
                  {riskDistribution.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {riskDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>
      </div>

      {/* AI Insights Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionReveal delay={0.12}>
          <ThreatPredictor />
        </SectionReveal>
        <SectionReveal delay={0.15}>
          <AnomalyPulse />
        </SectionReveal>
      </div>

      {/* Fraud Heatmap */}
      <SectionReveal delay={0.18}>
        <FraudHeatmap />
      </SectionReveal>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Live Transaction feed */}
        <SectionReveal className="lg:col-span-3">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${isLive ? "text-success animate-pulse" : "text-muted-foreground"}`} />
                <h3 className="text-sm font-semibold">Live Transaction Feed</h3>
              </div>
              <button onClick={toggleLive} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors">
                {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isLive ? "Pause" : "Resume"}
              </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <AnimatePresence initial={false}>
                {liveTxs.map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className={`text-xs font-mono font-bold w-16 ${riskColor(tx.riskScore)}`}>
                      {tx.riskScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{tx.from} → {tx.to}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{tx.id} • {tx.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold">₹{tx.amount.toLocaleString()}</p>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </SectionReveal>

        {/* Alerts panel */}
        <SectionReveal className="lg:col-span-2" delay={0.1}>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold">Active Alerts</h3>
              </div>
              <motion.span
                animate={alertPulse ? { scale: [1, 1.2, 1] } : {}}
                className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono font-bold"
              >
                {alerts.length}
              </motion.span>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {alerts.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className={`p-3 rounded-lg border-l-2 ${severityColor[alert.severity]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold">{alert.title}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{alert.severity.toUpperCase()}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{alert.description}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-2">{alert.transactionId}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </SectionReveal>
      </div>
    </div>
  );
}
