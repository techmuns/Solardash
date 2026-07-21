import { definePipeline } from "../lib/pipeline";
import { readManualCsv, writeSnapshot } from "../lib/io";
import type { Confidence, Series, SeriesPoint, SourceRef } from "../../src/data/types/core";
import type {
  DirectionClass,
  PriceHistoryData,
  StageEconomicsData,
  StageEconomicsRow,
  StageIrrConfigData,
  StageIrrConfigRow,
  StagePriceMode,
} from "../../src/data/types/profit-pools";

// ₹ per US$ used to convert the (US$) price stack into ₹/W (documented FX).
const FX_INR_PER_USD = 86;
const PRICE_MODES: StagePriceMode[] = [
  "stack:cell",
  "stack:module",
  "stack:poly",
  "stack:wafer",
  "tariff",
  "fixed",
];

// Vintage for the sourced benchmark pack (compiled early 2026).
const PP_AS_OF = "2026-03-31";
// Vintage of the monthly price refresh (latest survey quotes folded in).
const PRICE_MONTHLY_AS_OF = "2026-07-15";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `2026-06` → `Jun 26` (compact monthly tick labels). */
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const name = MONTH_NAMES[Number(m) - 1];
  if (!name || y?.length !== 4) throw new Error(`bad month "${ym}" (want YYYY-MM)`);
  return `${name} ${y.slice(2)}`;
}

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

