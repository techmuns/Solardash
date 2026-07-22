"use client";

import * as React from "react";
import { FillBarSeries } from "@/components/charts/FillCharts";
import { FrequencyToggle } from "@/components/charts/FrequencyToggle";
import { AwardsTooltip } from "./AwardsTooltip";
import type { Series } from "@/data/types/core";
import type { AwardRecord } from "@/data/types/tenders";

type Freq = "quarterly" | "monthly";

/**
 * Awarded-MW chart with a Quarterly ↔ Monthly toggle. Both views are stacked by
 * tender type; the monthly view is finer-grained (auctions plotted in their
 * calendar month). Hover a bar for that period's individual awards.
 */
export function AwardsChart({
  quarterly,
  quarterPeriods,
  quarterAwards,
  monthly,
  monthPeriods,
  monthAwards,
}: {
  quarterly: Series[];
  quarterPeriods: string[];
  quarterAwards: Record<string, AwardRecord[]>;
  monthly: Series[];
  monthPeriods: string[];
  monthAwards: Record<string, AwardRecord[]>;
}) {
  const [freq, setFreq] = React.useState<Freq>("quarterly");
  const isM = freq === "monthly";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 justify-end">
        <FrequencyToggle<Freq>
          options={[
            { value: "quarterly", label: "Quarterly" },
            { value: "monthly", label: "Monthly" },
          ]}
          value={freq}
          onChange={setFreq}
        />
      </div>
      <FillBarSeries
        series={isM ? monthly : quarterly}
        stacked
        unit="MW"
        periodOrder={isM ? monthPeriods : quarterPeriods}
        tooltipContent={
          <AwardsTooltip awardsByPeriod={isM ? monthAwards : quarterAwards} />
        }
      />
    </div>
  );
}
