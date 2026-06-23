import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

export type Trend = "up" | "down" | "flat";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Unit suffix, e.g. `GW`, `₹/kWh`. */
  unit?: string;
  /** Pre-formatted delta string, e.g. `+4.2%`. */
  delta?: string;
  /** Overrides the trend colour/arrow; inferred from `delta` sign otherwise. */
  trend?: Trend;
  /** Secondary caption under the value, e.g. `vs. last quarter`. */
  hint?: string;
  icon?: LucideIcon;
  /** Optional sparkline slot (a chart is dropped in here in later phases). */
  sparkline?: React.ReactNode;
  /** Optional footer slot, e.g. a <ConfidenceBadge />. */
  footer?: React.ReactNode;
  className?: string;
}

function inferTrend(delta?: string, trend?: Trend): Trend {
  if (trend) return trend;
  if (!delta) return "flat";
  const t = delta.trim();
  if (t.startsWith("-") || t.startsWith("−")) return "down";
  if (t.startsWith("+")) return "up";
  return "flat";
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  trend,
  hint,
  icon: Icon,
  sparkline,
  footer,
  className,
}: StatCardProps) {
  const t = inferTrend(delta, trend);
  const trendColor =
    t === "up"
      ? "text-positive"
      : t === "down"
        ? "text-negative"
        : "text-muted-foreground";
  const TrendIcon = t === "up" ? ArrowUpRight : t === "down" ? ArrowDownRight : Minus;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="truncate text-stat font-semibold tabular-nums text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-medium text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          {(delta || hint) && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium tabular-nums",
                    trendColor,
                  )}
                >
                  <TrendIcon className="h-3.5 w-3.5" aria-hidden />
                  {delta}
                </span>
              )}
              {hint && <span className="text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>
        {sparkline && <div className="h-10 w-24 shrink-0">{sparkline}</div>}
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  );
}

/** Alias — `KpiCard` and `StatCard` are the same component. */
export const KpiCard = StatCard;
