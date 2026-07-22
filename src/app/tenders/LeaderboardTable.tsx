"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { cn, formatNumber } from "@/lib/utils";
import type { ExportMeta } from "@/lib/export";
import type { DeveloperStanding } from "@/data/types/tenders";
import { LISTED_DEVELOPERS, isListedDeveloper } from "./listed-developers";

export function LeaderboardTable({
  rows,
  exportMeta,
}: {
  rows: DeveloperStanding[];
  exportMeta?: ExportMeta;
}) {
  const [listedOnly, setListedOnly] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const listedCount = React.useMemo(
    () => rows.filter((r) => isListedDeveloper(r.developer)).length,
    [rows],
  );
  const q = query.trim().toLowerCase();
  const data = rows.filter(
    (r) =>
      (!listedOnly || isListedDeveloper(r.developer)) &&
      (!q ||
        r.developer.toLowerCase().includes(q) ||
        (LISTED_DEVELOPERS[r.developer] ?? "").toLowerCase().includes(q)),
  );

  const maxMw = Math.max(1, ...rows.map((r) => r.mw));

  const columns: Column<DeveloperStanding>[] = [
    {
      key: "developer",
      header: "Developer",
      sortable: true,
      render: (r) => {
        const ticker = LISTED_DEVELOPERS[r.developer];
        return (
          <span className="inline-flex items-center gap-1.5">
            {r.developer}
            {ticker && (
              <span
                className="rounded bg-positive/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums tracking-wide text-positive"
                title={`Listed · NSE: ${ticker}`}
              >
                {ticker}
              </span>
            )}
          </span>
        );
      },
    },
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
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search developer…"
            aria-label="Search developers"
            className="h-7 w-48 rounded-lg border border-border bg-card pl-7 pr-7 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-brand"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={listedOnly}
          onClick={() => setListedOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand",
            listedOnly
              ? "border-positive/40 bg-positive/10 text-positive"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              listedOnly ? "bg-positive" : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
          Listed only
        </button>
        <span className="text-2xs text-muted-foreground">
          {q
            ? `${data.length} match${data.length === 1 ? "" : "es"}`
            : listedOnly
              ? `${listedCount} listed of ${rows.length} developers`
              : `${listedCount} of ${rows.length} trade publicly (NSE/BSE)`}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={data}
          getRowKey={(r) => r.developer}
          dense
          emptyMessage="No developer standings."
          exportable={Boolean(exportMeta)}
          exportMeta={exportMeta}
        />
      </div>
    </div>
  );
}
