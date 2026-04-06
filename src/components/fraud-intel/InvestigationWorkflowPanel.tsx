import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Upload,
  UserCheck,
} from "lucide-react";
import {
  addWorkflowCaseComment,
  assignWorkflowCase,
  createWorkflowCase,
  fetchWorkflowAssignees,
  fetchWorkflowCases,
  type BackendWorkflowAssignee,
  type BackendWorkflowCase,
  type BackendWorkflowCasePriority,
  type BackendWorkflowCaseStatus,
  updateWorkflowCaseStatus,
  uploadWorkflowEvidence,
} from "@/lib/backendApi";

interface InvestigationWorkflowPanelProps {
  selectedCaseIds: string[];
  disabled?: boolean;
}

const workflowStatusOptions: BackendWorkflowCaseStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "reopened",
];

const workflowPriorityOptions: BackendWorkflowCasePriority[] = ["low", "medium", "high", "critical"];

const toReadableStatus = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const statusTone: Record<string, string> = {
  open: "bg-accent/10 text-accent",
  assigned: "bg-primary/10 text-primary",
  in_progress: "bg-warning/15 text-warning",
  on_hold: "bg-muted text-muted-foreground",
  resolved: "bg-success/15 text-success",
  closed: "bg-muted text-muted-foreground",
  reopened: "bg-destructive/10 text-destructive",
};

const priorityTone: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/10 text-accent",
  high: "bg-warning/15 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

const sortWorkflowCases = (rows: BackendWorkflowCase[]) =>
  [...rows].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );

const formatSla = (seconds: number, breached: boolean) => {
  if (breached) {
    const overdueMinutes = Math.abs(Math.round(seconds / 60));
    if (overdueMinutes < 60) return `${overdueMinutes}m overdue`;
    const overdueHours = Math.round(overdueMinutes / 60);
    return `${overdueHours}h overdue`;
  }

  const remainingMinutes = Math.max(0, Math.round(seconds / 60));
  if (remainingMinutes < 60) return `${remainingMinutes}m left`;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;
  return `${remainingHours}h ${remainingMins}m left`;
};

