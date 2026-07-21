import {
  getCompaniesSnapshot,
  getManufacturingSnapshot,
  getPriceHistorySnapshot,
  getStageEconomicsSnapshot,
  getStageIrrSnapshot,
  getTendersSnapshot,
} from "@/data";
import { getProfitPools, getCompanyValueCapture } from "@/data/profit-pools";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { SectionCanvas, type CanvasTab } from "@/components/sections/SectionCanvas";
import { Constituents, Scorecard, type ScorecardClaim } from "./parts";
import { StageMarginsBody } from "./StageMarginsBody";
import {
  MarginByStage,
  MarginContrast,
  PriceStack,
  StageEconomicsTable,
} from "./PackTabs";
import { StageIrr, CompanyValueCaptureList } from "./ValueCapture";

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

  // ── KPI trends (sparkline-stat, all real) ──────────────────────────────
  const mfgTrend =
    pools.marginByStage.find((s) => s.key === "manufacturing")?.points.map((p) => p.value) ??
    [];
  // Higher-frequency (quarterly) trajectories for the stage-economics sparklines.
  const mfgTrendQ =
    pools.marginByStageQuarterly
      .find((s) => s.key === "manufacturing")
      ?.points.map((p) => p.value) ?? [];
  const ippTrendQ =
    pools.marginByStageQuarterly
      .find((s) => s.key === "generation")
      ?.points.map((p) => p.value) ?? [];
  const tariffHist = tenders.tariffHistory[0];
  const tariffTrend = tariffHist?.points.map((p) => p.value) ?? [];

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

  // ── Pack-fed benchmark datasets (sourced; cited per series/row) ────────
  const price = getPriceHistorySnapshot();
  const eco = getStageEconomicsSnapshot();
  const irr = getStageIrrSnapshot();
  const valueCapture = getCompanyValueCapture();
  const priceMeta = snapshotMeta(price, {
    section: "profit-pools",
    dataset: "price-history",
  });
  const ecoMeta = snapshotMeta(eco, {
    section: "profit-pools",
    dataset: "stage-economics",
  });
  const irrMeta = snapshotMeta(irr, {
    section: "profit-pools",
    dataset: "value-chain-irr",
  });
  // Attach the render-time India aggregates as sparklines where a stage's
  // margin trajectory exists in our filings data (Module / IPP) — quarterly,
  // the densest series the committed filings support.
  const ecoRows = eco.data.rows.map((r) => {
    if (r.stage === "Module" && r.region === "India") return { ...r, trend: mfgTrendQ };
    if (r.stage.startsWith("IPP") && r.region === "India")
      return { ...r, trend: ippTrendQ };
    return r;
  });

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
      subtitle:
        "Revenue-weighted EBITDA margin · listed players · quarterly Q1 FY24 → Q4 FY26 · annual FY20 → FY26",
      source: "Company filings (quarterly results · annual reports)",
      body: (
        <StageMarginsBody
          annual={pools.marginByStage}
          annualPeriods={pools.periods}
          quarterly={pools.marginByStageQuarterly}
          quarterPeriods={pools.quarterPeriods}
        />
      ),
      side: { title: "Pool constituents", node: <Constituents groups={pools.groups} /> },
      exportData: {
        columns: seriesToExport(pools.marginByStage, pools.periods, "Period").columns,
        rows: [
          ...seriesToExport(pools.marginByStageQuarterly, pools.quarterPeriods, "Period")
            .rows,
          ...seriesToExport(pools.marginByStage, pools.periods, "Period").rows,
        ],
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
    {
      id: "price-stack",
      label: "Price stack",
      title: "PV price stack over time",
      subtitle: "Polysilicon → module · native units",
      source: "InfoLink · EnergyTrend · Silicon Industry Branch · OPIS · Bernreuter · SMM",
      body: (
        <PriceStack
          years={price.data.years}
          series={price.data.series}
          months={price.data.months}
          monthly={price.data.monthly}
        />
      ),
      exportData: {
        columns: seriesToExport(price.data.series, price.data.years, "Period").columns,
        rows: [
          ...seriesToExport(price.data.monthly, price.data.months, "Period").rows,
          ...seriesToExport(price.data.series, price.data.years, "Period").rows,
        ],
        meta: priceMeta,
      },
    },
    {
      id: "stage-economics",
      label: "Stage economics",
      title: "Per-stage economics across the chain",
      subtitle:
        "Representative margin per stage (bars) + the FACT table with value-shift direction and the China vs India/US split",
      source: "Company filings · CRISIL · BNEF · Mercom · IEEFA · Wood Mackenzie",
      body: (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex min-h-0 basis-2/5 flex-col">
            <MarginByStage rows={ecoRows} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <StageEconomicsTable rows={ecoRows} />
          </div>
        </div>
      ),
      side: { title: "Geographic contrast", node: <MarginContrast rows={ecoRows} /> },
      exportData: {
        columns: [
          { key: "stage", label: "Stage" },
          { key: "region", label: "Region" },
          { key: "metric", label: "Metric" },
          { key: "margin", label: "Margin (FACT)" },
          { key: "direction", label: "Direction (analysis)" },
          { key: "rationale", label: "Rationale" },
          { key: "source", label: "Source" },
          { key: "confidence", label: "Confidence" },
        ],
        rows: eco.data.rows.map((r) => ({
          stage: r.stage,
          region: r.region,
          metric: r.metric,
          margin: r.marginText,
          direction: r.direction,
          rationale: r.rationale,
          source: r.source,
          confidence: r.confidence,
        })),
        meta: ecoMeta,
      },
    },
    {
      id: "value-capture",
      label: "Value capture",
      title: "Who captures the value — IRR across the chain",
      subtitle:
        "Greenfield project IRR per stage from CapEx + EBITDA over asset life · and each maker's IRR at its own margin",
      source: "CEEW · CareEdge · CRISIL · ICRA · Mercom · company filings",
      body: <StageIrr rows={irr.data.rows} assumptions={irr.data.assumptions} />,
      side: {
        title: "Company value capture",
        node: <CompanyValueCaptureList rows={valueCapture.rows} />,
      },
      exportData: {
        columns: [
          { key: "stage", label: "Stage" },
          { key: "region", label: "Region" },
          { key: "capexPerW", label: "CapEx (₹/W)" },
          { key: "aspPerW", label: "Revenue (₹/W/yr)" },
          { key: "ebitdaMarginPct", label: "EBITDA margin (%)" },
          { key: "utilizationPct", label: "Utilisation (%)" },
          { key: "lifeYears", label: "Life (yrs)" },
          { key: "ebitdaPerWYr", label: "EBITDA (₹/W/yr)" },
          { key: "paybackYears", label: "Payback (yrs)" },
          { key: "irrPct", label: "IRR % (analysis)" },
          { key: "source", label: "Source" },
        ],
        rows: irr.data.rows.map((r) => ({
          stage: r.stage,
          region: r.region,
          capexPerW: r.capexPerW,
          aspPerW: r.aspPerW,
          ebitdaMarginPct: r.ebitdaMarginPct,
          utilizationPct: r.utilizationPct,
          lifeYears: r.lifeYears,
          ebitdaPerWYr: r.ebitdaPerWYr,
          paybackYears: r.paybackYears,
          irrPct: r.offChart ? "off-chart" : r.irrPct,
          source: r.source,
        })),
        meta: irrMeta,
      },
    },
  ];

  return <SectionCanvas tabs={tabs} asOf={asOf} defaultSource="Company filings" />;
}
