import {
  getDemandSnapshot,
  getManufacturingSnapshot,
  getPriceHistorySnapshot,
  getTendersSnapshot,
} from "@/data";
import { getProfitPools } from "@/data/profit-pools";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillLineSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { Series } from "@/data/types/core";
import { INSIGHT_GROUPS, INSIGHTS } from "./insights";
import { InsightGrid, type EvidenceData } from "./InsightViews";

export const dynamic = "force-static";
export const metadata = {
  title: "Trends & Insights",
  description:
    "The buy-side synthesis of India's solar sector — structural trends, anomalies, and what most people miss, plus the power demand & peak trend. Each insight is Munshot analysis, evidenced by a live chart or a cited stat.",
};

/** Firm-power & storage contract types (vs pure solar / wind). */
const FIRM_KEYS = new Set(["solar-bess", "bess", "fdre", "hybrid", "rtc"]);

const GROUP_SUBTITLE: Record<string, string> = {
  structural: "The durable shifts reshaping where solar value sits.",
  anomalies: "Where the data breaks the obvious narrative.",
  missed: "The under-priced risks and dependencies.",
};

export default function TrendsPage() {
  const tenders = getTendersSnapshot().data;
  const mfg = getManufacturingSnapshot().data;
  const price = getPriceHistorySnapshot().data;
  const demSnap = getDemandSnapshot();
  const dem = demSnap.data;
  const pools = getProfitPools();

  // Demand & peak (moved here from the retired Power System section).
  const demandSeries: Series[] = [
    {
      key: "peak",
      label: "Peak demand (GW)",
      color: "#EC4899",
      points: dem.months.map((m, i) => ({ period: m, value: dem.peakGw[i] })),
    },
    {
      key: "energy",
      label: "Energy met (BU)",
      color: "#0EA5E9",
      points: dem.months
        .map((m, i) => ({ period: m, value: dem.energyBu[i] }))
        .filter((p): p is { period: string; value: number } => p.value != null),
    },
  ];
  const driverRows = dem.drivers.map((dr) => ({
    label: dr.driver,
    value: `${dr.valueGw} GW`,
  }));

  // ── Resolve the live evidence series the cards reuse ───────────────────
  const quarters = tenders.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const firmAll = quarters.map((_, i) => {
    let tot = 0,
      firm = 0;
    for (const s of tenders.awardsByQuarter) {
      const v = s.points[i]?.value ?? 0;
      tot += v;
      if (FIRM_KEYS.has(s.key)) firm += v;
    }
    return tot ? Math.round((firm / tot) * 100) : 0;
  });
  const firmShare = quarters
    .map((p, i) => (p.includes("FY26") ? firmAll[i] : null))
    .filter((v): v is number => v != null);

  const data: EvidenceData = {
    sparks: {
      firmShare: { values: firmShare },
      mfgMargin: {
        values:
          pools.marginByStage.find((s) => s.key === "manufacturing")?.points.map((p) => p.value) ??
          [],
      },
      polyPrice: {
        values: price.series.find((s) => s.key === "poly")?.points.map((p) => p.value) ?? [],
      },
      tariff: {
        values: tenders.tariffHistory[0]?.points.map((p) => p.value) ?? [],
      },
    },
    lines: {
      cellModule: {
        series: mfg.capacityHistory,
        periods: mfg.capacityHistory[0]?.points.map((p) => p.period) ?? [],
      },
    },
  };

  const tabs: CanvasTab[] = [
    ...INSIGHT_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      title: g.label,
      subtitle: GROUP_SUBTITLE[g.id],
      source: "Munshot synthesis · evidence cited per card",
      body: (
        <InsightGrid insights={INSIGHTS.filter((i) => i.group === g.id)} data={data} />
      ),
    })),
    {
      id: "demand",
      label: "Demand & peak",
      title: "Peak demand & energy met",
      subtitle:
        "Monthly · peak (GW) + energy met (BU) — the load the build-out chases",
      source: "CEA / PIB",
      body: <FillLineSeries series={demandSeries} periodOrder={dem.months} />,
      side: { title: "Demand drivers · 2030", node: <RankList rows={driverRows} /> },
      exportData: {
        ...seriesToExport(demandSeries, dem.months, "Month"),
        meta: snapshotMeta(demSnap, { section: "trends", dataset: "demand-peak" }),
      },
    },
  ];

  return (
    <SectionCanvas
      tabs={tabs}
      asOf={formatDate(pools.asOf)}
      defaultSource="Munshot synthesis"
    />
  );
}
