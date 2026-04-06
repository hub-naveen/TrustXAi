import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, X, ExternalLink, Download, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, ShieldAlert, Clock, CheckCircle2, RotateCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import SectionReveal from "@/components/shared/SectionReveal";
import { useAuth } from "@/contexts/AuthContext";
import { transactions, type Transaction } from "@/data/mockData";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import AccountRiskScorePanel from "@/components/transactions/AccountRiskScorePanel";
import MoneyFlowVisualizer from "@/components/transactions/MoneyFlowVisualizer";
import { computeAccountRiskScores } from "@/lib/accountRiskScoring";
import {
  fetchAllTransactions,
  fetchTransactionMetrics,
  type BackendTransaction,
  type BackendTransactionMetrics,
} from "@/lib/backendApi";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const riskColor = (s: number) => s >= 80 ? "text-destructive" : s >= 50 ? "text-warning" : "text-success";
const riskBg = (s: number) => s >= 80 ? "bg-destructive" : s >= 50 ? "bg-warning" : "bg-success";
const statusBadge: Record<string, string> = {
  approved: "bg-success/10 text-success",
  blocked: "bg-destructive/10 text-destructive",
  flagged: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 5;

// Extended transactions for pagination demo
const extendedTxs: Transaction[] = [
  ...transactions,
  { id: "TXN-8304", from: "IndusInd ****6612", to: "Merchant #9982", amount: 8900, currency: "INR", timestamp: "2024-03-15T13:50:00Z", riskScore: 15, status: "approved", type: "POS Payment", institution: "IndusInd Bank" },
  { id: "TXN-8305", from: "Federal ****3378", to: "Government Tax", amount: 125000, currency: "INR", timestamp: "2024-03-15T13:45:00Z", riskScore: 2, status: "approved", type: "NEFT", institution: "Federal Bank" },
  { id: "TXN-8306", from: "Axis Bank ****7741", to: "Layered Account #1", amount: 340000, currency: "INR", timestamp: "2024-03-15T13:40:00Z", riskScore: 88, status: "blocked", type: "Wire Transfer", institution: "Axis Bank" },
  { id: "TXN-8307", from: "SBI ****4492", to: "Medical Insurance", amount: 67000, currency: "INR", timestamp: "2024-03-15T13:35:00Z", riskScore: 4, status: "approved", type: "Auto-Debit", institution: "SBI" },
  { id: "TXN-8308", from: "HDFC ****8829", to: "Crypto Mixer", amount: 920000, currency: "INR", timestamp: "2024-03-15T13:30:00Z", riskScore: 96, status: "blocked", type: "Online Transfer", institution: "HDFC Bank" },
  { id: "TXN-8309", from: "Layered Account #1", to: "Offshore Account", amount: 310000, currency: "INR", timestamp: "2024-03-15T13:28:00Z", riskScore: 93, status: "flagged", type: "Layer Transfer", institution: "Axis Bank" },
  { id: "TXN-8310", from: "Offshore Account", to: "Crypto Mixer", amount: 295000, currency: "INR", timestamp: "2024-03-15T13:24:00Z", riskScore: 95, status: "blocked", type: "Offshore Relay", institution: "External Network" },
  { id: "TXN-8311", from: "Crypto Mixer", to: "Unknown Wallet 0xF3..a9", amount: 280000, currency: "INR", timestamp: "2024-03-15T13:20:00Z", riskScore: 98, status: "blocked", type: "Crypto Bridge", institution: "External Network" },
  { id: "TXN-8312", from: "Multiple Recipients", to: "Layered Account #1", amount: 240000, currency: "INR", timestamp: "2024-03-15T13:16:00Z", riskScore: 82, status: "flagged", type: "Bulk Settlement", institution: "Axis Bank" },
];

type SortField = "riskScore" | "amount" | "timestamp";
type SortDir = "asc" | "desc";

const normalizeStatus = (status: string): Transaction["status"] => {
  if (status === "approved" || status === "blocked" || status === "flagged" || status === "pending") {
    return status;
  }
  return "flagged";
};

const mapBackendTransaction = (row: BackendTransaction): Transaction => ({
  id: row.id,
  from: row.from_account,
  to: row.to_account,
  amount: row.amount,
  currency: row.currency,
  timestamp: row.timestamp,
  riskScore: row.risk_score,
  status: normalizeStatus(row.status),
  type: row.type,
  institution: row.institution,
});

export default function Transactions() {
  const { authToken } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [backendRows, setBackendRows] = useState<Transaction[] | null>(null);
  const [backendMetrics, setBackendMetrics] = useState<BackendTransactionMetrics | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const syncBackendData = useCallback(async () => {
    if (!authToken) {
      setBackendRows(null);
      setBackendMetrics(null);
      setSyncMessage("Backend auth token unavailable. Showing local demo dataset.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage("Syncing transactions from MongoDB...");

    try {
      const [rows, metrics] = await Promise.all([
        fetchAllTransactions({
          sortBy: "timestamp",
          sortDir: "desc",
          maxRecords: 20000,
        }),
        fetchTransactionMetrics(),
      ]);

      setBackendRows(rows.map(mapBackendTransaction));
      setBackendMetrics(metrics);
      setSyncMessage(`Loaded ${rows.length.toLocaleString()} transaction rows from MongoDB.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to fetch backend transactions.";
      setBackendRows(null);
      setBackendMetrics(null);
      setSyncMessage(`${detail} Falling back to local demo dataset.`);
    } finally {
      setIsSyncing(false);
    }
  }, [authToken]);

  useEffect(() => {
    void syncBackendData();
  }, [syncBackendData]);

  const sourceTransactions = backendRows ?? extendedTxs;
  const accountRiskScores = useMemo(() => computeAccountRiskScores(sourceTransactions), [sourceTransactions]);

  const uniqueTypes = useMemo(() => [...new Set(sourceTransactions.map(t => t.type))], [sourceTransactions]);

  const filtered = useMemo(() => {
    return sourceTransactions
      .filter((tx) => {
        const matchSearch = tx.id.toLowerCase().includes(search.toLowerCase()) ||
          tx.from.toLowerCase().includes(search.toLowerCase()) ||
          tx.to.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || tx.status === statusFilter;
        const matchType = typeFilter === "all" || tx.type === typeFilter;
        return matchSearch && matchStatus && matchType;
      })
      .sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortField === "riskScore") return (a.riskScore - b.riskScore) * mul;
        if (sortField === "amount") return (a.amount - b.amount) * mul;
        return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * mul;
      });
  }, [search, statusFilter, typeFilter, sortField, sortDir, sourceTransactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  // Stats
  const totalBlocked = backendMetrics?.blocked_count ?? sourceTransactions.filter(t => t.status === "blocked").length;
  const totalFlagged = backendMetrics?.flagged_count ?? sourceTransactions.filter(t => t.status === "flagged").length;
  const avgRisk = Math.round(
    backendMetrics?.average_risk ?? (sourceTransactions.reduce((a, t) => a + t.riskScore, 0) / Math.max(sourceTransactions.length, 1)),
  );
  const totalVolume = backendMetrics?.total_volume ?? sourceTransactions.reduce((a, t) => a + t.amount, 0);

  const blockedCount = useAnimatedCounter(totalBlocked, 1000);
  const flaggedCount = useAnimatedCounter(totalFlagged, 1000, 100);
  const avgRiskCount = useAnimatedCounter(avgRisk, 1200, 200);
  const volumeCount = useAnimatedCounter(Math.round(totalVolume / 100000), 1500, 300);

  // Charts data
  const statusData = [
    { name: "Approved", value: sourceTransactions.filter(t => t.status === "approved").length, fill: "hsl(142, 72%, 45%)" },
    { name: "Blocked", value: totalBlocked, fill: "hsl(0, 72%, 51%)" },
    { name: "Flagged", value: totalFlagged, fill: "hsl(38, 92%, 50%)" },
  ];

  const typeData = uniqueTypes.map(type => ({
    name: type.length > 8 ? type.slice(0, 8) + ".." : type,
    count: sourceTransactions.filter(t => t.type === type).length,
  }));

  const suspiciousValue = filtered
    .filter((tx) => tx.riskScore >= 80)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const filteredAvgTicket = Math.round(
    filtered.reduce((sum, tx) => sum + tx.amount, 0) / Math.max(filtered.length, 1),
  );

  const highRiskRatio = filtered.length
    ? Math.round((filtered.filter((tx) => tx.riskScore >= 80).length / filtered.length) * 100)
    : 0;

  const newestTs = filtered.length
    ? Math.max(...filtered.map((tx) => new Date(tx.timestamp).getTime()))
    : Date.now();
  const velocityWindowStart = newestTs - 30 * 60 * 1000;
  const velocityCount = filtered.filter(
    (tx) => new Date(tx.timestamp).getTime() >= velocityWindowStart,
  ).length;

  const riskTrendData = useMemo(() => {
    return filtered
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-12)
      .map((tx, index) => ({
        label: `P${index + 1}`,
        value: tx.riskScore,
      }));
  }, [filtered]);

  const handleExport = () => {
    const csv = ["ID,From,To,Amount,Risk,Status,Type,Timestamp"]
      .concat(filtered.map(t => `${t.id},${t.from},${t.to},${t.amount},${t.riskScore},${t.status},${t.type},${t.timestamp}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Filter, search, and inspect transactions in real-time</p>
          {syncMessage ? (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Data Source: {backendRows ? "MongoDB" : "Local Fallback"} • {syncMessage}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void syncBackendData()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/85 transition-colors disabled:opacity-70"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing" : "Sync MongoDB"}
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Transaction Velocity Lens"
          subtitle="Visual risk telemetry and movement metrics for the active filtered transaction set"
          variant="risk"
          chartType="radar"
          chartPlacement="left"
          metrics={[
            {
              label: "Suspicious Value",
              value: `Rs ${suspiciousValue.toLocaleString()}`,
              hint: "risk score >= 80",
              icon: ShieldAlert,
              tone: suspiciousValue > 1000000 ? "destructive" : "warning",
            },
            {
              label: "Velocity 30m",
              value: `${velocityCount}`,
              hint: "transactions in rolling 30m",
              icon: Clock,
              tone: velocityCount > 5 ? "warning" : "success",
            },
            {
              label: "High Risk Ratio",
              value: `${highRiskRatio}%`,
              hint: "share of active filter",
              icon: TrendingUp,
              tone: highRiskRatio >= 40 ? "destructive" : "primary",
            },
            {
              label: "Avg Ticket",
              value: `Rs ${filteredAvgTicket.toLocaleString()}`,
              hint: "filtered average amount",
              icon: CheckCircle2,
              tone: "accent",
            },
          ]}
          chartData={riskTrendData}
          chartLabel="Risk Path"
          chartColor="hsl(48, 96%, 53%)"
          badges={[
            `Filtered Rows: ${filtered.length}`,
            `Status Filter: ${statusFilter}`,
            `Type Filter: ${typeFilter}`,
          ]}
        />
      </SectionReveal>

      {/* Stats Row */}
      <SectionReveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShieldAlert, label: "Blocked", value: blockedCount.toString(), color: "text-destructive" },
            { icon: Clock, label: "Flagged", value: flaggedCount.toString(), color: "text-warning" },
            { icon: TrendingUp, label: "Avg Risk", value: `${avgRiskCount}%`, color: avgRisk >= 50 ? "text-warning" : "text-success" },
            { icon: CheckCircle2, label: "Volume", value: `₹${volumeCount}L`, color: "text-primary" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="glass rounded-xl p-4 flex items-center gap-3">
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

      {/* Charts Row */}
      <SectionReveal delay={0.05}>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                  <span className="text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">By Transaction Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" />
                <XAxis dataKey="name" stroke="hsl(220, 10%, 50%)" fontSize={10} />
                <YAxis stroke="hsl(220, 10%, 50%)" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 16%, 14%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal delay={0.08}>
        <div className="grid xl:grid-cols-5 gap-4">
          <MoneyFlowVisualizer
            className="xl:col-span-3"
            transactions={filtered.length ? filtered : sourceTransactions}
            accountScores={accountRiskScores}
          />
          <div className="xl:col-span-2">
            <AccountRiskScorePanel scores={accountRiskScores} />
          </div>
        </div>
      </SectionReveal>

      {/* Filters */}
      <SectionReveal delay={0.1}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search by ID, sender, or recipient..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {["all", "approved", "blocked", "flagged"].map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground border-none focus:outline-none focus:ring-1 focus:ring-primary/50">
              <option value="all">All Types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </SectionReveal>

      {/* Table */}
      <SectionReveal delay={0.15}>
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">From → To</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("amount")}>
                    <span className="flex items-center gap-1">Amount <SortIcon field="amount" /></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("riskScore")}>
                    <span className="flex items-center gap-1">Risk <SortIcon field="riskScore" /></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("timestamp")}>
                    <span className="flex items-center gap-1">Time <SortIcon field="timestamp" /></span>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {paginated.map((tx, i) => (
                    <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => setSelected(tx)}>
                      <td className="px-4 py-3 font-mono text-xs">{tx.id}</td>
                      <td className="px-4 py-3 text-xs truncate max-w-[200px]">{tx.from} → {tx.to}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">₹{tx.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-1.5 rounded-full bg-secondary overflow-hidden`}>
                            <div className={`h-full rounded-full ${riskBg(tx.riskScore)}`} style={{ width: `${tx.riskScore}%` }} />
                          </div>
                          <span className={`text-xs font-mono font-bold ${riskColor(tx.riskScore)}`}>{tx.riskScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusBadge[tx.status]}`}>{tx.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{tx.type}</td>
                      <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3"><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    page === i + 1 ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
                  }`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </SectionReveal>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[520px] z-50 bg-card border border-border rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg">{selected.id}</h3>
                  <p className="text-xs text-muted-foreground">{selected.type} • {selected.institution}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
              </div>

              {/* Risk gauge */}
              <div className="mb-6 p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Risk Assessment</span>
                  <span className={`text-2xl font-bold font-mono ${riskColor(selected.riskScore)}`}>{selected.riskScore}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div className={`h-full rounded-full ${riskBg(selected.riskScore)}`}
                    initial={{ width: 0 }} animate={{ width: `${selected.riskScore}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }} />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["From", selected.from],
                  ["To", selected.to],
                  ["Amount", `₹${selected.amount.toLocaleString()}`],
                  ["Status", selected.status.toUpperCase()],
                  ["Type", selected.type],
                  ["Institution", selected.institution],
                  ["Timestamp", new Date(selected.timestamp).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">AI Analysis: </span>
                  {selected.riskScore >= 80
                    ? "High-confidence fraud signal. Multiple behavioral anomalies detected including velocity stacking, unusual destination patterns, and amount threshold violations. Recommend immediate investigation and account freeze."
                    : selected.riskScore >= 50
                    ? "Elevated risk indicators present. Pattern matches partial fraud signatures. Cross-institution correlation reveals potential layering behavior. Enhanced monitoring recommended."
                    : "Transaction within normal behavioral parameters. No anomalies detected. Pattern consistent with historical profile."}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
                  Flag Transaction
                </button>
                <button className="flex-1 py-2 rounded-lg bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-colors">
                  Mark Safe
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