// The monthly-refresh trackers (weekly/daily surveys → mid-month points).
// Where a name also appears in the annual pack, the monthly entry wins (it
// carries the fresher asOf + the cadence note).
const PRICE_MONTHLY_SOURCES: { name: string; url: string; note: string }[] = [
  {
    name: "InfoLink Consulting",
    url: "https://www.infolink-group.com/spot-price/",
    note: "weekly (Wed) full-chain spot survey — poly · wafer · cell · module",
  },
  {
    name: "EnergyTrend (TrendForce)",
    url: "https://www.energytrend.com/solar-price.html",
    note: "weekly (Thu) China spot table; free weekly archive",
  },
  {
    name: "Silicon Industry Branch (CNMIA)",
    url: "https://www.pv-tech.org/tag/polysilicon/",
    note: "official weekly China polysilicon transaction averages (via reprints)",
  },
  {
    name: "OPIS",
    url: "https://www.opis.com/product/pricing/spot/global-solar-markets/",
    note: "weekly (Tue) Chinese Module Marker · Global Polysilicon Marker (via pv magazine)",
  },
  {
    name: "Bernreuter Research",
    url: "https://www.bernreuter.com/polysilicon/price-trend/",
    note: "weekly global polysilicon price index",
  },
  {
    name: "SMM",
    url: "https://www.metal.com/photovoltaic",
    note: "daily China poly/wafer/cell/module quotes (RMB, converted)",
  },
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
    // Monthly refresh — the same four series tracked at survey frequency.
    const monthlyRows = readManualCsv("profit-pools/price-history-monthly.csv");
    const months = monthlyRows.map((r) => monthLabel(r.month));
    const monthly: Series[] = PRICE_METRICS.map((m) => ({
      key: m.key,
      label: m.label,
      unit: m.unit,
      color: m.color,
      points: monthlyRows.map((r): SeriesPoint => {
        const { value, est } = parsePrice(r[m.col]);
        return {
          period: monthLabel(r.month),
          value,
          ...(est ? { modelled: true } : {}),
        };
      }),
    }));

    // One SourceRef per distinct tracker; monthly entries override annual-pack
    // duplicates with the fresher asOf + cadence note.
    const priceSourceMap = new Map<string, SourceRef>();
    for (const name of PRICE_SOURCES) {
      priceSourceMap.set(name, {
        name,
        asOf: PP_AS_OF,
        confidence: "high",
        note: "representative annual; est. where monthly-reconstructed",
      });
    }
    for (const s of PRICE_MONTHLY_SOURCES) {
      priceSourceMap.set(s.name, {
        name: s.name,
        url: s.url,
        asOf: PRICE_MONTHLY_AS_OF,
        confidence: "high",
        note: s.note,
      });
    }
    const priceSources = [...priceSourceMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    writeSnapshot<PriceHistoryData>("profit-pools", "price-history", {
      asOf: PRICE_MONTHLY_AS_OF,
      cadence: "monthly",
      coverage: "Global · solar PV price stack (polysilicon, wafer, cell, module)",
      sources: priceSources,
      notes: [
        "Two frequencies: a monthly track (Jan 2024 → Jul 2026, mid-month spot from the weekly surveys — InfoLink, EnergyTrend, Silicon Industry Branch, OPIS, Bernreuter, SMM) and representative annual values for the long arc (2019→2025). Native units: poly $/kg, wafer $/piece, cell & module $/W.",
        "Monthly basis: China spot for poly (n-type dense), wafer (182/183N) and cell (TOPCon M10), RMB converted at ~7.2/USD; module is the TOPCon FOB-China marker (OPIS CMM basis). Annual representative values can sit slightly above China spot where they blend non-China supply.",
        "Points flagged modelled are interpolated between published survey quotes (monthly) or reconstructed from monthly series (annual, the pack's est. flag).",
        "Polysilicon peaked ~$39/kg in Aug 2022 and fell to ~$5/kg in 2024 (−88% peak→trough), below cash cost across poly/wafer/cell. The H2 2025 'anti-involution' supply-cut rally (~$4.9 → $7.2/kg) unwound through H1 2026 back to the cash-cost floor (~$4.5/kg, Jul 2026).",
        "Module FOB spiked ~30% in early 2026 ($0.088 → $0.12/W) on pre-buying ahead of China's export-tax-rebate cancellation (Apr 2026); domestic China module prices stayed near RMB 0.69/W — the FOB and domestic series diverge in 2026.",
        "Confidence: polysilicon & module HIGH; wafer & cell MEDIUM.",
      ],
      data: { years, series, months, monthly },
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

    // ── DATASET 3 — IRR model config (structural inputs; prices/margins are
    //    derived from the freshest committed data at render time) ────────────
    const irrInput = readManualCsv("profit-pools/value-chain-irr.csv");
    const irrRows: StageIrrConfigRow[] = irrInput.map((r) => {
      const priceMode = r.price_mode?.trim() as StagePriceMode;
      if (!PRICE_MODES.includes(priceMode)) {
        throw new Error(`value-chain-irr: bad price_mode "${r.price_mode}" for ${r.stage}`);
      }
      const priceParam = r.price_param?.trim();
      return {
        stage: r.stage,
        region: r.region,
        ...(r.node_id?.trim() ? { nodeId: r.node_id.trim() } : {}),
        capexPerW: Number(r.capex_per_w),
        utilizationPct: Number(r.utilization_pct),
        lifeYears: Number(r.life_years),
        priceMode,
        ...(priceParam ? { priceParam: Number(priceParam) } : {}),
        ebitdaMarginPct: Number(r.ebitda_margin_pct),
        priceFallbackPerW: Number(r.price_fallback_per_w),
        source: r.source,
        confidence: r.confidence,
        ...(r.note?.trim() ? { note: r.note.trim() } : {}),
      };
    });

    const irrSrcMap = new Map<string, SourceRef>();
    for (const r of irrInput) {
      const conf = mapConf(r.confidence?.includes("low") ? "low" : r.confidence);
      for (const name of (r.source ?? "").split("·").map((s) => s.trim()).filter(Boolean)) {
        if (!irrSrcMap.has(name)) irrSrcMap.set(name, { name, asOf: PP_AS_OF, confidence: conf });
      }
    }
    const irrSources = [...irrSrcMap.values()].sort((a, b) => a.name.localeCompare(b.name));

    writeSnapshot<StageIrrConfigData>("profit-pools", "value-chain-irr", {
      asOf: PP_AS_OF,
      cadence: "adhoc",
      coverage: "Solar value chain · greenfield-IRR model config (structural inputs)",
      sources: irrSources,
      notes: [
        "This snapshot holds only the STRUCTURAL inputs (CapEx intensity, utilisation, asset life, the India price premium and the maintained pure-stage margin). The volatile inputs — the representative price/W and the generation tariff — are DERIVED at render time from the freshest committed data (the monthly price stack and the tenders tariff feed), so the IRR always uses the latest source without re-hand-editing.",
        "The IRR itself (pre-tax, unlevered project IRR = solve CapEx = Σ EBITDA/(1+r)ᵗ over the asset life) is computed at render time and is Munshot analysis. CapEx & prices are sourced FACT; loss-making stages (poly, wafer) return no positive IRR.",
      ],
      data: {
        rows: irrRows,
        fxInrPerUsd: FX_INR_PER_USD,
        assumptions: [
          "Pre-tax, unlevered project IRR · level annual EBITDA as the cash proxy · single upfront CapEx.",
          "Per Watt of annual output capacity · EBITDA/W = price/W × margin × utilisation.",
          "Manufacturing life ~10–15 yrs · generation 25-yr PPA · steady-state utilisation (India module lines run ~40–50%).",
          "Prices/tariff derived from the latest price-stack & tenders data; CapEx & DCR premium maintained. Ignores leverage, tax, ramp & working capital — a relative value-capture read, not a bankable return.",
        ],
      },
    });
  },
});
