import { ShieldAlert } from "lucide-react";
import type { AccountRiskScore } from "@/lib/accountRiskScoring";

interface AccountRiskScorePanelProps {
  scores: AccountRiskScore[];
}

const tierClass: Record<AccountRiskScore["tier"], string> = {
  critical: "text-destructive",
  high: "text-warning",
  medium: "text-primary",
  low: "text-success",
};

const tierBadgeClass: Record<AccountRiskScore["tier"], string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-warning/15 text-warning",
  medium: "bg-primary/15 text-primary",
  low: "bg-success/15 text-success",
};

export default function AccountRiskScorePanel({ scores }: AccountRiskScorePanelProps) {
  return (
    <div className="glass rounded-xl border border-warning/20 p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold">Account Behavior Risk Scoring</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Score blends behavior patterns and history: average risk, blocked and flagged rate, value spikes,
        velocity bursts, risky transfer types, and counterparty spread.
      </p>

      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
        {scores.map((score) => (
          <div key={score.accountId} className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{score.accountId}</p>
                <p className="text-[10px] text-muted-foreground truncate">{score.institution}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tierBadgeClass[score.tier]}`}>
                {score.tier.toUpperCase()}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Score</p>
              <p className={`text-sm font-bold font-mono ${tierClass[score.tier]}`}>{score.score}</p>
            </div>

            <div className="mt-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className={`h-full rounded-full ${score.score >= 80 ? "bg-destructive" : score.score >= 60 ? "bg-warning" : score.score >= 45 ? "bg-primary" : "bg-success"}`}
                style={{ width: `${score.score}%` }}
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
              <p>Txns: <span className="text-foreground font-semibold">{score.transactionCount}</span></p>
              <p>Blocked: <span className="text-foreground font-semibold">{score.blockedCount}</span></p>
              <p>Velocity: <span className="text-foreground font-semibold">{score.velocityBurst}</span></p>
            </div>

            <p className="mt-1 text-[10px] text-muted-foreground truncate" title={score.behaviorTags.join(" | ")}>
              {score.behaviorTags.join(" • ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}