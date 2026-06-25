"use client";

import * as React from "react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";

export interface CanvasKpi {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}

export interface CanvasSide {
  title: string;
  node: React.ReactNode;
}

export interface CanvasTab {
  id: string;
  /** Pill label. */
  label: string;
  /** Canvas header title. */
  title: string;
  subtitle?: string;
  /** Footer source (falls back to the section `defaultSource`). */
  source?: string;
  /** The fill-canvas body (a FillChart, a scroll-wrapped table, etc.). */
  body: React.ReactNode;
  /** Optional right side panel (~240px, left border). */
  side?: CanvasSide;
}

export interface SectionCanvasProps {
  kpis: CanvasKpi[];
  tabs: CanvasTab[];
  asOf: string;
  defaultSource: string;
  initialTab?: string;
}

const KPI_COLS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * The shared "focused canvas" template (generalised from the Phase-1 Tenders
 * canvas): a fixed KPI strip + sub-tab pills + a flex-fill canvas that swaps
 * the active tab's body in place, with an optional right side panel and a
 * source · as-of footer. The page never scrolls; charts fill via FillCharts and
 * inner tables scroll. Every Phase-2 section renders through this one component.
 */
export function SectionCanvas({
  kpis,
  tabs,
  asOf,
  defaultSource,
  initialTab,
}: SectionCanvasProps) {
  const [active, setActive] = React.useState(initialTab ?? tabs[0].id);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  const cols = KPI_COLS[kpis.length] ?? "lg:grid-cols-5";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5 p-4 sm:p-5">
      {/* KPI strip */}
      <div className={cn("grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3", cols)}>
        {kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.value}
            unit={k.unit}
            hint={k.hint}
          />
        ))}
      </div>

      {/* Sub-tab pills */}
      <div
        role="tablist"
        aria-label="Section views"
        className="scrollbar-thin flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5"
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={cn(
                "whitespace-nowrap rounded-[10px] border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand",
                on
                  ? "border-border bg-card text-foreground shadow-card"
                  : "border-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {tab.title}
            </h3>
            {tab.subtitle && (
              <p className="text-xs text-muted-foreground">{tab.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col px-3 py-2">{tab.body}</div>
          {tab.side && (
            <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-l border-border p-4 xl:flex">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tab.side.title}
              </p>
              <div className="mt-3 min-h-0">{tab.side.node}</div>
            </aside>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-2.5 text-2xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground/70">Source</span>{" "}
            {tab.source ?? defaultSource}
          </span>
          <span>· As of {asOf}</span>
        </div>
      </Card>
    </div>
  );
}

/** Small ranked side-panel list (rank · label · value) reused across sections. */
export function RankList({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-3 shrink-0 text-2xs tabular-nums text-muted-foreground">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {r.label}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
