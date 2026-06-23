"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge, ConfidenceBadge, type ConfidenceLevel } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { ExportMeta } from "@/lib/export";
import type { ProvenanceRow } from "@/data";

const CONF_ORDER: ConfidenceLevel[] = ["high", "medium", "modelled"];

export function ProvenanceTable({
  rows,
  exportMeta,
}: {
  rows: ProvenanceRow[];
  exportMeta?: ExportMeta;
}) {
  const columns: Column<ProvenanceRow>[] = [
    {
      key: "section",
      header: "Section",
      sortable: true,
      accessor: (r) => r.section,
      render: (r) => (
        <span className="font-medium capitalize text-foreground">{r.section}</span>
      ),
    },
    {
      key: "dataset",
      header: "Dataset",
      sortable: true,
      render: (r) => <span className="text-muted-foreground">{r.dataset}</span>,
    },
    {
      key: "cadence",
      header: "Cadence",
      sortable: true,
      accessor: (r) => r.cadence,
      render: (r) => (
        <Badge variant="outline" className="capitalize">
          {r.cadence}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: "As of",
      align: "right",
      sortable: true,
      accessor: (r) => r.updatedAt,
      render: (r) => (
        <span className="whitespace-nowrap">{formatDate(r.updatedAt)}</span>
      ),
    },
    {
      key: "sources",
      header: "Sources",
      exportValue: (r) => [...new Set(r.sources.map((s) => s.name))].join("; "),
      render: (r) => {
        const names = [...new Set(r.sources.map((s) => s.name))];
        return (
          <span className="block max-w-[22rem] text-muted-foreground">
            {names.join(" · ")}
          </span>
        );
      },
    },
    {
      key: "confidence",
      header: "Confidence",
      exportValue: (r) =>
        CONF_ORDER.filter((l) => r.sources.some((s) => s.confidence === l)).join(", "),
      render: (r) => {
        const levels = CONF_ORDER.filter((l) =>
          r.sources.some((s) => s.confidence === l),
        );
        return (
          <span className="inline-flex flex-wrap gap-1">
            {levels.map((l) => (
              <ConfidenceBadge key={l} level={l} showDot={false} />
            ))}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => `${r.section}/${r.dataset}`}
      dense
      emptyMessage="No datasets."
      exportable
      exportMeta={exportMeta}
    />
  );
}
