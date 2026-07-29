"use client";

import * as React from "react";
import { FillLineSeries } from "@/components/charts/FillCharts";
import { FrequencyToggle } from "@/components/charts/FrequencyToggle";
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
    </div>
  );
}
