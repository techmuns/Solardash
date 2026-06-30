import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Atom,
  Boxes,
  Building2,
  Cable,
  Grid2x2,
  HardHat,
  Home,
  Layers,
  LayoutGrid,
  Lightbulb,
  Package,
  Package2,
  PanelTop,
  Settings2,
  Square,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FitWidth } from "./FitWidth";
import {
  HEAT_COLOR,
  VC_DEPLOY,
  VC_MFG,
  type Heat,
  type VcPlayer,
  type VcStage,
} from "@/data/value-chain";

/* ------------------------------------------------------------------ *
 * Node model — the value chain as a branching graph (after Figure 1).
 * Three states: a tracked value-chain "stage" (heat-tinted, clickable,
 * with companies), an application "segment" (brand-tinted, clickable),
 * or a "muted" box we don't track yet (greyed, not clickable).
 * ------------------------------------------------------------------ */
type NodeKind = "stage" | "segment" | "muted";

interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  icon: LucideIcon;
  heat?: Heat;
  players?: VcPlayer[];
  href?: string;
  badge?: string;
}

/** Look up a curated stage by id (build-time safety — ids are known). */
function stage(id: string): VcStage {
  const s = [...VC_MFG, ...VC_DEPLOY].find((x) => x.id === id);
  if (!s) throw new Error(`value-chain: unknown stage "${id}"`);
  return s;
}

/** Build a tracked-stage node, pulling heat / players / drill target from data. */
function stageNode(p: {
  id: string;
  label: string;
  stageId: string;
  icon: LucideIcon;
  badge?: string;
}): FlowNode {
  const s = stage(p.stageId);
  return {
    id: p.id,
    label: p.label,
    kind: "stage",
    icon: p.icon,
    heat: s.heat,
    players: s.players,
    href: s.href,
    badge: p.badge,
  };
}

