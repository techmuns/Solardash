import type { Series, SourceRef, Unit } from "./core";

/** A single headline KPI on the Overview page (per-metric provenance). */
export interface OverviewKpi {
  key: string;
  label: string;
  value: number;
  unit: Unit;
  /** Per-KPI source — drives the card's source label + ConfidenceBadge. */
  source: SourceRef;
}

/** Payload of the Overview `summary` snapshot. */
export interface OverviewSummary {
  kpis: OverviewKpi[];
  /** Quarterly RE capacity additions, one Series per source (stacked). */
  reAdditions: Series[];
}
