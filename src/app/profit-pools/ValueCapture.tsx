"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import { cn } from "@/lib/utils";
import type { StageIrrRow } from "@/data/types/profit-pools";
import type { CompanyValueCapture } from "@/data/profit-pools";

/** IRR heat: emerald (high) → blue → amber → red (thin/none). */
function irrColor(pct: number | null): string {
  if (pct == null) return "#94A3B8";
  if (pct >= 20) return "#10B981";
  if (pct >= 12) return "#3B82F6";
  if (pct >= 6) return "#F59E0B";
  return "#EF4444";
}

const fmtPct = (v: number | null, off?: boolean) =>
  off ? "off-chart" : v == null ? "—" : `${v}%`;

// ─────────────────────── Expandable per-stage company rows ──────────────────

function CompanyRows({ companies }: { companies: CompanyValueCapture[] }) {
  if (companies.length === 0) {
    return (
      <tr className="bg-muted/20">
        <td colSpan={9} className="px-2 py-2 pl-8 text-2xs text-muted-foreground">
          No tracked India players at this stage.
        </td>
      </tr>
    );
  }
  return (
    <>
      {companies.map((c) => (
        <tr key={c.slug} className="bg-muted/20 text-xs">
          <td className="py-1.5 pl-8 pr-2">
            <Link
              href={`/companies/${c.slug}`}
              className="text-foreground/90 outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
            >
              {c.name}
            </Link>
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.capexPerW}
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.aspPerW}
          </td>
          <td className="px-2 py-1.5 text-right font-medium tabular-nums text-foreground/90">
            {c.ebitdaMarginPct}%
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.utilizationPct}%
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground/50">
            {c.lifeYears}y
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-foreground/80">
            {c.ebitdaPerWYr > 0 ? c.ebitdaPerWYr : "—"}
          </td>
          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
            {c.paybackYears != null ? `${c.paybackYears}y` : "—"}
          </td>
          <td
            className="px-2 py-1.5 text-right font-semibold tabular-nums"
            style={{ color: c.irrPct != null ? irrColor(c.irrPct) : undefined }}
          >
            {fmtPct(c.irrPct, c.offChart)}
          </td>
        </tr>
      ))}
    </>
  );
}

function StageRow({
  row,
  companies,
  open,
  onToggle,
}: {
  row: StageIrrRow;
  companies: CompanyValueCapture[];
  open: boolean;
  onToggle: () => void;
}) {
  const expandable = companies.length > 0;
  return (
    <>
      <tr
        className={cn(
          "border-b border-border/60 align-middle",
          expandable && "cursor-pointer hover:bg-muted/30",
          open && "bg-muted/20",
        )}
        onClick={expandable ? onToggle : undefined}
      >
        <td className="px-2 py-2">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90",
                !expandable && "opacity-0",
              )}
              aria-hidden
            />
            <div>
              <div className="font-medium text-foreground">
                {row.stage}
                {expandable && (
                  <span className="ml-1.5 text-2xs font-normal text-muted-foreground">
                    {companies.length}
                  </span>
                )}
              </div>
              <div className="pl-0 text-2xs text-muted-foreground">{row.region}</div>
            </div>
          </div>
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">{row.capexPerW}</td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">{row.aspPerW}</td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
          {row.ebitdaMarginPct}%
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
          {row.utilizationPct}%
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.lifeYears}y</td>
        <td className="px-2 py-2 text-right tabular-nums text-foreground/90">
          {row.ebitdaPerWYr > 0 ? row.ebitdaPerWYr : "—"}
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
          {row.paybackYears != null ? `${row.paybackYears}y` : "—"}
        </td>
        <td
          className="px-2 py-2 text-right font-semibold tabular-nums"
          style={{ color: row.irrPct != null ? irrColor(row.irrPct) : undefined }}
        >
          {fmtPct(row.irrPct, row.offChart)}
        </td>
      </tr>
      {open && <CompanyRows companies={companies} />}
    </>
  );
}

export function StageIrr({
  rows,
  companies,
  assumptions,
}: {
  rows: StageIrrRow[];
  companies: CompanyValueCapture[];
  assumptions: string[];
}) {
  // Group companies under their stage (matched on the stage name).
  const byStage = React.useMemo(() => {
    const m = new Map<string, CompanyValueCapture[]>();
    for (const c of companies) {
      const arr = m.get(c.stageName) ?? [];
      arr.push(c);
      m.set(c.stageName, arr);
    }
    return m;
  }, [companies]);

  // Collapsed by default — each stage is a summary row; click to reveal its
  // companies' IRRs.
  const [open, setOpen] = React.useState<Set<string>>(() => new Set());
  const toggle = (stage: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });

  const lossStages = rows.filter((r) => r.irrPct == null && !r.offChart).map((r) => r.stage);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xs leading-snug text-muted-foreground">
        <AnalysisTag />
        <span>
          Greenfield IRR = solve{" "}
          <span className="font-medium text-foreground/80">CapEx = Σ EBITDA / (1+r)ᵗ</span> over asset
          life. Expand a stage for each company&apos;s IRR at its own margin.
          {lossStages.length > 0 && (
            <> Loss-making upstream ({lossStages.join(", ")}) returns no positive IRR.</>
          )}
        </span>
      </p>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 font-semibold">Stage · company</th>
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
              <StageRow
                key={`${r.stage}-${r.region}`}
                row={r}
                companies={byStage.get(r.stage) ?? []}
                open={open.has(r.stage)}
                onToggle={() => toggle(r.stage)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="shrink-0 border-t border-border pt-1.5 text-[10px] leading-snug text-muted-foreground">
        Assumptions · {assumptions.join(" · ")}
      </p>
    </div>
  );
}

// ─────────────────────── Company value-capture (side panel) ─────────────────

/** Ranked cross-stage "who captures value" leaderboard (top players). */
export function CompanyValueCaptureList({
  rows,
  limit = 12,
}: {
  rows: CompanyValueCapture[];
  limit?: number;
}) {
  const shown = rows.slice(0, limit);
  const maxIrr = Math.max(1, ...shown.map((r) => r.irrPct ?? 0));
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-2xs leading-snug text-muted-foreground">
        Greenfield IRR at each player&apos;s <span className="font-medium text-foreground/80">own EBITDA margin</span>{" "}
        (FACT), on that stage&apos;s CapEx model — ranked across the chain.
      </p>
      <ul className="flex flex-col gap-2">
        {shown.map((r) => {
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
        className="inline-flex shrink-0 items-center gap-1 self-start rounded-md text-2xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
      >
        All companies
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}
