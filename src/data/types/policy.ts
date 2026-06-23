import type { Confidence, Kpi, Series, Unit } from "./core";

export interface Scheme {
  scheme: string;
  category: string;
  target: string;
  status: string;
  allocationCr?: number;
  keyMetric: string;
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

export interface LocalisationWave {
  wave: string;
  period: string;
  scope: string;
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
  localisationWaves: LocalisationWave[];
  /** BESS pack cost curve, $/kWh by year (one Series). */
  bessCostCurve: Series[];
  prices: PriceItem[];
  /** Manufacturing TAM, one Series per segment (₹'000 cr), stacked by period. */
  tam: Series[];
}
