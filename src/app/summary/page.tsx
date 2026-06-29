import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  FillBarSeries,
  FillDonut,
  FillLineSeries,
  FillSparkline,
} from "@/components/charts/FillCharts";
import {
  getCapacitySnapshot,
  getDemandSnapshot,
  getDevelopersSnapshot,
  getTendersSnapshot,
} from "@/data";
import { getWhatsNewFeed } from "@/data/whats-new";
import { energyColor } from "@/lib/colors";
import { cn, formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { CATEGORY_META } from "../whats-new/category-meta";
import type { Kpi } from "@/data/types/core";

export const dynamic = "force-static";
export const metadata = {
  title: "Summary",
  description:
    "A tenders-led, single-screen synthesis of India's solar sector — the auction pipeline, installed capacity, peak demand, tariffs, the type mix, top developers, and the latest activity.",
};

function kpiVal(k?: Kpi): string {
  if (!k) return "—";
  if (typeof k.value === "string") return k.value;
  return Number.isInteger(k.value)
    ? formatNumber(k.value)
    : parseFloat(k.value.toFixed(2)).toString();
}
const findKpi = (kpis: Kpi[], key: string) => kpis.find((k) => k.key === key);

// Clickable bento card: card surface + hover lift + focus ring.
const cardCls =
  "group flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card outline-none transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand";
const eyebrow =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

// "Metric + trend" bento card: title top, value + green delta upper, a bare
// sparkline filling the lower band down to the bottom edge (no dead space).
function TrendCard({
  href,
  place,
  label,
  value,
  unit,
  delta,
  hint,
  values,
  color,
  ariaLabel,
}: {
  href: string;
  place: string;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  hint?: string;
  values: number[];
  color: string;
  ariaLabel: string;
}) {
  return (
    <Link href={href} aria-label={ariaLabel} className={cn(cardCls, place)}>
      <div className="flex items-start justify-between gap-2">
        <p className={eyebrow}>{label}</p>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
          aria-hidden
        />
      </div>
      <div className="mt-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-stat font-semibold tabular-nums text-foreground">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        {(delta || hint) && (
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            {delta && (
              <span className="inline-flex items-center gap-0.5 font-medium tabular-nums text-positive">
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                {delta}
              </span>
            )}
            {hint && (
              <span className="truncate text-muted-foreground">{hint}</span>
            )}
          </div>
        )}
      </div>
      {values.length > 1 && <FillSparkline values={values} color={color} />}
    </Link>
  );
}

export default function SummaryPage() {
  const tenders = getTendersSnapshot();
  const developers = getDevelopersSnapshot();
  const capacity = getCapacitySnapshot();
  const demand = getDemandSnapshot();

  const tK = tenders.data.kpis;
  const quarters =
    tenders.data.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const tariffYears =
    tenders.data.tariffHistory[0]?.points.map((p) => p.period) ?? [];
  const typeMixData = tenders.data.typeMix.map((t) => ({
    key: t.type,
    label: TENDER_TYPE_LABELS[t.type],
    value: t.mw,
    color: energyColor(t.type),
  }));

  const heroKpis = [
    { label: "Awarded FY26-TD", k: findKpi(tK, "awarded_fy26") },
    { label: "Lowest tariff", k: findKpi(tK, "lowest_tariff") },
    { label: "Top developer", k: findKpi(tK, "top_developer") },
  ];

  const totalInstalled = findKpi(capacity.data.kpis, "total_installed");
  const nfAdds = findKpi(capacity.data.kpis, "fy26_nonfossil_adds");
  const nfShare = findKpi(capacity.data.kpis, "non_fossil_share");

  const peak = findKpi(demand.data.kpis, "all-time-peak-apr-2026");
  const peakYoy = findKpi(demand.data.kpis, "peak-growth-jan-yoy");

  // Sparkline series, straight from the loaders (no hardcoded points).
  const capTrend =
    capacity.data.installedHistory[0]?.points.map((p) => p.value) ?? [];
  const peakTrend = demand.data.peakGw;

  const topDevs = developers.data.roster.slice(0, 4);
  const maxDevGw = Math.max(1, ...topDevs.map((d) => d.operationalGw));

  const feed = getWhatsNewFeed().slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-3.5 p-4 sm:p-5 lg:h-full lg:grid-cols-4 lg:grid-rows-[1.25fr_1fr_0.9fr] lg:overflow-hidden">
      {/* HERO — tenders pipeline (cols 1–2, rows 1–2) */}
      <Link
        href="/tenders"
        className={cn(cardCls, "lg:col-span-2 lg:row-span-2")}
        aria-label="India's RE auction pipeline — open Tenders"
      >
        <div className="flex items-center justify-between gap-2">
          <Badge variant="brand" className="text-2xs">
            Hero · Tenders
          </Badge>
          <ArrowUpRight
            className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand"
            aria-hidden
          />
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
          India&apos;s RE auction pipeline
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {heroKpis.map(
            ({ label, k }) =>
              k && (
                <div key={label} className="min-w-0">
                  <p className="truncate text-2xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">
                    {kpiVal(k)}
                    {k.unit && (
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        {formatUnit(k.unit)}
                      </span>
                    )}
                  </p>
                  {k.hint && (
                    <p className="truncate text-2xs text-muted-foreground">
                      {k.hint}
                    </p>
                  )}
                </div>
              ),
          )}
        </div>
        <p className="mb-1 mt-3 text-2xs text-muted-foreground">
          Awarded MW by quarter · stacked by tender type
        </p>
        <FillBarSeries
          series={tenders.data.awardsByQuarter}
          stacked
          unit="MW"
          periodOrder={quarters}
        />
      </Link>

      {/* Installed capacity (col 3, row 1) — value + amber installed-history spark */}
      <TrendCard
        href="/power-system"
        place="lg:col-start-3 lg:row-start-1"
        label="Installed capacity"
        value={kpiVal(totalInstalled)}
        unit={totalInstalled?.unit ? formatUnit(totalInstalled.unit) : undefined}
        delta={nfAdds ? `+${Number(nfAdds.value).toFixed(1)} GW` : undefined}
        hint={nfShare ? `${kpiVal(nfShare)}% non-fossil · FY26` : undefined}
        values={capTrend}
        color="#F59E0B"
        ariaLabel="Installed capacity — open Power System"
      />

      {/* Peak demand (col 4, row 1) — value + peak-demand history spark */}
      <TrendCard
        href="/power-system"
        place="lg:col-start-4 lg:row-start-1"
        label="Peak demand"
        value={kpiVal(peak)}
        unit={peak?.unit ? formatUnit(peak.unit) : "GW"}
        delta={peakYoy ? `${peakYoy.value}%` : undefined}
        hint="all-time peak · Apr 2026"
        values={peakTrend}
        color="#0EA5E9"
        ariaLabel="Peak demand — open Power System"
      />

      {/* Lowest solar tariff · mini line (col 3, row 2) */}
      <Link
        href="/tenders"
        className={cn(cardCls, "lg:col-start-3 lg:row-start-2")}
        aria-label="Lowest solar tariff by year — open Tenders"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={eyebrow}>Lowest solar tariff</p>
            <p className="text-2xs text-muted-foreground">by year · ₹/kWh</p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
            aria-hidden
          />
        </div>
        <FillLineSeries
          series={tenders.data.tariffHistory}
          unit="₹/kWh"
          periodOrder={tariffYears}
        />
      </Link>

      {/* Tender-type mix · donut (col 4, row 2) */}
      <Link
        href="/tenders"
        className={cn(cardCls, "lg:col-start-4 lg:row-start-2")}
        aria-label="Tender-type mix — open Tenders"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={eyebrow}>Tender-type mix</p>
            <p className="text-2xs text-muted-foreground">FY26 · share of MW</p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
            aria-hidden
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <FillDonut data={typeMixData} unit="MW" showLegend={false} />
          <ul className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-0.5 pt-1.5">
            {typeMixData.map((t) => (
              <li
                key={t.key}
                className="flex items-center gap-1.5 text-2xs text-muted-foreground"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: t.color }}
                  aria-hidden
                />
                <span className="truncate">{t.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Link>

      {/* Top developers · leaderboard (cols 1–2, row 3) */}
      <Link
        href="/developers"
        className={cn(cardCls, "lg:col-span-2 lg:row-start-3")}
        aria-label="Top developers by operational GW — open IPPs"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className={eyebrow}>Top developers</p>
            <p className="text-2xs text-muted-foreground">operational GW</p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
            aria-hidden
          />
        </div>
        <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-2.5">
          {topDevs.map((d, i) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-3 shrink-0 text-2xs tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="w-32 shrink-0 truncate text-sm font-medium text-foreground">
                {d.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(d.operationalGw / maxDevGw) * 100}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                {d.operationalGw}
              </span>
            </div>
          ))}
        </div>
      </Link>

      {/* What's new (cols 3–4, row 3) */}
      <div className={cn(cardCls, "hover:translate-y-0 hover:shadow-card lg:col-span-2 lg:col-start-3 lg:row-start-3")}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className={eyebrow}>What&apos;s new</p>
            <p className="text-2xs text-muted-foreground">latest sector activity</p>
          </div>
          <Link
            href="/whats-new"
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
          >
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="mt-1 flex min-h-0 flex-1 flex-col justify-center divide-y divide-border/70">
          {feed.map((e) => {
            const meta = CATEGORY_META[e.category];
            const Icon = meta.icon;
            return (
              <Link
                key={e.id}
                href={e.href}
                className="flex items-center gap-2.5 py-2 outline-none transition-opacity hover:opacity-70 focus-visible:opacity-70"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ background: `${meta.color}1a`, color: meta.color }}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {e.title}
                </span>
                <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
                  {formatDate(e.date)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
