"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import type { GlossaryTerm } from "@/data/types/reference";

export function GlossaryTable({ rows }: { rows: GlossaryTerm[] }) {
  const columns: Column<GlossaryTerm>[] = [
    {
      key: "term",
      header: "Term",
      sortable: true,
      render: (r) => (
        <span className="whitespace-nowrap font-semibold text-foreground">{r.term}</span>
      ),
    },
    {
      key: "definition",
      header: "Definition",
      render: (r) => <span className="text-muted-foreground">{r.definition}</span>,
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.term}
      dense
      emptyMessage="No terms."
    />
  );
}
