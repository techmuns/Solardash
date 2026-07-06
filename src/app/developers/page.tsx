import { getDevelopersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { fyQuarter, formatFyQuarter } from "@/lib/fiscal";
import { categoryToExport, snapshotMeta } from "@/lib/export";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { FillCategoryBar } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  RankList,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import { RosterTable } from "./RosterTable";
import { PpaTrackerTable } from "./PpaTrackerTable";
import { CommissioningTimeline } from "./CommissioningTimeline";

export const dynamic = "force-static";
export const metadata = {
  title: "IPPs",
  description:
    "India's renewable IPPs — operational, under-construction and pipeline capacity, PPA signings, and the aggregate portfolio mix.",
};

export default function DevelopersPage() {
  const snap = getDevelopersSnapshot();
  const d = snap.data;
  const source = "Investor disclosures (maintained)";
  const asOf = formatDate(snap.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snap, { dataset });

  const mixData = d.portfolioMix
    .map((m) => ({
      key: m.key,
      label: TENDER_TYPE_LABELS[m.key],
      value: m.gw,
      color: energyColor(m.key),
    }))
    .sort((a, b) => b.value - a.value);

  const topDevRows = d.roster
    .slice(0, 5)
    .map((r) => ({ label: r.name, value: `${r.operationalGw}` }));
  const opSide = {
    title: "Top · operational GW",
    node: <RankList rows={topDevRows} />,
  };

  // Commissioning timeline anchored to the snapshot vintage.
  const nowPeriod = fyQuarter(snap.updatedAt);
  const slipRows = d.commissioning
    .filter((t) => t.slipQuarters > 0)
    .sort(
      (a, b) => b.slipQuarters - a.slipQuarters || b.capacityGw - a.capacityGw,
    )
    .slice(0, 6)
    .map((t) => ({ label: `${t.developer} · ${t.project}`, value: `+${t.slipQuarters}Q` }));
  const slipSide = {
    title: "Biggest slips (Q)",
    node:
      slipRows.length > 0 ? (
        <RankList rows={slipRows} />
      ) : (
        <p className="text-2xs text-muted-foreground">
          No tranches behind their original guidance.
        </p>
      ),
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
      label: "Commissioning",
      title: "Commissioning timeline by IPP",
      subtitle:
        "Guided COD by fiscal quarter · tracked from concalls, with slippage vs earlier guidance",
      body: (
        <CommissioningTimeline tranches={d.commissioning} now={nowPeriod} />
      ),
      side: slipSide,
      exportData: {
        columns: [
          { key: "developer", label: "IPP" },
          { key: "project", label: "Project" },
          { key: "tech", label: "Tech" },
          { key: "capacityGw", label: "Capacity" },
          { key: "original", label: "Original target" },
          { key: "current", label: "Current target" },
          { key: "slipQuarters", label: "Slip (Q)" },
          { key: "status", label: "Status" },
          { key: "lastConcall", label: "Last stated" },
        ],
        rows: d.commissioning.map((t) => ({
          developer: t.developer,
          project: t.project,
          tech: TENDER_TYPE_LABELS[t.tech] ?? t.tech,
          capacityGw: t.capacityGw,
          original: formatFyQuarter(t.originalTarget),
          current: formatFyQuarter(t.currentTarget),
          slipQuarters: t.slipQuarters,
          status: t.status,
          lastConcall: t.history[t.history.length - 1]?.concall ?? "",
        })),
        meta: meta("commissioning"),
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
    <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
