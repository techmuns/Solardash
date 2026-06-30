import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Atom,
  Building,
  Building2,
  Cable,
  Grid2x2,
  HardHat,
  Layers,
  LayoutGrid,
  Network,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HEAT_COLOR,
  VC_DEPLOY,
  VC_MFG,
  type Heat,
  type VcPlayer,
  type VcStage,
} from "@/data/value-chain";

/** One clean icon per stage — the "image" for that capability. */
const STAGE_ICON: Record<string, LucideIcon> = {
  polysilicon: Atom,
  wafer: Layers,
  cell: Grid2x2,
  module: LayoutGrid,
  bos: Cable,
  epc: HardHat,
  ipp: Building2,
  grid: Network,
  offtake: Building,
};

const HEAT_LABEL: Record<Heat, string> = {
  loss: "Loss-making",
  thin: "Thin",
  mod: "Moderate",
  fat: "Profitable",
  regulated: "Regulated",
  offtake: "Offtake risk",
};

function initials(name: string): string {
  return name
    .split(/[\s./&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** A company monogram — clickable to its page when we track it, else muted. */
function Avatar({ player }: { player: VcPlayer }) {
  const base =
    "flex h-7 w-7 items-center justify-center rounded-full text-2xs font-semibold leading-none";
  return player.slug ? (
    <Link
      href={`/companies/${player.slug}`}
      title={player.name}
      aria-label={player.name}
      className={cn(
        base,
        "relative z-10 border border-border bg-card text-foreground/80 outline-none transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand",
      )}
    >
      {initials(player.name)}
    </Link>
  ) : (
    <span
      title={player.name}
      className={cn(base, "border border-dashed border-border bg-muted text-muted-foreground")}
    >
      {initials(player.name)}
    </span>
  );
}

/** A visual stage tile: a heat-tinted icon, the capability name, and the
 *  companies that operate there. The whole tile drills to the detail tab. */
function StageTile({ stage }: { stage: VcStage }) {
  const Icon = STAGE_ICON[stage.id] ?? Layers;
  const color = HEAT_COLOR[stage.heat];
  return (
    <div
      className={cn(
        "group relative flex w-40 shrink-0 flex-col items-center rounded-2xl border bg-card p-3.5 text-center shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-card-hover",
        stage.emphasis ? "border-brand/50 ring-1 ring-brand/20" : "border-border",
      )}
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: `${color}1f`, color }}
        aria-hidden
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <Link
        href={stage.href}
        className="mt-2.5 text-sm font-semibold leading-tight tracking-tight text-foreground outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-brand"
      >
        {stage.name}
      </Link>
      {stage.players.length > 0 && (
        <div className="relative z-10 mt-2.5 flex flex-wrap justify-center gap-1">
          {stage.players.slice(0, 5).map((p) => (
            <Avatar key={p.name} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Band({ label, stages }: { label: string; stages: VcStage[] }) {
  return (
    <div>
      <p className="mb-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="scrollbar-thin flex items-stretch gap-1 overflow-x-auto pb-1">
        {stages.map((s, i) => (
          <React.Fragment key={s.id}>
            <StageTile stage={s} />
            {i < stages.length - 1 && (
              <div className="flex shrink-0 items-center" aria-hidden>
                <ArrowRight className="h-4 w-4 text-border" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function HeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
      {(["fat", "mod", "thin", "loss"] as Heat[]).map((h) => (
        <span key={h} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: HEAT_COLOR[h] }} />
          {HEAT_LABEL[h]}
        </span>
      ))}
    </div>
  );
}

/**
 * The clean, visual value-chain map — two flow bands of icon stage tiles
 * (manufacturing → deployment), each tinted by profit-pool heat and carrying the
 * companies that operate there as clickable monograms. No prose, no numbers —
 * click a stage to drill into the detail tab, or a company to open its page.
 */
export function ValueChainMap() {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border bg-gradient-to-b from-muted/30 to-transparent p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          The solar value chain — who plays where
        </h2>
        <HeatLegend />
      </div>
      <Band label="Make the panel · manufacturing →" stages={VC_MFG} />
      <Band label="Build & sell the power · deployment →" stages={VC_DEPLOY} />
    </section>
  );
}
