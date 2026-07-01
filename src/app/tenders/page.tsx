import { getTendersSnapshot } from "@/data";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillBarSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasKpi,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { AwardRecord, TenderKpi } from "@/data/types/tenders";
import { LeaderboardTable } from "./LeaderboardTable";
import { AwardsTooltip } from "./AwardsTooltip";
import { TariffTrendToggle } from "./TariffTrendToggle";

export const dynamic = "force-static";
export const metadata = {
  title: "Tenders & Auctions",
  description:
    "Central & state solar / renewable auction results — awarded capacity, winning tariffs, the tender-type mix, and the developer leaderboard, in a single focused canvas.",
};

function kpiValue(value: number | string): string {
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2);
}

const KPI_KEYS = [
  "awarded_fy26",
  "lowest_tariff",
  "avg_tariff",
  "leading_type",
  "top_developer",
];

export default function TendersPage() {
  const snapshot = getTendersSnapshot();
  const d = snapshot.data;
  const quarters = d.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const tariffYears = d.tariffHistory[0]?.points.map((p) => p.period) ?? [];
  const source = "Auction feed · SECI / state DISCOMs (maintained)";
  const asOf = formatDate(snapshot.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snapshot, { dataset });

  // Contextual change chips, from committed series only:
  //  • lowest tariff — fall vs the series peak year (same "lowest by year" metric)
  //  • awarded — how many auctions the total spans
  const th = d.tariffHistory[0]?.points ?? [];
  const tariffPeak = th.length ? Math.max(...th.map((p) => p.value)) : undefined;
  const peakYear =
    tariffPeak != null ? th.find((p) => p.value === tariffPeak)?.period : undefined;
  const lowestVal = d.kpis.find((k) => k.key === "lowest_tariff")?.value;
  const tariffFall =
    tariffPeak && typeof lowestVal === "number"
      ? `${Math.round(((lowestVal - tariffPeak) / tariffPeak) * 100)}%`
      : undefined;
  const auctions = d.kpis.find((k) => k.key === "auctions_fy26")?.value;

  const kpiExtra: Record<string, { delta?: string; hint?: string }> = {
    awarded_fy26: auctions != null ? { hint: `${auctions} auctions · FY26` } : {},
    lowest_tariff:
      tariffFall && peakYear
        ? { delta: tariffFall, hint: `vs ₹${tariffPeak} in ${peakYear}` }
        : {},
  };

  const kpis: CanvasKpi[] = KPI_KEYS.map((key) =>
    d.kpis.find((k) => k.key === key),
  )
    .filter((k): k is TenderKpi => Boolean(k))
    .map((k) => ({
      label: k.label,
      value: kpiValue(k.value),
      unit: k.unit ? formatUnit(k.unit) : undefined,
      hint: k.hint,
      ...kpiExtra[k.key],
    }));

  const topWinners = d.developerLeaderboard
    .slice(0, 5)
    .map((w) => ({ label: w.developer, value: formatNumber(w.mw) }));

  // Atomic awards grouped by quarter — powers the Awards-by-quarter hover card
  // (the detail that used to live in the separate Award-log tab).
  const awardsByPeriod: Record<string, AwardRecord[]> = {};
  for (const a of d.recentAwards) (awardsByPeriod[a.period] ??= []).push(a);

  // Recent quarterly solar tariff (capacity-weighted per quarter) for the
  // "By quarter" toggle on the tariff tab; the annual line stays the default.
  const solarTariffQ = d.tariffByType.filter((s) => s.key === "solar");
  const tariffQuarters = solarTariffQ[0]?.points.map((p) => p.period) ?? [];

  const tabs: CanvasTab[] = [
    {
      id: "awards",
      label: "Awards by quarter",
      title: "Awarded MW by quarter",
      subtitle: "Stacked by tender type · hover a quarter for its individual awards",
      body: (
        <FillBarSeries
          series={d.awardsByQuarter}
          stacked
          unit="MW"
          periodOrder={quarters}
          tooltipContent={<AwardsTooltip awardsByPeriod={awardsByPeriod} />}
        />
      ),
      side: { title: "Top winners · FY26", node: <RankList rows={topWinners} /> },
      exportData: {
        ...seriesToExport(d.awardsByQuarter, quarters, "Quarter"),
        meta: meta("awards-by-quarter"),
      },
    },
    {
      id: "tariff",
      label: "Tariff trend",
      title: "Solar tariff trend",
      subtitle: "Lowest discovered ₹/kWh · switch year ↔ recent quarters",
      source: "Mercom / SECI (maintained)",
      body: (
        <TariffTrendToggle
          annual={d.tariffHistory}
          annualOrder={tariffYears}
          quarterly={solarTariffQ}
          quarterlyOrder={tariffQuarters}
        />
      ),
      exportData: {
        ...seriesToExport(d.tariffHistory, tariffYears, "Year"),
        meta: meta("tariff-history"),
      },
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      title: "Top developers by MW won",
      subtitle: "FY26-to-date · sortable · toggle listed-only · winners where disclosed",
      body: <LeaderboardTable rows={d.developerLeaderboard} />,
      exportData: {
        columns: [
          { key: "developer", label: "Developer" },
          { key: "mw", label: "MW won" },
          { key: "auctions", label: "Auctions" },
          { key: "avgTariffRs", label: "Avg tariff (₹/kWh)" },
        ],
        rows: d.developerLeaderboard.map((r) => ({
          developer: r.developer,
          mw: r.mw,
          auctions: r.auctions,
          avgTariffRs: r.avgTariffRs ?? null,
        })),
        meta: meta("developer-leaderboard"),
      },
    },
  ];

  return (
    <SectionCanvas
      kpis={kpis}
      tabs={tabs}
      asOf={asOf}
      defaultSource={source}
    />
  );
}
