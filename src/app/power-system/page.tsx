import { getCapacitySnapshot, getDemandSnapshot } from "@/data";
import { formatDate } from "@/lib/utils";
import { energyColor } from "@/lib/colors";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillLineSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { Series } from "@/data/types/core";

export const dynamic = "force-static";
export const metadata = {
  title: "Power System",
  description:
    "India's renewable penetration curve, solar additions by segment and power demand — the supply-to-demand story in one focused canvas.",
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const NON_FOSSIL = new Set(["solar", "wind", "hydro", "nuclear", "biomass"]);

export default function PowerSystemPage() {
  const capSnap = getCapacitySnapshot();
  const demSnap = getDemandSnapshot();
  const c = capSnap.data;
  const d = demSnap.data;
  const asOf = formatDate(
    capSnap.updatedAt > demSnap.updatedAt ? capSnap.updatedAt : demSnap.updatedAt,
  );
  const capSource = "CEA / MNRE (maintained)";
  const demSource = "CEA / PIB";
  const capMeta = (dataset: string) =>
    snapshotMeta(capSnap, { section: "power-system", dataset });
  const demMeta = (dataset: string) =>
    snapshotMeta(demSnap, { section: "power-system", dataset });

  // Penetration: solar & non-fossil SHARE of installed capacity, FY17 → FY26.
  const bySource = c.installedBySource;
  const fyOrder = bySource[0]?.points.map((p) => p.period) ?? [];
  const totals = fyOrder.map((_, i) =>
    bySource.reduce((s, ser) => s + (ser.points[i]?.value ?? 0), 0),
  );
  const solarSeries = bySource.find((s) => s.key === "solar");
  const penetration: Series[] = [
    {
      key: "solar-share",
      label: "Solar % of capacity",
      color: energyColor("solar"),
      unit: "%",
      points: fyOrder.map((p, i) => ({
        period: p,
        value: totals[i]
          ? round1((100 * (solarSeries?.points[i]?.value ?? 0)) / totals[i])
          : 0,
      })),
    },
    {
      key: "nonfossil-share",
      label: "Non-fossil % of capacity",
      color: "#059669",
      unit: "%",
      points: fyOrder.map((p, i) => {
        const nf = bySource
          .filter((s) => NON_FOSSIL.has(s.key))
          .reduce((a, s) => a + (s.points[i]?.value ?? 0), 0);
        return { period: p, value: totals[i] ? round1((100 * nf) / totals[i]) : 0 };
      }),
    },
  ];

  const segYears = c.solarSegments[0]?.points.map((p) => p.period) ?? [];

  // Demand: peak (GW) + energy (BU) → one dual-line chart.
  const demandSeries: Series[] = [
    {
      key: "peak",
      label: "Peak demand (GW)",
      color: "#EC4899",
      points: d.months.map((m, i) => ({ period: m, value: d.peakGw[i] })),
    },
    {
      key: "energy",
      label: "Energy met (BU)",
      color: "#0EA5E9",
      points: d.months
        .map((m, i) => ({ period: m, value: d.energyBu[i] }))
        .filter((p): p is { period: string; value: number } => p.value != null),
    },
  ];

  // --- side panels ---
  const gridMixRows = c.installedMix
    .slice(0, 6)
    .map((m) => ({ label: cap(m.source), value: `${Math.round(m.share * 100)}%` }));
  const driverRows = d.drivers.map((dr) => ({
    label: dr.driver,
    value: `${dr.valueGw} GW`,
  }));

  const tabs: CanvasTab[] = [
    {
      id: "penetration",
      label: "RE penetration",
      title: "Solar & non-fossil share of the grid",
      subtitle: "% of installed capacity · FY17 → FY26 — the penetration curve",
      source: capSource,
      body: (
        <FillLineSeries series={penetration} unit="%" periodOrder={fyOrder} />
      ),
      side: { title: "Grid mix now", node: <RankList rows={gridMixRows} /> },
      exportData: {
        ...seriesToExport(penetration, fyOrder, "Year"),
        meta: capMeta("re-penetration"),
      },
    },
    {
      id: "segments",
      label: "Solar segments",
      title: "Solar additions by segment",
      subtitle: "GW · utility · open-access · rooftop · KUSUM",
      source: capSource,
      body: (
        <FillLineSeries
          series={c.solarSegments}
          unit="GW"
          periodOrder={segYears}
        />
      ),
      exportData: {
        ...seriesToExport(c.solarSegments, segYears, "Year"),
        meta: capMeta("solar-segments"),
      },
    },
    {
      id: "demand",
      label: "Demand & peak",
      title: "Peak demand & energy met",
      subtitle: "Monthly · peak (GW) + energy met (BU) — the load the build-out chases",
      source: demSource,
      body: <FillLineSeries series={demandSeries} periodOrder={d.months} />,
      side: { title: "Demand drivers · 2030", node: <RankList rows={driverRows} /> },
      exportData: {
        ...seriesToExport(demandSeries, d.months, "Month"),
        meta: demMeta("demand-peak"),
      },
    },
  ];

  return <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={capSource} />;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
