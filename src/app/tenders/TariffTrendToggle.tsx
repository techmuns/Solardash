"use client";

import * as React from "react";
import { FillLineSeries } from "@/components/charts/FillCharts";
import { cn } from "@/lib/utils";
import type { Series } from "@/data/types/core";

/**
 * Tariff trend with a granularity switch: the long-run "By year" line (lowest
 * discovered solar tariff per calendar year) and a recent "By quarter" view
 * (capacity-weighted solar and solar-plus-storage auction tariff per quarter).
 * Both come from the committed auction feed, which runs through Q4 FY26 (Mar 2026).
 */
export function TariffTrendToggle({
  annual,
  annualOrder,
  quarterly,
  quarterlyOrder,
}: {
  annual: Series[];
  annualOrder: string[];
  quarterly: Series[];
  quarterlyOrder: string[];
}) {
  const [mode, setMode] = React.useState<"year" | "quarter">("year");
  const isYear = mode === "year";
  const hasQuarterly = quarterlyOrder.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="text-2xs text-muted-foreground">
          {isYear
            ? "Lowest discovered solar tariff per calendar year"
            : "Capacity-weighted solar & solar-plus-storage tariff per quarter"}
        </p>
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 text-xs">
          {(["year", "quarter"] as const).map((m) => {
            const disabled = m === "quarter" && !hasQuarterly;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-2 py-0.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand",
                  mode === m
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                  disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
                )}
              >
                {m === "year" ? "By year" : "By quarter"}
              </button>
            );
          })}
        </div>
      </div>
      <FillLineSeries
        series={isYear ? annual : quarterly}
        unit="₹/kWh"
        periodOrder={isYear ? annualOrder : quarterlyOrder}
      />
    </div>
  );
}
