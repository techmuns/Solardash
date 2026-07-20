"use client";

import * as React from "react";
import type {
  CommissioningStatus,
  CommissioningTranche,
} from "@/data/types/developers";
import {
  fyQuarterIndex,
  fyQuarterLabel,
  formatFyQuarter,
  fyOf,
} from "@/lib/fiscal";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { cn } from "@/lib/utils";
import { Select, type SelectOption } from "@/components/ui/Select";

const ALL = "__all__";

/** CVD-safe status palette (shared with the sector report exhibits). */
const STATUS: Record<CommissioningStatus, { label: string; color: string }> = {
  commissioned: { label: "Commissioned", color: "#059669" },
  "on-track": { label: "On track", color: "#2563EB" },
  delayed: { label: "Delayed", color: "#D97706" },
  "at-risk": { label: "At risk", color: "#DC2626" },
};

const fmtCap = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
/** Capacity label: GWh for storage, MW under 0.1 GW, else GW. */
function capLabel(cap: number, tech: string): string {
  if (tech === "bess") return `${fmtCap(cap)} GWh`;
  if (cap > 0 && cap < 0.1) return `${Math.round(cap * 1000)} MW`;
  return `${fmtCap(cap)} GW`;
}

function slipLabel(q: number): string {
  if (q === 0) return "On plan";
  const n = Math.abs(q);
  return q > 0 ? `+${n}Q late` : `−${n}Q early`;
}

/** Display label for a tech/stage tag — a known TenderType, else Title-cased. */
const techLabel = (tech: string): string =>
  (TENDER_TYPE_LABELS as Record<string, string>)[tech] ??
  tech.charAt(0).toUpperCase() + tech.slice(1);

function historyTitle(t: CommissioningTranche): string {
  const lines = t.history.map((h) => {
    const base = `${h.concall} → ${formatFyQuarter(h.targetPeriod)}`;
    return `${base} (${STATUS[h.status].label})`;
  });
  const head = `${t.developer} — ${t.project}\n${capLabel(t.capacityGw, t.tech)} · ${techLabel(
    t.tech,
  )}`;
  const slip =
    t.slipQuarters !== 0
      ? `\nSlippage: ${formatFyQuarter(t.originalTarget)} → ${formatFyQuarter(
          t.currentTarget,
        )} (${slipLabel(t.slipQuarters)})`
      : "";
  return `${head}\n\nGuidance history:\n${lines.join("\n")}${slip}`;
}

