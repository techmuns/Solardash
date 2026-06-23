import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { BarSeriesChart } from "@/components/charts/BarSeriesChart";
import { PieSeriesChart } from "@/components/charts/PieSeriesChart";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { getCapacitySnapshot } from "@/data";
import { ENERGY_LABELS, OTHERS_COLOR, energyColor, type EnergySource } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";

export const dynamic = "force-static";
export const metadata = { title: "Capacity & Generation" };

function kpiValue(value: number | string): string {
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(1);
}

export default function CapacityPage() {
  const snapshot = getCapacitySnapshot();
  const d = snapshot.data;
  const asOf = formatDate(snapshot.updatedAt);
  const source = "CEA / MNRE (maintained)";

  const quarters = d.commissioningQuarterly.categories;
  const lastIdx = quarters.length - 1;
  const commSeries = d.commissioningQuarterly.series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    points: quarters.map((q, i) => ({ period: q, value: s.values[i] })),
  }));
  const latestTotal = d.commissioningQuarterly.series.reduce(
    (sum, s) => sum + (s.values[lastIdx] ?? 0),
    0,
  );

  const mixData = d.installedMix.map((m) => ({
    key: m.source,
    label: ENERGY_LABELS[m.source as EnergySource] ?? m.source,
    value: m.capacityGw,
    color: energyColor(m.source),
  }));

  const stateData = d.stateSolar.map((s) => ({
    key: s.state,
    label: s.state,
    value: s.solarGw,
    color: /^others/i.test(s.state) ? OTHERS_COLOR : energyColor("solar"),
  }));

  const sideMetrics = d.metrics.filter((m) => !/re share/i.test(m.metric));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Capacity & Generation"
        subtitle="All-India installed capacity and quarterly commissioning by source, the solar build-out, state leaders, and the generation mix."
        asOf={`As of ${asOf}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader
          title="Grid snapshot"
          subtitle="Installed base, latest additions and RE penetration."
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

      {/* Hero — commissioning by source */}
      <section className="space-y-3">
        <SectionHeader
          title="Commissioning by source"
          subtitle="GW added per quarter, stacked by source."
        />
        <ChartFrame
          title="Quarterly commissioning by source"
          subtitle={`Stacked · GW · ${quarters[lastIdx]} total ${latestTotal.toFixed(1)} GW`}
          source={source}
          asOf={asOf}
          confidence="medium"
        >
          <BarSeriesChart
            series={commSeries}
            stacked
            unit="GW"
            periodOrder={quarters}
            height={340}
          />
        </ChartFrame>
      </section>

      {/* Installed base */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame
          title="Installed capacity mix"
          subtitle="Cumulative · GW (all sources)"
          source="CEA"
          asOf={asOf}
          confidence="medium"
        >
          <PieSeriesChart data={mixData} unit="GW" height={300} />
        </ChartFrame>
        <ChartFrame
          title="Solar additions by segment"
          subtitle="Annual GW · utility / OA / rooftop / KUSUM"
          source="JMK Research"
          asOf={asOf}
          confidence="medium"
        >
          <BarSeriesChart
            series={d.solarSegments}
            stacked
            unit="GW"
            periodOrder={["FY24", "FY25", "FY26"]}
            height={300}
          />
        </ChartFrame>
      </section>

      {/* States & generation */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame
          title="Installed solar by state"
          subtitle="GW · leading states"
          source="MNRE"
          asOf={asOf}
          confidence="medium"
        >
          <CategoryBarChart
            data={stateData}
            unit="GW"
            height={360}
            categoryWidth={104}
          />
        </ChartFrame>
        <div className="space-y-4">
          <ChartFrame
            title="RE share of generation"
            subtitle="% of total generation · annual"
            source="CEA / Ember"
            asOf={asOf}
            confidence="medium"
          >
            <LineSeriesChart
              series={d.reShareTrend}
              unit="%"
              periodOrder={["FY24", "FY25", "FY26"]}
              height={200}
            />
          </ChartFrame>
          <div className="grid grid-cols-2 gap-4">
            {sideMetrics.map((m) => (
              <StatCard
                key={m.metric}
                label={m.metric}
                value={kpiValue(m.value)}
                unit={m.unit ? formatUnit(m.unit) : undefined}
                hint={m.note}
                footer={
                  <div className="flex justify-end">
                    <ConfidenceBadge level={m.confidence} />
                  </div>
                }
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
