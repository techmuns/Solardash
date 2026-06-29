import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  ChevronRight,
  Landmark,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { FillSparkline } from "@/components/charts/FillCharts";
import { cn } from "@/lib/utils";

/** How present India is at a given stage — drives the badge colour + label. */
export type Presence = "present" | "emerging" | "imported";

/** Visual width weight in the ribbon (India-relevant stages get more room). */
export type Emphasis = "compact" | "normal" | "wide";

/** One stage in the left→right value-chain ribbon. */
export interface ValueChainNode {
  id: string;
  /** Short stage label (may wrap to two lines). */
  name: string;
  presence: Presence;
  /** Drill-down route into the Deep-Dive evidence tier. */
  href?: string;
  /** 2–3 key players, reused from the manufacturer / IPP / offtaker lists. */
  players: string[];
  /** A real Phase-1 trajectory → renders a sparkline. Absent → status note. */
  trend?: number[];
  /** Sparkline colour (hex). */
  trendColor?: string;
  /** What the sparkline shows (trend nodes) or the stage status (the rest). */
  note?: string;
  /** Reserved for Phase-3 profit-pool sizing — unused in the map today. */
  economicWeight?: number;
  emphasis?: Emphasis;
}

/** A cross-cutting enabler (Financing · Policy · Storage) below the ribbon. */
export interface ValueChainEnabler {
  id: string;
  name: string;
  presence: Presence;
  href?: string;
  /** One-line "what it is". */
  detail: string;
  players: string[];
  icon: LucideIcon;
}

const PRESENCE: Record<Presence, { label: string; cls: string }> = {
  present: {
    label: "Present",
    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  emerging: {
    label: "Emerging",
    cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  imported: {
    label: "≈ Imported",
    cls: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
  },
};

const EMPHASIS_GROW: Record<Emphasis, number> = {
  compact: 0.75,
  normal: 1,
  wide: 1.4,
};

/** Compact ₹-crore label for the economic-weight annotation. */
const compactCr = (v: number) =>
  v >= 1000 ? `₹${Math.round(v / 1000)}k cr` : `₹${Math.round(v)} cr`;

function PresenceBadge({ presence }: { presence: Presence }) {
  const p = PRESENCE[presence];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-2xs font-semibold",
        p.cls,
      )}
    >
      {p.label}
    </span>
  );
}

