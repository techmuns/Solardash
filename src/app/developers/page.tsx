import { getDevelopersSnapshot } from "@/data";
import { energyColor } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { fyQuarter, formatFyQuarter } from "@/lib/fiscal";
import { snapshotMeta } from "@/lib/export";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import {
  SectionCanvas,
  RankList,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import { RosterTable } from "./RosterTable";
import { PpaTrackerTable } from "./PpaTrackerTable";
import { CommissioningTimeline } from "@/components/CommissioningTimeline";

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

  // Aggregate portfolio tech-mix as a compact %-stacked bar (folded into the
  // Leaderboard side — replaces the old standalone "Portfolio mix" tab).
  const mix = [...d.portfolioMix].sort((a, b) => b.gw - a.gw);
  const mixSide = {
    title: "Portfolio mix",
    node: (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          {mix.map((m) => (
            <div key={m.key} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: energyColor(m.key) }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground">
                {TENDER_TYPE_LABELS[m.key]}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {m.gw} GW
              </span>
              <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-foreground">
                {Math.round(m.share * 100)}%
              </span>
            </div>
          ))}
        </div>
        <p className="border-t border-border pt-2 text-2xs text-muted-foreground">
          + {d.bessGwh} GWh BESS across portfolios
        </p>
      </div>
    ),
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
        "Operational · under-construction · pipeline · company-guided FY30 target (linked) · forward PPA coverage · sortable",
      body: (
        <div className="min-h-0 flex-1 overflow-auto">
          <RosterTable rows={d.roster} />
        </div>
      ),
      side: mixSide,
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
        <CommissioningTimeline
          tranches={d.commissioning}
          now={nowPeriod}
          companyLabel="IPP"
        />
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
          tech: (TENDER_TYPE_LABELS as Record<string, string>)[t.tech] ?? t.tech,
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
  ];

  return (
    <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
