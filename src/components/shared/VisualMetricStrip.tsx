import { useId } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface VisualMetric {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive" | "accent";
}

export interface VisualMetricPoint {
  label: string;
  value: number;
}

export type VisualMetricStripVariant =
  | "default"
  | "pulse"
  | "risk"
  | "chain"
  | "federation"
  | "governance"
  | "settings"
  | "investigation"
  | "landing"
  | "auth"
  | "recovery";

interface VisualMetricStripProps {
  title: string;
  subtitle: string;
  metrics: VisualMetric[];
  chartData: VisualMetricPoint[];
  chartLabel?: string;
  chartColor?: string;
  badges?: string[];
  variant?: VisualMetricStripVariant;
  chartPlacement?: "left" | "right";
}

const toneClass: Record<NonNullable<VisualMetric["tone"]>, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  accent: "text-accent",
};

const variantStyles: Record<
  VisualMetricStripVariant,
  {
    shell: string;
    orb: string;
    topRule: string;
    metricCard: string;
    chartPanel: string;
    badge: string;
    chartColor: string;
  }
> = {
  default: {
    shell: "border border-border/70 bg-background/40",
    orb: "bg-primary/20",
    topRule: "bg-gradient-to-r from-transparent via-primary/40 to-transparent",
    metricCard: "border border-border bg-secondary/40",
    chartPanel: "border border-border bg-secondary/30",
    badge: "bg-primary/10 text-primary",
    chartColor: "hsl(48, 96%, 53%)",
  },
  pulse: {
    shell: "border border-primary/25 bg-gradient-to-br from-primary/10 via-background/70 to-accent/5",
    orb: "bg-primary/30",
    topRule: "bg-gradient-to-r from-transparent via-primary to-transparent",
    metricCard: "border border-primary/20 bg-primary/5",
    chartPanel: "border border-primary/20 bg-background/40",
    badge: "bg-primary/15 text-primary",
    chartColor: "hsl(210, 100%, 60%)",
  },
  risk: {
    shell: "border border-warning/30 bg-gradient-to-br from-warning/10 via-background/75 to-destructive/10",
    orb: "bg-warning/30",
    topRule: "bg-gradient-to-r from-transparent via-warning to-transparent",
    metricCard: "border border-warning/20 bg-warning/5",
    chartPanel: "border border-destructive/20 bg-background/45",
    badge: "bg-warning/15 text-warning",
    chartColor: "hsl(44, 94%, 58%)",
  },
  chain: {
    shell: "border border-accent/25 bg-gradient-to-br from-accent/10 via-background/70 to-primary/5",
    orb: "bg-accent/30",
    topRule: "bg-gradient-to-r from-transparent via-accent to-transparent",
    metricCard: "border border-accent/20 bg-accent/5",
    chartPanel: "border border-accent/20 bg-background/45",
    badge: "bg-accent/15 text-accent",
    chartColor: "hsl(190, 95%, 45%)",
  },
  federation: {
    shell: "border border-success/25 bg-gradient-to-br from-success/10 via-background/75 to-primary/5",
    orb: "bg-success/30",
    topRule: "bg-gradient-to-r from-transparent via-success to-transparent",
    metricCard: "border border-success/20 bg-success/5",
    chartPanel: "border border-success/20 bg-background/45",
    badge: "bg-success/15 text-success",
    chartColor: "hsl(142, 72%, 45%)",
  },
  governance: {
    shell: "border border-destructive/20 bg-gradient-to-br from-destructive/10 via-background/80 to-primary/5",
    orb: "bg-destructive/20",
    topRule: "bg-gradient-to-r from-transparent via-destructive to-transparent",
    metricCard: "border border-destructive/15 bg-destructive/5",
    chartPanel: "border border-destructive/20 bg-background/45",
    badge: "bg-destructive/15 text-destructive",
    chartColor: "hsl(0, 72%, 51%)",
  },
  settings: {
    shell: "border border-success/20 bg-gradient-to-br from-success/10 via-background/80 to-accent/5",
    orb: "bg-success/30",
    topRule: "bg-gradient-to-r from-transparent via-success to-transparent",
    metricCard: "border border-success/15 bg-success/5",
    chartPanel: "border border-success/20 bg-background/45",
    badge: "bg-success/15 text-success",
    chartColor: "hsl(142, 72%, 45%)",
  },
  investigation: {
    shell: "border border-warning/20 bg-gradient-to-br from-destructive/10 via-background/80 to-warning/5",
    orb: "bg-destructive/25",
    topRule: "bg-gradient-to-r from-transparent via-warning to-transparent",
    metricCard: "border border-warning/20 bg-warning/5",
    chartPanel: "border border-warning/20 bg-background/45",
    badge: "bg-warning/15 text-warning",
    chartColor: "hsl(48, 96%, 53%)",
  },
  landing: {
    shell: "border border-primary/20 bg-gradient-to-br from-primary/10 via-background/75 to-accent/5",
    orb: "bg-primary/30",
    topRule: "bg-gradient-to-r from-transparent via-primary to-transparent",
    metricCard: "border border-primary/15 bg-primary/5",
    chartPanel: "border border-primary/20 bg-background/45",
    badge: "bg-primary/15 text-primary",
    chartColor: "hsl(48, 96%, 53%)",
  },
  auth: {
    shell: "border border-accent/25 bg-gradient-to-br from-accent/10 via-background/75 to-success/5",
    orb: "bg-accent/30",
    topRule: "bg-gradient-to-r from-transparent via-accent to-transparent",
    metricCard: "border border-accent/20 bg-accent/5",
    chartPanel: "border border-accent/20 bg-background/45",
    badge: "bg-accent/15 text-accent",
    chartColor: "hsl(190, 95%, 45%)",
  },
  recovery: {
    shell: "border border-destructive/25 bg-gradient-to-br from-destructive/12 via-background/75 to-warning/6",
    orb: "bg-destructive/30",
    topRule: "bg-gradient-to-r from-transparent via-destructive to-transparent",
    metricCard: "border border-destructive/20 bg-destructive/5",
    chartPanel: "border border-destructive/20 bg-background/45",
    badge: "bg-destructive/15 text-destructive",
    chartColor: "hsl(0, 72%, 51%)",
  },
};

