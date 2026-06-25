"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CompareTray } from "@/components/compare/CompareTray";
import {
  CompareDialog,
  type CompareEntity,
  type CompareGroup,
} from "@/components/compare/CompareDialog";
import { useCompareSelection } from "@/components/compare/useCompareSelection";
import { MIX_SEGMENTS, MixBar } from "@/components/compare/MixBar";
import { categoricalColor, energyColor } from "@/lib/colors";
import type { ExportMeta } from "@/lib/export";
import type { Developer } from "@/data/types/developers";
import type { TenderType } from "@/data/types/tenders";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";

function primaryTech(mix: Developer["mix"]): TenderType {
  const entries: [TenderType, number][] = [
    ["solar", mix.solar],
    ["wind", mix.wind],
    ["hybrid", mix.hybrid],
    ["fdre", mix.fdre],
  ];
  return entries.reduce((best, e) => (e[1] > best[1] ? e : best), entries[0])[0];
}

const oneDp = (v: number) => v.toFixed(1);

function buildDeveloperGroups(devs: Developer[]): CompareGroup[] {
  const col = <T,>(get: (d: Developer) => T) => devs.map(get);
  return [
    {
      category: "Capacity (GW)",
      metrics: [
        { label: "Operational", unit: "GW", direction: "high", values: col((d) => d.operationalGw), format: oneDp },
        { label: "Under construction", unit: "GW", direction: "high", values: col((d) => d.underConstructionGw), format: oneDp },
        { label: "Pipeline", unit: "GW", direction: "high", values: col((d) => d.pipelineGw), format: oneDp },
        { label: "FY30 target", unit: "GW", direction: "high", values: col((d) => d.targetGw), format: oneDp },
        { label: "PPA-signed", unit: "GW", direction: "high", values: col((d) => d.ppaSignedGw ?? null), format: oneDp },
      ],
    },
    {
      category: "Portfolio",
      metrics: [
        {
          label: "Tech mix",
          direction: "info",
          values: devs.map(() => null),
          renderCell: (i) => <MixBar mix={devs[i].mix} />,
        },
      ],
    },
  ];
}

export function RosterTable({
  rows,
  exportMeta,
}: {
  rows: Developer[];
  exportMeta?: ExportMeta;
}) {
  const sel = useCompareSelection(4);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const maxOp = Math.max(1, ...rows.map((r) => r.operationalGw));

  const byName = React.useMemo(
    () => new Map(rows.map((r) => [r.name, r])),
    [rows],
  );
  const selectedDevs = React.useMemo(
    () => sel.selected.map((name) => byName.get(name)).filter(Boolean) as Developer[],
    [sel.selected, byName],
  );

  const trayItems = sel.selected.map((name, i) => ({
    id: name,
    label: name,
    color: categoricalColor(i),
  }));
  const entities: CompareEntity[] = selectedDevs.map((d, i) => ({
    id: d.name,
    label: d.name,
    color: categoricalColor(i),
    sublabel: `${d.operationalGw.toFixed(1)} GW operational`,
  }));
  const groups = React.useMemo(
    () => buildDeveloperGroups(selectedDevs),
    [selectedDevs],
  );

  const selectColumn: Column<Developer> = {
    key: "__select",
    header: <span className="sr-only">Select to compare</span>,
    align: "center",
    exportExclude: true,
    headerClassName: "w-9",
    render: (r) => {
      const checked = sel.isSelected(r.name);
      const disabled = !checked && sel.atMax;
      return (
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => sel.toggle(r.name)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Compare ${r.name}`}
          className="h-4 w-4 cursor-pointer accent-brand disabled:cursor-not-allowed disabled:opacity-40"
        />
      );
    },
  };

  const columns: Column<Developer>[] = [
    selectColumn,
    { key: "name", header: "Developer", sortable: true },
    {
      key: "operationalGw",
      header: "Operational",
      align: "right",
      sortable: true,
      accessor: (r) => r.operationalGw,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span
            className="hidden h-1.5 rounded-full bg-brand/70 sm:block"
            style={{ width: `${Math.max(6, (r.operationalGw / maxOp) * 64)}px` }}
            aria-hidden
          />
          <span className="tabular-nums">{r.operationalGw.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "underConstructionGw",
      header: "Under constr.",
      align: "right",
      sortable: true,
      accessor: (r) => r.underConstructionGw,
      render: (r) => r.underConstructionGw.toFixed(1),
    },
    {
      key: "pipelineGw",
      header: "Pipeline",
      align: "right",
      sortable: true,
      accessor: (r) => r.pipelineGw,
      render: (r) => r.pipelineGw.toFixed(1),
    },
    {
      key: "targetGw",
      header: "Target",
      align: "right",
      sortable: true,
      accessor: (r) => r.targetGw,
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.targetGw.toFixed(0)}{" "}
          <span className="text-muted-foreground">{r.targetYear}</span>
        </span>
      ),
    },
    {
      key: "tech",
      header: "Primary",
      sortable: true,
      accessor: (r) => TENDER_TYPE_LABELS[primaryTech(r.mix)],
      exportValue: (r) => TENDER_TYPE_LABELS[primaryTech(r.mix)],
      render: (r) => {
        const t = primaryTech(r.mix);
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: energyColor(t) }}
              aria-hidden
            />
            {TENDER_TYPE_LABELS[t]}
          </span>
        );
      },
    },
    {
      key: "ppaSignedGw",
      header: "PPA-signed",
      align: "right",
      sortable: true,
      accessor: (r) => r.ppaSignedGw ?? -1,
      render: (r) =>
        r.ppaSignedGw != null ? (
          `${r.ppaSignedGw.toFixed(1)} GW`
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={rows}
        getRowKey={(r) => r.name}
        dense
        emptyMessage="No developers."
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
        open={dialogOpen && selectedDevs.length >= 2}
        onClose={() => setDialogOpen(false)}
        title={`Compare developers (${selectedDevs.length})`}
        entities={entities}
        groups={groups}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {MIX_SEGMENTS.map((seg) => (
            <span key={seg.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: seg.color }} aria-hidden />
              {seg.label}
            </span>
          ))}
        </div>
      </CompareDialog>
    </div>
  );
}
