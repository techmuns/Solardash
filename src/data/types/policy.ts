import type { Confidence, Kpi, Unit } from "./core";

export interface Scheme {
  scheme: string;
  category: string;
  target: string;
  status: string;
  allocationCr?: number;
  keyMetric: string;
  /** Month & year the scheme was announced/notified, e.g. "Feb 2024". */
  announced?: string;
  /** One-line summary of the scheme's main lever. */
  highlights?: string;
  /** Official source (MNRE / PIB / CBIC / portal) link. */
  sourceUrl?: string;
  confidence: Confidence;
  note?: string;
}

export interface PmSuryaGharMetric {
  metric: string;
  value: number;
  unit: Unit;
  confidence: Confidence;
}

export interface KusumComponent {
  component: string;
  scope: string;
  targetGw: number;
  executedGw: number;
  confidence: Confidence;
}

export interface PriceItem {
  item: string;
  value: number;
  unit: Unit;
  confidence: Confidence;
  note?: string;
}

export interface PolicyData {
  kpis: Kpi[];
  schemes: Scheme[];
  pmSuryaGhar: PmSuryaGharMetric[];
  kusum: KusumComponent[];
  prices: PriceItem[];
}
