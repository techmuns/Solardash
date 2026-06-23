"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber } from "@/lib/utils";
import type { AwardRecord } from "@/data/types/tenders";
import { TENDER_TYPE_LABELS, TENDER_TYPE_ORDER } from "@/lib/tender-types";

const dash = <span className="text-muted-foreground/50">—</span>;

export function RecentAwardsTable({ awards }: { awards: AwardRecord[] }) {
  const [type, setType] = React.useState<string>("all");

  const presentTypes = TENDER_TYPE_ORDER.filter((t) =>
    awards.some((a) => a.tenderType === t),
  );
  const filtered =
    type === "all" ? awards : awards.filter((a) => a.tenderType === type);

  const columns: Column<AwardRecord>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (r) => r.date,
      render: (r) => (
        <span className="whitespace-nowrap">{formatDate(r.date, "d MMM yy")}</span>
      ),
    },
    { key: "agency", header: "Agency", sortable: true },
    {
      key: "tenderType",
      header: "Type",
      sortable: true,
      accessor: (r) => TENDER_TYPE_LABELS[r.tenderType],
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ background: energyColor(r.tenderType) }}
            aria-hidden
          />
          {TENDER_TYPE_LABELS[r.tenderType]}
        </span>
      ),
    },
    {
      key: "capacityMw",
      header: "MW",
      align: "right",
      sortable: true,
      accessor: (r) => r.capacityMw,
      render: (r) => formatNumber(r.capacityMw),
    },
    {
      key: "storageMwh",
      header: "Storage",
      align: "right",
      sortable: true,
      accessor: (r) => r.storageMwh ?? -1,
      render: (r) =>
        r.storageMwh != null ? `${formatNumber(r.storageMwh)} MWh` : dash,
    },
    {
      key: "tariffRs",
      header: "₹/unit",
      align: "right",
      sortable: true,
      accessor: (r) => r.tariffRs ?? Infinity,
      render: (r) => (r.tariffRs != null ? r.tariffRs.toFixed(2) : dash),
    },
    {
      key: "winners",
      header: "Winners",
      render: (r) => {
        const text =
          (r.winners ?? [])
            .map((w) => (w.mw != null ? `${w.developer} (${w.mw})` : w.developer))
            .join(", ") || "—";
        return (
          <span
            className="block max-w-[18rem] truncate text-muted-foreground"
            title={text}
          >
            {text}
          </span>
        );
      },
    },
    {
      key: "state",
      header: "State",
      render: (r) =>
        r.state ? r.state : <span className="text-muted-foreground/60">Central</span>,
    },
    {
      key: "confidence",
      header: "Conf.",
      align: "center",
      render: (r) => <ConfidenceBadge level={r.confidence} showDot={false} />,
    },
  ];

  return (
    <div className="space-y-3">
      <Tabs defaultValue="all" value={type} onValueChange={setType}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {presentTypes.map((t) => (
            <TabsTrigger key={t} value={t}>
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ background: energyColor(t) }}
                aria-hidden
              />
              {TENDER_TYPE_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTable
        columns={columns}
        data={filtered}
        getRowKey={(r) => r.id}
        dense
        className="max-h-[28rem]"
        emptyMessage="No awards for this type."
      />
    </div>
  );
}
