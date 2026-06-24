import type { Confidence, Kpi, Unit } from "./core";

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
