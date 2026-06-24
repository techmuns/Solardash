import type { Confidence, Kpi } from "./core";
import type { TenderType } from "./tenders";

/** A developer / IPP portfolio entry. */
export interface Developer {
  name: string;
  operationalGw: number;
  underConstructionGw: number;
  pipelineGw: number;
  targetGw: number;
  targetYear: string;
  /** Technology split of the operational portfolio (GW; BESS in GWh). */
  mix: {
    solar: number;
    wind: number;
    hybrid: number;
    fdre: number;
    bessGwh: number;
  };
  /** GW under signed PPAs (derived from the PPA tracker). */
  ppaSignedGw?: number;
  confidence: Confidence;
  sourceNote?: string;
}

/** A PPA / PSA signing record. */
export interface PpaRecord {
  id: string;
  date: string;
  period: string;
  developer: string;
  agency: string;
  tenderType: TenderType;
  capacityMw: number;
  tariffRs?: number;
  confidence: Confidence;
  sourceNote?: string;
  /** Per-signing source link (from the feed's `source_url`). */
  sourceUrl?: string;
}

/** Per-developer capacity funnel, arrays aligned to `categories`. */
export interface CapacityFunnel {
  categories: string[];
  operational: number[];
  underConstruction: number[];
  pipeline: number[];
}

/** National PPA funnel: one row per stage, split by tech. */
export interface NationalFunnelStage {
  stage: string;
  solarGw: number;
  windGw: number;
}

/** Aggregate portfolio-mix entry (GW + share across all developers). */
export interface PortfolioMixEntry {
  key: TenderType;
  gw: number;
  /** Share of total GW, 0–1. */
  share: number;
}

/** Payload of the developers `portfolio` snapshot. */
export interface DevelopersData {
  kpis: Kpi[];
  /** Roster sorted by operational GW desc. */
  roster: Developer[];
  /** Per-developer operational / UC / pipeline funnel (by total portfolio). */
  capacityFunnel: CapacityFunnel;
  /** National LOA → PPA → Executed → Balance funnel. */
  nationalFunnel: NationalFunnelStage[];
  /** Aggregate tech mix across all developers (BESS excluded — it's GWh). */
  portfolioMix: PortfolioMixEntry[];
  /** Total BESS across portfolios, GWh (shown separately from the GW mix). */
  bessGwh: number;
  /** PPA / PSA signings, newest first. */
  ppaTracker: PpaRecord[];
}
