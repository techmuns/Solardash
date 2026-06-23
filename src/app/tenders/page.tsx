import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { BarSeriesChart } from "@/components/charts/BarSeriesChart";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { PieSeriesChart } from "@/components/charts/PieSeriesChart";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { getTendersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { categoryToExport, snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { LeaderboardTable } from "./LeaderboardTable";
import { RecentAwardsTable } from "./RecentAwardsTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Tenders & Auctions",
  description:
    "Central & state solar / renewable auction results — awarded capacity, winning tariffs, the tender-type mix, and the developer leaderboard.",
};

function kpiValue(value: number | string): string {
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2);
}

export default function TendersPage() {
  const snapshot = getTendersSnapshot();
  const d = snapshot.data;
  const quarters = d.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];

  const source = "Auction feed · SECI / state DISCOMs (maintained)";
  const asOf = formatDate(snapshot.updatedAt);

  const typeMixData = d.typeMix.map((t) => ({
    key: t.type,
    label: TENDER_TYPE_LABELS[t.type],
    value: t.mw,
    color: energyColor(t.type),
  }));
  const agencyData = d.agencySplit.map((a) => ({
    key: a.agency,
    label: a.agency,
    value: a.mw,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tenders & Auctions"
        subtitle="Central & state solar / renewable auctions — awarded capacity, winning tariffs, the tender-type mix, and the developer leaderboard."
        asOf={`As of ${asOf} · ${d.asOfPeriod}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader
          title="FY26-to-date"
          subtitle="Apr 2025 – Mar 2026 · central & state auctions."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {d.kpis.map((k) => (
            <StatCard
              key={k.key}
              label={k.label}
              value={kpiValue(k.value)}
              unit={k.unit ? formatUnit(k.unit) : undefined}
              hint={k.hint}
              footer={
                <div className="flex justify-end">
                  <ConfidenceBadge level={k.confidence} />
                </div>
              }
            />
          ))}
        </div>
      </section>

      {/* Hero chart — awarded MW by quarter, stacked by type */}
      <section className="space-y-3">
        <SectionHeader
          title="Awarded capacity"
          subtitle="MW awarded per quarter, stacked by tender type."
        />
        <ChartFrame
          title="Awarded MW by quarter"
          subtitle="Stacked by tender type · whole feed"
          source={source}
          asOf={asOf}
          confidence="medium"
          exportData={{
            ...seriesToExport(d.awardsByQuarter, quarters, "Quarter"),
            meta: snapshotMeta(snapshot, { dataset: "awards-by-quarter" }),
          }}
        >
          <BarSeriesChart
            series={d.awardsByQuarter}
            stacked
            unit="MW"
            periodOrder={quarters}
            height={320}
          />
        </ChartFrame>
      </section>

      {/* Two-up: type mix + agency split */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame
          title="Tender-type mix"
          subtitle="Share of FY26-to-date MW"
          source={source}
          asOf={asOf}
          confidence="medium"
          exportData={{
            ...categoryToExport(typeMixData, "Tender type", "MW"),
            meta: snapshotMeta(snapshot, { dataset: "type-mix" }),
          }}
        >
          <PieSeriesChart data={typeMixData} unit="MW" height={300} />
        </ChartFrame>
        <ChartFrame
          title="Awarding agencies"
          subtitle="Total MW awarded by agency · whole feed"
          source={source}
          asOf={asOf}
          confidence="medium"
          exportData={{
            ...categoryToExport(agencyData, "Agency", "MW"),
            meta: snapshotMeta(snapshot, { dataset: "agency-split" }),
          }}
        >
          <CategoryBarChart
            data={agencyData}
            unit="MW"
            height={300}
            categoryWidth={72}
          />
        </ChartFrame>
      </section>

      {/* Tariff trends */}
      <section className="space-y-3">
        <SectionHeader
          title="Tariff trends"
          subtitle="Capacity-weighted winning tariff by type, ₹/unit."
        />
        <ChartFrame
          title="Winning tariffs by type"
          subtitle="₹/kWh · capacity-weighted · excl. standalone BESS"
          source={source}
          asOf={asOf}
          confidence="medium"
          exportData={{
            ...seriesToExport(d.tariffByType, quarters, "Quarter"),
            meta: snapshotMeta(snapshot, { dataset: "tariff-by-type" }),
          }}
        >
          <LineSeriesChart
            series={d.tariffByType}
            unit="₹/kWh"
            periodOrder={quarters}
            height={320}
          />
        </ChartFrame>
      </section>

      {/* Developer leaderboard */}
      <section className="space-y-3">
        <SectionHeader
          title="Developer leaderboard"
          subtitle="MW won FY26-to-date — winner attribution is modelled."
        />
        <ChartFrame
          title="Top developers by MW won"
          subtitle="FY26-to-date · sortable"
          source={source}
          asOf={asOf}
          confidence="modelled"
        >
          <LeaderboardTable
            rows={d.developerLeaderboard}
            exportMeta={snapshotMeta(snapshot, { dataset: "developer-leaderboard" })}
          />
        </ChartFrame>
      </section>

      {/* Recent awards log */}
      <section className="space-y-3">
        <SectionHeader
          title="Award log"
          subtitle="Every awarded auction — filter by type, sort any column."
        />
        <ChartFrame
          title="Recent awards"
          subtitle="Atomic award records · per-row confidence"
          source={source}
          asOf={asOf}
        >
          <RecentAwardsTable
            awards={d.recentAwards}
            exportMeta={snapshotMeta(snapshot, { dataset: "recent-awards" })}
          />
        </ChartFrame>
      </section>
    </div>
  );
}
