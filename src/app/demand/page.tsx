import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { getDemandSnapshot } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { GrowthTable } from "./GrowthTable";

export const dynamic = "force-static";
export const metadata = { title: "Power Demand" };

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
  const source = "CEA (monthly)";

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
      points: d.months.map((_, i) => ({ period: monthLabels[i], value: d.energyBu[i] })),
    },
  ];
  const yoySeries = [
    {
      key: "peak-yoy",
      label: "Peak YoY",
      unit: "%" as const,
      color: "#F59E0B",
      points: d.months
        .map((_, i) => ({ period: monthLabels[i], value: d.peakGrowthYoy[i] }))
        .filter((p): p is { period: string; value: number } => p.value != null),
    },
    {
      key: "energy-yoy",
      label: "Energy YoY",
      unit: "%" as const,
      color: "#0EA5E9",
      points: d.months
        .map((_, i) => ({ period: monthLabels[i], value: d.energyGrowthYoy[i] }))
        .filter((p): p is { period: string; value: number } => p.value != null),
    },
  ];

  const driverData = d.drivers.map((dr, i) => ({
    key: dr.driver,
    label: dr.driver,
    value: dr.valueGw,
    color: categoricalColor(i),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Power Demand"
        subtitle="All-India peak demand and energy met — monthly trends, year-on-year growth across grains, and the forces driving future load."
        asOf={`As of ${asOf}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader
          title="Demand snapshot"
          subtitle="Latest month and FY26-to-date growth."
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

      {/* Hero — monthly peak demand */}
      <section className="space-y-3">
        <SectionHeader
          title="Monthly peak demand"
          subtitle="All-India peak met, GW."
        />
        <ChartFrame
          title="Monthly peak demand"
          subtitle="GW · all-India"
          source={source}
          asOf={asOf}
          confidence="high"
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

      {/* Energy + YoY growth */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame
          title="Monthly energy met"
          subtitle="BU · all-India"
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
          subtitle="% YoY · peak & energy (from month 13)"
          source={source}
          asOf={asOf}
          confidence="high"
        >
          <LineSeriesChart
            series={yoySeries}
            unit="%"
            periodOrder={monthLabels}
            xInterval={1}
            height={280}
          />
        </ChartFrame>
      </section>

      {/* Growth — quarterly & yearly */}
      <section className="space-y-3">
        <SectionHeader
          title="Growth by grain"
          subtitle="Quarterly and financial-year YoY (peak = max, energy = sum)."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartFrame
            title="Quarterly YoY growth"
            subtitle="FY26 quarters vs FY25"
            source={source}
            asOf={asOf}
            confidence="high"
          >
            <GrowthTable rows={d.quarterlyGrowth} periodHeader="Quarter" />
          </ChartFrame>
          <ChartFrame
            title="Yearly YoY growth"
            subtitle="Financial year vs prior FY"
            source={source}
            asOf={asOf}
            confidence="high"
          >
            <GrowthTable rows={d.yearlyGrowth} periodHeader="FY" />
          </ChartFrame>
        </div>
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
          source="VQ Research / industry"
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
