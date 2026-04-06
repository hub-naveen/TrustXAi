import { useCallback, useMemo, useState } from "react";
import {
  Archive,
  FileCheck2,
  FileDown,
  FileSearch,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { InvestigationEdge, InvestigationNode, InvestigationPathRisk } from "@/data/investigationData";
import {
  downloadRegulatorExportBundle,
  downloadSignedInvestigationReportCsv,
  downloadSignedInvestigationReportPdf,
  fetchInvestigationAuditLogs,
  verifyInvestigationAuditLogs,
  type SignedExportReceipt,
} from "@/lib/backendApi";

interface GeneratedReport {
  generatedAt: string;
  caseIds: string[];
  sourceAccounts: string[];
  destinationAccounts: string[];
  layerStructure: Array<{ layer: number; accounts: string[] }>;
  transactionPath: string[];
  riskExplanation: string[];
  suspiciousChains: Array<{ label: string; riskScore: number; chain: string }>;
}

interface InvestigationReportGeneratorProps {
  selectedCaseIds: string[];
  nodes: InvestigationNode[];
  edges: InvestigationEdge[];
  layerByNode: Record<string, number>;
  pathRisks: InvestigationPathRisk[];
  sourceNodeIds: string[];
  destinationNodeIds: string[];
  disabled?: boolean;
}

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)}L`;
  return `Rs ${amount.toLocaleString()}`;
};

const shortHash = (value: string | null | undefined) => {
  if (!value) return "n/a";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}...${value.slice(-10)}`;
};

