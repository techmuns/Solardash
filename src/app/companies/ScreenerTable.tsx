"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { CompareTray } from "@/components/compare/CompareTray";
import { CompareDialog, type CompareEntity } from "@/components/compare/CompareDialog";
import { useCompareSelection } from "@/components/compare/useCompareSelection";
import { categoricalColor } from "@/lib/colors";
import { cn, formatNumber } from "@/lib/utils";
import type { ExportMeta } from "@/lib/export";
import type { CompanyDetail, CompanyIdentity } from "@/data/types/companies";
import { RatingBadge, TYPE_LABELS, TypeBadge, upsidePct } from "./company-ui";
import { buildCompanyGroups, buildCompanyTrends } from "./compare-data";

const dash = <span className="text-muted-foreground/50">—</span>;
const gw = (v?: number) =>
  v == null ? dash : Number.isInteger(v) ? formatNumber(v) : String(v);
const cr = (v?: number) => (v == null ? dash : formatNumber(Math.round(v)));
const x = (v?: number) => (v == null ? dash : v.toFixed(1));
const pct = (v?: number) => (v == null ? dash : `${v.toFixed(1)}%`);

function orderBook(c: CompanyIdentity): React.ReactNode {
  if (c.orderBookCr != null) return `₹${formatNumber(c.orderBookCr)} cr`;
  if (c.orderBookGw != null) return `${gw(c.orderBookGw)} GW`;
  return dash;
}

