import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Building2,
  AlertTriangle,
  Network,
  BrainCircuit,
  Boxes,
  Settings,
  ArrowRight,
  FileText,
} from "lucide-react";
import SectionReveal from "@/components/shared/SectionReveal";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";
import { alerts, institutions, modelUpdates } from "@/data/mockData";

const quickActions = [
  {
    title: "Institution Governance",
    description: "Monitor trust scores, node health, and access posture.",
    to: "/admin",
    icon: Building2,
  },
  {
    title: "Federated Model Control",
    description: "Review global rounds, drift, and secure aggregation.",
    to: "/federated-learning",
    icon: BrainCircuit,
  },
  {
    title: "On-Chain Evidence Trail",
    description: "Track immutable fraud signature and contract events.",
    to: "/blockchain",
    icon: Boxes,
  },
  {
    title: "Policy and Security Settings",
    description: "Manage notifications, API keys, and control surfaces.",
    to: "/settings",
    icon: Settings,
  },
  {
    title: "Investigation Oversight",
    description: "Open high-risk case clusters and cross-case linking.",
    to: "/fraud-intelligence",
    icon: Shield,
  },
  {
    title: "High-Risk Transaction Queue",
    description: "Jump to blocked and flagged transaction streams.",
    to: "/transactions",
    icon: AlertTriangle,
  },
];

const governanceEvents = [
  "New institution node joined federated network.",
  "Critical threat advisory propagated to all member banks.",
  "Policy baseline updated for high-value transfer monitoring.",
  "Model update MU-005 rejected after quality validation.",
];

export default function AdminDashboard() {
  const activeInstitutions = institutions.filter((institution) => institution.status === "active").length;
  const totalNodes = institutions.reduce((sum, institution) => sum + institution.nodesCount, 0);
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const rejectedModels = modelUpdates.filter((update) => update.status === "rejected").length;
  const trustAverage = Math.round(
    institutions.reduce((sum, institution) => sum + institution.trustScore, 0) /
      Math.max(institutions.length, 1),
  );

  const trustTrend = institutions.map((institution, index) => ({
    label: `I${index + 1}`,
    value: institution.trustScore,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governance command center for institutions, risk controls, and policy execution
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          Privileged Access
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Governance Command Pulse"
          subtitle="Cross-institution trust posture, threat urgency, and model governance health"
          variant="governance"
          chartPlacement="right"
          metrics={[
            {
              label: "Institutions Active",
              value: `${activeInstitutions}/${institutions.length}`,
              hint: "members online",
              icon: Building2,
              tone: "success",
            },
            {
              label: "Trust Average",
              value: `${trustAverage}`,
              hint: "network trust index",
              icon: Network,
              tone: trustAverage >= 92 ? "success" : "warning",
            },
            {
              label: "Critical Alerts",
              value: `${criticalAlerts}`,
              hint: "priority incidents",
              icon: AlertTriangle,
              tone: criticalAlerts > 1 ? "destructive" : "warning",
            },
            {
              label: "Rejected Models",
              value: `${rejectedModels}`,
              hint: "federation quality checks",
              icon: BrainCircuit,
              tone: rejectedModels > 0 ? "warning" : "success",
            },
            {
              label: "Network Nodes",
              value: `${totalNodes}`,
              hint: "federated infrastructure",
              icon: Boxes,
              tone: "accent",
            },
          ]}
          chartData={trustTrend}
          chartLabel="Institution Trust"
          badges={[
            "Mode: GOVERNANCE",
            "Audit: ENFORCED",
            "Scope: ALL INSTITUTIONS",
          ]}
        />
      </SectionReveal>

      <SectionReveal>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quickActions.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-xl p-5 border border-border/70"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.description}</p>
              <Link
                to={item.to}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/90"
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
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Governance Briefing</h3>
          </div>
          <div className="space-y-2">
            {governanceEvents.map((event) => (
              <div key={event} className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                {event}
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
