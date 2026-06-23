"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { ConfidenceBadge } from "@/components/ui/Badge";
import type { ExportMeta } from "@/lib/export";
import type { CellPlayer } from "@/data/types/manufacturing";

const dash = <span className="text-muted-foreground/50">—</span>;

export function CellCapacityTable({
  rows,
  exportMeta,
}: {
  rows: CellPlayer[];
  exportMeta?: ExportMeta;
}) {
  const columns: Column<CellPlayer>[] = [
    {
      key: "player",
      header: "Manufacturer",
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate">{r.player}</div>
          {r.note && (
            <div className="text-2xs text-muted-foreground">{r.note}</div>
          )}
        </div>
      ),
    },
    {
      key: "nameplateGw",
      header: "Nameplate",
      align: "right",
      sortable: true,
      accessor: (r) => r.nameplateGw,
      render: (r) => r.nameplateGw.toFixed(2),
    },
    {
      key: "almm2Gw",
      header: "ALMM-II",
      align: "right",
      sortable: true,
      accessor: (r) => r.almm2Gw,
      render: (r) => r.almm2Gw.toFixed(2),
    },
    {
      key: "productionGw",
      header: "Production",
      align: "right",
      sortable: true,
      accessor: (r) => r.productionGw ?? -1,
      render: (r) => (r.productionGw != null ? r.productionGw.toFixed(2) : dash),
    },
    {
      key: "utilizationPct",
      header: "Utilisation",
      align: "right",
      sortable: true,
      accessor: (r) => r.utilizationPct ?? -1,
      render: (r) =>
        r.utilizationPct != null ? (
          <div className="flex items-center justify-end gap-2">
            <span
              className="hidden h-1.5 rounded-full sm:block"
              style={{
                width: `${Math.min(100, r.utilizationPct) * 0.6}px`,
                background: r.utilizationPct >= 100 ? "#059669" : "#F59E0B",
              }}
              aria-hidden
            />
            <span className="tabular-nums">{r.utilizationPct}%</span>
          </div>
        ) : (
          dash
        ),
    },
    {
      key: "confidence",
      header: "Conf.",
      align: "center",
      render: (r) => <ConfidenceBadge level={r.confidence} showDot={false} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.player}
      dense
      emptyMessage="No manufacturers."
      exportable
      exportMeta={exportMeta}
    />
  );
}
