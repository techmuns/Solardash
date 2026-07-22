"use client";

import * as React from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { cn, formatNumber } from "@/lib/utils";
import type { ExportMeta } from "@/lib/export";
import type { AwardRecord, DeveloperStanding } from "@/data/types/tenders";
import { isListedDeveloper, listedInfo } from "./listed-developers";
import { DeveloperDetailDialog } from "./DeveloperDetailDialog";

export function LeaderboardTable({
  rows,
  awards = [],
  exportMeta,
}: {
  rows: DeveloperStanding[];
  /** Award records, for the per-developer detail popup. */
  awards?: AwardRecord[];
  exportMeta?: ExportMeta;
}) {
  const [listedOnly, setListedOnly] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [openDev, setOpenDev] = React.useState<string | null>(null);

  const listedCount = React.useMemo(
    () => rows.filter((r) => isListedDeveloper(r.developer)).length,
    [rows],
  );
  const q = query.trim().toLowerCase();
  const data = rows.filter((r) => {
    const info = listedInfo(r.developer);
    return (
      (!listedOnly || Boolean(info)) &&
      (!q ||
        r.developer.toLowerCase().includes(q) ||
        (info?.parent ?? "").toLowerCase().includes(q) ||
        (info?.ticker ?? "").toLowerCase().includes(q))
    );
  });

  const maxMw = Math.max(1, ...rows.map((r) => r.mw));

  const columns: Column<DeveloperStanding>[] = [
    {
      key: "developer",
      header: "Developer",
      sortable: true,
      render: (r) => {
        const info = listedInfo(r.developer);
        return (
          <div className="flex min-w-0 flex-col">
            <span className="inline-flex items-center gap-1.5">
              <span className="truncate">{r.developer}</span>
              {info && (
                <span
                  className="shrink-0 rounded bg-positive/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums tracking-wide text-positive"
                  title={`Listed · NSE: ${info.ticker}`}
                >
                  {info.ticker}
                </span>
              )}
            </span>
            {info?.subsidiary && (
              <span className="text-2xs text-muted-foreground">
                ↳ subsidiary of {info.parent}
              </span>
            )}
          </div>
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
    {
      key: "__detail",
      header: <span className="sr-only">Detail</span>,
      align: "right",
      exportExclude: true,
      headerClassName: "w-8",
      render: () => (
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
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
          onRowClick={(r) => setOpenDev(r.developer)}
          dense
          emptyMessage="No developer standings."
          exportable={Boolean(exportMeta)}
          exportMeta={exportMeta}
        />
      </div>
      <DeveloperDetailDialog
        developer={openDev}
        awards={awards}
        onClose={() => setOpenDev(null)}
      />
    </div>
  );
}
