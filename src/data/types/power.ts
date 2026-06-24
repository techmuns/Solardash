import type { Confidence, Kpi, Series, Unit } from "./core";

// ---------------------------------------------------------------------------
// Capacity & Generation
// ---------------------------------------------------------------------------

/** One stacked series (a source) in the quarterly commissioning view. */
export interface CommissioningSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export interface CommissioningQuarterly {
  categories: string[];
  series: CommissioningSeries[];
}

export interface InstalledMixEntry {
  source: string;
  capacityGw: number;
  /** Share of total installed, 0–1. */
  share: number;
}

export interface StateSolar {
  state: string;
  solarGw: number;
}

export interface CapacityMetric {
  metric: string;
  value: number;
  unit: Unit;
  confidence: Confidence;
  note?: string;
}

export interface CapacityData {
  kpis: Kpi[];
  /** GW added per financial year, one series per source (stacked + total). */
  commissioningQuarterly: CommissioningQuarterly;
  /** Cumulative installed capacity mix (latest). */
  installedMix: InstalledMixEntry[];
  /** Annual solar additions by segment (utility / OA / rooftop / KUSUM). */
  solarSegments: Series[];
  /** Installed solar by state (Others appended last). */
  stateSolar: StateSolar[];
  /** RE share of generation trend. */
  reShareTrend: Series[];
  /** Cumulative installed solar GW by FY (the long-run S-curve to 150 GW). */
  installedHistory: Series[];
  metrics: CapacityMetric[];
}

// ---------------------------------------------------------------------------
// Power Demand
// ---------------------------------------------------------------------------

/** YoY growth for an aggregated period (quarter or financial year). */
export interface GrowthRow {
  period: string;
  peakYoyPct: number;
  energyYoyPct: number;
}

export interface DemandDriver {
  driver: string;
  valueGw: number;
  horizon: string;
  confidence: Confidence;
  note?: string;
}

export interface DemandData {
  kpis: Kpi[];
  /** Month labels (e.g. `2026-01`), aligned to the arrays below. */
  months: string[];
  peakGw: number[];
  /** Energy met (BU); null where not published (the series is sparse). */
  energyBu: (number | null)[];
  /** Per-month YoY% vs the same month a year earlier; null when no pair exists. */
  peakGrowthYoy: (number | null)[];
  energyGrowthYoy: (number | null)[];
  /** YoY growth for months with a same-month prior-year counterpart. */
  growth: GrowthRow[];
  drivers: DemandDriver[];
}
