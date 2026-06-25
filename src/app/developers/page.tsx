import { getDevelopersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { FillDonut, FillStackedCategory } from "@/components/charts/FillCharts";
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

  const mixData = d.portfolioMix.map((m) => ({
    key: m.key,
    label: TENDER_TYPE_LABELS[m.key],
    value: m.gw,
    color: energyColor(m.key),
  }));

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
          <RosterTable
            rows={d.roster}
            exportMeta={snapshotMeta(snap, { dataset: "roster" })}
          />
        </div>
      ),
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
    },
    {
      id: "ppas",
      label: "PPAs",
      title: "PPA / PSA signings",
      subtitle: "Recent power-purchase agreements · sortable",
      source: "SECI / NTPC / SJVN auctions (maintained)",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <PpaTrackerTable
            ppas={d.ppaTracker}
            exportMeta={snapshotMeta(snap, { dataset: "ppa-tracker" })}
          />
        </div>
      ),
      side: opSide,
    },
    {
      id: "mix",
      label: "Portfolio mix",
      title: "Aggregate portfolio mix",
      subtitle: `GW by technology · + ${d.bessGwh} GWh BESS across portfolios`,
      body: <FillDonut data={mixData} unit="GW" />,
      side: opSide,
    },
  ];

  return (
    <SectionCanvas kpis={kpis} tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
