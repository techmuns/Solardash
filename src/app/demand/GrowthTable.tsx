"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import type { GrowthRow } from "@/data/types/power";

function pct(v: number) {
  const s = v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        v > 0 ? "text-positive" : v < 0 ? "text-negative" : "text-muted-foreground",
      )}
    >
      {s}%
    </span>
  );
}

export function GrowthTable({
  rows,
  periodHeader = "Period",
}: {
  rows: GrowthRow[];
  periodHeader?: string;
}) {
  const columns: Column<GrowthRow>[] = [
    { key: "period", header: periodHeader, sortable: true },
    {
      key: "peakYoyPct",
      header: "Peak YoY",
      align: "right",
      sortable: true,
      accessor: (r) => r.peakYoyPct,
      render: (r) => pct(r.peakYoyPct),
    },
    {
      key: "energyYoyPct",
      header: "Energy YoY",
      align: "right",
      sortable: true,
      accessor: (r) => r.energyYoyPct,
      render: (r) => pct(r.energyYoyPct),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.period}
      dense
      emptyMessage="No data."
    />
  );
}
