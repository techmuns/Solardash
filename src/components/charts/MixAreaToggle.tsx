"use client";

import * as React from "react";
import { FillArea } from "./FillCharts";
import type { Series } from "@/data/types/core";
import { cn } from "@/lib/utils";

export interface MixAreaToggleProps {
  series: Series[];
  periodOrder?: string[];
  /** Absolute-units label for the toggle (e.g. `GW`, `MW`). */
  unit?: string;
  /** Lead with the 100%-share view (best shows a composition transition). */
  initialShare?: boolean;
}

/**
 * "Mix over time" canvas body: a stacked-area chart with a small
 * absolute ↔ 100%-share toggle. Fills its stage via FillArea.
 */
export function MixAreaToggle({
  series,
  periodOrder,
  unit = "GW",
  initialShare = false,
}: MixAreaToggleProps) {
  const [share, setShare] = React.useState(initialShare);
  const options: { label: string; value: boolean }[] = [
    { label: unit, value: false },
    { label: "100%", value: true },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1 flex shrink-0 items-center gap-0.5 self-end rounded-lg border border-border bg-card p-0.5">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setShare(o.value)}
            aria-pressed={share === o.value}
            className={cn(
              "rounded-md px-2.5 py-1 text-2xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand",
              share === o.value
                ? "bg-brand/15 text-brand"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <FillArea series={series} periodOrder={periodOrder} unit={unit} share={share} />
    </div>
  );
}
