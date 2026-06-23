"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatNumber } from "@/lib/utils";
import type { QuarterRow } from "@/data/types/companies";

const dash = <span className="text-muted-foreground/50">—</span>;
const cr = (v?: number) => (v == null ? dash : formatNumber(Math.round(v)));
const pct = (v?: number) => (v == null ? dash : `${v.toFixed(1)}%`);

export function QuarterlyTable({ rows }: { rows: QuarterRow[] }) {
  const columns: Column<QuarterRow>[] = [
    {
      key: "period",
      header: "Quarter",
      sortable: true,
      render: (r) => <span className="whitespace-nowrap font-medium">{r.period}</span>,
    },
    { key: "revenue", header: "Revenue", align: "right", sortable: true, accessor: (r) => r.revenue ?? -1, render: (r) => cr(r.revenue) },
    { key: "ebitda", header: "EBITDA", align: "right", sortable: true, accessor: (r) => r.ebitda ?? -1, render: (r) => cr(r.ebitda) },
    { key: "ebitdaMarginPct", header: "EBITDA %", align: "right", sortable: true, accessor: (r) => r.ebitdaMarginPct ?? -1, render: (r) => pct(r.ebitdaMarginPct) },
    { key: "pat", header: "PAT", align: "right", sortable: true, accessor: (r) => r.pat ?? -1, render: (r) => cr(r.pat) },
    { key: "patMarginPct", header: "PAT %", align: "right", sortable: true, accessor: (r) => r.patMarginPct ?? -1, render: (r) => pct(r.patMarginPct) },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.period}
      dense
      emptyMessage="No quarterly data."
    />
  );
}
