import { getTendersSnapshot } from "@/data";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { FillBarSeries, FillLineSeries } from "@/components/charts/FillCharts";
import { MixAreaToggle } from "@/components/charts/MixAreaToggle";
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
  const meta = (dataset: string) => snapshotMeta(snapshot, { dataset });

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
      exportData: {
        ...seriesToExport(d.awardsByQuarter, quarters, "Quarter"),
        meta: meta("awards-by-quarter"),
      },
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
      exportData: {
        ...seriesToExport(d.tariffHistory, tariffYears, "Year"),
        meta: meta("tariff-history"),
      },
    },
    {
      id: "mix",
      label: "Mix shift",
      title: "Tender mix over time",
      subtitle:
        "Awarded-MW composition by type per quarter · 100% share (toggle MW)",
      body: (
        <MixAreaToggle
          series={d.awardsByQuarter}
          periodOrder={quarters}
          unit="MW"
          initialShare
        />
      ),
      exportData: {
        ...seriesToExport(d.awardsByQuarter, quarters, "Quarter"),
        meta: meta("tender-mix-over-time"),
      },
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      title: "Top developers by MW won",
      subtitle: "FY26-to-date · sortable · winners where disclosed",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <LeaderboardTable rows={d.developerLeaderboard} />
        </div>
      ),
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
    {
      id: "log",
      label: "Award log",
      title: "Recent awards",
      subtitle: "Atomic award records · filter by type, sort any column",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <RecentAwardsTable awards={d.recentAwards} />
        </div>
      ),
      exportData: {
        columns: [
          { key: "date", label: "Date" },
          { key: "agency", label: "Agency" },
          { key: "type", label: "Type" },
          { key: "mw", label: "MW" },
          { key: "storage", label: "Storage (MWh)" },
          { key: "tariff", label: "Tariff (₹/kWh)" },
          { key: "winners", label: "Winners" },
          { key: "state", label: "State" },
        ],
        rows: d.recentAwards.map((a) => ({
          date: a.date,
          agency: a.agency,
          type: TENDER_TYPE_LABELS[a.tenderType],
          mw: a.capacityMw,
          storage: a.storageMwh ?? null,
          tariff: a.tariffRs ?? null,
          winners:
            (a.winners ?? []).map((w) => w.developer).join("; ") || null,
          state: a.state ?? "Central",
        })),
        meta: meta("recent-awards"),
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
