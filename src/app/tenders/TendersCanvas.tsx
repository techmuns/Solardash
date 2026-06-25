"use client";

import * as React from "react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  FillBarSeries,
  FillDonut,
  FillLineSeries,
} from "@/components/charts/FillCharts";
import { LeaderboardTable } from "./LeaderboardTable";
import { RecentAwardsTable } from "./RecentAwardsTable";
import { cn, formatNumber, formatUnit } from "@/lib/utils";
import type { Series } from "@/data/types/core";
import type {
  AwardRecord,
  DeveloperStanding,
  TenderKpi,
} from "@/data/types/tenders";
import type { PieDatum } from "@/components/charts/PieSeriesChart";
import type { ExportMeta } from "@/lib/export";

const PILLS = [
  { id: "awards", label: "Awards by quarter" },
  { id: "tariff", label: "Tariff trend" },
  { id: "mix", label: "Type mix" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "log", label: "Award log" },
] as const;
type PillId = (typeof PILLS)[number]["id"];

// The five KPI-strip cards (in order), pulled from the snapshot's kpis.
const KPI_KEYS = [
  "awarded_fy26",
  "lowest_tariff",
  "avg_tariff",
  "leading_type",
  "top_developer",
];

function kpiValue(value: number | string): string {
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2);
}

export interface TendersCanvasProps {
  kpis: TenderKpi[];
  awardsByQuarter: Series[];
  quarters: string[];
  tariffHistory: Series[];
  tariffYears: string[];
  typeMixData: PieDatum[];
  leaderboard: DeveloperStanding[];
  recentAwards: AwardRecord[];
  asOfPeriod: string;
  source: string;
  asOf: string;
  leaderboardMeta: ExportMeta;
  awardsMeta: ExportMeta;
}

/**
 * Tenders "focused canvas" (redesign concept 2, the Phase-2 template): a fixed
 * KPI strip + sub-tab pills + a flex-fill canvas that swaps the existing
 * Tenders charts/tables in place, with an optional right side panel. The page
 * never scrolls; the canvas fills the content area and inner tables scroll.
 */
export function TendersCanvas(props: TendersCanvasProps) {
  const [active, setActive] = React.useState<PillId>("awards");

  const kpiCards = KPI_KEYS.map((key) =>
    props.kpis.find((k) => k.key === key),
  ).filter((k): k is TenderKpi => Boolean(k));

  const topWinners = props.leaderboard.slice(0, 5);

  const frame: Record<
    PillId,
    { title: string; subtitle: string; source: string }
  > = {
    awards: {
      title: "Awarded MW by quarter",
      subtitle: "Stacked by tender type",
      source: props.source,
    },
    tariff: {
      title: "Lowest discovered solar tariff by year",
      subtitle: "₹/kWh · calendar years",
      source: "Mercom / SECI (maintained)",
    },
    mix: {
      title: "Tender-type mix",
      subtitle: `Share of ${props.asOfPeriod} MW`,
      source: props.source,
    },
    leaderboard: {
      title: "Top developers by MW won",
      subtitle: "FY26-to-date · sortable · winners where disclosed",
      source: props.source,
    },
    log: {
      title: "Recent awards",
      subtitle: "Atomic award records · filter by type, sort any column",
      source: props.source,
    },
  };
  const f = frame[active];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5 p-4 sm:p-5">
      {/* KPI strip */}
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((k) => (
          <StatCard
            key={k.key}
            label={k.label}
            value={kpiValue(k.value)}
            unit={k.unit ? formatUnit(k.unit) : undefined}
            hint={k.hint}
          />
        ))}
      </div>

      {/* Sub-tab pills */}
      <div
        role="tablist"
        aria-label="Tenders views"
        className="scrollbar-thin flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5"
      >
        {PILLS.map((p) => {
          const on = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(p.id)}
              className={cn(
                "whitespace-nowrap rounded-[10px] border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand",
                on
                  ? "border-border bg-card text-foreground shadow-card"
                  : "border-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {f.title}
            </h3>
            <p className="text-xs text-muted-foreground">{f.subtitle}</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
            {active === "awards" && (
              <FillBarSeries
                series={props.awardsByQuarter}
                stacked
                unit="MW"
                periodOrder={props.quarters}
              />
            )}
            {active === "tariff" && (
              <FillLineSeries
                series={props.tariffHistory}
                unit="₹/kWh"
                periodOrder={props.tariffYears}
              />
            )}
            {active === "mix" && <FillDonut data={props.typeMixData} unit="MW" />}
            {active === "leaderboard" && (
              <div className="min-h-0 flex-1 overflow-auto">
                <LeaderboardTable
                  rows={props.leaderboard}
                  exportMeta={props.leaderboardMeta}
                />
              </div>
            )}
            {active === "log" && (
              <div className="min-h-0 flex-1 overflow-auto">
                <RecentAwardsTable
                  awards={props.recentAwards}
                  exportMeta={props.awardsMeta}
                />
              </div>
            )}
          </div>

          {/* Side panel — only on the awards view */}
          {active === "awards" && (
            <aside className="hidden w-60 shrink-0 flex-col border-l border-border p-4 xl:flex">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top winners · FY26
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {topWinners.map((w, i) => (
                  <div key={w.developer} className="flex items-center gap-2">
                    <span className="w-3 shrink-0 text-2xs tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {w.developer}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatNumber(w.mw)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-2xs text-muted-foreground">
                MW won · FY26-to-date
              </p>
            </aside>
          )}
        </div>

        {/* Footer — source · as-of (kept from ChartFrame) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-2.5 text-2xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground/70">Source</span>{" "}
            {f.source}
          </span>
          <span>· As of {props.asOf}</span>
        </div>
      </Card>
    </div>
  );
}
