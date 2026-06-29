import {
  getCompaniesSnapshot,
  getManufacturingSnapshot,
  getTendersSnapshot,
} from "@/data";
import { getProfitPools } from "@/data/profit-pools";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillLineSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  type CanvasKpi,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import { AnalysisTag, Constituents, Scorecard, type ScorecardClaim } from "./parts";

export const dynamic = "force-static";
export const metadata = {
  title: "Profit Pools",
  description:
    "Where value is shifting across India's solar value chain — stage profitability over time and a value-migration scorecard, evidenced from listed-company filings, tenders and capacity data.",
};

/** Firm-power & storage contract types (vs pure solar/wind). */
const FIRM_KEYS = new Set(["solar-bess", "bess", "fdre", "hybrid", "rtc"]);

export default function ProfitPoolsPage() {
  const pools = getProfitPools();
  const tenders = getTendersSnapshot().data;
  const mfg = getManufacturingSnapshot().data;
  const companiesSnap = getCompaniesSnapshot();
  const asOf = formatDate(pools.asOf);
  const meta = (dataset: string) =>
    snapshotMeta(companiesSnap, { section: "profit-pools", dataset });

  const last = (xs: number[]) => xs[xs.length - 1];

  // ── KPI trends (sparkline-stat, all real) ──────────────────────────────
  const mfgTrend =
    pools.marginByStage.find((s) => s.key === "manufacturing")?.points.map((p) => p.value) ??
    [];
  const ippTrend =
    pools.marginByStage.find((s) => s.key === "generation")?.points.map((p) => p.value) ??
    [];
  const tariffHist = tenders.tariffHistory[0];
  const tariffTrend = tariffHist?.points.map((p) => p.value) ?? [];

  const kpis: CanvasKpi[] = [
    {
      label: "Mfg pool EBITDA margin",
      value: `${last(mfgTrend)}`,
      unit: "%",
      hint: "rev-weighted · listed makers · FY26",
      trend: mfgTrend,
      color: "#10B981",
    },
    {
      label: "IPP pool EBITDA margin",
      value: `${last(ippTrend)}`,
      unit: "%",
      hint: "rev-weighted · listed IPPs · FY26",
      trend: ippTrend,
      color: "#6366F1",
    },
    {
      label: "Lowest solar tariff",
      value: `${last(tariffTrend)}`,
      unit: "₹/kWh",
      hint: `by year · ${tariffHist?.points[tariffHist.points.length - 1]?.period ?? ""}`,
      trend: tariffTrend,
      color: "#EC4899",
    },
  ];

  // ── Scorecard claims (only what our committed data evidences) ──────────
  const cellTrend =
    mfg.capacityHistory.find((s) => s.key === "cell")?.points.map((p) => p.value) ?? [];

  // Firm/storage share of awarded MW per quarter; show the denser FY26 window.
  const quarters = tenders.awardsByQuarter[0]?.points.map((p) => p.period) ?? [];
  const firmShare = quarters.map((_, i) => {
    let tot = 0,
      firm = 0;
    for (const s of tenders.awardsByQuarter) {
      const v = s.points[i]?.value ?? 0;
      tot += v;
      if (FIRM_KEYS.has(s.key)) firm += v;
    }
    return tot ? Math.round((firm / tot) * 100) : 0;
  });
  const firmShareFy26 = quarters
    .map((p, i) => (p.includes("FY26") ? firmShare[i] : null))
    .filter((v): v is number => v != null);

  const claims: ScorecardClaim[] = [
    {
      title: "Domestic cell pool emerging",
      direction: "expanding",
      detail: "Cell capacity 3 → 50 GW (FY21→FY26) as new lines ramp.",
      trend: cellTrend,
      href: "/manufacturing",
      hrefLabel: "Cell build-out",
    },
    {
      title: "Manufacturing margins re-rating",
      direction: "expanding",
      detail: "Listed module/cell pool EBITDA margin ~4% → 22% since the FY22 trough.",
      trend: mfgTrend,
      href: "/companies",
      hrefLabel: "Company filings",
    },
    {
      title: "Firm power & storage rising",
      direction: "shifting",
      detail: "FDRE · hybrid · BESS share of awarded MW, FY26: 19% → 73% (Q1→Q3), 52% Q4.",
      trend: firmShareFy26,
      href: "/tenders",
      hrefLabel: "Tender mix shift",
    },
    {
      title: "Merchant solar tariffs structurally low",
      direction: "squeezed",
      detail: "Lowest solar tariff ₹4.34 (2016) → ~₹2.2–2.5/kWh — thin merchant margins.",
      trend: tariffTrend,
      href: "/tenders",
      hrefLabel: "Tariff history",
    },
  ];
  const pending = ["Poly-to-module price collapse", "BESS project economics", "EPC margins"];

  const tabs: CanvasTab[] = [
    {
      id: "margins",
      label: "Stage margins",
      title: "Stage profitability over time",
      subtitle: "Revenue-weighted EBITDA margin · listed players · FY20 → FY26",
      source: "Company filings (annual reports)",
      body: (
        <div className="flex min-h-0 flex-1 flex-col">
          <FillLineSeries
            series={pools.marginByStage}
            unit="%"
            periodOrder={pools.periods}
          />
          <p className="mt-1 shrink-0 text-2xs leading-snug text-muted-foreground">
            <AnalysisTag /> Manufacturing pool margin tripled off its FY22 trough
            (~4% → 22%) as ALMM/DCR protection and scale took hold; IPP margins
            stayed structurally high on long-tenor PPAs — value is migrating into
            protected domestic manufacturing.
          </p>
        </div>
      ),
      side: { title: "Pool constituents", node: <Constituents groups={pools.groups} /> },
      exportData: {
        ...seriesToExport(pools.marginByStage, pools.periods, "Year"),
        meta: meta("stage-margins"),
      },
    },
    {
      id: "migration",
      label: "Value migration",
      title: "Value-migration scorecard",
      subtitle: "Where value is shifting — each claim linked to a real trend",
      source: "Filings · tenders · capacity data",
      body: <Scorecard claims={claims} pending={pending} />,
    },
  ];

  return <SectionCanvas kpis={kpis} tabs={tabs} asOf={asOf} defaultSource="Company filings" />;
}