const N: Record<string, FlowNode> = {
  // Thin-film path — no Indian manufacturing base, so greyed.
  pvMaterials: { id: "pvMaterials", label: "PV Materials", kind: "muted", icon: Boxes },
  substrate: { id: "substrate", label: "Substrate", kind: "muted", icon: Square },
  // Crystalline-silicon path — India's actual path; tracked.
  poly: stageNode({ id: "poly", label: "Poly-silicon", stageId: "polysilicon", icon: Atom }),
  wafer: stageNode({ id: "wafer", label: "Ingots & Wafers", stageId: "wafer", icon: Layers }),
  cell: stageNode({ id: "cell", label: "PV Cells", stageId: "cell", icon: Grid2x2, badge: "★ ALMM live" }),
  // Module inputs.
  solarGlass: { id: "solarGlass", label: "Solar Glass", kind: "muted", icon: PanelTop },
  bos: stageNode({ id: "bos", label: "Balance of System", stageId: "bos", icon: Cable }),
  // The convergence.
  modules: stageNode({ id: "modules", label: "PV Modules", stageId: "module", icon: LayoutGrid }),
  // Application segments.
  gridPlant: { id: "gridPlant", label: "Grid Power Plant", kind: "segment", icon: Sun, href: "/developers" },
  rooftop: { id: "rooftop", label: "Rooftop / Offgrid", kind: "segment", icon: Home, href: "/power-system" },
  solarProducts: { id: "solarProducts", label: "Solar Products", kind: "muted", icon: Package },
  // Roles & sub-applications.
  epc: stageNode({ id: "epc", label: "EPC", stageId: "epc", icon: HardHat }),
  ipp: stageNode({ id: "ipp", label: "IPP", stageId: "ipp", icon: Building2 }),
  sysIntegration: { id: "sysIntegration", label: "System Integration", kind: "muted", icon: Settings2 },
  lanterns: { id: "lanterns", label: "Lanterns & Lights", kind: "muted", icon: Lightbulb },
  waterPumps: { id: "waterPumps", label: "Solar Water Pumps", kind: "muted", icon: Zap },
  otherProducts: { id: "otherProducts", label: "Other Solar Products", kind: "muted", icon: Package2 },
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
    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold leading-none";
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

/** One box in the flowchart — rendered by state. */
function FlowBox({ node }: { node: FlowNode }) {
  const Icon = node.icon;

  if (node.kind === "muted") {
    return (
      <div
        className="flex w-28 shrink-0 flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 p-2.5 text-center opacity-90"
        title="Not tracked yet"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground/50"
          aria-hidden
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="mt-2 text-xs font-medium leading-tight text-muted-foreground">
          {node.label}
        </span>
      </div>
    );
  }

  const heatColor = node.kind === "stage" && node.heat ? HEAT_COLOR[node.heat] : undefined;
  return (
    <div
      className={cn(
        "group relative flex w-28 shrink-0 flex-col items-center rounded-2xl border p-2.5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
        heatColor ? "" : "border-border bg-card hover:border-brand/40",
      )}
      style={
        heatColor
          ? {
              backgroundColor: `${heatColor}33`,
              borderColor: node.badge ? heatColor : `${heatColor}b3`,
            }
          : undefined
      }
    >
      {node.badge && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-card">
          {node.badge}
        </span>
      )}
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl",
          !heatColor && "bg-brand/10 text-brand",
        )}
        style={heatColor ? { background: `${heatColor}59`, color: heatColor } : undefined}
        aria-hidden
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      {node.href ? (
        <Link
          href={node.href}
          className="mt-2 text-xs font-semibold leading-tight tracking-tight text-foreground outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-brand"
        >
          {node.label}
        </Link>
      ) : (
        <span className="mt-2 text-xs font-semibold leading-tight text-foreground">{node.label}</span>
      )}
      {node.players && node.players.length > 0 && (
        <div className="relative z-10 mt-2 flex flex-wrap justify-center gap-1">
          {node.players.slice(0, 3).map((p) => (
            <Avatar key={p.name} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A short directional connector between two boxes in a row. */
function HArrow() {
  return (
    <div className="flex shrink-0 items-center self-center" aria-hidden>
      <span className="h-1 w-2.5 rounded-full bg-brand/70" />
      <ArrowRight className="-ml-2 h-5 w-5 text-brand" strokeWidth={3} />
    </div>
  );
}

/** A left→right chain of boxes joined by arrows (one upstream technology path). */
function Path({ nodes }: { nodes: FlowNode[] }) {
  return (
    <div className="flex items-center">
      {nodes.map((n, i) => (
        <React.Fragment key={n.id}>
          <FlowBox node={n} />
          {i < nodes.length - 1 && <HArrow />}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * One connector cell next to a branch box. The vertical rail is drawn as two
 * half-segments (above / below this box's centre), so the rail spans only from
 * the first branch box to the last — it never dangles past the end arrows. The
 * lower half bridges the inter-row gap to meet the next box's upper half.
 */
function RailCell({
  side,
  isFirst,
  isLast,
  bridge,
}: {
  side: "left" | "right";
  isFirst: boolean;
  isLast: boolean;
  bridge: string;
}) {
  const x = side === "left" ? "left-0" : "right-0";
  return (
    <div className="relative w-3 shrink-0 self-stretch" aria-hidden>
      {!isFirst && <span className={cn("absolute top-0 h-1/2 w-[3px] bg-brand/70", x)} />}
      {!isLast && <span className={cn("absolute top-1/2 w-[3px] bg-brand/70", x, bridge)} />}
      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-brand/70" />
    </div>
  );
}

/** Several input rows converging (via a rail) into one downstream box. */
function Merge({ inputs }: { inputs: React.ReactNode[] }) {
  const n = inputs.length;
  return (
    <div className="flex items-center">
      <div className="flex flex-col items-end gap-16">
        {inputs.map((input, i) => (
          <div key={i} className="flex items-stretch">
            <div className="flex items-center self-center">{input}</div>
            <RailCell side="right" isFirst={i === 0} isLast={i === n - 1} bridge="-bottom-16" />
          </div>
        ))}
      </div>
      <span className="h-[3px] w-2.5 shrink-0 bg-brand/70" aria-hidden />
      <ArrowRight className="-ml-2 h-5 w-5 shrink-0 text-brand" strokeWidth={3} aria-hidden />
    </div>
  );
}

/** One box branching (via a rail) into one or more downstream boxes. */
function Fork({ from, to }: { from: React.ReactNode; to: React.ReactNode[] }) {
  const n = to.length;
  return (
    <div className="flex items-center">
      <div className="shrink-0">{from}</div>
      <span className="h-[3px] w-2.5 shrink-0 bg-brand/70" aria-hidden />
      <div className="flex flex-col gap-2.5">
        {to.map((child, i) => (
          <div key={i} className="flex items-stretch">
            <RailCell side="left" isFirst={i === 0} isLast={i === n - 1} bridge="-bottom-2.5" />
            <div className="flex items-center self-center">
              <ArrowRight className="-ml-1 h-5 w-5 shrink-0 text-brand" strokeWidth={3} aria-hidden />
              {child}
            </div>
          </div>
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
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border border-dashed border-border bg-muted" />
        Not tracked yet
      </span>
    </div>
  );
}

/**
 * The solar-PV value chain as a branching flowchart (after Figure 1). Two
 * upstream technology paths — crystalline-silicon (India's tracked path) and
 * thin-film (greyed, no Indian base) — plus solar glass and balance-of-system
 * converge into PV Modules, which then branches into the downstream
 * applications: grid power plants (EPC / IPP), rooftop / off-grid (system
 * integration), and solar products. Tracked boxes are heat-tinted and drill to
 * their detail tab; boxes we don't yet cover are greyed.
 */
export function ValueChainMap() {
  const thinFilm = (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-2.5">
      <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
        Thin-film · integrated process
      </p>
      <Path nodes={[N.pvMaterials, N.substrate]} />
    </div>
  );

  const crystalline = (
    <div className="px-0.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
        Crystalline silicon
      </p>
      <Path nodes={[N.poly, N.wafer, N.cell]} />
    </div>
  );

  const moduleInputs = (
    <div className="px-0.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
        Module inputs
      </p>
      <div className="flex items-center gap-2">
        <FlowBox node={N.solarGlass} />
        <FlowBox node={N.bos} />
      </div>
    </div>
  );

  return (
    <section
      className="flex flex-col gap-3 rounded-3xl border border-border bg-gradient-to-b from-muted/30 to-transparent p-3 sm:p-4"
      aria-label="Solar PV value chain flowchart"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          The solar PV value chain
        </h2>
        <HeatLegend />
      </div>

      <FitWidth max={1.9}>
        <div className="flex w-max items-center gap-0.5 px-0.5 py-1">
          {/* Upstream: two technology paths + module inputs converge on PV Modules */}
          <Merge inputs={[thinFilm, crystalline, moduleInputs]} />

          {/* PV Modules → downstream application branches */}
          <Fork
            from={<FlowBox node={N.modules} />}
            to={[
              <Fork
                key="grid"
                from={<FlowBox node={N.gridPlant} />}
                to={[<FlowBox key="epc" node={N.epc} />, <FlowBox key="ipp" node={N.ipp} />]}
              />,
              <Fork
                key="rooftop"
                from={<FlowBox node={N.rooftop} />}
                to={[<FlowBox key="si" node={N.sysIntegration} />]}
              />,
              <Fork
                key="products"
                from={<FlowBox node={N.solarProducts} />}
                to={[
                  <FlowBox key="lan" node={N.lanterns} />,
                  <FlowBox key="pump" node={N.waterPumps} />,
                  <FlowBox key="other" node={N.otherProducts} />,
                ]}
              />,
            ]}
          />
        </div>
      </FitWidth>
    </section>
  );
}