export default function InvestigationWorkflowPanel({
  selectedCaseIds,
  disabled = false,
}: InvestigationWorkflowPanelProps) {
  const [workflowCases, setWorkflowCases] = useState<BackendWorkflowCase[]>([]);
  const [assignees, setAssignees] = useState<BackendWorkflowAssignee[]>([]);
  const [activeWorkflowCaseId, setActiveWorkflowCaseId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<BackendWorkflowCaseStatus>("open");
  const [assigneeDraft, setAssigneeDraft] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newPriority, setNewPriority] = useState<BackendWorkflowCasePriority>("high");
  const [newSlaHours, setNewSlaHours] = useState<number>(24);
  const [newAssigneeId, setNewAssigneeId] = useState<string>("");
  const [newComment, setNewComment] = useState("");
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadWorkflow = useCallback(async () => {
    setIsLoading(true);
    setSyncMessage("Syncing workflow cases from backend...");

    try {
      const [workflowRows, assigneeRows] = await Promise.all([
        fetchWorkflowCases(),
        fetchWorkflowAssignees(),
      ]);
      setWorkflowCases(sortWorkflowCases(workflowRows));
      setAssignees(assigneeRows);
      setSyncMessage(
        `Loaded ${workflowRows.length} workflow cases and ${assigneeRows.length} assignable analysts.`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to sync workflow data.";
      setSyncMessage(detail);
      setWorkflowCases([]);
      setAssignees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  const scopedCases = useMemo(() => {
    if (!selectedCaseIds.length) return workflowCases;

    const selected = new Set(selectedCaseIds);
    const filtered = workflowCases.filter(
      (entry) => entry.investigation_case_id && selected.has(entry.investigation_case_id),
    );

    return filtered.length ? filtered : workflowCases;
  }, [selectedCaseIds, workflowCases]);

  useEffect(() => {
    if (!scopedCases.length) {
      setActiveWorkflowCaseId(null);
      return;
    }

    const exists = scopedCases.some((entry) => entry.workflow_case_id === activeWorkflowCaseId);
    if (!exists) {
      setActiveWorkflowCaseId(scopedCases[0].workflow_case_id);
    }
  }, [activeWorkflowCaseId, scopedCases]);

  const activeWorkflowCase = useMemo(
    () =>
      scopedCases.find((entry) => entry.workflow_case_id === activeWorkflowCaseId) ??
      scopedCases[0] ??
      null,
    [activeWorkflowCaseId, scopedCases],
  );

  useEffect(() => {
    if (!activeWorkflowCase) {
      setStatusDraft("open");
      setAssigneeDraft("");
      return;
    }

    setStatusDraft(activeWorkflowCase.status);
    setAssigneeDraft(
      activeWorkflowCase.assigned_to_user_id
        ? String(activeWorkflowCase.assigned_to_user_id)
        : "",
    );
  }, [activeWorkflowCase]);

  const upsertWorkflowCase = useCallback((updated: BackendWorkflowCase) => {
    setWorkflowCases((previous) => {
      const next = [
        updated,
        ...previous.filter((entry) => entry.workflow_case_id !== updated.workflow_case_id),
      ];
      return sortWorkflowCases(next);
    });
    setActiveWorkflowCaseId(updated.workflow_case_id);
  }, []);

  const handleCreateCase = async () => {
    if (disabled || isActing) return;

    const title = newTitle.trim();
    if (!title) {
      setSyncMessage("Provide a case title before creating workflow case.");
      return;
    }

    const linkedCaseId = selectedCaseIds[0]?.trim();
    const parsedAssignee = Number(newAssigneeId);

    setIsActing(true);
    setSyncMessage("Creating workflow case...");

    try {
      const created = await createWorkflowCase({
        title,
        summary: newSummary.trim() || undefined,
        investigation_case_id: linkedCaseId || undefined,
        priority: newPriority,
        assigned_to_user_id: Number.isFinite(parsedAssignee) ? parsedAssignee : undefined,
        sla_hours: Math.max(1, Math.min(240, Number(newSlaHours) || 24)),
      });

      upsertWorkflowCase(created);
      setNewTitle("");
      setNewSummary("");
      setNewPriority("high");
      setNewSlaHours(24);
      setNewAssigneeId("");
      setSyncMessage(`Created workflow case ${created.workflow_case_id}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to create workflow case.";
      setSyncMessage(detail);
    } finally {
      setIsActing(false);
    }
  };

  const handleAssign = async () => {
    if (!activeWorkflowCase || disabled || isActing) return;

    const parsedAssignee = Number(assigneeDraft);
    if (!Number.isFinite(parsedAssignee)) {
      setSyncMessage("Select an assignee before updating ownership.");
      return;
    }

    setIsActing(true);
    setSyncMessage(`Assigning ${activeWorkflowCase.workflow_case_id}...`);

    try {
      const updated = await assignWorkflowCase(activeWorkflowCase.workflow_case_id, parsedAssignee);
      upsertWorkflowCase(updated);
      setSyncMessage(`Assigned ${updated.workflow_case_id} to ${updated.assigned_to_name ?? "investigator"}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to assign workflow case.";
      setSyncMessage(detail);
    } finally {
      setIsActing(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!activeWorkflowCase || disabled || isActing) return;

    setIsActing(true);
    setSyncMessage(`Updating status for ${activeWorkflowCase.workflow_case_id}...`);

    try {
      const updated = await updateWorkflowCaseStatus(activeWorkflowCase.workflow_case_id, statusDraft);
      upsertWorkflowCase(updated);
      setSyncMessage(`${updated.workflow_case_id} moved to ${toReadableStatus(updated.status)}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to update workflow status.";
      setSyncMessage(detail);
    } finally {
      setIsActing(false);
    }
  };

  const handleAddComment = async () => {
    if (!activeWorkflowCase || disabled || isActing) return;

    const comment = newComment.trim();
    if (!comment) {
      setSyncMessage("Write a comment before submitting.");
      return;
    }

    setIsActing(true);
    setSyncMessage(`Posting comment to ${activeWorkflowCase.workflow_case_id}...`);

    try {
      const updated = await addWorkflowCaseComment(activeWorkflowCase.workflow_case_id, comment);
      upsertWorkflowCase(updated);
      setNewComment("");
      setSyncMessage("Comment added to workflow timeline.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to add workflow comment.";
      setSyncMessage(detail);
    } finally {
      setIsActing(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!activeWorkflowCase || disabled || isActing) return;
    if (!selectedEvidenceFile) {
      setSyncMessage("Choose an evidence file before uploading.");
      return;
    }

    setIsActing(true);
    setSyncMessage(`Uploading evidence to ${activeWorkflowCase.workflow_case_id}...`);

    try {
      const updated = await uploadWorkflowEvidence(
        activeWorkflowCase.workflow_case_id,
        selectedEvidenceFile,
      );
      upsertWorkflowCase(updated);
      setSelectedEvidenceFile(null);
      setSyncMessage(`Evidence uploaded to ${updated.workflow_case_id}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to upload evidence.";
      setSyncMessage(detail);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="glass rounded-xl p-4 space-y-4 border border-primary/20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Investigation Workflow</h4>
          <p className="text-[10px] text-muted-foreground mt-1">
            Create, assign, comment, upload evidence, and track SLA timers across investigation cases.
          </p>
          {syncMessage ? (
            <p className="text-[10px] text-muted-foreground mt-1.5">{syncMessage}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void loadWorkflow()}
          disabled={isLoading || disabled}
          className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Syncing" : "Sync"}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-secondary/35 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Create Workflow Case</p>
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          disabled={disabled || isActing}
          placeholder="Case title"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
        />
        <textarea
          value={newSummary}
          onChange={(event) => setNewSummary(event.target.value)}
          disabled={disabled || isActing}
          placeholder="Case summary"
          rows={2}
          className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
        />

        <div className="grid grid-cols-3 gap-2">
          <select
            value={newPriority}
            onChange={(event) => setNewPriority(event.target.value)}
            disabled={disabled || isActing}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
          >
            {workflowPriorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {toReadableStatus(priority)}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={newSlaHours}
            min={1}
            max={240}
            onChange={(event) => setNewSlaHours(Number(event.target.value) || 24)}
            disabled={disabled || isActing}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
            aria-label="SLA hours"
          />

          <select
            value={newAssigneeId}
            onChange={(event) => setNewAssigneeId(event.target.value)}
            disabled={disabled || isActing}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
          >
            <option value="">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.user_id} value={assignee.user_id}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void handleCreateCase()}
          disabled={disabled || isActing}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Case
        </button>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {scopedCases.map((entry) => (
          <button
            type="button"
            key={entry.workflow_case_id}
            onClick={() => setActiveWorkflowCaseId(entry.workflow_case_id)}
            className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
              activeWorkflowCase?.workflow_case_id === entry.workflow_case_id
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-secondary/30 hover:border-primary/25"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">{entry.workflow_case_id}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{entry.title}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityTone[entry.priority] ?? priorityTone.medium}`}>
                {toReadableStatus(entry.priority)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`px-2 py-0.5 rounded-full font-semibold ${statusTone[entry.status] ?? statusTone.open}`}>
                {toReadableStatus(entry.status)}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-semibold ${entry.sla_breached ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                {formatSla(entry.sla_remaining_seconds, entry.sla_breached)}
              </span>
            </div>
          </button>
        ))}

        {!scopedCases.length ? (
          <p className="text-xs text-muted-foreground">No workflow cases were returned for this investigation scope.</p>
        ) : null}
      </div>

      {activeWorkflowCase ? (
        <div className="rounded-lg border border-border bg-secondary/35 p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">{activeWorkflowCase.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{activeWorkflowCase.summary || "No summary provided."}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Due</p>
              <p className={`text-[11px] font-semibold ${activeWorkflowCase.sla_breached ? "text-destructive" : "text-success"}`}>
                {formatSla(activeWorkflowCase.sla_remaining_seconds, activeWorkflowCase.sla_breached)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-background/60 p-2 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Assignment</p>
              <select
                value={assigneeDraft}
                onChange={(event) => setAssigneeDraft(event.target.value)}
                disabled={disabled || isActing}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
              >
                <option value="">Select analyst</option>
                {assignees.map((assignee) => (
                  <option key={assignee.user_id} value={assignee.user_id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleAssign()}
                disabled={disabled || isActing}
                className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              >
                <UserCheck className="h-3.5 w-3.5" /> Assign
              </button>
            </div>

            <div className="rounded-md border border-border bg-background/60 p-2 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status Transition</p>
              <select
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value)}
                disabled={disabled || isActing}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
              >
                {workflowStatusOptions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {toReadableStatus(statusValue)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleUpdateStatus()}
                disabled={disabled || isActing}
                className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              >
                <Clock3 className="h-3.5 w-3.5" /> Update
              </button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background/60 p-2 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Case Comments</p>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {activeWorkflowCase.comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-border bg-secondary/40 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold">{comment.author_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[11px] mt-1">{comment.message}</p>
                </div>
              ))}
              {!activeWorkflowCase.comments.length ? (
                <p className="text-[11px] text-muted-foreground">No comments on this case yet.</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                disabled={disabled || isActing}
                placeholder="Add case note"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => void handleAddComment()}
                disabled={disabled || isActing}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background/60 p-2 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence Upload</p>
            <div className="flex items-center gap-2">
              <input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedEvidenceFile(file);
                }}
                disabled={disabled || isActing}
                className="block w-full text-[10px] text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-foreground"
              />
              <button
                type="button"
                onClick={() => void handleUploadEvidence()}
                disabled={disabled || isActing || !selectedEvidenceFile}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              >
                <Upload className="h-3.5 w-3.5" /> Upload
              </button>
            </div>

            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
              {activeWorkflowCase.evidence.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-secondary/40 px-2 py-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> {item.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {(item.size_bytes / 1024).toFixed(1)} KB • {item.uploaded_by_name}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(item.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {!activeWorkflowCase.evidence.length ? (
                <p className="text-[11px] text-muted-foreground">No evidence uploaded yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
