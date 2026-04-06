import { useMemo, useState } from "react";
import { FileDown, FileJson, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import type { InvestigationEdge, InvestigationNode, InvestigationPathRisk } from "@/data/investigationData";

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
  };

  const exportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trustxai-case-report-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!report) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 14;

    const writeLine = (text: string, fontSize = 10, spacing = 5) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, 182) as string[];
      for (const line of lines) {
        if (y > 282) {
          doc.addPage();
          y = 14;
        }
        doc.text(line, 14, y);
        y += spacing;
      }
    };

    writeLine("TrustXAi Money Laundering Investigation Report", 14, 7);
    writeLine(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    writeLine(`Case IDs: ${report.caseIds.join(", ")}`);
    y += 2;

    writeLine("Source Accounts", 12, 6);
    report.sourceAccounts.forEach((entry) => writeLine(`- ${entry}`));
    y += 2;

    writeLine("Destination Accounts", 12, 6);
    report.destinationAccounts.forEach((entry) => writeLine(`- ${entry}`));
    y += 2;

    writeLine("Layer Structure", 12, 6);
    report.layerStructure.forEach((layer) => {
      writeLine(`Layer ${layer.layer}: ${layer.accounts.join(", ")}`);
    });
    y += 2;

    writeLine("Transaction Path", 12, 6);
    report.transactionPath.forEach((step) => writeLine(step));
    y += 2;

    writeLine("Risk Explanation", 12, 6);
    report.riskExplanation.forEach((item) => writeLine(`- ${item}`));

    doc.save(`trustxai-case-report-${Date.now()}.pdf`);
  };

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
          onClick={exportPdf}
          disabled={!report}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
        >
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
        <button
          type="button"
          onClick={exportJson}
          disabled={!report}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
        >
          <FileJson className="w-3.5 h-3.5" /> JSON
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
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No report generated yet.</p>
      )}
    </div>
  );
}
