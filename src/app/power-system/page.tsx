import { getCapacitySnapshot, getDemandSnapshot } from "@/data";
import { formatDate } from "@/lib/utils";
import { energyColor } from "@/lib/colors";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillBarSeries, FillLineSeries } from "@/components/charts/FillCharts";
import { MixAreaToggle } from "@/components/charts/MixAreaToggle";
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
    "India's installed capacity & mix, the solar / non-fossil penetration curve, annual additions and power demand — the supply-to-demand story in one focused canvas.",
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

  // Installed mix OVER TIME → stacked-area by source (FY17 → FY26).
  const bySource = c.installedBySource;
  const fyOrder = bySource[0]?.points.map((p) => p.period) ?? [];

  // Penetration: solar & non-fossil SHARE of installed capacity, FY17 → FY26.
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

  // Annual additions (GW added per FY by source) → stacked bars.
  const addYears = c.commissioningQuarterly.categories;
  const additions: Series[] = c.commissioningQuarterly.series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    points: addYears.map((cat, i) => ({ period: cat, value: s.values[i] })),
  }));

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

  // --- side panels (surface the rich, previously-unused snapshot data) ---
  const fmtMetric = (v: number, unit: string) =>
    unit === "%" ? `${v}%` : `${v} ${unit}`;
  const systemNow = c.metrics.map((m) => ({
    label: m.metric,
    value: fmtMetric(m.value, m.unit),
  }));
  const gridMixRows = c.installedMix
    .slice(0, 6)
    .map((m) => ({ label: cap(m.source), value: `${Math.round(m.share * 100)}%` }));
  const stateRows = c.stateSolar
    .slice(0, 6)
    .map((s) => ({ label: s.state, value: `${s.solarGw}` }));
  const driverRows = d.drivers.map((dr) => ({
    label: dr.driver,
    value: `${dr.valueGw} GW`,
  }));

  const solarShareLatest =
    penetration[0].points[penetration[0].points.length - 1]?.value;
  const fy26Adds = additions.reduce(
    (s, ser) => s + (ser.points[ser.points.length - 1]?.value ?? 0),
    0,
  );

  const tabs: CanvasTab[] = [
    {
      id: "mix",
      label: "Capacity mix",
      title: "Installed capacity mix over time",
      subtitle: `GW by source · FY17 → FY26 · toggle 100% share — solar now ${solarShareLatest}% of the grid`,
      source: capSource,
      body: <MixAreaToggle series={bySource} periodOrder={fyOrder} unit="GW" />,
      side: { title: "System now", node: <RankList rows={systemNow} /> },
      exportData: {
        ...seriesToExport(bySource, fyOrder, "Year"),
        meta: capMeta("capacity-mix"),
      },
    },
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
      id: "additions",
      label: "Additions",
      title: "Capacity added per year",
      subtitle: `GW added by source · stacked, FY19 → FY26 — FY26 added ${round1(fy26Adds)} GW`,
      source: capSource,
      body: (
        <FillBarSeries
          series={additions}
          stacked
          unit="GW"
          periodOrder={addYears}
        />
      ),
      side: { title: "Top states · solar GW", node: <RankList rows={stateRows} /> },
      exportData: {
        ...seriesToExport(additions, addYears, "Year"),
        meta: capMeta("annual-additions"),
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
