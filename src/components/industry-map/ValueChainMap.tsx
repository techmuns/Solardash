import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HEAT_COLOR,
  VC_ASP,
  VC_CALLOUTS,
  VC_DEPLOY,
  VC_KEY_STATS,
  VC_MFG,
  type Heat,
  type VcAsp,
  type VcCallout,
  type VcStage,
} from "@/data/value-chain";

const HEAT_LABEL: Record<Heat, string> = {
  loss: "Loss",
  thin: "Thin",
  mod: "Moderate",
  fat: "Fat",
  regulated: "Regulated",
  offtake: "Offtake risk",
};

function HeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
      <span className="font-medium uppercase tracking-wide">Profit-pool heat</span>
      {(["loss", "thin", "mod", "fat"] as Heat[]).map((h) => (
        <span key={h} className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: HEAT_COLOR[h] }} />
          {HEAT_LABEL[h]}
        </span>
      ))}
    </div>
  );
}

/** India import-dependence on China — high = red (bad), low = green (good). */
function CnBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? "#EF4444" : pct >= 25 ? "#F59E0B" : "#10B981";
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-2xs font-medium text-muted-foreground">CN</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
          aria-hidden
        />
      </div>
      <span className="w-9 text-right text-2xs tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

function PlayerChips({ players }: { players: VcStage["players"] }) {
  return (
    <div className="relative z-10 mt-2 flex flex-wrap gap-1">
      {players.map((p) =>
        p.slug ? (
          <Link
            key={p.name}
            href={`/companies/${p.slug}`}
            className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-2xs font-medium text-foreground/80 outline-none transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
          >
            {p.name}
          </Link>
        ) : (
          <span
            key={p.name}
            className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-2xs text-muted-foreground"
          >
            {p.name}
          </span>
        ),
      )}
    </div>
  );
}

function StageCard({ stage }: { stage: VcStage }) {
  const color = HEAT_COLOR[stage.heat];
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card p-3 pl-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover",
        stage.emphasis ? "border-brand/50 ring-1 ring-brand/20" : "border-border",
      )}
    >
      <span
        className="absolute inset-y-2 left-1.5 w-1 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold tabular-nums text-muted-foreground">
              {stage.num}
            </span>
            {/* Stretched link → whole card is clickable to the detail tab */}
            <Link
              href={stage.href}
              className="text-sm font-semibold tracking-tight text-foreground outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-brand"
            >
              {stage.name}
            </Link>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-brand" aria-hidden />
          </div>
          {stage.capacity && (
            <p className="truncate text-2xs text-muted-foreground">{stage.capacity}</p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-semibold"
          style={{ background: `${color}1f`, color }}
        >
          {stage.statusLabel}
        </span>
      </div>

      <p className="mt-1.5 text-2xs leading-snug text-muted-foreground">{stage.desc}</p>
      <p className="mt-1 text-2xs font-medium text-foreground/75">{stage.margin}</p>

      {stage.cnDependence != null && <CnBar pct={stage.cnDependence} />}
      <PlayerChips players={stage.players} />
    </div>
  );
}

/** A policy gate sitting between two stages (gold = the live ALMM catalyst). */
function GateConnector({ label }: { label: string }) {
  const live = label.startsWith("★");
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      <ChevronDown className="h-3.5 w-3.5 text-border" />
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium",
          live
            ? "border-brand/50 bg-brand/10 text-brand"
            : "border-border bg-muted/50 text-muted-foreground",
        )}
      >
        <Flag className="h-3 w-3" />
        {label.replace(/^★\s*/, "")}
      </span>
    </div>
  );
}

const CALLOUT_STYLE: Record<VcCallout["kind"], { ring: string; accent: string }> = {
  warning: { ring: "border-amber-500/40", accent: "text-amber-600 dark:text-amber-400" },
  danger: { ring: "border-red-500/40", accent: "text-red-600 dark:text-red-400" },
  positive: { ring: "border-emerald-500/40", accent: "text-emerald-600 dark:text-emerald-400" },
};

