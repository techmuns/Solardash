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
// ---------------------------------------------------------------------------

/**
 * One value-chain stage's greenfield project economics. The IRR is a
 * pre-tax, unlevered project IRR solved from a single CapEx outflow and a level
 * annual EBITDA cash flow over the asset life — Munshot ANALYSIS built on
 * sourced CapEx / price / margin assumptions (each cited). All per-Watt figures
 * are ₹ per Watt of annual output capacity for that stage.
 */
export interface StageIrrRow {
  stage: string;
  region: string;
  /** Value-chain map node id, where the stage maps to one. */
  nodeId?: string;
  /** Greenfield CapEx, ₹ per W of annual capacity (sourced). */
  capexPerW: number;
  /** Representative annual revenue, ₹ per W of capacity (price × output). */
  aspPerW: number;
  /** Representative EBITDA margin (%). */
  ebitdaMarginPct: number;
  /** Steady-state utilisation (%). */
  utilizationPct: number;
  /** Asset / plant life (years). */
  lifeYears: number;
  /** Derived: annual EBITDA cash, ₹ per W of capacity. */
  ebitdaPerWYr: number;
  /** Derived: undiscounted payback (years); null when EBITDA ≤ 0. */
  paybackYears: number | null;
  /** Derived pre-tax project IRR (%); null when loss-making or off-chart. */
  irrPct: number | null;
  /** True when the IRR is above the model ceiling (shown as ">Nx"). */
  offChart?: boolean;
  /** Cited source(s) for the CapEx / price FACTs. */
  source: string;
  confidence: string;
  note?: string;
}

export interface StageIrrData {
  rows: StageIrrRow[];
  /** Model assumptions, shown beside the chart for transparency. */
  assumptions: string[];
}
