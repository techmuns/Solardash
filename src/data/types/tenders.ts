import type { Confidence, Series } from "./core";

/**
 * Tender / auction contract types. These map 1:1 to `ENERGY_COLORS`
 * (src/lib/colors.ts) so every chart colours them consistently.
 */
export type TenderType =
  | "solar"
  | "wind"
  | "hybrid"
  | "fdre"
  | "rtc"
  | "solar-bess"
  | "bess"
  | "peak";

/** A winning developer in an auction (capacity attribution is user-maintained). */
export interface AwardWinner {
  developer: string;
  mw?: number;
  tariffRs?: number;
}

/** One atomic awarded-auction record (the maintained `auctions.csv` feed). */
export interface AwardRecord {
  id: string;
  period: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  agency: string;
  tenderType: TenderType;
  capacityMw: number;
  storageMwh?: number;
  /** Winning tariff, ₹/kWh. Absent for standalone BESS (capacity charge). */
  tariffRs?: number;
  /** Ceiling tariff, ₹/kWh. */
  ceilingRs?: number;
  winners?: AwardWinner[];
  state?: string;
  status: string;
  confidence: Confidence;
  sourceNote?: string;
  /** Per-award source link (from the feed's `source_url`). */
  sourceUrl?: string;
}

/** A headline KPI for the tenders page. */
export interface TenderKpi {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  confidence: Confidence;
  hint?: string;
}

export interface AgencySplit {
  agency: string;
  mw: number;
}

export interface TypeMixEntry {
  type: TenderType;
  mw: number;
  /** Share of trailing-window MW, 0–1. */
  share: number;
}

/** The trailing window that the KPIs / mix / leaderboard are computed over. */
export interface TenderWindow {
  /** Short label, e.g. `TTM · trailing 4 quarters`. */
  label: string;
  /** Fiscal quarters in the window, chronological (e.g. `Q2FY26`…`Q1FY27`). */
  quarters: string[];
  firstQuarter: string;
  lastQuarter: string;
  /** ISO date span actually covered by the window's auctions. */
  startDate: string;
  endDate: string;
}

export interface DeveloperStanding {
  developer: string;
  mw: number;
  auctions: number;
  /** Capacity-weighted average winning tariff, ₹/kWh (excl. standalone BESS). */
  avgTariffRs?: number;
}

/** Payload of the tenders `awards` snapshot. */
export interface TendersData {
  /** Latest period covered, e.g. `Q3FY26`. */
  asOfPeriod: string;
  /** The trailing window KPIs / mix / leaderboard are computed over. */
  window: TenderWindow;
  kpis: TenderKpi[];
  /** MW awarded per quarter, one Series per tender type (stacked). */
  awardsByQuarter: Series[];
  /** MW awarded per calendar month, one Series per tender type (stacked). */
  awardsByMonth: Series[];
  /** Capacity-weighted avg ₹/unit per quarter, one Series per type (excl. BESS). */
  tariffByType: Series[];
  /** Lowest discovered solar tariff by calendar year, ₹/kWh (long-run trend). */
  tariffHistory: Series[];
  /** Total MW awarded per agency (whole feed). */
  agencySplit: AgencySplit[];
  /** MW + share per type over the trailing window. */
  typeMix: TypeMixEntry[];
  /** Developer standings over the trailing window. */
  developerLeaderboard: DeveloperStanding[];
  /** Atomic award records, most-recent first. */
  recentAwards: AwardRecord[];
}
