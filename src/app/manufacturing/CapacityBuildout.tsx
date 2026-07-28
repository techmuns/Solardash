"use client";

import * as React from "react";
import { FillLineSeries } from "@/components/charts/FillCharts";
import { FrequencyToggle } from "@/components/charts/FrequencyToggle";
import type { Series } from "@/data/types/core";

type Freq = "annual" | "quarterly";

/**
 * Cell vs module nameplate capacity with an Annual ↔ Quarterly toggle. The
 * quarterly view tracks actuals to the latest reported quarter and continues as
 * a dashed line showing the capacity projection per company managements'
 * guidance.
 */
export function CapacityBuildout({
  annual,
  annualPeriods,
  quarterly,
  quarterPeriods,
  projectedKeys,
}: {
  annual: Series[];
  annualPeriods: string[];
  quarterly: Series[];
  quarterPeriods: string[];
  projectedKeys: string[];
}) {
  const [freq, setFreq] = React.useState<Freq>("quarterly");
  const isQ = freq === "quarterly";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-2xs text-muted-foreground">
          {isQ
            ? "Solid = reported nameplate · dashed = guided projection (management concalls / FY28 outlook)"
            : "Reported nameplate capacity by financial year"}
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
        unit="GW"
        periodOrder={isQ ? quarterPeriods : annualPeriods}
        {...(isQ ? { dashedKeys: projectedKeys } : {})}
      />
    </div>
  );
}
