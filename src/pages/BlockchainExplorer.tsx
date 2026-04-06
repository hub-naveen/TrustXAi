import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes, CheckCircle, Clock, Hash, Search, Copy, ExternalLink, Cpu, Database,
  Shield, Activity, Radio, X, ChevronRight, Server,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import { blockchainEntries, type BlockchainEntry } from "@/data/mockData";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const actionColor: Record<string, string> = {
  STORE_FRAUD_DNA: "bg-primary/10 text-primary",
  FLAG_TRANSACTION: "bg-destructive/10 text-destructive",
  UPDATE_RISK_SCORE: "bg-warning/10 text-warning",
  SMART_CONTRACT_EXEC: "bg-accent/10 text-accent",
};

const actionIcon: Record<string, any> = {
  STORE_FRAUD_DNA: Database,
  FLAG_TRANSACTION: Shield,
  UPDATE_RISK_SCORE: Activity,
  SMART_CONTRACT_EXEC: Cpu,
};

const gasHistory = [
  { block: "18.84M", gas: 42000 },
  { block: "18.84M", gas: 48000 },
  { block: "18.84M", gas: 52100 },
  { block: "18.85M", gas: 38000 },
  { block: "18.85M", gas: 68400 },
  { block: "18.85M", gas: 47832 },
  { block: "18.85M", gas: 31200 },
];

const smartContracts = [
  { name: "FraudDNARegistry.sol", address: "0x742d...35Cc", calls: 2847, status: "active" },
  { name: "RiskOracle.sol", address: "0x1f9a...8bD2", calls: 12340, status: "active" },
  { name: "ComplianceGate.sol", address: "0x3e7c...4aF1", calls: 5621, status: "active" },
  { name: "AlertDispatcher.sol", address: "0x8b2d...9cE3", calls: 891, status: "paused" },
];

