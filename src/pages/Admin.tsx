import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Building2, Wifi, WifiOff, Users, Activity, AlertTriangle,
  Clock, Globe, Server, FileText, Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { institutions } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const trustColor = (score: number) => {
  if (score >= 95) return "text-success";
  if (score >= 90) return "text-primary";
  return "text-warning";
};

const auditLogs = [
  { id: 1, user: "admin@rbi.gov.in", action: "Modified RLS policy", target: "fraud_reports", timestamp: "2024-03-15T14:23:00Z", severity: "high" },
  { id: 2, user: "analyst@sbi.co.in", action: "Exported transaction data", target: "transactions", timestamp: "2024-03-15T14:18:00Z", severity: "medium" },
  { id: 3, user: "admin@rbi.gov.in", action: "Added new institution node", target: "Federal Bank", timestamp: "2024-03-15T13:45:00Z", severity: "low" },
  { id: 4, user: "system", action: "Automated model retrain triggered", target: "FedAvg v3.2.1", timestamp: "2024-03-15T12:00:00Z", severity: "low" },
  { id: 5, user: "admin@rbi.gov.in", action: "Revoked API key", target: "tc_live_old_key", timestamp: "2024-03-15T10:30:00Z", severity: "high" },
  { id: 6, user: "viewer@hdfc.com", action: "Accessed fraud intelligence", target: "Dashboard", timestamp: "2024-03-15T09:15:00Z", severity: "low" },
  { id: 7, user: "system", action: "Blockchain sync completed", target: "Block #18847291", timestamp: "2024-03-15T08:00:00Z", severity: "low" },
  { id: 8, user: "analyst@sbi.co.in", action: "Flagged suspicious transaction", target: "TXN-8302", timestamp: "2024-03-14T22:30:00Z", severity: "high" },
];

const severityBadge: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

const roleDistribution = [
  { name: "Admin", value: 3, fill: "hsl(48, 96%, 53%)" },
  { name: "Analyst", value: 12, fill: "hsl(210, 100%, 60%)" },
  { name: "Viewer", value: 28, fill: "hsl(142, 72%, 45%)" },
  { name: "Auditor", value: 5, fill: "hsl(38, 92%, 50%)" },
];

const threatFeed = [
  { id: 1, type: "Phishing Campaign", source: "CERT-In", severity: "critical", time: "2m ago", desc: "New phishing kit targeting UPI payment flows" },
  { id: 2, type: "Ransomware Alert", source: "FS-ISAC", severity: "high", time: "15m ago", desc: "LockBit variant targeting banking SWIFT endpoints" },
  { id: 3, type: "Data Breach", source: "DarkWeb Monitor", severity: "high", time: "1h ago", desc: "Credential dump containing 50K Indian bank accounts" },
  { id: 4, type: "Zero-Day Exploit", source: "NVD", severity: "critical", time: "3h ago", desc: "CVE-2024-XXXX: RCE in common banking middleware" },
  { id: 5, type: "Bot Network", source: "Honeypot", severity: "medium", time: "5h ago", desc: "Automated account creation attempts detected" },
];

const systemMetrics = [
  { label: "API Requests/min", value: "12,847", trend: "+8%", icon: Activity },
  { label: "Active Sessions", value: "43", trend: "+2", icon: Users },
  { label: "Avg Latency", value: "142ms", trend: "-12ms", icon: Clock },
  { label: "Uptime", value: "99.97%", trend: "30d", icon: Server },
];

