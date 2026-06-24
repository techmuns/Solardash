import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { Card } from "@/components/ui/Card";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { BarSeriesChart } from "@/components/charts/BarSeriesChart";
import { StackedCategoryBarChart } from "@/components/charts/StackedCategoryBarChart";
import { PieSeriesChart } from "@/components/charts/PieSeriesChart";
import { getPolicySnapshot, getManufacturingSnapshot } from "@/data";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import type { PmSuryaGharMetric } from "@/data/types/policy";
import { SchemesTable } from "./SchemesTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Policy & Pricing",
  description:
    "India's solar policy & pricing — schemes & incentives, flagship-scheme progress, the localisation roadmap, the BESS cost curve, and manufacturing TAM.",
};

function suryaValue(m: PmSuryaGharMetric): { value: string; unit?: string } {
  if (m.unit === "count") {
    return m.value >= 10_000_000
      ? { value: String(m.value / 10_000_000), unit: "Cr" }
      : { value: String(m.value / 100_000), unit: "L" };
  }
  if (m.unit === "Rs_cr") return { value: formatNumber(m.value), unit: "₹ cr" };
  return { value: String(m.value), unit: formatUnit(m.unit) };
}

export default function PolicyPage() {
  const snapshot = getPolicySnapshot();
  const d = snapshot.data;
  const asOf = formatDate(snapshot.updatedAt);
  const source = "MNRE / CBIC / VQ Research";
  const almm = getManufacturingSnapshot().data.almmTimeline;

  const install = d.pmSuryaGhar.find((m) => /install/i.test(m.metric))?.value ?? 0;
  const target = d.pmSuryaGhar.find((m) => /target/i.test(m.metric))?.value ?? 0;
  const suryaProgress = [
    { key: "installed", label: "Installed", value: install, color: "#10B981" },
    { key: "remaining", label: "Remaining to target", value: Math.max(0, target - install), color: "#94A3B8" },
  ];

  const wpPrices = d.prices.filter((p) => p.unit === "USD/Wp");
  const lcoe = d.prices.find((p) => /lcoe/i.test(p.item));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Policy & Pricing"
        subtitle="The rules and prices that move the sector — schemes & incentives, flagship-scheme progress, the localisation roadmap, the BESS cost curve, and manufacturing TAM."
        asOf={`As of ${asOf}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader title="Policy snapshot" subtitle="The incentive toolkit at a glance." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {d.kpis.map((k) => (
            <StatCard
              key={k.key}
              label={k.label}
              value={typeof k.value === "number" && Number.isInteger(k.value) ? formatNumber(k.value) : String(k.value)}
              unit={k.unit ? formatUnit(k.unit) : undefined}
              hint={k.hint}
            />
          ))}
        </div>
      </section>

      {/* § Schemes & Incentives */}
      <section className="space-y-3">
        <SectionHeader title="Schemes & incentives" subtitle="The policy toolkit across manufacturing, demand and consumers." />
        <ChartFrame
          title="Scheme & incentive tracker"
          subtitle="Manufacturing · demand · consumer policy"
          source={source}
          asOf={asOf}
        >
          <SchemesTable rows={d.schemes} />
        </ChartFrame>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">5-tool localisation toolkit:</span>{" "}
          ALMM · BCD · PLI · DCR · CPSU — together they de-risk domestic manufacturing demand.
        </p>
      </section>

      {/* § Flagship schemes */}
      <section className="space-y-4">
        <SectionHeader title="Flagship schemes" subtitle="PM Surya Ghar (rooftop) and PM-KUSUM (agri)." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {d.pmSuryaGhar.map((m) => {
            const f = suryaValue(m);
            return (
              <StatCard
                key={m.metric}
                label={m.metric}
                value={f.value}
                unit={f.unit}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartFrame
            title="PM Surya Ghar progress"
            subtitle={`Installed vs 1 Cr target · ~${Math.round(target ? (install / target) * 100 : 0)}%`}
            source="MNRE"
            asOf={asOf}
            confidence="medium"
          >
            <PieSeriesChart data={suryaProgress} unit="homes" height={280} />
          </ChartFrame>
          <ChartFrame
            title="PM-KUSUM — executed vs target"
            subtitle="GW by component"
            source="MNRE"
            asOf={asOf}
            confidence="medium"
          >
            <StackedCategoryBarChart
              categories={d.kusum.map((k) => k.component)}
              series={[
                { key: "executed", label: "Executed", color: "#10B981", values: d.kusum.map((k) => k.executedGw) },
                { key: "remaining", label: "Remaining", color: "#94A3B8", values: d.kusum.map((k) => Math.max(0, k.targetGw - k.executedGw)) },
              ]}
              unit="GW"
              height={280}
              categoryWidth={96}
            />
          </ChartFrame>
        </div>
      </section>

      {/* § Manufacturing roadmap */}
      <section className="space-y-4">
        <SectionHeader title="Manufacturing roadmap" subtitle="ALMM rollout and the 4-wave localisation path." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {almm.map((ph) => (
            <Card key={ph.phase} className="p-4">
              <span className="text-sm font-semibold text-foreground">{ph.phase}</span>
              <p className="mt-1 text-sm text-muted-foreground">{ph.scope}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-brand/10 px-2 py-0.5 font-medium text-brand">
                  {formatDate(ph.effectiveDate, "MMM yyyy")}
                </span>
                <span className="text-muted-foreground">{ph.status}</span>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {d.localisationWaves.map((w) => (
            <Card key={w.wave} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{w.wave}</span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
                  {w.period}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{w.scope}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* § Pricing & Economics */}
      <section className="space-y-4">
        <SectionHeader title="Pricing & economics" subtitle="BESS cost decline and value-chain prices." />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartFrame
            title="BESS pack cost curve"
            subtitle="$/kWh · ~90% decline since 2014"
            source="VQ Research / BNEF"
            asOf={asOf}
            confidence="medium"
            exportData={{
              ...seriesToExport(
                d.bessCostCurve,
                d.bessCostCurve[0]?.points.map((p) => p.period),
                "Year",
              ),
              meta: snapshotMeta(snapshot, {
                dataset: "bess-cost-curve",
                notes: ["Forward (2026, 2030) points are modelled projections."],
              }),
            }}
          >
            <LineSeriesChart
              series={d.bessCostCurve}
              unit="$/kWh"
              periodOrder={d.bessCostCurve[0]?.points.map((p) => p.period)}
              height={300}
            />
          </ChartFrame>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {wpPrices.map((p) => (
                <StatCard
                  key={p.item}
                  label={p.item}
                  value={`$${p.value.toFixed(2)}`}
                  unit="/Wp"
                  hint={p.note}
                />
              ))}
            </div>
            {lcoe && (
              <Card className="p-4">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Solar + BESS LCOE</span>{" "}
                  <span className="tabular-nums font-semibold text-brand">
                    ₹{lcoe.value.toFixed(2)}/kWh
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({lcoe.note}) — approaching new-coal tariffs, making round-the-clock RE competitive.
                  </span>
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* § Manufacturing TAM */}
      <section className="space-y-3">
        <SectionHeader title="Manufacturing TAM" subtitle="Total addressable market by segment, ₹'000 cr." />
        <ChartFrame
          title="Manufacturing TAM by segment"
          subtitle="₹'000 cr · stacked · FY25 → FY35"
          source="VQ Research"
          asOf={asOf}
          confidence="medium"
          exportData={{
            ...seriesToExport(d.tam, ["FY25", "FY27", "FY30", "FY35"], "Period"),
            meta: snapshotMeta(snapshot, { dataset: "manufacturing-tam" }),
          }}
        >
          <BarSeriesChart
            series={d.tam}
            stacked
            unit="₹'000 cr"
            periodOrder={["FY25", "FY27", "FY30", "FY35"]}
            height={320}
          />
        </ChartFrame>
      </section>
    </div>
  );
}