// Generate live chain events
let eventCounter = 100;
function randomEvent(): BlockchainEntry {
  eventCounter++;
  const actions = ["STORE_FRAUD_DNA", "FLAG_TRANSACTION", "UPDATE_RISK_SCORE", "SMART_CONTRACT_EXEC"];
  const action = actions[Math.floor(Math.random() * actions.length)];
  return {
    txHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`,
    blockNumber: 18847291 + eventCounter,
    timestamp: new Date().toISOString(),
    action,
    fraudDnaHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    status: Math.random() > 0.15 ? "confirmed" : "pending",
    gasUsed: Math.floor(25000 + Math.random() * 50000),
  };
}

export default function BlockchainExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<BlockchainEntry | null>(null);
  const [liveEntries, setLiveEntries] = useState<BlockchainEntry[]>(blockchainEntries);
  const [isLive, setIsLive] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "contracts" | "analytics">("activity");

  const totalBlocks = useAnimatedCounter(18847291, 2000);
  const fraudSigs = useAnimatedCounter(2847, 1500, 200);
  const avgConfirm = useAnimatedCounter(124, 1200, 300);
  const totalGas = useAnimatedCounter(248, 1000, 400);

  // Live chain activity
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      setLiveEntries(prev => [randomEvent(), ...prev].slice(0, 20));
    }, 5000);
    return () => clearInterval(id);
  }, [isLive]);

  const filteredEntries = liveEntries.filter(e =>
    searchQuery === "" ||
    e.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.fraudDnaHash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const confirmedCount = filteredEntries.filter((entry) => entry.status === "confirmed").length;
  const pendingCount = filteredEntries.filter((entry) => entry.status === "pending").length;
  const confirmationRate = filteredEntries.length
    ? Math.round((confirmedCount / filteredEntries.length) * 100)
    : 0;
  const avgGasLive = Math.round(
    filteredEntries.reduce((sum, entry) => sum + entry.gasUsed, 0) / Math.max(filteredEntries.length, 1),
  );
  const activeContractCount = smartContracts.filter((contract) => contract.status === "active").length;

  const gasPulseData = filteredEntries
    .slice(0, 12)
    .reverse()
    .map((entry, index) => ({
      label: `B${index + 1}`,
      value: Math.round(entry.gasUsed / 1000),
    }));

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blockchain Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">On-chain fraud signatures, smart contracts, and chain analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
          <span className="text-xs font-mono text-muted-foreground">{isLive ? "SYNCING" : "PAUSED"}</span>
          <button onClick={() => setIsLive(p => !p)} className="ml-1 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors">
            {isLive ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Chain Integrity Pulse"
          subtitle="On-chain validation metrics for fraud signature anchoring and contract execution health"
          variant="chain"
          chartPlacement="right"
          metrics={[
            {
              label: "Confirmation Rate",
              value: `${confirmationRate}%`,
              hint: "filtered chain events",
              icon: CheckCircle,
              tone: confirmationRate >= 85 ? "success" : "warning",
            },
            {
              label: "Pending Queue",
              value: `${pendingCount}`,
              hint: "awaiting confirmations",
              icon: Clock,
              tone: pendingCount > 4 ? "warning" : "primary",
            },
            {
              label: "Avg Gas",
              value: `${avgGasLive.toLocaleString()}`,
              hint: "gas used per event",
              icon: Cpu,
              tone: avgGasLive > 50000 ? "destructive" : "accent",
            },
            {
              label: "Active Contracts",
              value: `${activeContractCount}/${smartContracts.length}`,
              hint: "deployed policy contracts",
              icon: Server,
              tone: "primary",
            },
          ]}
          chartData={gasPulseData}
          chartLabel="Gas (k)"
          chartColor="hsl(210, 100%, 60%)"
          badges={[
            isLive ? "Chain Sync: LIVE" : "Chain Sync: PAUSED",
            `Confirmed: ${confirmedCount}`,
            `Filtered Events: ${filteredEntries.length}`,
          ]}
        />
      </SectionReveal>

      {/* Stats */}
      <SectionReveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Blocks", value: totalBlocks.toLocaleString(), icon: Boxes, color: "text-primary" },
            { label: "Fraud Signatures", value: fraudSigs.toLocaleString(), icon: Hash, color: "text-destructive" },
            { label: "Avg Confirm", value: `${(avgConfirm / 10).toFixed(1)}s`, icon: Clock, color: "text-warning" },
            { label: "Total Gas (M)", value: `${(totalGas / 10).toFixed(1)}M`, icon: Cpu, color: "text-accent" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="glass rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold font-mono">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      {/* Search */}
      <SectionReveal delay={0.05}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by tx hash, action, or fraud DNA hash..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" />
        </div>
      </SectionReveal>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary w-fit">
        {[
          { key: "activity" as const, label: "Chain Activity", icon: Activity },
          { key: "contracts" as const, label: "Smart Contracts", icon: Cpu },
          { key: "analytics" as const, label: "Analytics", icon: Boxes },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "activity" && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SectionReveal delay={0.1}>
              <div className="glass rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${isLive ? "text-success animate-pulse" : "text-muted-foreground"}`} />
                    <h3 className="text-sm font-semibold">Live Chain Activity</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{filteredEntries.length} entries</span>
                </div>
                <AnimatePresence initial={false}>
                  {filteredEntries.map((entry) => {
                    const ActionIcon = actionIcon[entry.action] || Boxes;
                    return (
                      <motion.div key={entry.txHash}
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <div className="shrink-0">
                          {entry.status === "confirmed" ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <Clock className="w-4 h-4 text-warning animate-pulse" />
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <ActionIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${actionColor[entry.action] || "bg-muted text-muted-foreground"}`}>
                              {entry.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Block #{entry.blockNumber.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-mono text-muted-foreground truncate">{entry.txHash}</p>
                            <button onClick={(e) => { e.stopPropagation(); copyHash(entry.txHash); }}
                              className="p-0.5 rounded hover:bg-secondary shrink-0">
                              <Copy className={`w-3 h-3 ${copiedHash === entry.txHash ? "text-success" : "text-muted-foreground"}`} />
                            </button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono">{entry.gasUsed.toLocaleString()} gas</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{entry.fraudDnaHash}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </SectionReveal>
          </motion.div>
        )}

        {activeTab === "contracts" && (
          <motion.div key="contracts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Deployed Smart Contracts</h3>
              <div className="space-y-3">
                {smartContracts.map((sc, i) => (
                  <motion.div key={sc.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Cpu className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold">{sc.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          sc.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}>{sc.status}</span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{sc.address}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono">{sc.calls.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">total calls</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Contract interaction log */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Recent Contract Interactions</h3>
              <div className="space-y-2 font-mono text-xs">
                {[
                  { fn: "storeFraudDNA(bytes32,uint256)", contract: "FraudDNARegistry", gas: "47,832", time: "2s ago" },
                  { fn: "updateRiskScore(address,uint8)", contract: "RiskOracle", gas: "31,200", time: "18s ago" },
                  { fn: "flagTransaction(bytes32)", contract: "ComplianceGate", gas: "52,100", time: "45s ago" },
                  { fn: "executeAlert(uint256,bytes)", contract: "AlertDispatcher", gas: "68,400", time: "1m ago" },
                  { fn: "verifySignature(bytes32,bytes)", contract: "FraudDNARegistry", gas: "28,900", time: "2m ago" },
                ].map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className="p-3 rounded-lg bg-secondary/50 flex items-center gap-3">
                    <span className="text-primary shrink-0">→</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">{log.fn}</p>
                      <p className="text-muted-foreground text-[10px]">{log.contract} • {log.gas} gas</p>
                    </div>
                    <span className="text-muted-foreground text-[10px] shrink-0">{log.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Gas Usage Over Time</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={gasHistory}>
                  <defs>
                    <linearGradient id="gradGas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 100%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(210, 100%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                  <XAxis dataKey="block" stroke="hsl(220, 10%, 50%)" fontSize={11} />
                  <YAxis stroke="hsl(220, 10%, 50%)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="gas" stroke="hsl(210, 100%, 60%)" strokeWidth={2} fill="url(#gradGas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Chain Health</h3>
                <div className="space-y-4">
                  {[
                    { label: "Block Time", value: "12.4s", status: "normal" },
                    { label: "Pending Txns", value: "3", status: "normal" },
                    { label: "Network Load", value: "67%", status: "moderate" },
                    { label: "Node Uptime", value: "99.97%", status: "normal" },
                    { label: "Consensus", value: "PoA", status: "normal" },
                  ].map((m, i) => (
                    <motion.div key={m.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                      className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold">{m.value}</span>
                        <div className={`w-2 h-2 rounded-full ${m.status === "normal" ? "bg-success" : "bg-warning"}`} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Action Distribution</h3>
                <div className="space-y-3">
                  {[
                    { action: "STORE_FRAUD_DNA", pct: 42 },
                    { action: "FLAG_TRANSACTION", pct: 28 },
                    { action: "UPDATE_RISK_SCORE", pct: 18 },
                    { action: "SMART_CONTRACT_EXEC", pct: 12 },
                  ].map((a, i) => (
                    <motion.div key={a.action} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${actionColor[a.action]}`}>{a.action}</span>
                        <span className="text-xs font-mono">{a.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }} animate={{ width: `${a.pct}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50" onClick={() => setSelectedEntry(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 top-[12%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-50 bg-card border border-border rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold">Block #{selectedEntry.blockNumber.toLocaleString()}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-muted-foreground font-mono">{selectedEntry.txHash}</p>
                    <button onClick={() => copyHash(selectedEntry.txHash)} className="p-0.5 rounded hover:bg-secondary">
                      <Copy className={`w-3 h-3 ${copiedHash === selectedEntry.txHash ? "text-success" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3">
                {[
                  ["Action", selectedEntry.action],
                  ["Status", selectedEntry.status.toUpperCase()],
                  ["Gas Used", `${selectedEntry.gasUsed.toLocaleString()} gas`],
                  ["Fraud DNA", selectedEntry.fraudDnaHash],
                  ["Timestamp", new Date(selectedEntry.timestamp).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono font-medium text-right">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 rounded-xl bg-secondary/50 font-mono text-[11px] text-muted-foreground space-y-1">
                <p className="text-foreground font-semibold text-xs mb-2">Transaction Receipt</p>
                <p>blockHash: 0x{Math.random().toString(16).slice(2, 18)}...</p>
                <p>from: 0x742d...35Cc (FraudDNARegistry)</p>
                <p>to: 0x{Math.random().toString(16).slice(2, 6)}...{Math.random().toString(16).slice(2, 6)}</p>
                <p>gasPrice: 20 Gwei</p>
                <p>nonce: {Math.floor(Math.random() * 1000)}</p>
                <p>status: {selectedEntry.status === "confirmed" ? "✓ Success" : "⏳ Pending"}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