export default function Admin() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInst, setExpandedInst] = useState<string | null>(null);
  const [liveAlertCount, setLiveAlertCount] = useState(threatFeed.length);

  const activeInstitutionCount = institutions.filter((inst) => inst.status === "active").length;
  const averageTrust = Math.round(
    institutions.reduce((sum, inst) => sum + inst.trustScore, 0) / Math.max(institutions.length, 1),
  );
  const highSeverityAudits = auditLogs.filter((log) => log.severity === "high").length;
  const criticalThreatCount = threatFeed.filter((threat) => threat.severity === "critical").length;
  const totalInstitutionNodes = institutions.reduce((sum, inst) => sum + inst.nodesCount, 0);

  const governanceTrend = auditLogs
    .slice(0, 10)
    .reverse()
    .map((log, index) => ({
      label: `E${index + 1}`,
      value: log.severity === "high" ? 95 : log.severity === "medium" ? 72 : 48,
    }));

  useEffect(() => {
    const id = setInterval(() => {
      setLiveAlertCount((c) => c + (Math.random() > 0.7 ? 1 : 0));
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage institutional nodes, users, and access control</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Globe className="w-4 h-4 text-primary" />
          Logged in as <span className="text-primary font-semibold">{user?.role}</span>
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Governance Pulse"
          subtitle="Administrative visibility across institutions, audits, and live threat pressure"
          variant="governance"
          chartPlacement="right"
          metrics={[
            {
              label: "Active Institutions",
              value: `${activeInstitutionCount}/${institutions.length}`,
              hint: "federated institutions online",
              icon: Building2,
              tone: "success",
            },
            {
              label: "Average Trust",
              value: `${averageTrust}`,
              hint: "institution trust baseline",
              icon: Shield,
              tone: averageTrust >= 92 ? "success" : "warning",
            },
            {
              label: "High Audit Events",
              value: `${highSeverityAudits}`,
              hint: "high severity log actions",
              icon: FileText,
              tone: highSeverityAudits > 4 ? "destructive" : "warning",
            },
            {
              label: "Critical Threats",
              value: `${criticalThreatCount}`,
              hint: "current threat feed",
              icon: AlertTriangle,
              tone: criticalThreatCount > 1 ? "destructive" : "warning",
            },
            {
              label: "Total Nodes",
              value: `${totalInstitutionNodes}`,
              hint: "institution infrastructure",
              icon: Server,
              tone: "accent",
            },
          ]}
          chartData={governanceTrend}
          chartLabel="Severity Signal"
          chartColor="hsl(0, 72%, 51%)"
          badges={[
            `Live Alerts: ${liveAlertCount}`,
            "RLS Enforcement: ACTIVE",
            "Audit Trail: IMMUTABLE",
          ]}
        />
      </SectionReveal>

      {/* System Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass rounded-xl p-4 group hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <m.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] text-success font-mono">{m.trend}</span>
            </div>
            <p className="text-xl font-bold font-mono">{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="institutions" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="institutions">Institutions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="threats">Threat Intel</TabsTrigger>
          <TabsTrigger value="roles">Access Control</TabsTrigger>
        </TabsList>

        {/* Institutions Tab */}
        <TabsContent value="institutions">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {institutions.map((inst, i) => (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-xl p-5 hover:border-primary/20 transition-colors duration-300 group cursor-pointer"
                onClick={() => setExpandedInst(expandedInst === inst.id ? null : inst.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{inst.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{inst.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inst.status === "active" ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                    {expandedInst === inst.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Trust Score</span>
                    <span className={`font-mono font-bold ${trustColor(inst.trustScore)}`}>{inst.trustScore}</span>
                  </div>
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${inst.trustScore}%` }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Nodes</span>
                    <span className="font-mono">{inst.nodesCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span className="font-mono text-[10px]">{new Date(inst.lastSync).toLocaleTimeString()}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedInst === inst.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border space-y-2"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">API Calls (24h)</span>
                        <span className="font-mono">{(Math.floor(Math.random() * 50000) + 10000).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Fraud Reports</span>
                        <span className="font-mono">{Math.floor(Math.random() * 200) + 50}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Model Version</span>
                        <span className="font-mono text-primary">v3.2.1</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Compliance</span>
                        <span className="font-mono text-success">RBI DPSS Compliant</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Smart Contract Permissions */}
          <SectionReveal delay={0.15}>
            <div className="glass rounded-xl p-5 mt-4">
              <h3 className="text-sm font-semibold mb-4">Smart Contract Permissions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Institution", "Read", "Write", "Flag", "Admin"].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.map((inst) => (
                      <tr key={inst.id} className="border-b border-border/50">
                        <td className="px-4 py-3 text-xs font-medium">{inst.name}</td>
                        {[true, true, inst.trustScore >= 92, inst.type === "Regulator"].map((perm, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className={`w-3 h-3 rounded-full ${perm ? "bg-success" : "bg-secondary"}`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionReveal>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <SectionReveal>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">System Audit Log</h3>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs bg-secondary/50 border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filteredLogs.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${severityBadge[log.severity]}`}>
                      {log.severity.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{log.user} → {log.target}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </TabsContent>

        {/* Threat Intel Tab */}
        <TabsContent value="threats">
          <SectionReveal>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h3 className="text-sm font-semibold">Live Threat Intelligence Feed</h3>
                </div>
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono font-bold"
                >
                  {liveAlertCount} active
                </motion.span>
              </div>
              <div className="space-y-3">
                {threatFeed.map((threat, i) => (
                  <motion.div
                    key={threat.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`p-4 rounded-lg border-l-2 ${
                      threat.severity === "critical" ? "border-l-destructive bg-destructive/5" : threat.severity === "high" ? "border-l-warning bg-warning/5" : "border-l-muted-foreground bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold">{threat.type}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          threat.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                        }`}>{threat.severity.toUpperCase()}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{threat.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{threat.desc}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">Source: {threat.source}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="roles">
          <div className="grid lg:grid-cols-2 gap-4">
            <SectionReveal>
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Role Distribution</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                      {roleDistribution.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {roleDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-mono font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Role Permissions Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Permission", "Admin", "Analyst", "Viewer", "Auditor"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["View Dashboard", true, true, true, true],
                        ["View Transactions", true, true, true, true],
                        ["Flag Transactions", true, true, false, false],
                        ["Export Data", true, true, false, true],
                        ["Manage Users", true, false, false, false],
                        ["Manage API Keys", true, false, false, false],
                        ["View Audit Logs", true, false, false, true],
                        ["Modify RLS Policies", true, false, false, false],
                      ].map(([perm, ...roles], i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-3 py-2.5 text-[11px] font-medium">{perm as string}</td>
                          {(roles as boolean[]).map((r, j) => (
                            <td key={j} className="px-3 py-2.5">
                              <div className={`w-3 h-3 rounded-full ${r ? "bg-success" : "bg-secondary"}`} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionReveal>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
