"use client";

import * as React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { BarSeriesChart } from "@/components/charts/BarSeriesChart";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import {
  PeriodSelector,
  type PeriodOption,
} from "@/components/charts/PeriodSelector";
import { seriesToExport } from "@/components/charts/series";
import type { Series } from "@/data/types/core";
import type { ExportMeta } from "@/lib/export";

const OPTIONS: PeriodOption[] = [
  { label: "All", count: "all" },
  { label: "4Q", count: 4 },
];

/**
 * The two auction time-series (awarded MW by quarter + winning tariffs) sharing
 * a single quarter-range selector. Slicing is done purely via `periodOrder` —
 * the same sliced quarter list drives both charts and both exports — so the
 * underlying series are untouched and stay aligned. KPIs/tables are unaffected.
 */
export function TendersTrends({
  awardsByQuarter,
  tariffByType,
  quarters,
  awardsMeta,
  tariffMeta,
  source,
  asOf,
}: {
  awardsByQuarter: Series[];
  tariffByType: Series[];
  quarters: string[];
  awardsMeta: ExportMeta;
  tariffMeta: ExportMeta;
  source: string;
  asOf: string;
}) {
  const [range, setRange] = React.useState("All");
  const count = OPTIONS.find((o) => o.label === range)?.count ?? "all";
  const periods = count === "all" ? quarters : quarters.slice(-count);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          title="Auction trends"
          subtitle="Awarded MW and winning tariffs by quarter."
        />
        <PeriodSelector
          options={OPTIONS}
          value={range}
          onChange={setRange}
          ariaLabel="Quarter range"
        />
      </div>

      <ChartFrame
        title="Awarded MW by quarter"
        subtitle="Stacked by tender type · whole feed"
        source={source}
        asOf={asOf}
        confidence="medium"
        exportData={{
          ...seriesToExport(awardsByQuarter, periods, "Quarter"),
          meta: awardsMeta,
        }}
      >
        <BarSeriesChart
          series={awardsByQuarter}
          stacked
          unit="MW"
          periodOrder={periods}
          height={320}
        />
      </ChartFrame>

      <ChartFrame
        title="Winning tariffs by type"
        subtitle="₹/kWh · capacity-weighted · excl. standalone BESS"
        source={source}
        asOf={asOf}
        confidence="medium"
        exportData={{
          ...seriesToExport(tariffByType, periods, "Quarter"),
          meta: tariffMeta,
        }}
      >
        <LineSeriesChart
          series={tariffByType}
          unit="₹/kWh"
          periodOrder={periods}
          height={320}
        />
      </ChartFrame>
    </section>
  );
}