export function CommissioningTimeline({
  tranches: allTranches,
  now,
  companyLabel = "company",
}: {
  tranches: CommissioningTranche[];
  now: string;
  /** Noun for the company filter, e.g. "IPP" or "maker". */
  companyLabel?: string;
}) {
  const nowIdx = fyQuarterIndex(now);
  const [sort, setSort] = React.useState<"timeline" | "capacity" | "slippage">(
    "timeline",
  );
  const [company, setCompany] = React.useState<string>(ALL);

  // Distinct companies (developers/makers), tranche-count as the option hint.
  const companyOptions: SelectOption[] = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of allTranches) counts.set(t.developer, (counts.get(t.developer) ?? 0) + 1);
    const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    return [
      { value: ALL, label: `All ${companyLabel === "company" ? "companies" : companyLabel + "s"}`, hint: String(allTranches.length) },
      ...names.map((name) => ({ value: name, label: name, hint: String(counts.get(name)) })),
    ];
  }, [allTranches, companyLabel]);

  // Effective selection: if the chosen company left the dataset (data refresh),
  // fall back to "all" without mutating state mid-render.
  const effectiveCompany =
    company !== ALL && !allTranches.some((t) => t.developer === company) ? ALL : company;

  const tranches = React.useMemo(
    () =>
      effectiveCompany === ALL
        ? allTranches
        : allTranches.filter((t) => t.developer === effectiveCompany),
    [allTranches, effectiveCompany],
  );

  // Quarter range: span every target (original + current) and "now", capped.
  // Anchored to the full dataset so filtering doesn't reshape the axis.
  const idxs = allTranches
    .flatMap((t) => [fyQuarterIndex(t.originalTarget), fyQuarterIndex(t.currentTarget)])
    .filter(Number.isFinite);
  let start = Math.min(nowIdx, ...idxs);
  const end = Math.max(nowIdx, ...idxs);
  if (end - start > 13) start = end - 13; // keep the axis readable
  const cols: number[] = [];
  for (let i = start; i <= end; i++) cols.push(i);
  const n = cols.length || 1;

  // Position (%) of a quarter's centre; clamp out-of-range originals to the edges.
  const centre = (idx: number) => {
    const c = Math.min(Math.max(idx, start), end);
    return ((c - start + 0.5) / n) * 100;
  };
  // The "now" divider sits at the end of the current quarter.
  const nowLeft = ((Math.min(Math.max(nowIdx, start - 1), end) - start + 1) / n) * 100;

  const totalGw = tranches
    .filter((t) => t.tech !== "bess")
    .reduce((s, t) => s + t.capacityGw, 0);
  const delayed = tranches.filter((t) => t.slipQuarters > 0);
  const delayedGw = delayed
    .filter((t) => t.tech !== "bess")
    .reduce((s, t) => s + t.capacityGw, 0);

  // Row order: default is the pipeline's chronological (by current target);
  // clients can re-sort by capacity (largest first) or by slippage.
  const sorted = React.useMemo(() => {
    const arr = [...tranches];
    if (sort === "capacity")
      arr.sort(
        (a, b) =>
          b.capacityGw - a.capacityGw ||
          fyQuarterIndex(a.currentTarget) - fyQuarterIndex(b.currentTarget),
      );
    else if (sort === "slippage")
      arr.sort(
        (a, b) => b.slipQuarters - a.slipQuarters || b.capacityGw - a.capacityGw,
      );
    return arr;
  }, [tranches, sort]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Legend + headline */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-2 text-2xs">
        <span className="font-medium text-muted-foreground">
          {tranches.length} tranches · {fmtCap(Math.round(totalGw))} GW guided ·{" "}
          <span className="font-semibold text-foreground">
            {delayed.length} slipped
          </span>{" "}
          ({fmtCap(Math.round(delayedGw))} GW)
        </span>
        {/* Company filter */}
        <Select
          options={companyOptions}
          value={effectiveCompany}
          onChange={setCompany}
          ariaLabel={`Filter by ${companyLabel}`}
          className="min-w-[9rem]"
        />
        {/* Sort control */}
        <div className="flex items-center gap-1">
          <span className="font-medium uppercase tracking-wide text-muted-foreground">
            Sort
          </span>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(
              [
                ["timeline", "Timeline"],
                ["capacity", "Capacity"],
                ["slippage", "Slippage"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={cn(
                  "rounded-md px-2 py-0.5 font-medium transition-colors",
                  sort === k
                    ? "bg-brand/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          {(Object.keys(STATUS) as CommissioningStatus[]).map((k) => (
            <span key={k} className="flex items-center gap-1 text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: STATUS[k].color }}
              />
              {STATUS[k].label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full border border-muted-foreground/60" />
            Original guidance
          </span>
        </span>
      </div>

      {/* Scroll region */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
        <div className="min-w-[680px]">
          {/* Quarter axis (sticky) */}
          <div className="sticky top-0 z-10 flex bg-card pb-1">
            <div className="w-[232px] shrink-0" />
            <div className="flex flex-1">
              {cols.map((idx, i) => {
                const label = fyQuarterLabel(idx);
                const q = label.slice(0, 2); // "Q1"
                const firstOfFy = idx % 4 === 1; // Q1 starts a new FY
                const showFy = firstOfFy || i === 0; // label the FY on each new FY + the first column
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex-1 border-l text-center text-2xs",
                      firstOfFy ? "border-border" : "border-border/40",
                    )}
                  >
                    <div className="font-medium text-muted-foreground">{q}</div>
                    <div className="text-[9px] text-muted-foreground/60">
                      {showFy ? fyOf(label) : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {/* now line spanning all rows */}
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-0 border-l border-dashed border-brand/50"
              style={{ left: `calc(232px + (100% - 232px) * ${nowLeft / 100})` }}
            >
              <span className="absolute -top-0.5 left-1 whitespace-nowrap text-[9px] font-medium text-brand/80">
                now
              </span>
            </div>

            {sorted.map((t) => {
              const s = STATUS[t.status];
              const curPct = centre(fyQuarterIndex(t.currentTarget));
              const origPct = centre(fyQuarterIndex(t.originalTarget));
              const slipped = t.slipQuarters > 0;
              const labelLeft = curPct > 72; // flip capacity pill to avoid the right edge
              return (
                <div
                  key={t.id}
                  title={historyTitle(t)}
                  className="group flex items-center border-b border-border/50 py-1.5"
                >
                  {/* Label */}
                  <div className="w-[232px] shrink-0 pr-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {t.developer}
                      </span>
                      <span
                        className="shrink-0 rounded px-1 py-px text-[9px] font-medium uppercase tracking-wide"
                        style={{
                          color: STATUS[t.status].color,
                          background: `${STATUS[t.status].color}1a`,
                        }}
                      >
                        {capLabel(t.capacityGw, t.tech)}
                      </span>
                    </div>
                    <div className="truncate text-2xs text-muted-foreground">
                      {t.project}
                    </div>
                  </div>

                  {/* Track */}
                  <div className="relative h-7 flex-1">
                    {/* faint gridlines */}
                    <div className="absolute inset-0 flex">
                      {cols.map((idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex-1 border-l",
                            idx % 4 === 1 ? "border-border/70" : "border-border/25",
                          )}
                        />
                      ))}
                    </div>

                    {/* slippage connector: original → current */}
                    {slipped && (
                      <div
                        className="absolute top-1/2 h-px -translate-y-1/2 border-t border-dashed"
                        style={{
                          left: `${Math.min(origPct, curPct)}%`,
                          width: `${Math.abs(curPct - origPct)}%`,
                          borderColor: s.color,
                        }}
                      />
                    )}
                    {/* original (ghost) marker */}
                    {t.slipQuarters !== 0 && (
                      <span
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-card"
                        style={{ left: `${origPct}%`, borderColor: `${s.color}90` }}
                      />
                    )}

                    {/* current marker + capacity/slip pill */}
                    <div
                      className="absolute top-1/2 flex -translate-y-1/2 items-center gap-1"
                      style={{
                        left: `${curPct}%`,
                        transform: `translate(${labelLeft ? "-100%" : "0"}, -50%)`,
                      }}
                    >
                      {labelLeft && (
                        <SlipTag slip={t.slipQuarters} color={s.color} flip />
                      )}
                      <span
                        className="relative z-10 h-3 w-3 shrink-0 rounded-full ring-2 ring-card"
                        style={{ background: s.color }}
                      />
                      {!labelLeft && (
                        <SlipTag slip={t.slipQuarters} color={s.color} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlipTag({
  slip,
  color,
  flip,
}: {
  slip: number;
  color: string;
  flip?: boolean;
}) {
  if (slip === 0) return null;
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded px-1 py-px text-[9px] font-semibold tabular-nums",
        flip ? "order-first" : "",
      )}
      style={{ color, background: `${color}1a` }}
    >
      {slip > 0 ? `▸ +${slip}Q` : `◂ ${slip}Q`}
    </span>
  );
}
