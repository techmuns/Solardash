"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatNumber } from "@/lib/utils";
import type { ExportMeta } from "@/lib/export";
import type { DeveloperStanding } from "@/data/types/tenders";

export function LeaderboardTable({
  rows,
  exportMeta,
}: {
  rows: DeveloperStanding[];
  exportMeta?: ExportMeta;
}) {
  const maxMw = Math.max(1, ...rows.map((r) => r.mw));

  const columns: Column<DeveloperStanding>[] = [
    { key: "developer", header: "Developer", sortable: true },
    {
      key: "mw",
      header: "MW won",
      align: "right",
      sortable: true,
      accessor: (r) => r.mw,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span
            className="hidden h-1.5 rounded-full bg-brand/70 sm:block"
            style={{ width: `${Math.max(6, (r.mw / maxMw) * 72)}px` }}
            aria-hidden
          />
          <span className="tabular-nums">{formatNumber(r.mw)}</span>
        </div>
      ),
    },
    {
      key: "auctions",
      header: "Auctions",
      align: "right",
      sortable: true,
      accessor: (r) => r.auctions,
    },
    {
      key: "avgTariffRs",
      header: "Avg ₹/unit",
      align: "right",
      sortable: true,
      accessor: (r) => r.avgTariffRs ?? Infinity,
      render: (r) =>
        r.avgTariffRs != null ? (
          r.avgTariffRs.toFixed(2)
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.developer}
      dense
      emptyMessage="No developer standings."
      exportable
      exportMeta={exportMeta}
    />
  );
}
