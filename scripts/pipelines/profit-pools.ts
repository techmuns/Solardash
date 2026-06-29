import { definePipeline } from "../lib/pipeline";
import { readManualCsv, writeSnapshot } from "../lib/io";
import type { Confidence, Series, SeriesPoint, SourceRef } from "../../src/data/types/core";
import type {
  DirectionClass,
  PriceHistoryData,
  StageEconomicsData,
  StageEconomicsRow,
} from "../../src/data/types/profit-pools";

// Vintage for the sourced benchmark pack (compiled early 2026).
const PP_AS_OF = "2026-03-31";

/** Parse a price cell: trailing `e` marks an est. (monthly-reconstructed) value. */
function parsePrice(v: string): { value: number; est: boolean } {
  const t = (v ?? "").trim();
  const est = /e$/i.test(t);
  return { value: parseFloat(t.replace(/e$/i, "")), est };
}

const PRICE_METRICS: {
  key: string;
  label: string;
  col: string;
  unit: string;
  color: string;
  confidence: Confidence;
}[] = [
  { key: "poly", label: "Polysilicon", col: "poly_usd_kg", unit: "$/kg", color: "#EA580C", confidence: "high" },
  { key: "wafer", label: "Wafer", col: "wafer_usd_pc", unit: "$/pc", color: "#8B5CF6", confidence: "medium" },
  { key: "cell", label: "Cell", col: "cell_usd_w", unit: "$/W", color: "#F59E0B", confidence: "medium" },
  { key: "module", label: "Module", col: "module_usd_w", unit: "$/W", color: "#2563EB", confidence: "high" },
];

// The pack's cited sources for the price stack (collective across the series).
const PRICE_SOURCES = [
  "Bernreuter Research",
  "InfoLink Consulting",
  "BloombergNEF",
  "IEA",
  "OPIS",
  "Wood Mackenzie",
  "ITRPV",
];

const mapConf = (c: string): Confidence =>
  c === "high" ? "high" : c === "medium" ? "medium" : "medium";

export const profitPoolsPipeline = definePipeline({
  name: "profit-pools",
  section: "profit-pools",
  cadence: "adhoc",
  run() {
    // ── DATASET 1 — price history (global PV stack) ──────────────────────
    const priceRows = readManualCsv("profit-pools/price-history.csv");
    const years = priceRows.map((r) => r.year);
    const series: Series[] = PRICE_METRICS.map((m) => ({
      key: m.key,
      label: m.label,
      unit: m.unit,
      color: m.color,
      points: priceRows.map((r): SeriesPoint => {
        const { value, est } = parsePrice(r[m.col]);
        return { period: r.year, value, ...(est ? { modelled: true } : {}) };
      }),
    }));
    const priceSources: SourceRef[] = PRICE_SOURCES.map((name) => ({
      name,
      asOf: PP_AS_OF,
      confidence: "high",
      note: "representative annual; est. where monthly-reconstructed",
    }));

    writeSnapshot<PriceHistoryData>("profit-pools", "price-history", {
      asOf: PP_AS_OF,
      cadence: "annual",
      coverage: "Global · solar PV price stack (polysilicon, wafer, cell, module)",
      sources: priceSources,
      notes: [
        "Representative annual values in native units (poly $/kg, wafer $/piece, cell & module $/W); points flagged modelled were reconstructed from monthly series (the pack's est. flag).",
        "Polysilicon peaked ~$39/kg in Aug 2022 and fell to ~$5/kg in 2024 (−88% peak→trough), below cash cost across poly/wafer/cell; 2025 is a partial recovery (poly ~+39% YTD). Module $/W roughly halved 2022→2024.",
        "Confidence: polysilicon & module HIGH; wafer & cell MEDIUM.",
      ],
      data: { years, series },
    });

    // ── DATASET 2 — per-stage economics benchmark ───────────────────────
    const ecoRows = readManualCsv("profit-pools/stage-economics.csv");
    const rows: StageEconomicsRow[] = ecoRows.map((r) => {
      const repRaw = (r.rep_margin ?? "").trim();
      const trendRaw = (r.trend ?? "").trim();
      return {
        stage: r.stage,
        region: r.region,
        metric: r.metric,
        marginText: r.margin_text,
        repMargin: repRaw === "" ? null : Number(repRaw),
        rep: r.rep === "yes",
        direction: r.direction,
        directionClass: r.direction_class as DirectionClass,
        rationale: r.rationale,
        source: r.source,
        confidence: r.confidence,
        ...(trendRaw
          ? { trend: trendRaw.split(";").map((n) => Number(n.trim())) }
          : {}),
      };
    });

    // Provenance: the distinct agencies cited across the rows (split on "·").
    const srcMap = new Map<string, SourceRef>();
    for (const r of ecoRows) {
      const conf = mapConf(r.confidence?.includes("low") ? "low" : r.confidence);
      for (const name of (r.source ?? "").split("·").map((s) => s.trim()).filter(Boolean)) {
        if (!srcMap.has(name)) srcMap.set(name, { name, asOf: PP_AS_OF, confidence: conf });
      }
    }
    const stageSources = [...srcMap.values()].sort((a, b) => a.name.localeCompare(b.name));

    writeSnapshot<StageEconomicsData>("profit-pools", "stage-economics", {
      asOf: PP_AS_OF,
      cadence: "adhoc",
      coverage: "Solar value chain · per-stage margin & direction benchmark (global + India)",
      sources: stageSources,
      notes: [
        "Margins are sourced FACT (company filings / agencies); the direction reading and the representative per-stage margin are Munshot analysis.",
        "Where a stage is bifurcated by geography, the India figure is the representative; China (squeezed) and US (IRA-boosted) figures are shown alongside. The key insight: trade policy, not technology, sets the module margin.",
        "BESS has no clean EBITDA yet — auction tariffs have fallen ~86% against a ~36% cost decline, so volume is exploding but margin is unproven (low confidence).",
      ],
      data: { rows },
    });
  },
});
