import { getCapacitySnapshot, getDemandSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
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
import type { Kpi, Series } from "@/data/types/core";

export const dynamic = "force-static";
export const metadata = {
  title: "Power System",
  description:
    "India's installed capacity & mix, commissioning, the solar build-out, and power demand — the supply-to-demand story in one focused canvas.",
};

function kv(k?: Kpi): string {
  if (!k) return "—";
  if (typeof k.value === "string") return k.value;
  return Number.isInteger(k.value)
    ? formatNumber(k.value)
    : parseFloat(k.value.toFixed(2)).toString();
}
const find = (kpis: Kpi[], key: string) => kpis.find((k) => k.key === key);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

  // KPI strip — supply (capacity, solar, non-fossil) + demand (peak, growth).
  const kpis: CanvasKpi[] = [
    find(c.kpis, "total_installed"),
    find(c.kpis, "solar_installed"),
    find(c.kpis, "non_fossil_share"),
    find(d.kpis, "all-time-peak-apr-2026"),
    find(d.kpis, "peak-growth-jan-yoy"),
  ]
    .filter((k): k is Kpi => Boolean(k))
    .map((k) => ({
      label: k.label,
      value: kv(k),
      unit: k.unit ? formatUnit(k.unit) : undefined,
      hint: k.hint,
    }));

  // Cumulative installed mix → donut.
  const mixData = c.installedMix.map((m) => ({
    key: m.source,
    label: cap(m.source),
    value: m.capacityGw,
    color: energyColor(m.source),
  }));

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
      title: "Installed capacity mix",
      subtitle: "Cumulative GW by source · latest",
      source: capSource,
      body: <FillDonut data={mixData} unit="GW" />,
      side: { title: "Top states · solar GW", node: <RankList rows={stateRows} /> },
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
    },
    {
      id: "demand",
      label: "Demand & peak",
      title: "Peak demand & energy met",
      subtitle: "Monthly · peak (GW) + energy met (BU)",
      source: demSource,
      body: <FillLineSeries series={demandSeries} periodOrder={d.months} />,
      side: { title: "Demand drivers · 2030", node: <RankList rows={driverRows} /> },
    },
  ];

  return (
    <SectionCanvas
      kpis={kpis}
      tabs={tabs}
      asOf={asOf}
      defaultSource={capSource}
    />
  );
}
