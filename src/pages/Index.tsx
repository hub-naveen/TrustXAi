import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  BrainCircuit,
  Boxes,
  ArrowRight,
  Fingerprint,
  Bell,
  Network,
  ChevronRight,
  Radar,
  Activity,
  Wallet,
  Landmark,
} from "lucide-react";
import SectionReveal from "@/components/shared/SectionReveal";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const features = [
  {
    icon: Fingerprint,
    title: "Fraud DNA Engine",
    description: "Unique cryptographic fingerprints for every fraud pattern. Cross-institution matching in milliseconds.",
  },
  {
    icon: BrainCircuit,
    title: "Federated Learning",
    description: "Privacy-preserving AI that learns across institutions without exposing sensitive data.",
  },
  {
    icon: Bell,
    title: "Real-Time Alerts",
    description: "Sub-second detection and notification. Automated blocking with human-in-the-loop escalation.",
  },
  {
    icon: Boxes,
    title: "Blockchain Immutability",
    description: "Every fraud signature stored on-chain. Tamper-proof audit trail for regulatory compliance.",
  },
  {
    icon: Network,
    title: "Network Intelligence",
    description: "Graph-based analysis reveals hidden connections between accounts, entities, and transactions.",
  },
  {
    icon: Shield,
    title: "Zero-Knowledge Proofs",
    description: "Verify fraud patterns across institutions without revealing underlying transaction data.",
  },
];

const stats = [
  { value: "99.7%", label: "Detection Accuracy" },
  { value: "<200ms", label: "Response Time" },
  { value: "312", label: "Active Nodes" },
  { value: "₹4.2Cr", label: "Fraud Prevented Today" },
];

const readinessTrend = [
  { label: "W1", value: 78 },
  { label: "W2", value: 82 },
  { label: "W3", value: 86 },
  { label: "W4", value: 89 },
  { label: "W5", value: 92 },
  { label: "W6", value: 95 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold tracking-tight">TrustChain AI</span>
              <span className="text-[10px] text-muted-foreground ml-1">2.0</span>
            </div>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:brightness-110 active:scale-[0.97] transition-all duration-200"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Grid background */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">Kaasu Kaval AI Chain • Live Network</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]"
          >
            From Fraud Detection
            <br />
            <span className="text-gradient-primary">to Financial Immunity</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Privacy-preserving AI and blockchain intelligence working together
            to detect, predict, and prevent financial fraud in real-time
            across 312 institutional nodes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:brightness-110 active:scale-[0.97] transition-all duration-200 glow-primary"
            >
              Sign In to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-secondary active:scale-[0.97] transition-all duration-200"
            >
              Explore Features
              <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        {/* Animated flow visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-3xl mx-auto mt-20"
        >
          <div className="glass rounded-2xl p-8 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              {[
                { icon: BrainCircuit, label: "AI Detection", color: "text-primary" },
                { icon: Boxes, label: "Blockchain Log", color: "text-accent" },
                { icon: Network, label: "Network Intel", color: "text-success" },
              ].map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.15 }}
                  className="flex flex-col items-center gap-3 flex-1"
                >
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                    <step.icon className={`w-6 h-6 ${step.color}`} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
                </motion.div>
              ))}
            </div>
            {/* Connecting lines */}
            <div className="absolute top-1/2 left-[33%] right-[33%] h-px bg-border" />
            <motion.div
              className="absolute top-1/2 left-[33%] h-px bg-primary"
              initial={{ width: 0 }}
              animate={{ width: "34%" }}
              transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </section>

      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          <SectionReveal>
            <VisualMetricStrip
              title="Trust Network Readiness"
              subtitle="Operational confidence indicators across onboarding institutions and intelligence lanes"
              variant="landing"
              chartPlacement="left"
              metrics={[
                {
                  label: "Institutions Live",
                  value: "312",
                  hint: "connected member banks",
                  icon: Landmark,
                  tone: "primary",
                },
                {
                  label: "Alert Throughput",
                  value: "14.7k/day",
                  hint: "cross-node signal ingestion",
                  icon: Radar,
                  tone: "accent",
                },
                {
                  label: "Protected Value",
                  value: "₹4.2Cr",
                  hint: "daily blocked fraud attempts",
                  icon: Wallet,
                  tone: "success",
                },
                {
                  label: "Model Drift",
                  value: "1.8%",
                  hint: "within safe adaptation band",
                  icon: Activity,
                  tone: "warning",
                },
              ]}
              chartData={readinessTrend}
              chartLabel="Readiness Score"
              chartColor="hsl(48, 96%, 53%)"
              badges={[
                "State: LIVE NETWORK",
                "Coverage: PAN-INDIA",
                "Mode: FRAUD IMMUNITY",
              ]}
            />
          </SectionReveal>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <SectionReveal key={stat.label} delay={i * 0.08}>
              <div className="text-center">
                <p className="text-3xl font-black tracking-tight font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Intelligence at Every Layer
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                Six core capabilities working in concert to create a
                financial immune system.
              </p>
            </div>
          </SectionReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <SectionReveal key={feature.title} delay={i * 0.07}>
                <div className="glass rounded-xl p-6 h-full hover:border-primary/20 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <SectionReveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to See It in Action?
            </h2>
            <p className="text-muted-foreground mb-8">
              Explore the live dashboard with simulated real-time data from 312 institutional nodes.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:brightness-110 active:scale-[0.97] transition-all duration-200 glow-primary"
            >
              Launch Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </SectionReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">TrustChain AI 2.0 • Kaasu Kaval AI Chain</span>
          </div>
          <span className="text-xs text-muted-foreground">Enterprise Fintech Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
