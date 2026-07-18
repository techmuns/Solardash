"use client";

import * as React from "react";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { FillCategoryBar } from "@/components/charts/FillCharts";
import { FrequencyToggle } from "@/components/charts/FrequencyToggle";
import { Sparkline } from "@/components/charts/Sparkline";
import { DIRECTION_CLASS as DCLASS } from "@/components/ui/direction";
import { cn } from "@/lib/utils";
import type { Series } from "@/data/types/core";
import type { StageEconomicsRow } from "@/data/types/profit-pools";
import { AnalysisTag } from "./parts";

// ───────────────────────────── Tab A · Price stack ─────────────────────────

/** One native-unit price panel (its own y-scale). */
function PricePanel({ series, periods }: { series: Series; periods: string[] }) {
  const pts = series.points;
  const first = pts[0]?.value;
  const lastP = pts[pts.length - 1];
  const peak = Math.max(...pts.map((p) => p.value));
  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="flex shrink-0 items-baseline justify-between">
        <h4 className="text-sm font-semibold tracking-tight text-foreground">
          {series.label}
          <span className="ml-1.5 text-2xs font-normal text-muted-foreground">
            {series.unit}
          </span>
        </h4>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {first} → <span className="text-foreground/80">{lastP?.value}</span> · peak{" "}
          {peak}
        </span>
      </div>
      <LineSeriesChart
        series={[series]}
        periodOrder={periods}
        unit={series.unit}
        height={158}
        showLegend={false}
      />
    </div>
  );
}

