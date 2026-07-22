import type { Series } from "./core";

/**
 * Profit-pool BENCHMARK datasets (the sourced pack) — external FACTs that can't
 * be derived from the existing snapshots, so they get their own pipeline-built
 * snapshots with cited SourceRefs. (The stage-margin aggregates derived from
 * listed filings live separately in `src/data/profit-pools.ts`.)
 */

// ---------------------------------------------------------------------------
// price-history — the global PV price stack (native units, 2019→2025)
// ---------------------------------------------------------------------------

/** Payload of the profit-pools `price-history` snapshot. */
export interface PriceHistoryData {
  /** Years covered (e.g. `2019`…`2025`). */
  years: string[];
  /**
   * One native-unit price series per chain stage — poly $/kg, wafer $/pc,
   * cell $/W, module $/W. Points carry `modelled: true` where the annual value
   * was reconstructed from monthly data (the pack's "est." flag).
   */
  series: Series[];
  /** Month labels (e.g. `Jan 24`) — the higher-frequency x-axis, trailing window. */
  months: string[];
  /**
   * Monthly counterparts of `series` (same stages / keys / units), tracked from
   * the weekly/monthly price surveys (InfoLink · Bernreuter · PVInsights ·
   * OPIS · SMM). Points carry `modelled: true` where a month is interpolated
   * between published survey quotes.
   */
  monthly: Series[];
}

// ---------------------------------------------------------------------------
// stage-economics — per-stage margin + direction benchmark
// ---------------------------------------------------------------------------

/** Base value-shift direction (drives the badge / bar colour). */
export type DirectionClass = "expanding" | "stable" | "squeezed" | "mixed";

/** One benchmarked stage (optionally split by region). */
export interface StageEconomicsRow {
  stage: string;
  /** "Global" · "China" · "India" · "US" — the geographic cut, if any. */
  region: string;
  /** Margin metric — "GM" (gross) or "EBITDA". */
  metric: string;
  /** Verbatim margin range / trajectory text (FACT). */
  marginText: string;
  /** Representative % for the "Margin by stage" bar; null where unproven (BESS). */
  repMargin: number | null;
  /** True for the one row per stage that feeds the representative bar. */
  rep: boolean;
  /** Full direction reading (ANALYSIS). */
  direction: string;
  directionClass: DirectionClass;
  /** Why it's moving (ANALYSIS). */
  rationale: string;
  /** Cited source(s) for the margin FACT. */
  source: string;
  /** Link to the cited source, where a canonical page exists. */
  sourceUrl?: string;
  /** Free-text confidence flag (e.g. "high", "medium", "high demand · low margin"). */
  confidence: string;
  /** A margin trajectory for a sparkline, where one exists (poly / wafer). */
  trend?: number[];
}

export interface StageEconomicsData {
  rows: StageEconomicsRow[];
}

// ---------------------------------------------------------------------------
// value-chain-irr — greenfield project IRR per stage (CapEx + EBITDA → IRR)
//
// The committed snapshot holds only the STRUCTURAL config below; the computed
// per-stage / per-company IRRs are derived at render time from the freshest
// price, tariff and margin feeds (see `getValueChainIrr` in profit-pools.ts).
// ---------------------------------------------------------------------------

/**
 * How a stage's representative price/W is derived from the freshest committed
 * data (so the IRR uses the latest source, not a hardcoded number):
 *  - `stack:cell` / `stack:module` — latest month of the price stack ($/W)
 *    × FX × `priceParam` (the India realised premium).
 *  - `stack:poly` — latest poly ($/kg) × `priceParam` (g/W) ÷ 1000 × FX.
 *  - `stack:wafer` — latest wafer ($/pc) ÷ `priceParam` (W/piece) × FX.
 *  - `tariff` — latest awarded solar tariff (₹/kWh) × `priceParam` (CUF %)
 *    ÷ 100 × 8,760 h → annual revenue/W.
 *  - `fixed` — use `priceFallbackPerW` verbatim.
 */
export type StagePriceMode =
  | "stack:cell"
  | "stack:module"
  | "stack:poly"
  | "stack:wafer"
  | "tariff"
  | "fixed";

/** Maintained, slow-moving structural inputs for one stage's IRR. */
export interface StageIrrConfigRow {
  stage: string;
  region: string;
  nodeId?: string;
  /** Greenfield CapEx, ₹ per W of annual capacity (sourced structural input). */
  capexPerW: number;
  utilizationPct: number;
  lifeYears: number;
  /** Derivation rule for the (freshly-sourced) representative price/W. */
  priceMode: StagePriceMode;
  priceParam?: number;
  /** Representative pure-stage EBITDA margin (%) — maintained benchmark. */
  ebitdaMarginPct: number;
  /** Price/W used when `priceMode` is `fixed` or the live source is missing. */
  priceFallbackPerW: number;
  source: string;
  confidence: string;
  note?: string;
}

export interface StageIrrConfigData {
  rows: StageIrrConfigRow[];
  /** ₹ per US$ used to convert the (US$) price stack into ₹/W. */
  fxInrPerUsd: number;
  /** Model assumptions, shown in the methodology dialog. */
  assumptions: string[];
}
