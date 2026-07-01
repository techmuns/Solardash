import {
  getCompaniesSnapshot,
  getManufacturingSnapshot,
  getPriceHistorySnapshot,
  getStageEconomicsSnapshot,
  getTendersSnapshot,
} from "@/data";
import { getProfitPools } from "@/data/profit-pools";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import { seriesToExport } from "@/components/charts/series";
import { FillLineSeries } from "@/components/charts/FillCharts";
import { SectionCanvas, type CanvasTab } from "@/components/sections/SectionCanvas";
import { AnalysisTag, Constituents, Scorecard, type ScorecardClaim } from "./parts";
import {
  MarginByStage,
  MarginContrast,
  PriceStack,
  StageEconomicsTable,
} from "./PackTabs";

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
  const ippTrend =
    pools.marginByStage.find((s) => s.key === "generation")?.points.map((p) => p.value) ??
    [];
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
  const priceMeta = snapshotMeta(price, {
    section: "profit-pools",
    dataset: "price-history",
  });
  const ecoMeta = snapshotMeta(eco, {
    section: "profit-pools",
    dataset: "stage-economics",
  });
  // Attach the render-time India aggregates as sparklines where a stage's
  // margin trajectory exists in our filings data (Module / IPP).
  const ecoRows = eco.data.rows.map((r) => {
    if (r.stage === "Module" && r.region === "India") return { ...r, trend: mfgTrend };
    if (r.stage.startsWith("IPP") && r.region === "India")
      return { ...r, trend: ippTrend };
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
    {
      id: "price-stack",
      label: "Price stack",
      title: "PV price stack over time",
      subtitle: "Native units · 2019 → 2025 · polysilicon to module",
      source: "Bernreuter · InfoLink · BNEF · IEA · OPIS · WoodMac · ITRPV",
      body: <PriceStack years={price.data.years} series={price.data.series} />,
      exportData: {
        ...seriesToExport(price.data.series, price.data.years, "Year"),
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
  ];

  return <SectionCanvas tabs={tabs} asOf={asOf} defaultSource="Company filings" />;
}