function Callout({ c }: { c: VcCallout }) {
  const s = CALLOUT_STYLE[c.kind];
  return (
    <Link
      href={c.href}
      className={cn(
        "group block rounded-xl border bg-card p-3 shadow-card outline-none transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand",
        s.ring,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-2xs font-semibold uppercase tracking-wide", s.accent)}>
          {c.title}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-brand" aria-hidden />
      </div>
      <p className="mt-1 text-sm font-bold tracking-tight text-foreground">{c.stat}</p>
      <p className="mt-1 text-2xs leading-snug text-muted-foreground">{c.detail}</p>
    </Link>
  );
}

function AspSpread({ asp }: { asp: VcAsp[] }) {
  const max = Math.max(...asp.map((a) => a.value));
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Module ASP spread
          <span className="ml-1.5 text-2xs font-normal text-muted-foreground">$/W</span>
        </h3>
        <Link href="/profit-pools" className="text-2xs font-medium text-brand hover:underline">
          Profit Pools →
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {asp.map((a) => (
          <div key={a.label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-2xs text-muted-foreground">{a.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(6, (a.value / max) * 100)}%`,
                  background: a.premium ? "#10B981" : "#94A3B8",
                }}
                aria-hidden
              />
            </div>
            <span
              className={cn(
                "w-14 shrink-0 text-right text-xs font-semibold tabular-nums",
                a.premium ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/80",
              )}
            >
              {a.display}
            </span>
            <span className="hidden w-40 shrink-0 truncate text-2xs text-muted-foreground sm:block">
              {a.note}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-2xs leading-snug text-muted-foreground">
        The ~$0.13/W DCR premium (~2×) is the single most important number in the Indian
        module market — and the entire case for backward integration.
      </p>
    </div>
  );
}

function StageColumn({ label, stages }: { label: string; stages: VcStage[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {stages.map((s) => (
        <React.Fragment key={s.id}>
          <StageCard stage={s} />
          {s.gate && <GateConnector label={s.gate} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * The redesigned value-chain map — "where the money is made & lost". Two flow
 * columns (manufacturing → deployment) of clickable stage cards coloured by
 * profit-pool heat, with China-dependence bars, listed-player chips that link to
 * their company pages, three structural callouts, and the module ASP spread.
 */
export function ValueChainMap() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Where the money is made &amp; lost
          </h2>
          <p className="max-w-2xl text-xs text-muted-foreground">
            The India solar value chain — make the panel (left), build &amp; sell the
            power (right). Cards are coloured by profit-pool heat; bars show China
            import-dependence. Click any stage, player or callout to drill in.
          </p>
        </div>
        <HeatLegend />
      </div>

      {/* key stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {VC_KEY_STATS.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3 shadow-card">
            <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
              {k.value}
            </p>
            <p className="mt-0.5 text-2xs leading-snug text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </div>

      {/* three-column flow: manufacturing · callouts · deployment */}
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(220px,0.85fr)_1fr]">
        <StageColumn label="① Upstream · Manufacturing — make the panel" stages={VC_MFG} />
        <div className="flex flex-col gap-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            The three things that move the market
          </p>
          {VC_CALLOUTS.map((c) => (
            <Callout key={c.id} c={c} />
          ))}
          <div className="mt-auto rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-2xs leading-snug text-muted-foreground">
            Product flows{" "}
            <span className="font-medium text-foreground/70">downstream</span> ↓ → ↑ ·
            ₹ revenue flows <span className="font-medium text-foreground/70">upstream</span>
          </div>
        </div>
        <StageColumn label="② Downstream · Deployment — build &amp; sell the power" stages={VC_DEPLOY} />
      </div>

      <AspSpread asp={VC_ASP} />
    </section>
  );
}
