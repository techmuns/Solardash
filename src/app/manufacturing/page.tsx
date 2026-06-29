import { getManufacturingSnapshot } from "@/data";
import { categoricalColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { categoryToExport, snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import {
  FillBarSeries,
  FillCategoryBar,
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
  title: "Manufacturing",
  description:
    "India's solar manufacturing value chain — cell & module capacity, the production ramp, supply vs demand, the ALMM rollout, and PLI awardees.",
};

function kv(k?: Kpi): string {
  if (!k) return "—";
  if (typeof k.value === "string") return k.value;
  return Number.isInteger(k.value)
    ? formatNumber(k.value)
    : parseFloat(k.value.toFixed(2)).toString();
}
const find = (kpis: Kpi[], key: string) => kpis.find((k) => k.key === key);
const mapKpi = (k?: Kpi): CanvasKpi => ({
  label: k?.label ?? "—",
  value: kv(k),
  unit: k?.unit ? formatUnit(k.unit) : undefined,
  hint: k?.hint,
});
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function AlmmList({
  items,
}: {
  items: {
    phase: string;
    scope: string;
    status: string;
    effectiveDate: string;
  }[];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex flex-col gap-3">
        {items.map((a) => (
          <div
            key={a.phase}
            className="flex items-start gap-3 rounded-xl border border-border p-3"
          >
            <span className="shrink-0 rounded-md bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">
              {a.phase}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{a.scope}</p>
              <p className="text-xs text-muted-foreground">
                {a.status} · effective {formatDate(a.effectiveDate)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ManufacturingPage() {
  const snap = getManufacturingSnapshot();
  const m = snap.data;
  const source = "MNRE / DCR Portal (maintained)";
  const asOf = formatDate(snap.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snap, { dataset });

  const pliAwarded = m.pliAwardees.reduce((s, p) => s + p.capacityGw, 0);

  const kpis: CanvasKpi[] = [
    mapKpi(find(m.kpis, "cell_capacity")),
    mapKpi(find(m.kpis, "module_capacity")),
    mapKpi(find(m.kpis, "overcapacity")),
    {
      label: "PLI awarded",
      value: pliAwarded.toFixed(1),
      unit: "GW",
      hint: `${m.pliAwardees.length} firms`,
    },
  ];

  const prodYears = m.cellQuarterly.categories;
  const prodSeries: Series[] = m.cellQuarterly.series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    points: prodYears.map((c, i) => ({ period: c, value: s.values[i] })),
  }));

  const segPeriods = m.supplyDemand.map((s) => cap(s.segment));
  const sdSeries: Series[] = [
    {
      key: "capFy26",
      label: "Capacity FY26",
      color: "#CBD5E1",
      points: m.supplyDemand.map((s) => ({
        period: cap(s.segment),
        value: s.capacityFy26,
      })),
    },
    {
      key: "demFy26",
      label: "Demand FY26",
      color: "#F59E0B",
      points: m.supplyDemand.map((s) => ({
        period: cap(s.segment),
        value: s.demandFy26,
      })),
    },
    {
      key: "capFy28",
      label: "Capacity FY28",
      color: "#64748B",
      points: m.supplyDemand.map((s) => ({
        period: cap(s.segment),
        value: s.capacityFy28,
      })),
    },
    {
      key: "demFy28",
      label: "Demand FY28",
      color: "#D97706",
      points: m.supplyDemand.map((s) => ({
        period: cap(s.segment),
        value: s.demandFy28,
      })),
    },
  ];

  const pliData = m.pliAwardees.map((p, i) => ({
    key: p.company,
    label: p.company,
    value: p.capacityGw,
    color: categoricalColor(i),
  }));

  const cellMakerRows = m.cellPlayers
    .slice(0, 5)
    .map((p) => ({ label: p.player, value: `${p.nameplateGw}` }));
  const moduleMakerRows = m.modulePlayers
    .slice(0, 5)
    .map((p) => ({ label: p.player, value: `${p.almm1Gw}` }));

  const chYears = m.capacityHistory[0]?.points.map((p) => p.period) ?? [];

  const tabs: CanvasTab[] = [
    {
      id: "buildout",
      label: "Capacity build-out",
      title: "Cell vs module capacity over time",
      subtitle: "Nameplate GW · FY21 → FY26 — cell catching up to module",
      source: "JMK Research / Mercom",
      body: (
        <FillLineSeries
          series={m.capacityHistory}
          unit="GW"
          periodOrder={chYears}
        />
      ),
      exportData: {
        ...seriesToExport(m.capacityHistory, chYears, "Year"),
        meta: meta("capacity-history"),
      },
    },
    {
      id: "production",
      label: "Cell production",
      title: "Cell production ramp",
      subtitle: "GW by player · quarterly, stacked",
      source,
      body: (
        <FillBarSeries
          series={prodSeries}
          stacked
          unit="GW"
          periodOrder={prodYears}
        />
      ),
      side: {
        title: "Top cell makers · nameplate GW",
        node: <RankList rows={cellMakerRows} />,
      },
      exportData: {
        ...seriesToExport(prodSeries, prodYears, "Quarter"),
        meta: meta("cell-production"),
      },
    },
    {
      id: "supply",
      label: "Supply vs demand",
      title: "Capacity vs demand",
      subtitle: "GW · module & cell, FY26 → FY28 (the overcapacity gap)",
      source,
      body: <FillBarSeries series={sdSeries} unit="GW" periodOrder={segPeriods} />,
      side: {
        title: "Top module makers · ALMM-I GW",
        node: <RankList rows={moduleMakerRows} />,
      },
      exportData: {
        ...seriesToExport(sdSeries, segPeriods, "Segment"),
        meta: meta("supply-demand"),
      },
    },
    {
      id: "almm",
      label: "ALMM timeline",
      title: "ALMM rollout",
      subtitle: "Approved List of Models & Manufacturers · by phase",
      source: "MNRE ALMM",
      body: <AlmmList items={m.almmTimeline} />,
      exportData: {
        columns: [
          { key: "phase", label: "Phase" },
          { key: "scope", label: "Scope" },
          { key: "status", label: "Status" },
          { key: "effectiveDate", label: "Effective date" },
        ],
        rows: m.almmTimeline.map((a) => ({
          phase: a.phase,
          scope: a.scope,
          status: a.status,
          effectiveDate: a.effectiveDate,
        })),
        meta: meta("almm-timeline"),
      },
    },
    {
      id: "pli",
      label: "PLI awardees",
      title: "PLI awardees",
      subtitle: "Integrated manufacturing capacity awarded · GW",
      source: "PIB / JMK Research",
      body: <FillCategoryBar data={pliData} unit="GW" categoryWidth={92} showValues />,
      exportData: {
        ...categoryToExport(pliData, "Company", "GW"),
        meta: meta("pli-awardees"),
      },
    },
  ];

  return (
    <SectionCanvas kpis={kpis} tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
