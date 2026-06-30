import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { AnalysisTag } from "@/components/ui/AnalysisTag";
import type { Series } from "@/data/types/core";
import type { Evidence, Insight, LinesKey, SparkKey } from "./insights";

/** Live series resolved from the snapshots, keyed for the cards to reuse. */
export interface EvidenceData {
  sparks: Record<SparkKey, { values: number[]; periodLast?: string }>;
  lines: Record<LinesKey, { series: Series[]; periods: string[] }>;
}

function EvidenceBars({
  bars,
}: {
  bars: { label: string; value: number; display: string; color: string }[];
}) {
  const max = Math.max(...bars.map((b) => b.value));
  return (
    <div className="flex w-full flex-col gap-2">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-2xs text-muted-foreground">
            {b.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(6, (b.value / max) * 100)}%`, background: b.color }}
              aria-hidden
            />
          </div>
          <span
            className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums"
            style={{ color: b.color }}
          >
            {b.display}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The compact evidence element — a reused live chart or a cited visual/stat. */
function EvidenceView({
  evidence,
  data,
}: {
  evidence: Evidence;
  data: EvidenceData;
}) {
  if (evidence.kind === "spark") {
    return (
      <div className="w-full">
        <div className="h-24">
          <Sparkline
            values={data.sparks[evidence.key].values}
            color={evidence.color}
            height={96}
          />
        </div>
        <p className="mt-1 text-2xs text-muted-foreground">{evidence.caption}</p>
      </div>
    );
  }
  if (evidence.kind === "lines") {
    const l = data.lines[evidence.key];
    return (
      <div className="w-full">
        <LineSeriesChart series={l.series} periodOrder={l.periods} unit="GW" height={128} />
        <p className="mt-0.5 text-2xs text-muted-foreground">{evidence.caption}</p>
      </div>
    );
  }
  if (evidence.kind === "bars") {
    return (
      <div className="w-full py-2">
        <EvidenceBars bars={evidence.bars} />
        <p className="mt-2.5 text-2xs text-muted-foreground">{evidence.caption}</p>
      </div>
    );
  }
  return (
    <ul className="flex w-full flex-col gap-2 py-1">
      {evidence.lines.map((line) => (
        <li key={line} className="flex gap-1.5 text-xs leading-snug text-foreground/80">
          <span className="shrink-0 text-brand" aria-hidden>
            ▸
          </span>
          {line}
        </li>
      ))}
    </ul>
  );
}

function InsightCard({ insight, data }: { insight: Insight; data: EvidenceData }) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card">
      <AnalysisTag className="self-start" />
      <h3 className="mt-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
        {insight.thesis}
      </h3>

      <div className="mt-2.5">
        <div className="text-2xl font-semibold tabular-nums leading-none text-foreground">
          {insight.stat}
        </div>
        <p className="mt-1 text-2xs leading-snug text-muted-foreground">
          {insight.statCaption}
        </p>
      </div>

      <div className="mt-3">
        <EvidenceView evidence={insight.evidence} data={data} />
      </div>

      {/* so-what + provenance, pinned to the bottom of the (equal-height) card */}
      <div className="mt-auto pt-3">
        <p className="text-2xs leading-snug">
          <span className="font-semibold text-foreground/80">So what · </span>
          <span className="text-muted-foreground">{insight.soWhat}</span>
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
          <span className="min-w-0 truncate text-2xs text-muted-foreground">
            {insight.source}
          </span>
          <Link
            href={insight.href}
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-2xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
          >
            {insight.hrefLabel}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * A sub-tab's three insight cards — sized to content and vertically centred in
 * the canvas (no page scroll). Cards in a row equalise to the tallest.
 */
export function InsightGrid({
  insights,
  data,
}: {
  insights: Insight[];
  data: EvidenceData;
}) {
  return (
    <div className="grid min-h-0 w-full flex-1 grid-cols-1 content-center gap-3 md:grid-cols-3">
      {insights.map((i) => (
        <InsightCard key={i.id} insight={i} data={data} />
      ))}
    </div>
  );
}
