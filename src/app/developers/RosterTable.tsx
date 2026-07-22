"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CompareTray } from "@/components/compare/CompareTray";
import {
  CompareDialog,
  type CompareEntity,
  type CompareGroup,
} from "@/components/compare/CompareDialog";
import { useCompareSelection } from "@/components/compare/useCompareSelection";
import { MIX_SEGMENTS, MixBar } from "@/components/compare/MixBar";
import { categoricalColor } from "@/lib/colors";
import type { ExportMeta } from "@/lib/export";
import type { Developer } from "@/data/types/developers";

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
      header: "Target FY30",
      align: "right",
      sortable: true,
      accessor: (r) => r.targetGw,
      render: (r) => {
        const label = (
          <span className="whitespace-nowrap tabular-nums">
            {r.targetGw.toFixed(0)}{" "}
            <span className="text-muted-foreground">{r.targetYear}</span>
          </span>
        );
        // Surface where the (company-guided) target comes from — clickable to source.
        return r.sourceUrl ? (
          <a
            href={r.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Target guidance — ${r.source ?? "company"}`}
            className="inline-flex items-center gap-1 hover:text-brand"
          >
            {label}
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
          </a>
        ) : (
          <span title={r.source ? `Target guidance — ${r.source}` : undefined}>{label}</span>
        );
      },
    },
    {
      // PPA-signed is FORWARD offtake from the PPA tracker (recent auction wins
      // that secure pipeline / UC capacity) — operational GW is contracted by
      // definition. Shown against the forward book so "signed against what" is clear.
      key: "ppaSignedGw",
      header: "PPA-signed (fwd)",
      align: "right",
      sortable: true,
      accessor: (r) => r.ppaSignedGw ?? -1,
      render: (r) => {
        const fwd = r.underConstructionGw + r.pipelineGw;
        return r.ppaSignedGw != null ? (
          <span
            className="whitespace-nowrap tabular-nums"
            title={`${r.ppaSignedGw.toFixed(1)} GW of forward capacity (under-construction + pipeline = ${fwd.toFixed(1)} GW) has a signed PPA, per the PPA tracker. Operational capacity is already contracted.`}
          >
            {r.ppaSignedGw.toFixed(1)}
            <span className="text-muted-foreground"> / {fwd.toFixed(1)}</span>
          </span>
        ) : (
          <span
            className="text-muted-foreground/50"
            title="No forward PPA signing in the tracker (operational capacity is contracted separately)."
          >
            —
          </span>
        );
      },
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
