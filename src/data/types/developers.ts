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

/** Status of a capacity tranche against its guided commissioning date. */
export type CommissioningStatus =
  | "commissioned"
  | "on-track"
  | "delayed"
  | "at-risk";

/**
 * A single dated guidance statement about when a capacity tranche will be
 * commissioned — captured from a specific concall / investor disclosure. The
 * sequence of these is what lets us detect slippage (a target pushed out).
 */
export interface GuidanceStatement {
  /** ISO date of the disclosure that stated this target. */
  statedOn: string;
  /** Human label of the disclosure, e.g. `Q2 FY26 concall`. */
  concall: string;
  /** Guided commissioning period as an FY-quarter, e.g. `Q4FY26`. */
  targetPeriod: string;
  status: CommissioningStatus;
  /** Link to the disclosure supporting this statement. */
  sourceUrl?: string;
}

/**
 * A capacity tranche an IPP has given commissioning guidance for, with its full
 * revision `history`. `slipQuarters` and the `original`/`current` targets are
 * derived from that history so the UI can show "was Q2 FY26, now Q4 FY26 (+2Q)".
 */
export interface CommissioningTranche {
  id: string;
  /** The entity giving guidance — an IPP for the power pipeline, a maker for the
   *  cell-manufacturing timeline. */
  developer: string;
  /** Project / tranche name, e.g. `Khavda solar — Phase III`. */
  project: string;
  /** Technology / stage tag (a TenderType like `solar`/`bess`, or `cell`).
   *  BESS capacity is expressed in GWh, everything else in GW. */
  tech: string;
  /** Headline capacity (GW; GWh when `tech` is `bess`). */
  capacityGw: number;
  /** Guidance statements, oldest first (at least one). */
  history: GuidanceStatement[];
  /** First guided commissioning period (`history[0]`). */
  originalTarget: string;
  /** Latest guided commissioning period (last of `history`). */
  currentTarget: string;
  /** Latest status. */
  status: CommissioningStatus;
  /** Quarters of slippage: currentTarget − originalTarget (0 = on original plan, <0 = pulled forward). */
  slipQuarters: number;
  confidence: Confidence;
  sourceNote?: string;
  /** Latest per-tranche source link. */
  sourceUrl?: string;
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
  /** Aggregate tech mix across all developers (BESS excluded — it's GWh). */
  portfolioMix: PortfolioMixEntry[];
  /** Total BESS across portfolios, GWh (shown separately from the GW mix). */
  bessGwh: number;
  /** PPA / PSA signings, newest first. */
  ppaTracker: PpaRecord[];
  /**
   * Capacity tranches with commissioning-date guidance & revision history,
   * sorted by current target (earliest first). Drives the commissioning timeline.
   */
  commissioning: CommissioningTranche[];
}
