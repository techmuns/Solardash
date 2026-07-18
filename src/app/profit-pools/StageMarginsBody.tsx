"use client";

import * as React from "react";
import { FillLineSeries } from "@/components/charts/FillCharts";
import { FrequencyToggle } from "@/components/charts/FrequencyToggle";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import type { Series } from "@/data/types/core";

type Freq = "quarterly" | "annual";

/**
 * Stage-margins tab body with a Quarterly ↔ Annual frequency toggle. Quarterly
 * is the default (the higher-frequency read from SEBI-LODR quarterly results);
 * Annual keeps the long FY20 → FY26 arc from annual reports.
 */
export function StageMarginsBody({
  annual,
  annualPeriods,
  quarterly,
  quarterPeriods,
}: {
  annual: Series[];
  annualPeriods: string[];
  quarterly: Series[];
  quarterPeriods: string[];
}) {
  const [freq, setFreq] = React.useState<Freq>("quarterly");
  const isQ = freq === "quarterly";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-1">
        <p className="text-2xs text-muted-foreground">
          {isQ
            ? `Quarterly results (SEBI LODR filings) · ${quarterPeriods[0] ?? ""} → ${quarterPeriods[quarterPeriods.length - 1] ?? ""}`
            : `Annual reports · ${annualPeriods[0] ?? ""} → ${annualPeriods[annualPeriods.length - 1] ?? ""}`}
        </p>
        <FrequencyToggle<Freq>
          options={[
            { value: "quarterly", label: "Quarterly" },
            { value: "annual", label: "Annual" },
          ]}
          value={freq}
          onChange={setFreq}
        />
      </div>
      <FillLineSeries
        series={isQ ? quarterly : annual}
        unit="%"
        periodOrder={isQ ? quarterPeriods : annualPeriods}
      />
      <p className="mt-1 shrink-0 text-2xs leading-snug text-muted-foreground">
        <AnalysisTag />{" "}
        {isQ ? (
          <>
            The quarterly read sharpens the same migration: the manufacturing
            pool re-rates ~13% → ~24% EBITDA across FY24 → FY26 with only mild
            quarter noise, and the generation pool steps up in FY26 partly on
            mix as pure-play IPPs enter the pool. Constituents vary by quarter
            as names list and start reporting.
          </>
        ) : (
          <>
            Manufacturing pool margin tripled off its FY22 trough (~4% → 22%)
            as ALMM/DCR protection and scale took hold; IPP margins stayed
            structurally high on long-tenor PPAs — value is migrating into
            protected domestic manufacturing.
          </>
        )}
      </p>
    </div>
  );
}
