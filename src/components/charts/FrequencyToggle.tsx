"use client";

import { cn } from "@/lib/utils";

export interface FrequencyOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Compact segmented control for switching a chart's data frequency
 * (e.g. Quarterly ↔ Annual, Monthly ↔ Annual). Same visual language as
 * `PeriodSelector`, but generic over an arbitrary string union instead of
 * trailing-period counts.
 */
export function FrequencyToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Data frequency",
}: {
  options: FrequencyOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
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
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
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