export function ScreenerTable({
  companies,
  details,
  exportMeta,
}: {
  companies: CompanyIdentity[];
  /** Full per-company models (for the compare dialog's metrics + trends). */
  details: CompanyDetail[];
  exportMeta?: ExportMeta;
}) {
  const [type, setType] = React.useState<string>("all");
  const sel = useCompareSelection(4);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const filtered =
    type === "all" ? companies : companies.filter((c) => c.type === type);

  const detailBySlug = React.useMemo(
    () => new Map(details.map((d) => [d.slug, d])),
    [details],
  );
  const identityBySlug = React.useMemo(
    () => new Map(companies.map((c) => [c.slug, c])),
    [companies],
  );

  // Resolve the selection (in pick order) to full detail records.
  const selectedDetails = React.useMemo(
    () =>
      sel.selected.map((slug) => {
        const d = detailBySlug.get(slug);
        if (d) return d;
        const id = identityBySlug.get(slug);
        return { ...(id as CompanyIdentity), hasDetail: false } as CompanyDetail;
      }),
    [sel.selected, detailBySlug, identityBySlug],
  );

  const trayItems = sel.selected.map((slug, i) => ({
    id: slug,
    label: identityBySlug.get(slug)?.name ?? slug,
    color: categoricalColor(i),
  }));

  const entities: CompareEntity[] = selectedDetails.map((d, i) => ({
    id: d.slug,
    label: d.name,
    color: categoricalColor(i),
    sublabel: d.tickerNse ?? TYPE_LABELS[d.type],
  }));
  const groups = React.useMemo(
    () => buildCompanyGroups(selectedDetails),
    [selectedDetails],
  );
  const trends = React.useMemo(
    () => buildCompanyTrends(selectedDetails),
    [selectedDetails],
  );

  const selectColumn: Column<CompanyIdentity> = {
    key: "__select",
    header: <span className="sr-only">Select to compare</span>,
    align: "center",
    exportExclude: true,
    headerClassName: "w-9",
    render: (r) => {
      const checked = sel.isSelected(r.slug);
      const disabled = !checked && sel.atMax;
      return (
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => sel.toggle(r.slug)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Compare ${r.name}`}
          className="h-4 w-4 cursor-pointer accent-brand disabled:cursor-not-allowed disabled:opacity-40"
        />
      );
    },
  };

  const columns: Column<CompanyIdentity>[] = [
    selectColumn,
    {
      key: "name",
      header: "Company",
      sortable: true,
      accessor: (r) => r.name,
      render: (r) => (
        <Link
          href={`/companies/${r.slug}`}
          className="whitespace-nowrap font-medium text-foreground hover:text-brand"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      accessor: (r) => TYPE_LABELS[r.type],
      exportValue: (r) => TYPE_LABELS[r.type],
      render: (r) => <TypeBadge type={r.type} />,
    },
    { key: "moduleGw", header: "Module GW", align: "right", sortable: true, accessor: (r) => r.moduleGw ?? -1, render: (r) => gw(r.moduleGw) },
    { key: "cellGw", header: "Cell GW", align: "right", sortable: true, accessor: (r) => r.cellGw ?? -1, render: (r) => gw(r.cellGw) },
    {
      key: "orderBook",
      header: "Order book",
      exportLabel: "Order book (₹cr/GW)",
      align: "right",
      sortable: true,
      accessor: (r) => r.orderBookCr ?? -1,
      exportValue: (r) => r.orderBookCr ?? r.orderBookGw ?? null,
      render: (r) => <span className="whitespace-nowrap">{orderBook(r)}</span>,
    },
    { key: "revenueFy26Cr", header: "Rev FY26", align: "right", sortable: true, accessor: (r) => r.revenueFy26Cr ?? -1, render: (r) => cr(r.revenueFy26Cr) },
    { key: "ebitdaMarginPct", header: "EBITDA %", align: "right", sortable: true, accessor: (r) => r.ebitdaMarginPct ?? -1, render: (r) => pct(r.ebitdaMarginPct) },
    { key: "peX", header: "P/E", align: "right", sortable: true, accessor: (r) => r.peX ?? Infinity, render: (r) => x(r.peX) },
    { key: "evEbitdaX", header: "EV/EBITDA", align: "right", sortable: true, accessor: (r) => r.evEbitdaX ?? Infinity, render: (r) => x(r.evEbitdaX) },
    { key: "targetPrice", header: "Target", align: "right", sortable: true, accessor: (r) => r.targetPrice ?? -1, render: (r) => (r.targetPrice == null ? dash : `₹${formatNumber(r.targetPrice)}`) },
    { key: "cmp", header: "CMP", align: "right", sortable: true, accessor: (r) => r.cmp ?? -1, render: (r) => (r.cmp == null ? dash : `₹${formatNumber(r.cmp)}`) },
    {
      key: "upside",
      header: "Upside",
      exportLabel: "Upside (%)",
      align: "right",
      sortable: true,
      accessor: (r) => upsidePct(r.targetPrice, r.cmp) ?? -Infinity,
      exportValue: (r) => upsidePct(r.targetPrice, r.cmp) ?? null,
      render: (r) => {
        const up = upsidePct(r.targetPrice, r.cmp);
        if (up == null) return dash;
        return (
          <span
            className={cn(
              "tabular-nums font-medium",
              up > 0 ? "text-positive" : up < 0 ? "text-negative" : "",
            )}
          >
            {up > 0 ? "+" : ""}
            {up.toFixed(1)}%
          </span>
        );
      },
    },
    { key: "rating", header: "Rating", align: "center", render: (r) => <RatingBadge rating={r.rating} /> },
  ];

  return (
    <div className="space-y-3">
      <Tabs defaultValue="all" value={type} onValueChange={setType}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="manufacturer">Manufacturer</TabsTrigger>
          <TabsTrigger value="integrated">Integrated</TabsTrigger>
          <TabsTrigger value="ipp">IPP</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable
        columns={columns}
        data={filtered}
        getRowKey={(r) => r.slug}
        dense
        emptyMessage="No companies of this type."
        exportable={Boolean(exportMeta)}
        exportMeta={exportMeta}
      />

      <CompareTray
        items={trayItems}
        onRemove={sel.remove}
        onClear={sel.clear}
        onCompare={() => setDialogOpen(true)}
      />

      <CompareDialog
        open={dialogOpen && selectedDetails.length >= 2}
        onClose={() => setDialogOpen(false)}
        title={`Compare companies (${selectedDetails.length})`}
        entities={entities}
        groups={groups}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              Revenue <span className="text-xs font-normal text-muted-foreground">₹ cr</span>
            </h3>
            <LineSeriesChart series={trends.revenue} unit="₹cr" periodOrder={trends.periodOrder} height={240} />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              EBITDA margin <span className="text-xs font-normal text-muted-foreground">%</span>
            </h3>
            <LineSeriesChart series={trends.margin} unit="%" periodOrder={trends.periodOrder} height={240} />
          </div>
        </div>
      </CompareDialog>
    </div>
  );
}
