import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
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

/** A one-word "what happens here" — the verbs read as a flow when chained. */
const STAGE_ROLE: Record<string, string> = {
  polysilicon: "Feedstock",
  wafer: "Sliced",
  cell: "Energised",
  module: "Assembled",
  bos: "Hardware",
  epc: "Built",
  ipp: "Operated",
  grid: "Carried",
  offtake: "Consumed",
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

/** A visual stage node: a heat-tinted icon, the flow-role, the capability name,
 *  and the companies that operate there. The whole node drills to its detail tab. */
function StageNode({ stage }: { stage: VcStage }) {
  const Icon = STAGE_ICON[stage.id] ?? Layers;
  const role = STAGE_ROLE[stage.id];
  const color = HEAT_COLOR[stage.heat];
  return (
    <div
      className={cn(
        "group relative flex w-40 shrink-0 flex-col items-center rounded-2xl border bg-card p-3.5 text-center shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-card-hover",
        stage.emphasis ? "border-brand/50 ring-1 ring-brand/20" : "border-border",
      )}
    >
      {stage.emphasis && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-card">
          ★ ALMM live
        </span>
      )}
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: `${color}1f`, color }}
        aria-hidden
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>
      {role && (
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          {role}
        </span>
      )}
      <Link
        href={stage.href}
        className="mt-0.5 text-sm font-semibold leading-tight tracking-tight text-foreground outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-brand"
      >
        {stage.name}
      </Link>
      {stage.players.length > 0 && (
        <div className="relative z-10 mt-2.5 flex flex-wrap justify-center gap-1">
          {stage.players.slice(0, 4).map((p) => (
            <Avatar key={p.name} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A directional connector between two nodes — a line that ends in an arrowhead. */
function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center self-center" aria-hidden>
      <span className="h-px w-4 bg-border sm:w-5" />
      <ArrowRight className="-ml-1.5 h-4 w-4 text-border" strokeWidth={2.5} />
    </div>
  );
}

/** A horizontal flow tier: a numbered label, then the stages chained by arrows. */
function FlowTier({
  step,
  label,
  stages,
}: {
  step: number;
  label: string;
  stages: VcStage[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-2xs font-bold text-brand">
          {step}
        </span>
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="scrollbar-thin overflow-x-auto pb-1">
        <div className="flex items-stretch justify-center gap-1">
          {stages.map((s, i) => (
            <React.Fragment key={s.id}>
              <StageNode stage={s} />
              {i < stages.length - 1 && <FlowArrow />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The branch between the tiers: the finished panel + balance-of-system are
 *  engineered into operating plants. Shows BoS feeding in as a side-input. */
function Junction({ bos }: { bos: VcStage }) {
  const color = HEAT_COLOR[bos.heat];
  return (
    <div className="flex flex-col items-center gap-1.5" aria-label="Panels are built into operating plants">
      <span className="h-3 w-px bg-border" aria-hidden />
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 shadow-card">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand">
          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-2xs font-medium text-muted-foreground">
          Built into operating plants
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <Link
          href={bos.href}
          title={`${bos.name} feeds in here`}
          className="group relative flex items-center gap-1.5 rounded-full pr-1 text-2xs font-semibold text-foreground/80 outline-none transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: `${color}1f`, color }}
            aria-hidden
          >
            <Cable className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          + {bos.name}
        </Link>
      </div>
      <span className="h-3 w-px bg-border" aria-hidden />
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
 * The solar value-chain flowchart — how a panel becomes power. The silicon chain
 * flows left→right (polysilicon → wafers → cells → modules); the finished panel
 * plus balance-of-system then drops into the deployment chain (EPC → IPP → grid →
 * end markets). Each node is heat-tinted by its profit pool, drills to its detail
 * tab, and carries the companies that operate there as clickable monograms.
 */
export function ValueChainMap() {
  // The silicon chain is the linear upstream flow; Balance of System is a
  // parallel hardware input that joins at deployment, so it feeds the junction.
  const siliconChain = VC_MFG.filter((s) => s.id !== "bos");
  const bos = VC_MFG.find((s) => s.id === "bos");

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-gradient-to-b from-muted/30 to-transparent p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          The solar value chain — how a panel becomes power
        </h2>
        <HeatLegend />
      </div>

      <FlowTier step={1} label="Make the panel · upstream manufacturing" stages={siliconChain} />

      {bos && <Junction bos={bos} />}

      <FlowTier step={2} label="Build & sell the power · downstream deployment" stages={VC_DEPLOY} />
    </section>
  );
}
