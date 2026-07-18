"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  Gauge,
  Globe2,
  Layers,
  Percent,
  Target,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/Dialog";
import { Sparkline } from "@/components/charts/Sparkline";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import { DIRECTION_CLASS } from "@/components/ui/direction";
import { STAGE_DETAIL, type DetailCompany, type Rating } from "@/data/value-chain-detail";
import type { StageEconomicsRow } from "@/data/types/profit-pools";

/** What the map hands the dialog when a box is clicked. */
export interface OpenNode {
  id: string;
  label: string;
  icon: LucideIcon;
  heatColor?: string;
  heatLabel?: string;
  href?: string;
  hrefLabel?: string;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-snug text-foreground">{value}</p>
      {sub && <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {title}
      </p>
      {children}
    </div>
  );
}

/** A Low/Medium/High rating shown as a 3-segment meter. */
function Meter({ label, rating }: { label: string; rating: Rating }) {
  const level = rating === "High" ? 3 : rating === "Medium" ? 2 : 1;
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex gap-1" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn("h-1.5 w-5 rounded-full", i <= level ? "bg-foreground/70" : "bg-border")}
            />
          ))}
        </span>
        <span className="text-2xs font-semibold text-foreground">{rating}</span>
      </div>
    </div>
  );
}

/** One benchmark margin row (region · metric · FACT text · direction read). */
function EconRow({ row }: { row: StageEconomicsRow }) {
  const d = DIRECTION_CLASS[row.directionClass];
  return (
    <li className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {row.region} · {row.metric}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 text-2xs font-medium"
          style={{ color: d.color }}
        >
          <d.Icon className="h-3 w-3" aria-hidden />
          {row.direction}
        </span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-sm font-bold leading-snug tabular-nums text-foreground">
          {row.marginText}
        </p>
        {row.trend && row.trend.length > 1 && (
          <div className="h-6 w-16 shrink-0" aria-hidden>
            <Sparkline values={row.trend} color={d.color} height={24} area={false} />
          </div>
        )}
      </div>
      <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
        {row.rationale} · <span className="text-foreground/70">{row.source}</span> ·{" "}
        {row.confidence}
      </p>
    </li>
  );
}

function CompanyList({ items }: { items: DetailCompany[] }) {
  return (
    <ul className="divide-y divide-border/70 rounded-xl border border-border">
      {items.map((c) => (
        <li
          key={c.name}
          className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"
        >
          <span className="font-semibold text-foreground">{c.name}</span>
          <span className="shrink-0 text-right text-2xs text-muted-foreground">{c.note}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Click-through popup for a value-chain stage: market size (TAM), profit pool, a
 * risk/return scorecard, the key success drivers, the leading companies globally
 * and in India, plus a "how it's made" process strip and thin-film materials.
 * Data is curated & sourced in value-chain-detail.ts.
 */
export function StageDetailDialog({
  node,
  onClose,
  economics,
}: {
  node: OpenNode | null;
  onClose: () => void;
  /** Stage-economics benchmark rows for this node, when the stage is tracked. */
  economics?: StageEconomicsRow[];
}) {
  const detail = node ? STAGE_DETAIL[node.id] : undefined;
  const Icon = node?.icon;

  return (
    <Dialog
      open={Boolean(node && detail)}
      onClose={onClose}
      ariaLabel={node ? `${node.label} — value-chain detail` : undefined}
      className="max-w-xl"
    >
      {node && detail && (
        <>
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <span
              className={
                node.heatColor
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
              }
              style={
                node.heatColor
                  ? { background: `${node.heatColor}33`, color: node.heatColor }
                  : undefined
              }
              aria-hidden
            >
              {Icon && <Icon className="h-5 w-5" strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold tracking-tight text-foreground">{node.label}</h2>
              {node.heatLabel && (
                <span className="mt-1 inline-flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={node.heatColor ? { background: node.heatColor } : undefined}
                  />
                  {node.heatLabel} profit pool
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stat label="Market size (TAM)" value={detail.tam} sub={detail.tamSub} />
              <Stat label="Profit pool" value={detail.profit} sub={detail.profitSub} />
            </div>

            {economics && economics.length > 0 && (
              <Section icon={Percent} title="Stage economics">
                <ul className="space-y-2">
                  {economics.map((r) => (
                    <EconRow key={`${r.stage}-${r.region}`} row={r} />
                  ))}
                </ul>
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-2xs leading-relaxed text-muted-foreground">
                  Margins are sourced FACT (cited per row); the direction read is
                  <AnalysisTag />
                </p>
              </Section>
            )}

            {detail.scorecard && (
              <Section icon={Gauge} title="Stage scorecard">
                <div className="grid grid-cols-2 gap-2">
                  <Meter label="Competition" rating={detail.scorecard.competition} />
                  <Meter label="Capital intensity" rating={detail.scorecard.capital} />
                  <Meter label="Payback" rating={detail.scorecard.payback} />
                  <Meter label="Risk" rating={detail.scorecard.risk} />
                </div>
              </Section>
            )}

            {detail.drivers && detail.drivers.length > 0 && (
              <Section icon={Target} title="What drives winners here">
                <ul className="space-y-1.5">
                  {detail.drivers.map((d) => (
                    <li key={d} className="flex gap-2 text-sm text-foreground">
                      <span
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand"
                        aria-hidden
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section icon={Globe2} title="Top companies globally — by size">
              <CompanyList items={detail.global} />
            </Section>

            <Section icon={Building2} title="In India">
              <CompanyList items={detail.india} />
            </Section>

            {detail.process && detail.process.length > 0 && (
              <Section icon={Workflow} title="How it's made">
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
                  {detail.process.map((step, i) => (
                    <React.Fragment key={step}>
                      <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-2xs font-medium text-foreground">
                        {step}
                      </span>
                      {i < detail.process!.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </Section>
            )}

            {detail.materials && detail.materials.length > 0 && (
              <Section icon={Layers} title="Thin-film materials">
                <CompanyList items={detail.materials} />
              </Section>
            )}

            <p className="text-2xs leading-relaxed text-muted-foreground">{detail.source}</p>
          </div>

          {/* Footer */}
          {node.href && (
            <div className="flex justify-end border-t border-border px-5 py-3">
              <Link
                href={node.href}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand"
              >
                Open {node.hrefLabel ?? "full data"}
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
