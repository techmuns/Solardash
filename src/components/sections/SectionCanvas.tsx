"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { cn } from "@/lib/utils";
import type { ColumnDef, ExportMeta, ExportRow } from "@/lib/export";

/** Underlying data for the canvas-footer export (CSV + xlsx with provenance). */
export interface CanvasExport {
  columns: ColumnDef[];
  rows: ExportRow[];
  meta: ExportMeta;
  filename?: string;
}

export interface CanvasKpi {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  /** Pre-formatted change chip (e.g. "+42%"); else derived from the trend's last step. */
  delta?: string;
  /** Optional trajectory — used only to derive `delta` when one isn't supplied. */
  trend?: number[];
  /** Retained for callers; no longer rendered (the strip dropped its sparkline). */
  color?: string;
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
  /** The active tab's underlying data, exported from the canvas footer. */
  exportData?: CanvasExport;
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

function deltaFromTrend(trend?: number[]): string | undefined {
  if (!trend || trend.length < 2) return undefined;
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  if (!prev) return undefined;
  const pct = ((last - prev) / Math.abs(prev)) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/**
 * Compact KPI cell — a small "bold text" stat: label · value · an inline
 * change chip · one context line. The delta reads from `kpi.delta` (or the last
 * step of `kpi.trend`); a KPI with neither shows just its value + context, never
 * a fabricated number.
 */
function KpiCell({ kpi }: { kpi: CanvasKpi }) {
  const delta = kpi.delta ?? deltaFromTrend(kpi.trend);
  const dir = delta?.startsWith("-")
    ? "down"
    : delta?.startsWith("+")
      ? "up"
      : "flat";
  const dColor =
    dir === "up"
      ? "text-positive"
      : dir === "down"
        ? "text-negative"
        : "text-muted-foreground";
  const DIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

  return (
    <div className="flex flex-col justify-center rounded-xl border border-border bg-card px-3.5 py-2.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {kpi.label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="min-w-0 truncate text-xl font-bold leading-none tracking-tight tabular-nums text-foreground">
          {kpi.value}
        </span>
        {kpi.unit && (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {kpi.unit}
          </span>
        )}
        {delta && (
          <span
            className={cn(
              "ml-auto inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums",
              dColor,
            )}
          >
            <DIcon className="h-3.5 w-3.5" aria-hidden />
            {delta}
          </span>
        )}
      </div>
      {kpi.hint && (
        <p className="mt-1 truncate text-[11px] leading-tight text-muted-foreground">
          {kpi.hint}
        </p>
      )}
    </div>
  );
}

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
      {/* KPI strip (omitted when a section carries no headline KPIs) */}
      {kpis.length > 0 && (
        <div className={cn("grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-3", cols)}>
          {kpis.map((k) => (
            <KpiCell key={k.label} kpi={k} />
          ))}
        </div>
      )}

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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-2 text-2xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground/70">Source</span>{" "}
            {tab.source ?? defaultSource}
          </span>
          <span>· As of {asOf}</span>
          {tab.exportData && (
            <div className="ml-auto">
              <ExportMenu
                columns={tab.exportData.columns}
                rows={tab.exportData.rows}
                meta={tab.exportData.meta}
                filename={tab.exportData.filename}
                size="sm"
                label="Export"
              />
            </div>
          )}
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
