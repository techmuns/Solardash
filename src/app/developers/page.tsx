import { getDevelopersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { categoriesToExport, categoryToExport, snapshotMeta } from "@/lib/export";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import {
  FillCategoryBar,
  FillStackedCategory,
} from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasKpi,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { Kpi } from "@/data/types/core";
import { RosterTable } from "./RosterTable";
import { PpaTrackerTable } from "./PpaTrackerTable";

export const dynamic = "force-static";
export const metadata = {
  title: "IPPs",
  description:
    "India's renewable IPPs — operational, under-construction and pipeline capacity, PPA signings, and the aggregate portfolio mix.",
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

export default function DevelopersPage() {
  const snap = getDevelopersSnapshot();
  const d = snap.data;
  const source = "Investor disclosures (maintained)";
  const asOf = formatDate(snap.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snap, { dataset });

  const ppaGw = d.ppaTracker.reduce((s, p) => s + p.capacityMw, 0) / 1000;

  const kpis: CanvasKpi[] = [
    mapKpi(find(d.kpis, "operational_gw")),
    mapKpi(find(d.kpis, "buildout_gw")),
    {
      label: "PPAs signed",
      value: ppaGw.toFixed(1),
      unit: "GW",
      hint: `${d.ppaTracker.length} recent`,
    },
    mapKpi(find(d.kpis, "largest")),
  ];

  const mixData = d.portfolioMix
    .map((m) => ({
      key: m.key,
      label: TENDER_TYPE_LABELS[m.key],
      value: m.gw,
      color: energyColor(m.key),
    }))
    .sort((a, b) => b.value - a.value);

  const funnelSeries = [
    {
      key: "operational",
      label: "Operational",
      color: "#10B981",
      values: d.capacityFunnel.operational,
    },
    {
      key: "underConstruction",
      label: "Under construction",
      color: "#F59E0B",
      values: d.capacityFunnel.underConstruction,
    },
    {
      key: "pipeline",
      label: "Pipeline",
      color: "#94A3B8",
      values: d.capacityFunnel.pipeline,
    },
  ];

  const topDevRows = d.roster
    .slice(0, 5)
    .map((r) => ({ label: r.name, value: `${r.operationalGw}` }));
  const opSide = {
    title: "Top · operational GW",
    node: <RankList rows={topDevRows} />,
  };

  const tabs: CanvasTab[] = [
    {
      id: "leaderboard",
      label: "Leaderboard",
      title: "IPP roster",
      subtitle:
        "Operational · under-construction · pipeline · FY30 target (GW) · sortable",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <RosterTable rows={d.roster} />
        </div>
      ),
      exportData: {
        columns: [
          { key: "name", label: "IPP" },
          { key: "operationalGw", label: "Operational (GW)" },
          { key: "underConstructionGw", label: "Under construction (GW)" },
          { key: "pipelineGw", label: "Pipeline (GW)" },
          { key: "targetGw", label: "FY30 target (GW)" },
        ],
        rows: d.roster.map((r) => ({
          name: r.name,
          operationalGw: r.operationalGw,
          underConstructionGw: r.underConstructionGw,
          pipelineGw: r.pipelineGw,
          targetGw: r.targetGw,
        })),
        meta: meta("roster"),
      },
    },
    {
      id: "pipeline",
      label: "Pipeline",
      title: "Capacity funnel by IPP",
      subtitle: "GW · operational + under-construction + pipeline, stacked",
      body: (
        <FillStackedCategory
          categories={d.capacityFunnel.categories}
          series={funnelSeries}
          unit="GW"
          categoryWidth={104}
        />
      ),
      side: opSide,
      exportData: {
        ...categoriesToExport(d.capacityFunnel.categories, funnelSeries, "Developer"),
        meta: meta("capacity-funnel"),
      },
    },
    {
      id: "ppas",
      label: "PPAs",
      title: "PPA / PSA signings",
      subtitle: "Recent power-purchase agreements · sortable",
      source: "SECI / NTPC / SJVN auctions (maintained)",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <PpaTrackerTable ppas={d.ppaTracker} />
        </div>
      ),
      exportData: {
        columns: [
          { key: "date", label: "Date" },
          { key: "developer", label: "Developer" },
          { key: "agency", label: "Agency" },
          { key: "type", label: "Type" },
          { key: "mw", label: "MW" },
          { key: "tariff", label: "Tariff (₹/kWh)" },
        ],
        rows: d.ppaTracker.map((p) => ({
          date: p.date,
          developer: p.developer,
          agency: p.agency,
          type: TENDER_TYPE_LABELS[p.tenderType],
          mw: p.capacityMw,
          tariff: p.tariffRs ?? null,
        })),
        meta: meta("ppa-tracker"),
      },
    },
    {
      id: "mix",
      label: "Portfolio mix",
      title: "Aggregate portfolio mix",
      subtitle: `GW by technology, ranked · + ${d.bessGwh} GWh BESS across portfolios`,
      body: (
        <FillCategoryBar data={mixData} unit="GW" categoryWidth={64} showValues />
      ),
      side: opSide,
      exportData: {
        ...categoryToExport(mixData, "Technology", "GW"),
        meta: meta("portfolio-mix"),
      },
    },
  ];

  return (
    <SectionCanvas kpis={kpis} tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
