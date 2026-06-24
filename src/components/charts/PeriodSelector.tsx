"use client";

import { cn } from "@/lib/utils";

export interface PeriodOption {
  label: string;
  /** Number of trailing periods to show, or "all". */
  count: number | "all";
}

export interface PeriodSelectorProps {
  options: PeriodOption[];
  value: string;
  onChange: (label: string) => void;
  className?: string;
  /** Accessible label for the group. */
  ariaLabel?: string;
}

/**
 * Compact segmented control (pill buttons) for picking a chart time-range.
 * Accessible: role="group" + per-button aria-pressed; theme-aware; the active
 * pill uses the brand accent.
 */
export function PeriodSelector({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Time range",
}: PeriodSelectorProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.label === value;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.label)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium tabular-nums transition-colors",
              active
                ? "bg-brand text-slate-900 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Drop options that would show everything anyway (count ≥ available) — they're
 * redundant with "all". "all" is always kept. Returns the visible options and a
 * default label clamped to what's visible.
 */
export function visiblePeriodOptions(
  options: PeriodOption[],
  available: number,
  preferredDefault: string,
): { options: PeriodOption[]; defaultLabel: string } {
  const visible = options.filter(
    (o) => o.count === "all" || o.count < available,
  );
  const defaultLabel = visible.some((o) => o.label === preferredDefault)
    ? preferredDefault
    : (visible[visible.length - 1]?.label ?? preferredDefault);
  return { options: visible, defaultLabel };
}
