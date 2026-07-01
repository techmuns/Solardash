import { getCapacitySnapshot, getDemandSnapshot } from "@/data";
import { formatDate } from "@/lib/utils";
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
    "India's installed capacity & mix, commissioning, the solar build-out, and power demand — the supply-to-demand story in one focused canvas.",
};

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

  // Commissioning (GW added per FY by source) → stacked bars.
  const commYears = c.commissioningQuarterly.categories;
  const commissioning: Series[] = c.commissioningQuarterly.series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    points: commYears.map((cat, i) => ({ period: cat, value: s.values[i] })),
  }));

  const histYears = c.installedHistory[0]?.points.map((p) => p.period) ?? [];
  const segYears = c.solarSegments[0]?.points.map((p) => p.period) ?? [];

  // Demand: peak (GW) + energy (BU) → one dual-line chart (energy is sparse).
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

  const stateRows = c.stateSolar
    .slice(0, 6)
    .map((s) => ({ label: s.state, value: `${s.solarGw}` }));
  const driverRows = d.drivers.map((dr) => ({
    label: dr.driver,
    value: `${dr.valueGw} GW`,
  }));

  const tabs: CanvasTab[] = [
    {
      id: "mix",
      label: "Capacity mix",
      title: "Capacity mix over time",
      subtitle: "Installed GW by source · FY17 → FY26 · toggle 100% share",
      source: capSource,
      body: <MixAreaToggle series={bySource} periodOrder={fyOrder} unit="GW" />,
      side: { title: "Top states · solar GW", node: <RankList rows={stateRows} /> },
      exportData: {
        ...seriesToExport(bySource, fyOrder, "Year"),
        meta: capMeta("capacity-mix"),
      },
    },
    {
      id: "commissioning",
      label: "Commissioning",
      title: "Capacity added per year",
      subtitle: "GW added by source · stacked, FY19 → FY26",
      source: capSource,
      body: (
        <FillBarSeries
          series={commissioning}
          stacked
          unit="GW"
          periodOrder={commYears}
        />
      ),
      exportData: {
        ...seriesToExport(commissioning, commYears, "Year"),
        meta: capMeta("commissioning"),
      },
    },
    {
      id: "trend",
      label: "Installed trend",
      title: "Cumulative installed solar",
      subtitle: "GW · FY19 → FY26 (the build-out to 150 GW)",
      source: capSource,
      body: (
        <FillLineSeries
          series={c.installedHistory}
          unit="GW"
          periodOrder={histYears}
        />
      ),
      exportData: {
        ...seriesToExport(c.installedHistory, histYears, "Year"),
        meta: capMeta("installed-trend"),
      },
    },
    {
      id: "segments",
      label: "Solar segments",
      title: "Annual solar additions by segment",
      subtitle: "GW · utility / open-access / rooftop / KUSUM",
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
      subtitle: "Monthly · peak (GW) + energy met (BU)",
      source: demSource,
      body: <FillLineSeries series={demandSeries} periodOrder={d.months} />,
      side: { title: "Demand drivers · 2030", node: <RankList rows={driverRows} /> },
      exportData: {
        ...seriesToExport(demandSeries, d.months, "Month"),
        meta: demMeta("demand-peak"),
      },
    },
  ];

  return (
    <SectionCanvas
      tabs={tabs}
      asOf={asOf}
      defaultSource={capSource}
    />
  );
}
