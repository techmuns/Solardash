"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompareTrayItem {
  id: string;
  label: string;
  /** Optional swatch colour (matches the dialog's per-entity colour). */
  color?: string;
}

export interface CompareTrayProps {
  items: CompareTrayItem[];
  min?: number;
  max?: number;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

/**
 * Fixed bottom action bar shown once ≥2 rows are selected. Lists the selected
 * entities as removable chips, plus Clear and an enabled-only-for-2..max
 * "Compare (N)" button. Hidden at 0–1 selected.
 */
export function CompareTray({
  items,
  min = 2,
  max = 4,
  onRemove,
  onClear,
  onCompare,
}: CompareTrayProps) {
  if (items.length < 2) return null;
  const canCompare = items.length >= min && items.length <= max;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold text-foreground">
          Compare
          <span className="ml-1 text-muted-foreground">({items.length})</span>
        </span>

        <ul className="flex flex-1 flex-wrap items-center gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2.5 pr-1 text-xs font-medium text-foreground"
            >
              {it.color ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: it.color }}
                  aria-hidden
                />
              ) : null}
              <span className="max-w-[10rem] truncate">{it.label}</span>
              <button
                type="button"
                onClick={() => onRemove(it.id)}
                aria-label={`Remove ${it.label}`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onCompare}
            disabled={!canCompare}
            className={cn(
              "rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-slate-900 transition-colors",
              canCompare
                ? "hover:bg-brand-dark"
                : "cursor-not-allowed opacity-50",
            )}
          >
            Compare ({items.length})
          </button>
        </div>
      </div>
    </div>
  );
}
