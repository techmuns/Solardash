import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { Card } from "@/components/ui/Card";
import { StackedCategoryBarChart } from "@/components/charts/StackedCategoryBarChart";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { BarSeriesChart } from "@/components/charts/BarSeriesChart";
import { getManufacturingSnapshot } from "@/data";
import { OTHERS_COLOR, categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { CellCapacityTable } from "./CellCapacityTable";

export const dynamic = "force-static";
export const metadata = {
  title: "Manufacturing",
  description:
    "India's solar PV supply chain — player-wise cell & module capacity, modelled production, and the manufacturing value chain.",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function kpiValue(value: number | string): string {
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(1);
}

export default function ManufacturingPage() {
  const snapshot = getManufacturingSnapshot();
  const d = snapshot.data;
  const asOf = formatDate(snapshot.updatedAt);
  const source = "MNRE / DCR Portal (maintained)";

  // Modelled quarterly cell production → Series[] (player colours pass through).
  const cellQuarterlySeries = d.cellQuarterly.series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    points: d.cellQuarterly.categories.map((q, i) => ({
      period: q,
      value: s.values[i],
      modelled: true,
    })),
  }));

  // Hero: per-player production filled within nameplate (idle = headroom).
  const cellCategories = d.cellPlayers.map((p) => p.player);
  const production = d.cellPlayers.map((p) => p.productionGw ?? 0);
  const idle = d.cellPlayers.map((p) =>
    round2(p.nameplateGw - (p.productionGw ?? 0)),
  );

  const moduleData = d.modulePlayers.map((p, i) => ({
    key: p.player,
    label: p.player,
    value: p.almm1Gw,
    color: /^others/i.test(p.player) ? OTHERS_COLOR : categoricalColor(i),
  }));

  const pliData = d.pliAwardees.map((p, i) => ({
    key: p.company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: p.company,
    value: p.capacityGw,
    color: /^others/i.test(p.company) ? OTHERS_COLOR : categoricalColor(i),
  }));
  const pliTotal = Math.round(d.pliAwardees.reduce((s, p) => s + p.capacityGw, 0));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manufacturing & Value Chain"
        subtitle="India's solar PV supply chain — player-wise cell & module capacity, modelled cell production, and the manufacturing value chain."
        asOf={`As of ${asOf}`}
      />

      {/* KPI row */}
      <section className="space-y-3">
        <SectionHeader
          title="Value-chain snapshot"
          subtitle="Capacity, production and demand across cells & modules."
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

      {/* § Capacity & Production (player-wise) */}
      <section className="space-y-4">
        <SectionHeader
          title="Capacity & production (player-wise)"
          subtitle="Cell & module manufacturers, capacities in GW."
        />

        <ChartFrame
          title="Cell capacity vs production by manufacturer"
          subtitle="Production (FY26E) filled within nameplate · GW"
          source={source}
          asOf={asOf}
          confidence="high"
        >
          <StackedCategoryBarChart
            categories={cellCategories}
            series={[
              { key: "production", label: "Production (FY26E)", color: "#F59E0B", values: production },
              { key: "idle", label: "Idle capacity", color: "#94A3B8", values: idle },
            ]}
            unit="GW"
            height={420}
            categoryWidth={108}
          />
        </ChartFrame>

        <ChartFrame
          title="Cell manufacturers"
          subtitle="Nameplate / ALMM-II / production / utilisation · sortable"
          source="MNRE / DCR Portal"
          asOf={asOf}
          confidence="high"
        >
          <CellCapacityTable
            rows={d.cellPlayers}
            exportMeta={snapshotMeta(snapshot, { dataset: "cell-capacity" })}
          />
        </ChartFrame>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartFrame
            title="Module capacity by manufacturer"
            subtitle="ALMM List-I · GW (long tail bucketed as Others)"
            source="MNRE ALMM List-I"
            asOf={asOf}
            confidence="medium"
          >
            <CategoryBarChart
              data={moduleData}
              unit="GW"
              height={360}
              categoryWidth={120}
            />
          </ChartFrame>

          <ChartFrame
            title="Modelled quarterly cell production"
            subtitle="Top-5 producers + Others · annual ÷ ramp (see methodology)"
            source={source}
            asOf={asOf}
            confidence="modelled"
            exportData={{
              ...seriesToExport(cellQuarterlySeries, d.cellQuarterly.categories, "Quarter"),
              meta: snapshotMeta(snapshot, {
                dataset: "cell-production-quarterly",
                notes: ["Quarterly split is modelled (annual ÷ fixed ramp) — see methodology."],
              }),
            }}
          >
            <BarSeriesChart
              series={cellQuarterlySeries}
              stacked
              unit="GW"
              periodOrder={d.cellQuarterly.categories}
              height={360}
            />
          </ChartFrame>
        </div>
      </section>

      {/* § Supply–demand */}
      <section className="space-y-4">
        <SectionHeader
          title="Supply–demand"
          subtitle="Module &amp; cell overcapacity (FY26 → FY28)."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {d.supplyDemand.map((s) => {
            const ratio = s.demandFy26 ? round2(s.capacityFy26 / s.demandFy26) : 0;
            return (
              <Card key={s.segment} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {s.segment}
                  </span>
                  <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    {ratio}× cap.
                  </span>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Capacity (FY26→28)</dt>
                    <dd className="tabular-nums font-medium">
                      {s.capacityFy26}→{s.capacityFy28} GW
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Demand (FY26→28)</dt>
                    <dd className="tabular-nums font-medium">
                      {s.demandFy26}→{s.demandFy28} GW
                    </dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      </section>

      {/* § ALMM & PLI */}
      <section className="space-y-4">
        <SectionHeader
          title="ALMM &amp; PLI"
          subtitle="Manufacturing localisation timeline and PLI-supported capacity."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {d.almmTimeline.map((ph) => (
            <Card key={ph.phase} className="p-4">
              <span className="text-sm font-semibold text-foreground">
                {ph.phase}
              </span>
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

        <ChartFrame
          title="PLI awardees — supported capacity"
          subtitle={`GW of integrated capacity · ~${pliTotal} GW PLI-supported (Tranche I+II)`}
          source="PIB / JMK Research"
          asOf={asOf}
          confidence="high"
        >
          <CategoryBarChart
            data={pliData}
            unit="GW"
            height={300}
            categoryWidth={140}
          />
        </ChartFrame>

      </section>
    </div>
  );
}
