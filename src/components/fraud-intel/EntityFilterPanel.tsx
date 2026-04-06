import type { ChangeEvent } from "react";

export interface InvestigationFilters {
  holderName: string;
  phone: string;
  ipAddress: string;
  email: string;
  bankName: string;
}

export interface ResolutionHint {
  leftLabel: string;
  rightLabel: string;
  probability: number;
  evidence: string[];
}

interface EntityFilterPanelProps {
  filters: InvestigationFilters;
  onFiltersChange: (next: InvestigationFilters) => void;
  linkedIdentityScore: number;
  directMatchCount: number;
  linkedCount: number;
  resolutionHints: ResolutionHint[];
  disabled?: boolean;
}

const fields: Array<{ key: keyof InvestigationFilters; label: string; placeholder: string }> = [
  { key: "holderName", label: "Account holder name", placeholder: "e.g. Rohit Menon" },
  { key: "phone", label: "Phone number", placeholder: "e.g. +91-9988776655" },
  { key: "ipAddress", label: "IP address", placeholder: "e.g. 185.44.31.18" },
  { key: "email", label: "Email", placeholder: "e.g. control@neontrade-fze.com" },
  { key: "bankName", label: "Bank name", placeholder: "e.g. Axis Bank" },
];

export default function EntityFilterPanel({
  filters,
  onFiltersChange,
  linkedIdentityScore,
  directMatchCount,
  linkedCount,
  resolutionHints,
  disabled,
}: EntityFilterPanelProps) {
  const handleField = (key: keyof InvestigationFilters) => (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, [key]: event.target.value });
  };

  const clearFilters = () => {
    onFiltersChange({
      holderName: "",
      phone: "",
      ipAddress: "",
      email: "",
      bankName: "",
    });
  };

  const meterTone =
    linkedIdentityScore >= 85
      ? "bg-destructive"
      : linkedIdentityScore >= 65
      ? "bg-warning"
      : linkedIdentityScore > 0
      ? "bg-primary"
      : "bg-muted";

  return (
    <div className={`glass rounded-xl p-4 space-y-4 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Filter and Entity Linking</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Highlight linked accounts by identity artifacts</p>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          disabled={disabled}
          className="px-2 py-1 rounded-md bg-secondary text-[10px] text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{field.label}</span>
            <input
              value={filters[field.key]}
              onChange={handleField(field.key)}
              placeholder={field.placeholder}
              disabled={disabled}
              className="mt-1 w-full rounded-lg bg-secondary border border-border px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:cursor-not-allowed"
            />
          </label>
        ))}
      </div>

      <div className="rounded-lg bg-secondary/70 border border-border p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Linked Identity Score</span>
          <span className="font-mono font-bold text-primary">{linkedIdentityScore}%</span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden mt-2">
          <div className={`h-full rounded-full transition-all duration-500 ${meterTone}`} style={{ width: `${linkedIdentityScore}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <p>Direct matches: <span className="font-mono text-foreground">{directMatchCount}</span></p>
          <p>Linked accounts: <span className="font-mono text-foreground">{linkedCount}</span></p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold">Entity Resolution Engine</h4>
        {resolutionHints.length ? (
          resolutionHints.slice(0, 4).map((hint) => (
            <div key={`${hint.leftLabel}-${hint.rightLabel}`} className="rounded-lg border border-border/70 bg-secondary/50 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] leading-snug">{hint.leftLabel} <span className="text-muted-foreground">{"->"}</span> {hint.rightLabel}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono whitespace-nowrap">
                  Probable Same Owner: {hint.probability}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Evidence: {hint.evidence.join(", ")}</p>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground">No linked entities found for current filter criteria.</p>
        )}
      </div>
    </div>
  );
}
