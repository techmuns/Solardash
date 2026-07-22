import { getTendersSnapshot } from "@/data";
import { formatDate, formatNumber } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillLineSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { AwardRecord } from "@/data/types/tenders";
import { LeaderboardTable } from "./LeaderboardTable";
import { AwardsChart } from "./AwardsChart";

export const dynamic = "force-static";
export const metadata = {
  title: "Tenders & Auctions",
  description:
    "Central & state solar / renewable auction results — awarded capacity, winning tariffs, the tender-type mix, and the developer leaderboard, in a single focused canvas.",
};

/** `Q1FY27` → `Q1 FY27`. */
const fmtQ = (q: string) => q.replace(/^(Q[1-4])(FY\d{2})$/, "$1 $2");

export default function TendersPage() {
  const snapshot = getTendersSnapshot();
  const d = snapshot.data;
  const quarters = d.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const source = "Auction feed · SECI / state DISCOMs (maintained)";
  const asOf = formatDate(snapshot.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snapshot, { dataset });

  const topWinners = d.developerLeaderboard
    .slice(0, 5)
    .map((w) => ({ label: w.developer, value: formatNumber(w.mw) }));

  // The trailing window (TTM) covered by KPIs / mix / leaderboard, clearly stated.
  const win = d.window;
  const winRange = `${fmtQ(win.firstQuarter)} – ${fmtQ(win.lastQuarter)}`;
  const winLabel = `${win.label} · ${winRange}`;

  // Atomic awards grouped by quarter and by month — powers the Awards hover card
  // in each frequency view.
  const awardsByPeriod: Record<string, AwardRecord[]> = {};
  for (const a of d.recentAwards) (awardsByPeriod[a.period] ??= []).push(a);
  const monthPeriods = d.awardsByMonth[0]?.points.map((p) => p.period) ?? [];
  const awardsByMonthPeriod: Record<string, AwardRecord[]> = {};
  for (const a of d.recentAwards) {
    const [y, m] = a.date.split("-");
    const label = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m) - 1]} ${y.slice(2)}`;
    (awardsByMonthPeriod[label] ??= []).push(a);
  }

  // Every tender type's capacity-weighted ₹/kWh trend (≥2 points), not just
  // solar — each line runs to the latest quarter that type was auctioned.
  const tariffSeries = d.tariffByType.filter((s) => s.points.length >= 2);
  const tariffPeriods = quarters.filter((q) =>
    tariffSeries.some((s) => s.points.some((p) => p.period === q)),
  );

  const tabs: CanvasTab[] = [
    {
      id: "awards",
      label: "Awarded MW",
      title: "Awarded MW over time",
      subtitle:
        "Stacked by tender type · toggle Quarterly / Monthly · hover a bar for its individual awards",
      body: (
        <AwardsChart
          quarterly={d.awardsByQuarter}
          quarterPeriods={quarters}
          quarterAwards={awardsByPeriod}
          monthly={d.awardsByMonth}
          monthPeriods={monthPeriods}
          monthAwards={awardsByMonthPeriod}
        />
      ),
      side: { title: `Top winners · ${win.label.startsWith("TTM") ? "TTM" : winRange}`, node: <RankList rows={topWinners} /> },
      exportData: {
        ...seriesToExport(d.awardsByQuarter, quarters, "Quarter"),
        meta: meta("awards-by-quarter"),
      },
    },
    {
      id: "tariff",
      label: "Tariff trend",
      title: "Winning tariff trend by tender type",
      subtitle:
        "Capacity-weighted ₹/kWh per quarter · every tender type · each point averages that quarter's underlying auctions",
      source: "Mercom / SECI (maintained)",
      body: (
        <FillLineSeries
          series={tariffSeries}
          unit="₹/kWh"
          periodOrder={tariffPeriods}
        />
      ),
      exportData: {
        ...seriesToExport(tariffSeries, tariffPeriods, "Quarter"),
        meta: meta("tariff-history"),
      },
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      title: "Top developers by MW won",
      subtitle: `${winLabel} · click a row for its auctions · sortable · search · listed parent shown`,
      body: <LeaderboardTable rows={d.developerLeaderboard} awards={d.recentAwards} />,
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
    <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
