import type { Confidence, Kpi, Series, Unit } from "./core";

/** A cell manufacturer (capacity + modelled production). */
export interface CellPlayer {
  player: string;
  nameplateGw: number;
  almm2Gw: number;
  productionGw?: number;
  utilizationPct?: number;
  confidence: Confidence;
  note?: string;
}

/** A module manufacturer (ALMM List-I capacity). */
export interface ModulePlayer {
  player: string;
  almm1Gw: number;
  confidence: Confidence;
  note?: string;
}

/** One stacked series (a player) in the quarterly cell-production view. */
export interface QuarterlySeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/** Modelled quarterly cell production, players stacked across quarters. */
export interface CellQuarterly {
  categories: string[];
  series: QuarterlySeries[];
}

export interface SupplyDemandSegment {
  segment: string;
  capacityFy26: number;
  capacityFy28: number;
  demandFy26: number;
  demandFy28: number;
}

export interface WaferPoint {
  period: string;
  demandGw: number;
  supplyGw: number;
}

export interface AlmmPhase {
  phase: string;
  scope: string;
  effectiveDate: string;
  status: string;
  confidence: Confidence;
}

export interface EconomicsMetric {
  metric: string;
  value: number;
  unit: Unit;
  confidence: Confidence;
  note?: string;
}

/** A PLI (Production-Linked Incentive) awardee — supported solar capacity. */
export interface PliAwardee {
  company: string;
  capacityGw: number;
  confidence: Confidence;
}

/** Payload of the manufacturing `value-chain` snapshot. */
export interface ManufacturingData {
  kpis: Kpi[];
  cellPlayers: CellPlayer[];
  modulePlayers: ModulePlayer[];
  /** Modelled quarterly cell production (top players + Others). */
  cellQuarterly: CellQuarterly;
  /** Module demand split DCR vs non-DCR (FY26–28). */
  moduleDemand: Series[];
  /** Cell production trajectory: existing + new (FY26–28). */
  cellTrajectory: Series[];
  supplyDemand: SupplyDemandSegment[];
  wafer: WaferPoint[];
  almmTimeline: AlmmPhase[];
  economics: EconomicsMetric[];
  /** PLI Tranche I+II awardees (GW of supported capacity). */
  pliAwardees: PliAwardee[];
}
