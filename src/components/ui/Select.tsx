"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional right-aligned hint (e.g. a count). */
  hint?: string;
}

/**
 * Compact single-select dropdown in the dashboard's control language (a
 * bordered trigger + popover menu, same visual family as ExportMenu). Closes on
 * outside-click / Escape and marks the active option. Keep option lists short —
 * for long lists it becomes scrollable.
 */
export function Select({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder = "Select…",
  className,
  menuClassName,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex w-full items-center justify-between gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            "absolute left-0 z-30 mt-1 max-h-64 min-w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-panel",
            menuClassName,
          )}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Check
                  className={cn("h-3.5 w-3.5 shrink-0", active ? "opacity-100 text-brand" : "opacity-0")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && (
                  <span className="shrink-0 tabular-nums text-2xs text-muted-foreground">
                    {o.hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
