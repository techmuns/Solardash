import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { getDemandSnapshot } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { GrowthTable } from "./GrowthTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Power Demand",
  description:
    "All-India peak demand and energy met — key CEA readings, same-month year-on-year growth, and the forces driving future load.",
};

function kpiValue(value: number | string): string {
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(1);
}

// Manual `YYYY-MM` -> `MMM yy` (tz-safe; avoids Date parsing across locales).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

export default function DemandPage() {
  const snapshot = getDemandSnapshot();
  const d = snapshot.data;
  const asOf = formatDate(snapshot.updatedAt);
  const source = "CEA / PIB";

  const monthLabels = d.months.map(monthLabel);

  const peakSeries = [
    {
      key: "peak",
      label: "Peak demand",
      unit: "GW" as const,
      color: "#F59E0B",
      points: d.months.map((_, i) => ({ period: monthLabels[i], value: d.peakGw[i] })),
    },
  ];
  const energySeries = [
    {
      key: "energy",
      label: "Energy met",
      unit: "BU" as const,
      color: "#0EA5E9",
      points: d.months
        .map((_, i) => ({ period: monthLabels[i], value: d.energyBu[i] }))
        .filter((p): p is { period: string; value: number } => p.value != null),
    },
  ];

  const driverData = d.drivers.map((dr, i) => ({
    key: dr.driver,
    label: dr.driver,
    value: dr.valueGw,
    color: categoricalColor(i),
  }));

  // Full monthly series in one export (peak, energy, and both YoY growths).
  const monthlyExport = {
    columns: [
      { key: "month", label: "Month" },
      { key: "peakGw", label: "Peak demand (GW)" },
      { key: "energyBu", label: "Energy met (BU)" },
      { key: "peakYoy", label: "Peak YoY (%)" },
      { key: "energyYoy", label: "Energy YoY (%)" },
    ],
    rows: d.months.map((m, i) => ({
      month: m,
      peakGw: d.peakGw[i],
      energyBu: d.energyBu[i],
      peakYoy: d.peakGrowthYoy[i] ?? null,
      energyYoy: d.energyGrowthYoy[i] ?? null,
    })),
    meta: snapshotMeta(snapshot, { dataset: "monthly-demand" }),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Power Demand"
        subtitle="All-India peak demand and energy met — key CEA readings, same-month year-on-year growth, and the forces driving future load."
        asOf={`As of ${asOf}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader
          title="Demand snapshot"
          subtitle="FY26 peak, the all-time record and same-month YoY growth."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {d.kpis.map((k) => (
            <StatCard
              key={k.key}
              label={k.label}
              value={kpiValue(k.value)}
              unit={k.unit ? formatUnit(k.unit) : undefined}
              hint={k.hint}
            />
          ))}
        </div>
      </section>

      {/* Hero — monthly peak demand */}
      <section className="space-y-3">
        <SectionHeader
          title="Monthly peak demand"
          subtitle="All-India peak met — key CEA / PIB readings (sparse-but-real)."
        />
        <ChartFrame
          title="Monthly peak demand"
          subtitle="GW · key CEA / PIB readings"
          source={source}
          asOf={asOf}
          confidence="high"
          exportData={monthlyExport}
        >
          <LineSeriesChart
            series={peakSeries}
            unit="GW"
            periodOrder={monthLabels}
            xInterval={2}
            height={320}
          />
        </ChartFrame>
      </section>

      {/* Energy + same-month YoY growth */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame
          title="Monthly energy met"
          subtitle="BU · key CEA readings"
          source={source}
          asOf={asOf}
          confidence="high"
        >
          <LineSeriesChart
            series={energySeries}
            unit="BU"
            periodOrder={monthLabels}
            xInterval={2}
            height={280}
          />
        </ChartFrame>
        <ChartFrame
          title="Year-on-year growth"
          subtitle="Same-month YoY · peak & energy"
          source={source}
          asOf={asOf}
          confidence="high"
        >
          <GrowthTable rows={d.growth} periodHeader="Month" />
        </ChartFrame>
      </section>

      {/* Demand drivers */}
      <section className="space-y-3">
        <SectionHeader
          title="Demand drivers"
          subtitle="Forward load additions by FY30 (context)."
        />
        <ChartFrame
          title="Future demand drivers"
          subtitle="Incremental GW by ~FY30"
          source="Industry / NGHM"
          asOf={asOf}
          confidence="medium"
        >
          <CategoryBarChart
            data={driverData}
            unit="GW"
            height={240}
            categoryWidth={120}
          />
        </ChartFrame>
      </section>
    </div>
  );
}
