import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { StackedCategoryBarChart } from "@/components/charts/StackedCategoryBarChart";
import { PieSeriesChart } from "@/components/charts/PieSeriesChart";
import { getDevelopersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { categoriesToExport, snapshotMeta } from "@/lib/export";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { RosterTable } from "./RosterTable";
import { PpaTrackerTable } from "./PpaTrackerTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Developers / IPPs",
  description:
    "India's solar IPPs — operational, under-construction and pipeline capacity, the national PPA funnel, portfolio mix, and PPA signings.",
};

// Stage colours for the capacity funnel — solid → lighter brand shades
// (these are stages, not energy sources, so not ENERGY_COLORS).
const STAGE = {
  operational: "#B45309",
  underConstruction: "#F59E0B",
  pipeline: "#FCD34D",
};

function kpiValue(value: number | string): string {
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(1);
}

export default function DevelopersPage() {
  const snapshot = getDevelopersSnapshot();
  const d = snapshot.data;
  const cf = d.capacityFunnel;

  const source = "VQ Research / investor disclosures (maintained)";
  const asOf = formatDate(snapshot.updatedAt);

  const mixData = d.portfolioMix.map((m) => ({
    key: m.key,
    label: TENDER_TYPE_LABELS[m.key],
    value: m.gw,
    color: energyColor(m.key),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Developers / IPPs"
        subtitle="Independent power producers — operational, under-construction and pipeline capacity, the national PPA funnel, portfolio mix, and PPA signings."
        asOf={`As of ${asOf}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader
          title="Portfolio totals"
          subtitle="Across tracked large & listed IPPs."
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

      {/* Hero — per-developer capacity funnel */}
      <section className="space-y-3">
        <SectionHeader
          title="Capacity funnel"
          subtitle="Operational → under-construction → pipeline, by developer (GW)."
        />
        <ChartFrame
          title="Per-developer capacity funnel"
          subtitle="Stacked GW · sorted by total portfolio"
          source={source}
          asOf={asOf}
          confidence="medium"
          exportData={{
            ...categoriesToExport(
              cf.categories,
              [
                { key: "operational", label: "Operational", unit: "GW", values: cf.operational },
                { key: "underConstruction", label: "Under construction", unit: "GW", values: cf.underConstruction },
                { key: "pipeline", label: "Pipeline", unit: "GW", values: cf.pipeline },
              ],
              "Developer",
            ),
            meta: snapshotMeta(snapshot, { dataset: "capacity-funnel" }),
          }}
        >
          <StackedCategoryBarChart
            categories={cf.categories}
            series={[
              { key: "operational", label: "Operational", color: STAGE.operational, values: cf.operational },
              { key: "underConstruction", label: "Under construction", color: STAGE.underConstruction, values: cf.underConstruction },
              { key: "pipeline", label: "Pipeline", color: STAGE.pipeline, values: cf.pipeline },
            ]}
            unit="GW"
            height={460}
            categoryWidth={104}
          />
        </ChartFrame>
      </section>

      {/* Two-up — national PPA funnel + portfolio mix */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame
          title="National PPA funnel"
          subtitle="LOA → PPA → Executed → Balance · GW by tech"
          source="VQ Research (national)"
          asOf={asOf}
          confidence="medium"
        >
          <StackedCategoryBarChart
            categories={d.nationalFunnel.map((s) => s.stage)}
            series={[
              { key: "solar", label: "Solar", color: energyColor("solar"), values: d.nationalFunnel.map((s) => s.solarGw) },
              { key: "wind", label: "Wind", color: energyColor("wind"), values: d.nationalFunnel.map((s) => s.windGw) },
            ]}
            unit="GW"
            height={280}
            categoryWidth={80}
          />
        </ChartFrame>
        <ChartFrame
          title="Aggregate portfolio mix"
          subtitle={`Operational GW by tech · + ${d.bessGwh} GWh BESS (excl.)`}
          source={source}
          asOf={asOf}
          confidence="medium"
        >
          <PieSeriesChart data={mixData} unit="GW" height={280} />
        </ChartFrame>
      </section>

      {/* Developer roster */}
      <section className="space-y-3">
        <SectionHeader
          title="Developer roster"
          subtitle="Capacities in GW · sortable."
        />
        <ChartFrame
          title="Developer roster"
          subtitle="Operational / UC / pipeline / FY30 target (GW)"
          source={source}
          asOf={asOf}
          confidence="medium"
        >
          <RosterTable
            rows={d.roster}
            exportMeta={snapshotMeta(snapshot, { dataset: "roster" })}
          />
        </ChartFrame>
      </section>

      {/* PPA / PSA tracker */}
      <section className="space-y-3">
        <SectionHeader
          title="PPA / PSA tracker"
          subtitle="Recent signings — filter by type, sort any column."
        />
        <ChartFrame
          title="PPA / PSA signings"
          subtitle="Newest first · per-row confidence"
          source="SECI / NTPC / SJVN auctions (maintained)"
          asOf={asOf}
        >
          <PpaTrackerTable
            ppas={d.ppaTracker}
            exportMeta={snapshotMeta(snapshot, { dataset: "ppa-tracker" })}
          />
        </ChartFrame>
      </section>
    </div>
  );
}