/** One stage column: name · presence · trend-or-status · players · drill. */
function StageCard({
  node,
  index,
  maxWeight,
}: {
  node: ValueChainNode;
  index: number;
  /** Largest economicWeight across the ribbon — normalises the weight bar. */
  maxWeight: number;
}) {
  const hasTrend = Boolean(node.trend && node.trend.length > 1);
  const weight = node.economicWeight ?? 0;
  const Tag = (node.href ? Link : "div") as React.ElementType;

  return (
    <Tag
      {...(node.href ? { href: node.href } : {})}
      style={{ flexGrow: EMPHASIS_GROW[node.emphasis ?? "normal"], flexBasis: 0 }}
      className={cn(
        "group flex min-h-0 min-w-[92px] flex-col overflow-hidden rounded-xl border border-border bg-card p-2.5 shadow-card outline-none",
        node.href &&
          "transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand",
      )}
      {...(node.href
        ? { "aria-label": `${node.name} — open the Deep-Dive evidence` }
        : {})}
    >
      {/* name + drill chevron */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex min-w-0 items-start gap-1.5">
          <span className="mt-0.5 w-3 shrink-0 text-2xs tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <h3 className="text-[11px] font-semibold leading-tight tracking-tight text-foreground">
            {node.name}
          </h3>
        </div>
        {node.href && (
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
            aria-hidden
          />
        )}
      </div>

      {/* presence */}
      <div className="mt-1.5">
        <PresenceBadge presence={node.presence} />
      </div>

      {/* economic-weight annotation (listed FY26 revenue pool — a proxy) */}
      {weight > 0 && maxWeight > 0 && (
        <div className="mt-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/30"
              style={{ width: `${Math.max(8, (weight / maxWeight) * 100)}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-0.5 truncate text-2xs tabular-nums text-muted-foreground">
            {compactCr(weight)} pool
          </p>
        </div>
      )}

      {/* trend (real series) or a centred status note */}
      {hasTrend ? (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <FillSparkline values={node.trend as number[]} color={node.trendColor} />
          {node.note && (
            <p className="mt-1 shrink-0 truncate text-2xs text-muted-foreground">
              {node.note}
            </p>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-2">
          <p className="text-center text-2xs leading-snug text-muted-foreground">
            {node.note}
          </p>
        </div>
      )}

      {/* key players */}
      {node.players.length > 0 && (
        <ul className="mt-2 shrink-0 space-y-0.5 border-t border-border/70 pt-1.5">
          {node.players.map((p) => (
            <li
              key={p}
              className="truncate text-2xs leading-tight text-foreground/80"
            >
              {p}
            </li>
          ))}
        </ul>
      )}
    </Tag>
  );
}

function EnablerCard({ enabler }: { enabler: ValueChainEnabler }) {
  const Tag = (enabler.href ? Link : "div") as React.ElementType;
  const Icon = enabler.icon;
  return (
    <Tag
      {...(enabler.href ? { href: enabler.href } : {})}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card outline-none",
        enabler.href &&
          "transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand",
      )}
      {...(enabler.href
        ? { "aria-label": `${enabler.name} — open the Deep-Dive evidence` }
        : {})}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {enabler.name}
          </h3>
          <PresenceBadge presence={enabler.presence} />
        </div>
        <p className="truncate text-2xs text-muted-foreground">{enabler.detail}</p>
        <p className="mt-0.5 truncate text-2xs text-foreground/70">
          {enabler.players.join(" · ")}
        </p>
      </div>
      {enabler.href && (
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
          aria-hidden
        />
      )}
    </Tag>
  );
}

function PresenceKey() {
  return (
    <div className="flex items-center gap-2.5 text-2xs text-muted-foreground">
      {(["present", "emerging", "imported"] as Presence[]).map((p) => (
        <span key={p} className="inline-flex items-center gap-1">
          <span
            className={cn("h-2 w-2 rounded-full", PRESENCE[p].cls.split(" ")[0])}
            aria-hidden
          />
          {PRESENCE[p].label}
        </span>
      ))}
    </div>
  );
}

export interface IndustryMapProps {
  nodes: ValueChainNode[];
  enablers: ValueChainEnabler[];
}

/**
 * The solar value chain as a clean left→right ribbon of stage columns with flow
 * connectors, plus a cross-cutting ENABLERS band — Munshot's design language, not
 * a logo wall. Product flows downstream (→); revenue flows upstream (←). Each
 * stage carries a real Phase-1 trend where we track it, else an India-presence
 * badge + status; click a stage to drill into the Deep-Dive evidence. Fits one
 * 1440×900 screen with no page scroll (the ribbon flexes to fill).
 */
export function IndustryMap({ nodes, enablers }: IndustryMapProps) {
  const maxWeight = Math.max(0, ...nodes.map((n) => n.economicWeight ?? 0));
  const hasWeights = maxWeight > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 sm:p-5">
      {/* header + presence key */}
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-1.5">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            India&apos;s solar value chain
          </h1>
          <p className="text-xs text-muted-foreground">
            Where India plays across the chain — with the trend where we track it.
            Click a stage to drill into the evidence.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <PresenceKey />
          {hasWeights && (
            <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span className="h-1 w-4 rounded-full bg-foreground/30" aria-hidden />
              bar = listed FY26 revenue pool
              <span className="rounded-full border border-dashed border-brand/40 bg-brand/5 px-1 font-medium text-brand">
                Munshot proxy
              </span>
            </span>
          )}
        </div>
      </div>

      {/* flow-direction rail — product downstream, ₹ upstream */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-2xs font-medium text-foreground/70">
        <span className="inline-flex items-center gap-1.5">
          Product &amp; material flow
          <ArrowRight className="h-3.5 w-3.5 text-brand" aria-hidden />
          poly → cell → module → IPP → offtaker
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5 text-emerald-500" aria-hidden />₹
          revenue flows upstream — offtaker → IPP → EPC → module → cell → poly
        </span>
      </div>

      {/* the ribbon — stage columns with chevron connectors */}
      <div className="flex min-h-0 flex-1 items-stretch">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <StageCard node={node} index={i} maxWeight={maxWeight} />
            {i < nodes.length - 1 && (
              <div
                className="flex shrink-0 items-center justify-center px-0.5 text-border"
                aria-hidden
              >
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* cross-cutting enablers */}
      <div className="shrink-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cross-cutting enablers
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {enablers.map((e) => (
            <EnablerCard key={e.id} enabler={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Re-export the enabler icons so the page can build the data without re-importing
// from lucide directly (keeps the value-chain vocabulary in one place).
export const ENABLER_ICONS = {
  financing: Landmark,
  policy: ScrollText,
  storage: BatteryCharging,
} as const;
