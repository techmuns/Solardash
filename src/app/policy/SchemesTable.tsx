"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/utils";
import type { Scheme } from "@/data/types/policy";

const dash = <span className="text-muted-foreground/50">—</span>;

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const variant = s.includes("active")
    ? "positive"
    : s.includes("effective")
      ? "brand"
      : "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}

export function SchemesTable({ rows }: { rows: Scheme[] }) {
  const columns: Column<Scheme>[] = [
    {
      key: "scheme",
      header: "Scheme",
      sortable: true,
      render: (r) => (
        <span className="whitespace-nowrap font-medium text-foreground">{r.scheme}</span>
      ),
    },
    { key: "category", header: "Category", sortable: true },
    {
      key: "target",
      header: "Target / scope",
      render: (r) => (
        <span className="block max-w-[16rem] text-muted-foreground">{r.target}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "allocationCr",
      header: "Allocation",
      align: "right",
      sortable: true,
      accessor: (r) => r.allocationCr ?? -1,
      render: (r) =>
        r.allocationCr != null ? `₹${formatNumber(r.allocationCr)} cr` : dash,
    },
    {
      key: "keyMetric",
      header: "Key metric",
      render: (r) => (
        <span className="block max-w-[18rem] text-muted-foreground">{r.keyMetric}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.scheme}
      dense
      emptyMessage="No schemes."
    />
  );
}
