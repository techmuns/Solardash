"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import { DIRECTION_CLASS } from "@/components/ui/direction";
import { cn } from "@/lib/utils";
import type { StageEconomicsRow } from "@/data/types/profit-pools";

/**
 * Chain-ordered links between the flowchart's node ids and the stage-economics
 * benchmark's stage names. Entries without a `nodeId` (O&M) have no box on the
 * map, so their chip is informational rather than clickable.
 */
export const ECON_CHAIN: { stage: string; label: string; nodeId?: string }[] = [
  { stage: "Polysilicon", label: "Poly", nodeId: "poly" },
  { stage: "Wafer / Ingot", label: "Wafer", nodeId: "wafer" },
  { stage: "Cell", label: "Cell", nodeId: "cell" },
  { stage: "Module", label: "Module", nodeId: "modules" },
  { stage: "Inverter / BoS", label: "Inverter / BoS", nodeId: "bos" },
  { stage: "EPC", label: "EPC", nodeId: "epc" },
  { stage: "IPP / Generation", label: "IPP", nodeId: "ipp" },
  { stage: "O&M", label: "O&M" },
];

const fmtMargin = (v: number) => `${v > 0 ? "+" : ""}${v}%`;

/** One per-stage economics chip: representative margin, direction, region. */
function EconChip({
  label,
  rep,
  onOpen,
}: {
  label: string;
  rep: StageEconomicsRow;
  onOpen?: () => void;
}) {
  const d = DIRECTION_CLASS[rep.directionClass];
  const body = (
    <>
      <span className="flex items-center justify-between gap-1.5">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <d.Icon className="h-3.5 w-3.5 shrink-0" style={{ color: d.color }} aria-hidden />
      </span>
      <span className="mt-0.5 flex items-baseline gap-1.5">
        <span
          className="text-sm font-bold leading-none tabular-nums"
          style={{ color: d.color }}
        >
          {rep.repMargin != null ? fmtMargin(rep.repMargin) : "—"}
        </span>
        <span className="text-2xs leading-none text-muted-foreground">{rep.metric}</span>
      </span>
      <span className="mt-1 block truncate text-2xs leading-none text-muted-foreground">
        {rep.region}
      </span>
    </>
  );

  const base =
    "min-w-[7.25rem] flex-1 shrink-0 rounded-xl border border-border bg-card px-2.5 py-2 text-left";
  if (!onOpen) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${rep.stage} — open stage detail`}
      className={cn(
        base,
        "shadow-card outline-none transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand",
      )}
    >
      {body}
    </button>
  );
}

/**
 * The stage-economics rail under the value-chain flowchart: one chip per chain
 * stage with its representative margin (filings/agency FACT), the Munshot
 * direction read (colour + icon) and the China / India / US split where the
 * stage is bifurcated. Chips open the same stage popup as the map boxes.
 */
export function StageEconomicsStrip({
  rows,
  onOpenStage,
}: {
  rows: StageEconomicsRow[];
  onOpenStage: (nodeId: string) => void;
}) {
  const chips = ECON_CHAIN.map((link) => {
    const stageRows = rows.filter((r) => r.stage === link.stage);
    const rep = stageRows.find((r) => r.rep) ?? stageRows[0];
    if (!rep) return null;
    return { link, rep };
  }).filter((c): c is NonNullable<typeof c> => c != null);
  if (chips.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-border/60 pt-2">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-2xs text-muted-foreground">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Stage economics
          </span>
          <AnalysisTag />
          <span>
            margins = filings / agency FACT · direction = our read · BESS omitted
            (margin unproven)
          </span>
        </p>
        <Link
          href="/profit-pools"
          className="inline-flex shrink-0 items-center gap-1 rounded-md text-2xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
        >
          Full stage economics
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-0.5">
        {chips.map(({ link, rep }) => (
          <EconChip
            key={link.stage}
            label={link.label}
            rep={rep}
            onOpen={link.nodeId ? () => onOpenStage(link.nodeId as string) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
