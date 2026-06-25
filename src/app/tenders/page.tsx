import { getTendersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import {
  FillBarSeries,
  FillDonut,
  FillLineSeries,
} from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasKpi,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { TenderKpi } from "@/data/types/tenders";
import { LeaderboardTable } from "./LeaderboardTable";
import { RecentAwardsTable } from "./RecentAwardsTable";

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

  const typeMixData = d.typeMix.map((t) => ({
    key: t.type,
    label: TENDER_TYPE_LABELS[t.type],
    value: t.mw,
    color: energyColor(t.type),
  }));

  const kpis: CanvasKpi[] = KPI_KEYS.map((key) =>
    d.kpis.find((k) => k.key === key),
  )
    .filter((k): k is TenderKpi => Boolean(k))
    .map((k) => ({
      label: k.label,
      value: kpiValue(k.value),
      unit: k.unit ? formatUnit(k.unit) : undefined,
      hint: k.hint,
    }));

  const topWinners = d.developerLeaderboard
    .slice(0, 5)
    .map((w) => ({ label: w.developer, value: formatNumber(w.mw) }));

  const tabs: CanvasTab[] = [
    {
      id: "awards",
      label: "Awards by quarter",
      title: "Awarded MW by quarter",
      subtitle: "Stacked by tender type",
      body: (
        <FillBarSeries
          series={d.awardsByQuarter}
          stacked
          unit="MW"
          periodOrder={quarters}
        />
      ),
      side: { title: "Top winners · FY26", node: <RankList rows={topWinners} /> },
    },
    {
      id: "tariff",
      label: "Tariff trend",
      title: "Lowest discovered solar tariff by year",
      subtitle: "₹/kWh · calendar years",
      source: "Mercom / SECI (maintained)",
      body: (
        <FillLineSeries
          series={d.tariffHistory}
          unit="₹/kWh"
          periodOrder={tariffYears}
        />
      ),
    },
    {
      id: "mix",
      label: "Type mix",
      title: "Tender-type mix",
      subtitle: `Share of ${d.asOfPeriod} MW`,
      body: <FillDonut data={typeMixData} unit="MW" />,
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      title: "Top developers by MW won",
      subtitle: "FY26-to-date · sortable · winners where disclosed",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <LeaderboardTable
            rows={d.developerLeaderboard}
            exportMeta={snapshotMeta(snapshot, {
              dataset: "developer-leaderboard",
            })}
          />
        </div>
      ),
    },
    {
      id: "log",
      label: "Award log",
      title: "Recent awards",
      subtitle: "Atomic award records · filter by type, sort any column",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <RecentAwardsTable
            awards={d.recentAwards}
            exportMeta={snapshotMeta(snapshot, { dataset: "recent-awards" })}
          />
        </div>
      ),
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