export function PriceStack({
  years,
  series,
  months,
  monthly,
}: {
  years: string[];
  series: Series[];
  months: string[];
  monthly: Series[];
}) {
  const [freq, setFreq] = React.useState<"monthly" | "annual">("monthly");
  const isM = freq === "monthly";
  const windowLabel = isM
    ? `${months[0] ?? ""} → ${months[months.length - 1] ?? ""}`
    : `${years[0] ?? ""} → ${years[years.length - 1] ?? ""}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-2xs leading-snug text-muted-foreground">
          {isM ? (
            <>
              Monthly survey track, {windowLabel} · China spot (RMB ÷ 7.2) · module =
              FOB China.{" "}
              <span className="font-medium text-foreground/80">
                Poly&apos;s H2&apos;25 supply-cut rally (~$4.9 → $7.2) unwound to
                the cash-cost floor by Jul &apos;26; module FOB spiked ~30% in
                early &apos;26 on export-rebate pre-buying.
              </span>{" "}
              Est. months interpolated between published quotes.
            </>
          ) : (
            <>
              Global PV price stack, native units, {windowLabel}.{" "}
              <span className="font-medium text-foreground/80">
                Polysilicon −88% peak→trough ($36→$5/kg); modules roughly halved
                ($0.26→$0.10/W); 2025 a partial recovery.
              </span>{" "}
              Dots are annual; est. years reconstructed from monthly data.
            </>
          )}
        </p>
        <FrequencyToggle<"monthly" | "annual">
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "annual", label: "Annual" },
          ]}
          value={freq}
          onChange={setFreq}
        />
      </div>
      <div className="grid min-h-0 flex-1 content-start grid-cols-1 gap-3 sm:grid-cols-2">
        {(isM ? monthly : series).map((s) => (
          <PricePanel key={s.key} series={s} periods={isM ? months : years} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────── Tab B · Stage economics table ─────────────────────

function DirText({ row }: { row: StageEconomicsRow }) {
  const d = DCLASS[row.directionClass];
  return (
    <span
      className="inline-flex items-center gap-1 font-medium"
      style={{ color: d.color }}
    >
      <d.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {row.direction}
    </span>
  );
}

export function StageEconomicsTable({ rows }: { rows: StageEconomicsRow[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mb-2 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Margins = FACT</span>{" "}
        (filings / agencies, cited per row) ·
        <AnalysisTag />
        <span>sets the direction read. China squeezed vs India / US expanding —</span>
        <span className="font-medium text-foreground/80">
          trade policy, not technology, sets the module margin.
        </span>
      </p>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 font-semibold">Stage</th>
              <th className="px-2 py-2 font-semibold">Margin</th>
              <th className="px-2 py-2 font-semibold">Trend</th>
              <th className="px-2 py-2 font-semibold">
                Direction <span className="font-normal normal-case">· Munshot</span>
              </th>
              <th className="px-2 py-2 font-semibold">Why</th>
              <th className="px-2 py-2 font-semibold">Source · conf</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.stage}-${r.region}`}
                className="border-b border-border/60 align-top"
              >
                <td className="px-2 py-2">
                  <div className="font-medium text-foreground">{r.stage}</div>
                  {r.region && (
                    <div className="text-2xs text-muted-foreground">{r.region}</div>
                  )}
                </td>
                <td className="px-2 py-2 tabular-nums text-foreground/90">
                  <span className="text-2xs text-muted-foreground">{r.metric} </span>
                  {r.marginText}
                </td>
                <td className="px-2 py-2">
                  {r.trend && r.trend.length > 1 ? (
                    <div className="h-7 w-20">
                      <Sparkline
                        values={r.trend}
                        color={DCLASS[r.directionClass].color}
                        height={28}
                        area={false}
                      />
                    </div>
                  ) : (
                    <span className="text-2xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-xs">
                  <DirText row={r} />
                </td>
                <td className="px-2 py-2 text-xs leading-snug text-muted-foreground">
                  {r.rationale}
                </td>
                <td className="px-2 py-2">
                  <div className="text-xs text-foreground/80">{r.source}</div>
                  <div
                    className={cn(
                      "text-2xs",
                      r.confidence === "high"
                        ? "text-muted-foreground"
                        : "font-medium text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {r.confidence}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────── Tab C · Margin by stage (bar) ──────────────────────

export function MarginByStage({ rows }: { rows: StageEconomicsRow[] }) {
  const repRows = rows
    .filter((r) => r.rep && r.repMargin != null)
    .sort((a, b) => (b.repMargin ?? 0) - (a.repMargin ?? 0));
  const data = repRows.map((r) => ({
    key: `${r.stage}-${r.region}`,
    label: r.stage,
    value: r.repMargin as number,
    color: DCLASS[r.directionClass].color,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FillCategoryBar data={data} unit="%" categoryWidth={128} showValues />
      <p className="mt-1 shrink-0 text-2xs leading-snug text-muted-foreground">
        <AnalysisTag /> Representative EBITDA / gross margin per stage (India figure
        where bifurcated). The profitability gradient runs from generation &
        protected manufacturing down to the globally-squeezed commodity midstream.
      </p>
    </div>
  );
}

/** Side panel for Tab C: the geographic contrast + the BESS caveat. */
export function MarginContrast({ rows }: { rows: StageEconomicsRow[] }) {
  const byStage = new Map<string, StageEconomicsRow[]>();
  for (const r of rows) {
    if (r.repMargin == null) continue;
    const arr = byStage.get(r.stage) ?? [];
    arr.push(r);
    byStage.set(r.stage, arr);
  }
  const bifurcated = [...byStage.entries()].filter(([, rs]) => rs.length > 1);
  const bess = rows.find((r) => r.repMargin == null);

  return (
    <div className="flex flex-col gap-3 text-xs">
      <ul className="space-y-1.5">
        {bifurcated.map(([stage, rs]) => (
          <li key={stage}>
            <span className="font-medium text-foreground">{stage}</span>
            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 tabular-nums">
              {rs
                .slice()
                .sort((a, b) => (a.repMargin ?? 0) - (b.repMargin ?? 0))
                .map((r) => (
                  <span
                    key={r.region}
                    style={{ color: DCLASS[r.directionClass].color }}
                  >
                    {r.region} {(r.repMargin as number) > 0 ? "+" : ""}
                    {r.repMargin}%
                  </span>
                ))}
            </div>
          </li>
        ))}
      </ul>
      {bess && (
        <p className="border-t border-border pt-2 text-2xs leading-snug text-muted-foreground">
          <span className="font-medium text-foreground/80">{bess.stage} omitted</span>{" "}
          — {bess.marginText.toLowerCase()}. {bess.confidence}.
        </p>
      )}
    </div>
  );
}
