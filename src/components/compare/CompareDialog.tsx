"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

/** Better-direction for best-in-row highlighting (`info` ⇒ no highlight). */
export type CompareDirection = "high" | "low" | "info";

export interface CompareMetric {
  label: string;
  /** Unit shown muted next to the row label, e.g. `₹cr`, `%`, `×`. */
  unit?: string;
  direction: CompareDirection;
  /** One value per entity (aligned to `entities`); null ⇒ rendered as — & skipped. */
  values: (number | null)[];
  /** Cell formatter for numeric values (defaults to a compact number). */
  format?: (v: number) => string;
  /** Full custom cell renderer per entity index (e.g. a mix bar); overrides `values`. */
  renderCell?: (entityIndex: number) => React.ReactNode;
}

export interface CompareGroup {
  category: string;
  metrics: CompareMetric[];
}

export interface CompareEntity {
  id: string;
  label: string;
  color: string;
  sublabel?: string;
}

const dash = <span className="text-muted-foreground/50">—</span>;

function defaultFormat(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toFixed(1);
}

/** Indices of the best (highlighted) cells in a row, per its direction. */
function bestIndices(m: CompareMetric): Set<number> {
  if (m.direction === "info" || m.renderCell) return new Set();
  const present = m.values
    .map((v, i) => [v, i] as const)
    .filter((p): p is readonly [number, number] => p[0] != null);
  if (present.length < 2) return new Set(); // nothing to compare against
  const best =
    m.direction === "high"
      ? Math.max(...present.map(([v]) => v))
      : Math.min(...present.map(([v]) => v));
  return new Set(present.filter(([v]) => v === best).map(([, i]) => i));
}

export interface CompareDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entities: CompareEntity[];
  groups: CompareGroup[];
  /** Extra content below the table (e.g. trend charts). */
  children?: React.ReactNode;
}

export function CompareDialog({
  open,
  onClose,
  title,
  entities,
  groups,
  children,
}: CompareDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="compare-title" className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 id="compare-title" className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Body (scrolls) */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-popover">
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Metric
                </th>
                {entities.map((e) => (
                  <th
                    key={e.id}
                    scope="col"
                    className="min-w-[8.5rem] px-4 py-2.5 text-right align-bottom"
                  >
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: e.color }}
                        aria-hidden
                      />
                      <span className="truncate font-semibold text-foreground">
                        {e.label}
                      </span>
                    </span>
                    {e.sublabel ? (
                      <span className="mt-0.5 block truncate text-2xs font-normal text-muted-foreground">
                        {e.sublabel}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <React.Fragment key={group.category}>
                  <tr>
                    <td
                      colSpan={entities.length + 1}
                      className="bg-muted/40 px-4 py-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {group.category}
                    </td>
                  </tr>
                  {group.metrics.map((m) => {
                    const best = bestIndices(m);
                    return (
                      <tr
                        key={m.label}
                        className="border-b border-border/60 last:border-0"
                      >
                        <th
                          scope="row"
                          className="whitespace-nowrap px-4 py-2 text-left font-medium text-foreground"
                        >
                          {m.label}
                          {m.unit ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              {m.unit}
                            </span>
                          ) : null}
                        </th>
                        {entities.map((e, i) => {
                          const isBest = best.has(i);
                          return (
                            <td
                              key={e.id}
                              className={cn(
                                "px-4 py-2 text-right tabular-nums",
                                isBest
                                  ? "bg-brand/10 font-semibold text-foreground"
                                  : "text-foreground/90",
                              )}
                            >
                              {m.renderCell
                                ? m.renderCell(i)
                                : m.values[i] == null
                                  ? dash
                                  : (m.format ?? defaultFormat)(m.values[i] as number)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {children ? (
          <div className="space-y-6 border-t border-border p-5">{children}</div>
        ) : null}
      </div>
    </Dialog>
  );
}
