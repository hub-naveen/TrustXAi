import type { DetectionLabel } from "@/data/investigationData";

export interface CaseOption {
  caseId: string;
  title: string;
  leadAgency: string;
}

interface CaseLinkingPanelProps {
  options: CaseOption[];
  selectedCaseIds: string[];
  onSelectedCaseIdsChange: (caseIds: string[]) => void;
  commonAccountLabels: string[];
  sharedPatternLabels: DetectionLabel[];
  disabled?: boolean;
}

export default function CaseLinkingPanel({
  options,
  selectedCaseIds,
  onSelectedCaseIdsChange,
  commonAccountLabels,
  sharedPatternLabels,
  disabled,
}: CaseLinkingPanelProps) {
  const handleSelect = (value: string) => {
    if (disabled) return;

    const next = selectedCaseIds.includes(value)
      ? selectedCaseIds.filter((entry) => entry !== value)
      : [...selectedCaseIds, value];

    onSelectedCaseIdsChange(next);
  };

  return (
    <div className={`glass rounded-xl p-4 space-y-3 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <h3 className="text-sm font-semibold">Inter-Case Layer Linking</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Select multiple Case IDs to line up and merge bank account spider maps</p>
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const active = selectedCaseIds.includes(option.caseId);
          return (
            <button
              key={option.caseId}
              type="button"
              onClick={() => handleSelect(option.caseId)}
              disabled={disabled}
              className={`w-full text-left p-2.5 rounded-lg border transition-colors disabled:cursor-not-allowed ${
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-secondary/40 hover:border-primary/40"
              }`}
            >
              <p className="text-xs font-semibold leading-snug">{option.caseId}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{option.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{option.leadAgency}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-2">
        <p className="text-xs font-semibold">Shared Across Selected Cases</p>
        <p className="text-[10px] text-muted-foreground">Common bank accounts</p>
        {commonAccountLabels.length ? (
          <div className="flex flex-wrap gap-1.5">
            {commonAccountLabels.slice(0, 6).map((label) => (
              <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono">
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">No overlaps yet. Select 2+ cases to compare.</p>
        )}

        <p className="text-[10px] text-muted-foreground pt-1">Shared fraud patterns</p>
        {sharedPatternLabels.length ? (
          <div className="flex flex-wrap gap-1.5">
            {sharedPatternLabels.map((label) => (
              <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">No shared pattern label detected yet.</p>
        )}
      </div>
    </div>
  );
}
