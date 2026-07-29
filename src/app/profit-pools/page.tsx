import {
  getCompaniesSnapshot,
  getPriceHistorySnapshot,
  getStageEconomicsSnapshot,
  getStageIrrConfigSnapshot,
} from "@/data";
import { getProfitPools, getValueChainIrr } from "@/data/profit-pools";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { SectionCanvas, type CanvasTab } from "@/components/sections/SectionCanvas";
import { Constituents } from "./parts";
import { StageMarginsBody } from "./StageMarginsBody";
import { MarginContrast, PriceStack, StageEconomicsTable } from "./PackTabs";
import { StageIrr, CompanyValueCaptureList } from "./ValueCapture";

export const dynamic = "force-static";
export const metadata = {
  title: "Profit Pools",
  description:
    "Where value sits across India's solar value chain — stage profitability over time, the PV price stack, per-stage economics with the China vs India/US split, and value-capture IRR, evidenced from listed filings and sourced benchmark packs.",
};

export default function ProfitPoolsPage() {
  const pools = getProfitPools();
  const companiesSnap = getCompaniesSnapshot();
  const asOf = formatDate(pools.asOf);
  const meta = (dataset: string) =>
    snapshotMeta(companiesSnap, { section: "profit-pools", dataset });

  // Higher-frequency (quarterly) stage-margin trajectories, attached as
  // sparklines in the stage-economics FACT table where our filings support them.
  const mfgTrendQ =
    pools.marginByStageQuarterly
      .find((s) => s.key === "manufacturing")
      ?.points.map((p) => p.value) ?? [];
  const ippTrendQ =
    pools.marginByStageQuarterly
      .find((s) => s.key === "generation")
      ?.points.map((p) => p.value) ?? [];

  // ── Pack-fed benchmark datasets (sourced; cited per series/row) ────────
  const price = getPriceHistorySnapshot();
  const eco = getStageEconomicsSnapshot();
  const irrConfig = getStageIrrConfigSnapshot();
  const vci = getValueChainIrr();
  const priceMeta = snapshotMeta(price, {
    section: "profit-pools",
    dataset: "price-history",
  });
  const ecoMeta = snapshotMeta(eco, {
    section: "profit-pools",
    dataset: "stage-economics",
  });
  const irrMeta = snapshotMeta(irrConfig, {
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
      id: "price-stack",
      label: "Price stack",
      title: "PV price stack over time",
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
        "The FACT table — per-stage margin range with value-shift direction and the China vs India/US split",
      source: "Company filings · CRISIL · BNEF · Mercom · IEEFA · Wood Mackenzie",
      body: (
        <div className="flex min-h-0 flex-1 flex-col">
          <StageEconomicsTable rows={ecoRows} />
        </div>
      ),
      side: { title: "Geographic contrast", node: <MarginContrast rows={ecoRows} /> },
      exportData: {
        columns: [
          { key: "stage", label: "Stage" },
          { key: "region", label: "Region" },
          { key: "metric", label: "Metric" },
          { key: "margin", label: "Margin range (FACT)" },
          { key: "rep", label: "Representative % (analysis)" },
          { key: "direction", label: "Direction (analysis)" },
          { key: "rationale", label: "Rationale" },
          { key: "source", label: "Source" },
          { key: "sourceUrl", label: "Source URL" },
          { key: "confidence", label: "Confidence" },
        ],
        rows: eco.data.rows.map((r) => ({
          stage: r.stage,
          region: r.region,
          metric: r.metric,
          margin: r.marginText,
          rep: r.rep && r.repMargin != null ? r.repMargin : null,
          direction: r.direction,
          rationale: r.rationale,
          source: r.source,
          sourceUrl: r.sourceUrl ?? null,
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
      body: (
        <StageIrr
          rows={vci.stages}
          companies={vci.companies}
          assumptions={vci.assumptions}
          sources={vci.sources}
          freshness={{
            price: vci.priceAsOf,
            tariff: vci.tariffAsOf,
            margin: vci.marginAsOf,
          }}
        />
      ),
      side: {
        title: "Top value capturers",
        node: <CompanyValueCaptureList rows={vci.companies} />,
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
        rows: vci.stages.map((r) => ({
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
