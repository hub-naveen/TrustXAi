import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  ArrowRight,
  ArrowLeftRight,
  Boxes,
  CheckCircle2,
  Building2,
  Activity,
} from "lucide-react";
import SectionReveal from "@/components/shared/SectionReveal";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";
import { blockchainEntries, transactions } from "@/data/mockData";

const quickViews = [
  {
    title: "Transaction Activity",
    description: "Browse live and historical transaction stream summaries.",
    to: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Blockchain Evidence",
    description: "Inspect immutable fraud ledger updates and confirmations.",
    to: "/blockchain",
    icon: Boxes,
  },
];

export default function ViewerDashboard() {
  const approvedTx = transactions.filter((transaction) => transaction.status === "approved").length;
  const approvedRate = Math.round((approvedTx / Math.max(transactions.length, 1)) * 100);
  const confirmedOnChain = blockchainEntries.filter((entry) => entry.status === "confirmed").length;
  const chainRate = Math.round((confirmedOnChain / Math.max(blockchainEntries.length, 1)) * 100);
  const trackedInstitutions = new Set(transactions.map((transaction) => transaction.institution)).size;
  const avgRisk = Math.round(
    transactions.reduce((sum, transaction) => sum + transaction.riskScore, 0) /
      Math.max(transactions.length, 1),
  );

  const confidenceTrend = transactions
    .slice()
    .reverse()
    .slice(0, 10)
    .map((transaction, index) => ({
      label: `V${index + 1}`,
      value: Math.max(0, 100 - transaction.riskScore),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Viewer Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only operational snapshot for cross-bank fraud monitoring
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
          <Eye className="w-3.5 h-3.5" />
          Read-Only Mode
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Executive Visibility Pulse"
          subtitle="Portfolio health indicators designed for observer and stakeholder monitoring"
          variant="landing"
          chartPlacement="left"
          metrics={[
            {
              label: "Approved Rate",
              value: `${approvedRate}%`,
              hint: "transaction approval ratio",
              icon: CheckCircle2,
              tone: approvedRate >= 70 ? "success" : "warning",
            },
            {
              label: "Chain Confirmation",
              value: `${chainRate}%`,
              hint: "on-chain event finality",
              icon: Boxes,
              tone: chainRate >= 80 ? "success" : "warning",
            },
            {
              label: "Institutions Tracked",
              value: `${trackedInstitutions}`,
              hint: "active sources in feed",
              icon: Building2,
              tone: "accent",
            },
            {
              label: "Average Risk",
              value: `${avgRisk}`,
              hint: "current transaction baseline",
              icon: Activity,
              tone: avgRisk >= 60 ? "warning" : "primary",
            },
          ]}
          chartData={confidenceTrend}
          chartLabel="Confidence Trend"
          badges={[
            "Access: VIEW ONLY",
            "Data: LIVE SNAPSHOT",
            "Export: RESTRICTED",
          ]}
        />
      </SectionReveal>

      <SectionReveal>
        <div className="grid md:grid-cols-2 gap-4">
          {quickViews.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass rounded-xl p-5 border border-border/70"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <item.icon className="w-4.5 h-4.5 text-accent" />
              </div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.description}</p>
              <Link
                to={item.to}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/90"
              >
                Open view
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-5 border border-border/70">
          <h3 className="text-sm font-semibold mb-3">Latest Read-Only Highlights</h3>
          <div className="space-y-2">
            {transactions.slice(0, 4).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium">{transaction.id}</p>
                  <p className="text-[11px] text-muted-foreground">{transaction.from} to {transaction.to}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">Rs {transaction.amount.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Risk {transaction.riskScore}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
