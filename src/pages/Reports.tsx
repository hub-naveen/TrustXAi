import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  FileCheck2,
  FileDown,
  FileSearch,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import SectionReveal from "@/components/shared/SectionReveal";
import { useAuth } from "@/contexts/AuthContext";
import {
  downloadRegulatorExportBundle,
  downloadSignedInvestigationReportCsv,
  downloadSignedInvestigationReportPdf,
  fetchInvestigationAuditLogs,
  fetchInvestigationCaseOptions,
  verifyInvestigationAuditLogs,
  type BackendInvestigationCaseOption,
  type SignedExportReceipt,
} from "@/lib/backendApi";

type BusyAction = "sync" | "pdf" | "csv" | "bundle" | "audit" | null;

const shortHash = (value: string | null | undefined) => {
  if (!value) return "n/a";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}...${value.slice(-10)}`;
};

export default function Reports() {
  const { authToken } = useAuth();

  const [caseOptions, setCaseOptions] = useState<BackendInvestigationCaseOption[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [lastReceipt, setLastReceipt] = useState<SignedExportReceipt | null>(null);
  const [auditValid, setAuditValid] = useState<boolean | null>(null);
  const [auditReason, setAuditReason] = useState<string | null>(null);
  const [auditLogCount, setAuditLogCount] = useState<number | null>(null);
  const [auditLatestHash, setAuditLatestHash] = useState<string | null>(null);

  const syncCaseOptions = useCallback(async () => {
    if (!authToken) {
      setCaseOptions([]);
      setSelectedCaseIds([]);
      setSyncMessage("Backend auth token unavailable. Sign in to load report cases.");
      return;
    }

    setBusyAction("sync");
    setSyncMessage("Loading investigation cases for report exports...");

    try {
      const options = await fetchInvestigationCaseOptions();
      setCaseOptions(options);
      setSelectedCaseIds((previous) =>
        previous.filter((caseId) => options.some((entry) => entry.case_id === caseId)),
      );
      setSyncMessage(`Loaded ${options.length} investigation case options.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to load investigation cases.";
      setCaseOptions([]);
      setSelectedCaseIds([]);
      setSyncMessage(detail);
    } finally {
      setBusyAction(null);
    }
  }, [authToken]);

  useEffect(() => {
    void syncCaseOptions();
  }, [syncCaseOptions]);

  const loadAuditTelemetry = useCallback(async (caseIds: string[]) => {
    const [verification, logs] = await Promise.all([
      verifyInvestigationAuditLogs(caseIds),
      fetchInvestigationAuditLogs(caseIds, 500),
    ]);

    setAuditValid(verification.valid);
    setAuditReason(verification.reason);
    setAuditLatestHash(verification.latest_hash);
    setAuditLogCount(logs.length);

    return verification;
  }, []);

  const refreshAuditTelemetry = useCallback(async () => {
    if (!selectedCaseIds.length) {
      setAuditValid(null);
      setAuditReason("Select one or more cases to verify immutable logs.");
      setAuditLogCount(null);
      setAuditLatestHash(null);
      return;
    }

    setBusyAction("audit");
    setSyncMessage("Verifying immutable activity logs...");

    try {
      const verification = await loadAuditTelemetry(selectedCaseIds);
      setSyncMessage(
        `Audit chain ${verification.valid ? "verified" : "failed"} (${verification.checked_records} checked records).`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Audit verification failed.";
      setAuditValid(false);
      setAuditReason(detail);
      setAuditLogCount(null);
      setAuditLatestHash(null);
      setSyncMessage(detail);
    } finally {
      setBusyAction(null);
    }
  }, [loadAuditTelemetry, selectedCaseIds]);

  const runExport = useCallback(
    async (kind: "pdf" | "csv" | "bundle") => {
      if (!selectedCaseIds.length) return;

      setBusyAction(kind);
      setSyncMessage(
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

        try {
          await loadAuditTelemetry(selectedCaseIds);
          setSyncMessage(`Downloaded ${receipt.filename} with signature receipt metadata.`);
        } catch {
          setSyncMessage(`Downloaded ${receipt.filename}. Audit verification needs retry.`);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Signed export failed.";
        setSyncMessage(detail);
      } finally {
        setBusyAction(null);
      }
    },
    [loadAuditTelemetry, selectedCaseIds],
  );

  const filteredCaseOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return caseOptions;

    return caseOptions.filter((entry) => {
      return (
        entry.case_id.toLowerCase().includes(query) ||
        entry.title.toLowerCase().includes(query) ||
        entry.lead_agency.toLowerCase().includes(query)
      );
    });
  }, [caseOptions, searchQuery]);

  const selectedCaseSet = useMemo(() => new Set(selectedCaseIds), [selectedCaseIds]);

  const selectedCaseDetails = useMemo(
    () => caseOptions.filter((entry) => selectedCaseSet.has(entry.case_id)),
    [caseOptions, selectedCaseSet],
  );

  const canRunActions = selectedCaseIds.length > 0 && busyAction === null;

  const toggleCase = (caseId: string) => {
    setSelectedCaseIds((previous) => {
      if (previous.includes(caseId)) {
        return previous.filter((entry) => entry !== caseId);
      }
      return [...previous, caseId];
    });
  };

  const selectAllVisible = () => {
    const visibleIds = filteredCaseOptions.map((entry) => entry.case_id);
    if (!visibleIds.length) return;
    setSelectedCaseIds((previous) => Array.from(new Set([...previous, ...visibleIds])));
  };

  const clearSelection = () => {
    setSelectedCaseIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Compliance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed export center for regulator handoff and immutable audit verification
          </p>
          {syncMessage ? <p className="mt-1.5 text-[11px] text-muted-foreground">{syncMessage}</p> : null}
        </div>
        <button
          onClick={() => void syncCaseOptions()}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${busyAction === "sync" ? "animate-spin" : ""}`} />
          {busyAction === "sync" ? "Syncing" : "Refresh Cases"}
        </button>
      </div>

      <SectionReveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cases Loaded</p>
            <p className="mt-2 font-mono text-2xl font-bold">{caseOptions.length}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Selected Cases</p>
            <p className="mt-2 font-mono text-2xl font-bold text-primary">{selectedCaseIds.length}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Audit Records</p>
            <p className="mt-2 font-mono text-2xl font-bold">{auditLogCount ?? 0}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Audit Status</p>
            <p
              className={`mt-2 font-mono text-2xl font-bold ${
                auditValid === null ? "text-muted-foreground" : auditValid ? "text-success" : "text-destructive"
              }`}
            >
              {auditValid === null ? "N/A" : auditValid ? "VALID" : "FAILED"}
            </p>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="glass rounded-xl p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter cases by ID, title, or agency"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllVisible}
                disabled={!filteredCaseOptions.length}
                className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
              >
                Select Visible
              </button>
              <button
                onClick={clearSelection}
                disabled={!selectedCaseIds.length}
                className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {filteredCaseOptions.map((entry) => {
              const checked = selectedCaseSet.has(entry.case_id);
              return (
                <label
                  key={entry.case_id}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors ${
                    checked ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCase(entry.case_id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold">{entry.case_id}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.title}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.lead_agency}</p>
                  </div>
                </label>
              );
            })}
            {!filteredCaseOptions.length ? (
              <p className="rounded-lg border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
                No cases match your filter.
              </p>
            ) : null}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Signed Export Actions</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Generate signed artifacts for selected investigation case IDs
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => void runExport("pdf")}
                disabled={!canRunActions}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
              >
                <FileDown className="h-3.5 w-3.5" />
                {busyAction === "pdf" ? "Signing..." : "Signed PDF"}
              </button>
              <button
                onClick={() => void runExport("csv")}
                disabled={!canRunActions}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                {busyAction === "csv" ? "Signing..." : "Signed CSV"}
              </button>
              <button
                onClick={() => void runExport("bundle")}
                disabled={!canRunActions}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
              >
                <Archive className="h-3.5 w-3.5" />
                {busyAction === "bundle" ? "Bundling..." : "Regulator Bundle"}
              </button>
              <button
                onClick={() => void refreshAuditTelemetry()}
                disabled={!selectedCaseIds.length || busyAction !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/80 disabled:cursor-not-allowed"
              >
                <FileSearch className="h-3.5 w-3.5" />
                {busyAction === "audit" ? "Verifying..." : "Verify Logs"}
              </button>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[11px] font-semibold">Selected Case IDs</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {selectedCaseDetails.length
                  ? selectedCaseDetails.map((entry) => entry.case_id).join(", ")
                  : "No cases selected yet."}
              </p>
            </div>
          </div>

          <div className="glass rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-success" />
                Compliance Snapshot
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Signature and immutable audit chain verification details
              </p>
            </div>

            {lastReceipt ? (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
                <p className="text-[11px] font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Last Signature Receipt
                </p>
                <p className="text-[11px] text-muted-foreground">File: {lastReceipt.filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  Algorithm: {lastReceipt.signatureAlgorithm ?? "n/a"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Digest: {shortHash(lastReceipt.digestSha256)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Signature: {shortHash(lastReceipt.signature)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Signed At: {lastReceipt.signedAt ?? "n/a"}
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
                No signed export generated in this session.
              </p>
            )}

            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
              <p className="text-[11px] font-semibold">Immutable Activity Logs</p>
              <p className="text-[11px] text-muted-foreground">
                Status: {auditValid === null ? "not verified" : auditValid ? "verified" : "failed"}
              </p>
              <p className="text-[11px] text-muted-foreground">Reason: {auditReason ?? "n/a"}</p>
              <p className="text-[11px] text-muted-foreground">Records: {auditLogCount ?? "n/a"}</p>
              <p className="text-[11px] text-muted-foreground">Latest Hash: {shortHash(auditLatestHash)}</p>
            </div>
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
