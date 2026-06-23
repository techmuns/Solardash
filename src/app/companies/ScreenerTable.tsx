"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn, formatNumber } from "@/lib/utils";
import type { CompanyIdentity } from "@/data/types/companies";
import { RatingBadge, TYPE_LABELS, TypeBadge, upsidePct } from "./company-ui";

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

export function ScreenerTable({ companies }: { companies: CompanyIdentity[] }) {
  const [type, setType] = React.useState<string>("all");
  const filtered =
    type === "all" ? companies : companies.filter((c) => c.type === type);

  const columns: Column<CompanyIdentity>[] = [
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
      render: (r) => <TypeBadge type={r.type} />,
    },
    { key: "moduleGw", header: "Module GW", align: "right", sortable: true, accessor: (r) => r.moduleGw ?? -1, render: (r) => gw(r.moduleGw) },
    { key: "cellGw", header: "Cell GW", align: "right", sortable: true, accessor: (r) => r.cellGw ?? -1, render: (r) => gw(r.cellGw) },
    {
      key: "orderBook",
      header: "Order book",
      align: "right",
      sortable: true,
      accessor: (r) => r.orderBookCr ?? -1,
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
      align: "right",
      sortable: true,
      accessor: (r) => upsidePct(r.targetPrice, r.cmp) ?? -Infinity,
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
    { key: "confidence", header: "Conf.", align: "center", render: (r) => <ConfidenceBadge level={r.confidence} showDot={false} /> },
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
      />
    </div>
  );
}
