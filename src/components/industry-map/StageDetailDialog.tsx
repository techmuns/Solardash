"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Globe2, X, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { STAGE_DETAIL, type DetailCompany } from "@/data/value-chain-detail";

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
 * Click-through popup for a value-chain stage: market size (TAM), profit pool,
 * the leading companies globally and the players in India. Data is curated &
 * sourced in value-chain-detail.ts.
 */
export function StageDetailDialog({
  node,
  onClose,
}: {
  node: OpenNode | null;
  onClose: () => void;
}) {
  const detail = node ? STAGE_DETAIL[node.id] : undefined;
  const Icon = node?.icon;

  return (
    <Dialog
      open={Boolean(node && detail)}
      onClose={onClose}
      ariaLabel={node ? `${node.label} — value-chain detail` : undefined}
      className="max-w-lg"
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

            <Section icon={Globe2} title="Top companies globally — by size">
              <CompanyList items={detail.global} />
            </Section>

            <Section icon={Building2} title="In India">
              <CompanyList items={detail.india} />
            </Section>

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