export default function InvestigationReportGenerator({
  selectedCaseIds,
  nodes,
  edges,
  layerByNode,
  pathRisks,
  sourceNodeIds,
  destinationNodeIds,
  disabled,
}: InvestigationReportGeneratorProps) {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [busyAction, setBusyAction] = useState<"pdf" | "csv" | "bundle" | "audit" | null>(null);
  const [lastReceipt, setLastReceipt] = useState<SignedExportReceipt | null>(null);
  const [auditValid, setAuditValid] = useState<boolean | null>(null);
  const [auditReason, setAuditReason] = useState<string | null>(null);
  const [auditLogCount, setAuditLogCount] = useState<number | null>(null);
  const [auditLatestHash, setAuditLatestHash] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const nodeLabel = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node.label])), [nodes]);

  const generateReport = () => {
    const layerMap = new Map<number, string[]>();
    for (const node of nodes) {
      const layer = layerByNode[node.id] ?? node.defaultLayer;
      const list = layerMap.get(layer) ?? [];
      list.push(node.label);
      layerMap.set(layer, list);
    }

    const layerStructure = Array.from(layerMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([layer, accounts]) => ({
        layer,
        accounts: Array.from(new Set(accounts)),
      }));

    const transactionPath = edges
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((edge, index) => {
        const fromLabel = nodeLabel[edge.from] ?? edge.from;
        const toLabel = nodeLabel[edge.to] ?? edge.to;
        return `t${index + 1}: ${fromLabel} -> ${toLabel} (${formatAmount(edge.amount)} | ${edge.txRef})`;
      });

    const sourceAccounts = sourceNodeIds.map((id) => nodeLabel[id] ?? id);
    const destinationAccounts = destinationNodeIds.map((id) => nodeLabel[id] ?? id);

    const suspiciousChains = pathRisks
      .slice()
      .sort((a, b) => b.riskScore - a.riskScore)
      .map((entry) => ({
        label: entry.label,
        riskScore: entry.riskScore,
        chain: entry.chain.map((id) => nodeLabel[id] ?? id).join(" -> "),
      }));

    const riskExplanation = suspiciousChains.slice(0, 4).map(
      (entry) => `${entry.label} scored ${entry.riskScore}% due to chain: ${entry.chain}`,
    );

    setReport({
      generatedAt: new Date().toISOString(),
      caseIds: selectedCaseIds,
      sourceAccounts,
      destinationAccounts,
      layerStructure,
      transactionPath,
      riskExplanation,
      suspiciousChains,
    });

    setExportMessage(
      `Prepared report snapshot for ${selectedCaseIds.length} case(s). Export signed artifacts for regulator use.`,
    );
  };

  const refreshAuditTelemetry = useCallback(async () => {
    if (!selectedCaseIds.length) {
      setAuditValid(null);
      setAuditReason("Select one or more cases to verify immutable audit logs.");
      setAuditLogCount(null);
      setAuditLatestHash(null);
      return;
    }

    setBusyAction("audit");
    setExportMessage("Verifying immutable activity logs...");

    try {
      const [verification, logs] = await Promise.all([
        verifyInvestigationAuditLogs(selectedCaseIds),
        fetchInvestigationAuditLogs(selectedCaseIds, 500),
      ]);

      setAuditValid(verification.valid);
      setAuditReason(verification.reason);
      setAuditLatestHash(verification.latest_hash);
      setAuditLogCount(logs.length);
      setExportMessage(
        `Audit chain ${verification.valid ? "verified" : "failed"} (${verification.checked_records} checked records).`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Audit verification failed.";
      setAuditValid(false);
      setAuditReason(detail);
      setAuditLatestHash(null);
      setAuditLogCount(null);
      setExportMessage(detail);
    } finally {
      setBusyAction(null);
    }
  }, [selectedCaseIds]);

  const runSignedExport = useCallback(
    async (kind: "pdf" | "csv" | "bundle") => {
      if (disabled || !selectedCaseIds.length) return;

      setBusyAction(kind);
      setExportMessage(
        kind === "bundle"
          ? "Generating regulator-ready signed bundle..."
          : `Generating signed ${kind.toUpperCase()} report...`,
      );

      try {
        let receipt: SignedExportReceipt;
        if (kind === "pdf") {
          receipt = await downloadSignedInvestigationReportPdf(selectedCaseIds);
        } else if (kind === "csv") {
          receipt = await downloadSignedInvestigationReportCsv(selectedCaseIds);
        } else {
          receipt = await downloadRegulatorExportBundle(selectedCaseIds);
        }

        setLastReceipt(receipt);
        setExportMessage(`Downloaded ${receipt.filename} with signature receipt metadata.`);
        await refreshAuditTelemetry();
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Signed export failed.";
        setExportMessage(detail);
      } finally {
        setBusyAction(null);
      }
    },
    [disabled, refreshAuditTelemetry, selectedCaseIds],
  );

  return (
    <div className={`glass rounded-xl p-4 space-y-3 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <h3 className="text-sm font-semibold">Investigation Report Generator</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Generate case summary for law enforcement handoff</p>
      </div>

      <button
        type="button"
        onClick={generateReport}
        disabled={disabled || !selectedCaseIds.length}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:cursor-not-allowed"
      >
        <FileText className="w-3.5 h-3.5" />
        Generate Case Report
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void runSignedExport("pdf")}
          disabled={!report || !!busyAction || disabled}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
        >
          <FileDown className="w-3.5 h-3.5" />
          {busyAction === "pdf" ? "Signing..." : "Signed PDF"}
        </button>
        <button
          type="button"
          onClick={() => void runSignedExport("csv")}
          disabled={!report || !!busyAction || disabled}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          {busyAction === "csv" ? "Signing..." : "Signed CSV"}
        </button>
        <button
          type="button"
          onClick={() => void runSignedExport("bundle")}
          disabled={!report || !!busyAction || disabled}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
        >
          <Archive className="w-3.5 h-3.5" />
          {busyAction === "bundle" ? "Bundling..." : "Regulator Bundle"}
        </button>
        <button
          type="button"
          onClick={() => void refreshAuditTelemetry()}
          disabled={!selectedCaseIds.length || !!busyAction || disabled}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
        >
          <FileSearch className="w-3.5 h-3.5" />
          {busyAction === "audit" ? "Verifying..." : "Verify Logs"}
        </button>
      </div>

      {report ? (
        <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-2 max-h-[210px] overflow-y-auto">
          <p className="text-[11px] text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()}</p>
          <p className="text-xs"><span className="text-muted-foreground">Cases:</span> {report.caseIds.join(", ")}</p>
          <p className="text-xs"><span className="text-muted-foreground">Sources:</span> {report.sourceAccounts.join(" | ")}</p>
          <p className="text-xs"><span className="text-muted-foreground">Destinations:</span> {report.destinationAccounts.join(" | ")}</p>
          <p className="text-[11px] text-muted-foreground pt-1">Top suspicious chain</p>
          <p className="text-xs text-warning">
            {report.suspiciousChains[0]
              ? `${report.suspiciousChains[0].label} (${report.suspiciousChains[0].riskScore}%)`
              : "No suspicious chain available"}
          </p>

          {lastReceipt ? (
            <div className="pt-2 border-t border-border/60 space-y-1">
              <p className="text-[11px] font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-success" /> Signature Receipt
              </p>
              <p className="text-[11px] text-muted-foreground">File: {lastReceipt.filename}</p>
              <p className="text-[11px] text-muted-foreground">Algorithm: {lastReceipt.signatureAlgorithm ?? "n/a"}</p>
              <p className="text-[11px] text-muted-foreground">Digest: {shortHash(lastReceipt.digestSha256)}</p>
              <p className="text-[11px] text-muted-foreground">Signature: {shortHash(lastReceipt.signature)}</p>
              <p className="text-[11px] text-muted-foreground">Signed At: {lastReceipt.signedAt ?? "n/a"}</p>
            </div>
          ) : null}

          {(auditReason || auditLogCount !== null) ? (
            <div className="pt-2 border-t border-border/60 space-y-1">
              <p className="text-[11px] font-semibold">Immutable Activity Logs</p>
              <p className="text-[11px] text-muted-foreground">
                Status: {auditValid === null ? "not verified" : auditValid ? "verified" : "failed"}
              </p>
              <p className="text-[11px] text-muted-foreground">Reason: {auditReason ?? "n/a"}</p>
              <p className="text-[11px] text-muted-foreground">Records: {auditLogCount ?? "n/a"}</p>
              <p className="text-[11px] text-muted-foreground">Latest Hash: {shortHash(auditLatestHash)}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No report generated yet.</p>
      )}

      {exportMessage ? <p className="text-[11px] text-muted-foreground">{exportMessage}</p> : null}
    </div>
  );
}
