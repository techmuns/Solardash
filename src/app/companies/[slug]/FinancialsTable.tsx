"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatNumber } from "@/lib/utils";
import type { ExportMeta } from "@/lib/export";
import type { AnnualRow } from "@/data/types/companies";

const dash = <span className="text-muted-foreground/50">—</span>;
const cr = (v?: number) => (v == null ? dash : formatNumber(Math.round(v)));
const pct = (v?: number) => (v == null ? dash : `${v.toFixed(1)}%`);
const rs = (v?: number) => (v == null ? dash : v.toFixed(1));

export function FinancialsTable({
  rows,
  exportMeta,
}: {
  rows: AnnualRow[];
  exportMeta?: ExportMeta;
}) {
  const columns: Column<AnnualRow>[] = [
    {
      key: "period",
      header: "Period",
      sortable: true,
      render: (r) => <span className="whitespace-nowrap font-medium">{r.period}</span>,
    },
    { key: "revenue", header: "Revenue", align: "right", sortable: true, accessor: (r) => r.revenue ?? -1, render: (r) => cr(r.revenue) },
    { key: "ebitda", header: "EBITDA", align: "right", sortable: true, accessor: (r) => r.ebitda ?? -1, render: (r) => cr(r.ebitda) },
    { key: "ebitdaMarginPct", header: "EBITDA %", align: "right", sortable: true, accessor: (r) => r.ebitdaMarginPct ?? -1, render: (r) => pct(r.ebitdaMarginPct) },
    { key: "pat", header: "PAT", align: "right", sortable: true, accessor: (r) => r.pat ?? -1, render: (r) => cr(r.pat) },
    { key: "grossMarginPct", header: "Gross %", align: "right", sortable: true, accessor: (r) => r.grossMarginPct ?? -1, render: (r) => pct(r.grossMarginPct) },
    { key: "roePct", header: "ROE %", align: "right", sortable: true, accessor: (r) => r.roePct ?? -1, render: (r) => pct(r.roePct) },
    { key: "rocePct", header: "ROCE %", align: "right", sortable: true, accessor: (r) => r.rocePct ?? -1, render: (r) => pct(r.rocePct) },
    { key: "capex", header: "Capex", align: "right", sortable: true, accessor: (r) => r.capex ?? -1, render: (r) => cr(r.capex) },
    { key: "netDebt", header: "Net debt", align: "right", sortable: true, accessor: (r) => r.netDebt ?? Number.NEGATIVE_INFINITY, render: (r) => cr(r.netDebt) },
    { key: "epsRs", header: "EPS ₹", align: "right", sortable: true, accessor: (r) => r.epsRs ?? -1, render: (r) => rs(r.epsRs) },
    { key: "wcDays", header: "WC days", align: "right", sortable: true, accessor: (r) => r.wcDays ?? -1, render: (r) => (r.wcDays == null ? dash : String(r.wcDays)) },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.period}
      dense
      emptyMessage="No annual data."
      exportable
      exportMeta={exportMeta}
    />
  );
}
