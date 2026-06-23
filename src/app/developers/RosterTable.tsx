"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { energyColor } from "@/lib/colors";
import type { ExportMeta } from "@/lib/export";
import type { Developer } from "@/data/types/developers";
import type { TenderType } from "@/data/types/tenders";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";

function primaryTech(mix: Developer["mix"]): TenderType {
  const entries: [TenderType, number][] = [
    ["solar", mix.solar],
    ["wind", mix.wind],
    ["hybrid", mix.hybrid],
    ["fdre", mix.fdre],
  ];
  return entries.reduce((best, e) => (e[1] > best[1] ? e : best), entries[0])[0];
}

export function RosterTable({
  rows,
  exportMeta,
}: {
  rows: Developer[];
  exportMeta?: ExportMeta;
}) {
  const maxOp = Math.max(1, ...rows.map((r) => r.operationalGw));

  const columns: Column<Developer>[] = [
    { key: "name", header: "Developer", sortable: true },
    {
      key: "operationalGw",
      header: "Operational",
      align: "right",
      sortable: true,
      accessor: (r) => r.operationalGw,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span
            className="hidden h-1.5 rounded-full bg-brand/70 sm:block"
            style={{ width: `${Math.max(6, (r.operationalGw / maxOp) * 64)}px` }}
            aria-hidden
          />
          <span className="tabular-nums">{r.operationalGw.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "underConstructionGw",
      header: "Under constr.",
      align: "right",
      sortable: true,
      accessor: (r) => r.underConstructionGw,
      render: (r) => r.underConstructionGw.toFixed(1),
    },
    {
      key: "pipelineGw",
      header: "Pipeline",
      align: "right",
      sortable: true,
      accessor: (r) => r.pipelineGw,
      render: (r) => r.pipelineGw.toFixed(1),
    },
    {
      key: "targetGw",
      header: "Target",
      align: "right",
      sortable: true,
      accessor: (r) => r.targetGw,
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.targetGw.toFixed(0)}{" "}
          <span className="text-muted-foreground">{r.targetYear}</span>
        </span>
      ),
    },
    {
      key: "tech",
      header: "Primary",
      sortable: true,
      accessor: (r) => TENDER_TYPE_LABELS[primaryTech(r.mix)],
      exportValue: (r) => TENDER_TYPE_LABELS[primaryTech(r.mix)],
      render: (r) => {
        const t = primaryTech(r.mix);
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: energyColor(t) }}
              aria-hidden
            />
            {TENDER_TYPE_LABELS[t]}
          </span>
        );
      },
    },
    {
      key: "ppaSignedGw",
      header: "PPA-signed",
      align: "right",
      sortable: true,
      accessor: (r) => r.ppaSignedGw ?? -1,
      render: (r) =>
        r.ppaSignedGw != null ? (
          `${r.ppaSignedGw.toFixed(1)} GW`
        ) : (
          <span className="text-muted-foreground/50">—</span>
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
      getRowKey={(r) => r.name}
      dense
      emptyMessage="No developers."
      exportable
      exportMeta={exportMeta}
    />
  );
}