export default function VisualMetricStrip({
  title,
  subtitle,
  metrics,
  chartData,
  chartLabel = "Signal Trend",
  chartColor,
  badges = [],
  variant = "default",
  chartPlacement = "right",
}: VisualMetricStripProps) {
  const styles = variantStyles[variant];
  const resolvedChartColor = chartColor ?? styles.chartColor;
  const gradientId = `trend-gradient-${useId().replace(/:/g, "")}`;

  const chartPanel = (
    <div className={cn("rounded-xl p-3", styles.chartPanel)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{chartLabel}</p>
        <div className="w-2 h-2 rounded-full" style={{ background: resolvedChartColor }} />
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ left: -12, right: 6, top: 4, bottom: -4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={resolvedChartColor} stopOpacity={0.32} />
              <stop offset="95%" stopColor={resolvedChartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
          <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
          <Tooltip
            contentStyle={{
              background: "hsl(220, 18%, 8%)",
              border: "1px solid hsl(220, 16%, 14%)",
              borderRadius: 8,
              fontSize: 11,
            }}
          />
          <Area type="monotone" dataKey="value" stroke={resolvedChartColor} strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className={cn("glass relative overflow-hidden rounded-xl p-5", styles.shell)}>
      <div className={cn("pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl", styles.orb)} />
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-px", styles.topRule)} />

      <div className="relative grid xl:grid-cols-3 gap-4">
        {chartPlacement === "left" ? chartPanel : null}

        <div className="xl:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const tone = metric.tone ? toneClass[metric.tone] : "text-foreground";

              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn("rounded-lg px-3 py-2", styles.metricCard)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                    {Icon ? <Icon className={`w-3.5 h-3.5 ${tone}`} /> : null}
                  </div>
                  <p className={`text-base font-bold font-mono mt-1 ${tone}`}>{metric.value}</p>
                  {metric.hint ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{metric.hint}</p>
                  ) : null}
                </motion.div>
              );
            })}
          </div>

          {badges.length ? (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", styles.badge)}
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {chartPlacement === "right" ? chartPanel : null}
      </div>
    </div>
  );
}
