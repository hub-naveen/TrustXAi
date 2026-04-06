import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Fingerprint,
  ArrowLeftRight,
  Boxes,
  BrainCircuit,
  ShieldAlert,
  Target,
  Activity,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import SectionReveal from "@/components/shared/SectionReveal";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";
import { alerts, fraudDNAs, transactions } from "@/data/mockData";

const analystActions = [
  {
    title: "Investigation Workbench",
    description: "Open layering trails, entity links, and case timelines.",
    to: "/fraud-intelligence",
    icon: Fingerprint,
  },
  {
    title: "Transaction Hunt",
    description: "Filter high-risk activity and trace suspicious velocity windows.",
    to: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Blockchain Trace",
    description: "Validate fraud DNA commits and chain confirmation status.",
    to: "/blockchain",
    icon: Boxes,
  },
  {
    title: "Federated Signals",
    description: "Track model convergence and privacy-preserving drift indicators.",
    to: "/federated-learning",
    icon: BrainCircuit,
  },
];

export default function AnalystDashboard() {
  const highRiskTx = transactions.filter((transaction) => transaction.riskScore >= 80).length;
  const blockedTx = transactions.filter((transaction) => transaction.status === "blocked").length;
  const activeAlerts = alerts.length;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const avgSimilarity = Math.round(
    fraudDNAs.reduce((sum, dna) => sum + dna.similarity, 0) / Math.max(fraudDNAs.length, 1),
  );

  const riskTrend = transactions
    .slice()
    .reverse()
    .slice(0, 10)
    .map((transaction, index) => ({
      label: `A${index + 1}`,
      value: transaction.riskScore,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analyst Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Investigation-first console for fraud detection, triage, and evidence linking
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">
          <Target className="w-3.5 h-3.5" />
          Active Investigation Mode
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Analyst Hunt Pulse"
          subtitle="Operational signal stack for case triage and suspicious flow prioritization"
          variant="investigation"
          chartPlacement="right"
          metrics={[
            {
              label: "High Risk TX",
              value: `${highRiskTx}`,
              hint: "risk >= 80",
              icon: ShieldAlert,
              tone: highRiskTx >= 3 ? "destructive" : "warning",
            },
            {
              label: "Blocked TX",
              value: `${blockedTx}`,
              hint: "automated intervention",
              icon: AlertTriangle,
              tone: blockedTx >= 2 ? "warning" : "primary",
            },
            {
              label: "Active Alerts",
              value: `${activeAlerts}`,
              hint: "pending analyst review",
              icon: Activity,
              tone: activeAlerts >= 4 ? "warning" : "primary",
            },
            {
              label: "Critical Alerts",
              value: `${criticalAlerts}`,
              hint: "priority now",
              icon: AlertTriangle,
              tone: criticalAlerts >= 1 ? "destructive" : "success",
            },
            {
              label: "DNA Similarity",
              value: `${avgSimilarity}%`,
              hint: "avg pattern confidence",
              icon: Fingerprint,
              tone: avgSimilarity >= 90 ? "success" : "warning",
            },
          ]}
          chartData={riskTrend}
          chartLabel="Risk Signal"
          badges={[
            "Role: ANALYST",
            "Scope: CASE TRIAGE",
            "Pipeline: LIVE FEED",
          ]}
        />
      </SectionReveal>

      <SectionReveal>
        <div className="grid md:grid-cols-2 gap-4">
          {analystActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="glass rounded-xl p-5 border border-border/70"
            >
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
                <action.icon className="w-4.5 h-4.5 text-warning" />
              </div>
              <h3 className="text-sm font-semibold">{action.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{action.description}</p>
              <Link
                to={action.to}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-warning hover:text-warning/90"
              >
                Open module
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5 border border-border/70">
          <h3 className="text-sm font-semibold mb-3">Priority Alert Queue</h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground">{alert.description}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    alert.severity === "critical"
                      ? "bg-destructive/15 text-destructive"
                      : alert.severity === "high"
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
