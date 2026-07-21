"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FillCategoryBar } from "@/components/charts/FillCharts";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import { cn } from "@/lib/utils";
import type { StageIrrRow } from "@/data/types/profit-pools";
import type { CompanyValueCapture } from "@/data/profit-pools";

/** IRR heat: emerald (high) → blue → amber → slate (thin/none). */
function irrColor(pct: number | null): string {
  if (pct == null) return "#94A3B8";
  if (pct >= 20) return "#10B981";
  if (pct >= 12) return "#3B82F6";
  if (pct >= 6) return "#F59E0B";
  return "#EF4444";
}

const fmtPct = (v: number | null, off?: boolean) =>
  off ? "off-chart" : v == null ? "—" : `${v}%`;

// ─────────────────────────── Stage IRR (bars + table) ──────────────────────

/** The per-stage greenfield-IRR bar chart (only stages with a positive IRR). */
function StageIrrBars({ rows }: { rows: StageIrrRow[] }) {
  const withIrr = rows
    .filter((r) => r.irrPct != null)
    .sort((a, b) => (b.irrPct ?? 0) - (a.irrPct ?? 0));
  const data = withIrr.map((r) => ({
    key: `${r.stage}-${r.region}`,
    label: r.stage,
    value: r.irrPct as number,
    color: irrColor(r.irrPct),
  }));
  return <FillCategoryBar data={data} unit="%" categoryWidth={104} showValues />;
}

function StageIrrTable({ rows }: { rows: StageIrrRow[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-2 font-semibold">Stage</th>
            <th className="px-2 py-2 text-right font-semibold">CapEx ₹/W</th>
            <th className="px-2 py-2 text-right font-semibold">Price ₹/W</th>
            <th className="px-2 py-2 text-right font-semibold">Margin</th>
            <th className="px-2 py-2 text-right font-semibold">Util</th>
            <th className="px-2 py-2 text-right font-semibold">Life</th>
            <th className="px-2 py-2 text-right font-semibold">EBITDA ₹/W/yr</th>
            <th className="px-2 py-2 text-right font-semibold">Payback</th>
            <th className="px-2 py-2 text-right font-semibold">
              IRR <span className="font-normal normal-case">· Munshot</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.stage}-${r.region}`} className="border-b border-border/60 align-top">
              <td className="px-2 py-2">
                <div className="font-medium text-foreground">{r.stage}</div>
                <div className="text-2xs text-muted-foreground">{r.region}</div>
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
                {r.capexPerW}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
                {r.aspPerW}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
                {r.ebitdaMarginPct}%
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {r.utilizationPct}%
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {r.lifeYears}y
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
                {r.ebitdaPerWYr > 0 ? r.ebitdaPerWYr : "—"}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {r.paybackYears != null ? `${r.paybackYears}y` : "—"}
              </td>
              <td
                className="px-2 py-2 text-right font-semibold tabular-nums"
                style={{ color: r.irrPct != null ? irrColor(r.irrPct) : undefined }}
              >
                {fmtPct(r.irrPct, r.offChart)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StageIrr({
  rows,
  assumptions,
}: {
  rows: StageIrrRow[];
  assumptions: string[];
}) {
  const lossStages = rows.filter((r) => r.irrPct == null && !r.offChart).map((r) => r.stage);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xs leading-snug text-muted-foreground">
        <AnalysisTag />
        <span>
          Greenfield project IRR = solve <span className="font-medium text-foreground/80">CapEx = Σ EBITDA / (1+r)ᵗ</span>{" "}
          over asset life. CapEx &amp; price are sourced FACT; the IRR is our read.
          {lossStages.length > 0 && (
            <> Loss-making upstream ({lossStages.join(", ")}) returns no positive IRR.</>
          )}
        </span>
      </p>
      <div className="flex min-h-0 basis-2/5 flex-col">
        <StageIrrBars rows={rows} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <StageIrrTable rows={rows} />
      </div>
      <p className="shrink-0 border-t border-border pt-1.5 text-[10px] leading-snug text-muted-foreground">
        Assumptions · {assumptions.join(" · ")}
      </p>
    </div>
  );
}

// ─────────────────────── Company value-capture (side panel) ─────────────────

/** Ranked "who captures value" list — greenfield IRR at each maker's margin. */
export function CompanyValueCaptureList({ rows }: { rows: CompanyValueCapture[] }) {
  const maxIrr = Math.max(1, ...rows.map((r) => r.irrPct ?? 0));
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-2xs leading-snug text-muted-foreground">
        Greenfield IRR at each maker&apos;s <span className="font-medium text-foreground/80">own EBITDA margin</span>{" "}
        (FACT), on that stage&apos;s CapEx model. Cell-line makers read on cell economics.
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const color = irrColor(r.irrPct);
          const w = r.offChart ? 100 : Math.max(4, ((r.irrPct ?? 0) / maxIrr) * 100);
          return (
            <li key={r.slug} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/companies/${r.slug}`}
                  className="min-w-0 flex-1 truncate text-xs font-medium text-foreground outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {r.name}
                </Link>
                <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
                  {r.stageLabel} · {r.ebitdaMarginPct}%
                </span>
                <span
                  className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums"
                  style={{ color }}
                >
                  {fmtPct(r.irrPct, r.offChart)}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/companies"
        className={cn(
          "inline-flex shrink-0 items-center gap-1 self-start rounded-md text-2xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand",
        )}
      >
        All companies
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}
