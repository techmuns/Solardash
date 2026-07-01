import { getTendersSnapshot } from "@/data";
import { formatDate, formatNumber } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillBarSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { AwardRecord } from "@/data/types/tenders";
import { LeaderboardTable } from "./LeaderboardTable";
import { AwardsTooltip } from "./AwardsTooltip";
import { TariffTrendToggle } from "./TariffTrendToggle";

export const dynamic = "force-static";
export const metadata = {
  title: "Tenders & Auctions",
  description:
    "Central & state solar / renewable auction results — awarded capacity, winning tariffs, the tender-type mix, and the developer leaderboard, in a single focused canvas.",
};

export default function TendersPage() {
  const snapshot = getTendersSnapshot();
  const d = snapshot.data;
  const quarters = d.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const tariffYears = d.tariffHistory[0]?.points.map((p) => p.period) ?? [];
  const source = "Auction feed · SECI / state DISCOMs (maintained)";
  const asOf = formatDate(snapshot.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snapshot, { dataset });

  const topWinners = d.developerLeaderboard
    .slice(0, 5)
    .map((w) => ({ label: w.developer, value: formatNumber(w.mw) }));

  // Atomic awards grouped by quarter — powers the Awards-by-quarter hover card
  // (the detail that used to live in the separate Award-log tab).
  const awardsByPeriod: Record<string, AwardRecord[]> = {};
  for (const a of d.recentAwards) (awardsByPeriod[a.period] ??= []).push(a);

  // Recent quarterly solar-family tariff (capacity-weighted per quarter) for the
  // "By quarter" toggle on the tariff tab: pure solar + solar-plus-storage, for
  // denser coverage than solar alone. The annual line stays the default.
  const solarFamilyTariffQ = d.tariffByType.filter(
    (s) => s.key === "solar" || s.key === "solar-bess",
  );
  const famPeriods = new Set(
    solarFamilyTariffQ.flatMap((s) => s.points.map((p) => p.period)),
  );
  const tariffQuarters = quarters.filter((q) => famPeriods.has(q));

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
          quarterly={solarFamilyTariffQ}
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
    <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
