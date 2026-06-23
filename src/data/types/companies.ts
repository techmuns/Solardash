import type { Confidence } from "./core";

export type CompanyType = "manufacturer" | "integrated" | "ipp";

/** Registry-level identity + headline metrics (powers the screener). */
export interface CompanyIdentity {
  slug: string;
  name: string;
  tickerNse?: string;
  tickerBse?: string;
  type: CompanyType;
  moduleGw?: number;
  cellGw?: number;
  orderBookCr?: number;
  orderBookGw?: number;
  technology?: string;
  revenueFy26Cr?: number;
  ebitdaMarginPct?: number;
  patFy26Cr?: number;
  peX?: number;
  evEbitdaX?: number;
  targetPrice?: number;
  cmp?: number;
  rating?: string;
  confidence: Confidence;
  sourceNote?: string;
}

/** Annual financials (₹ crore unless noted). */
export interface AnnualRow {
  period: string;
  revenue?: number;
  ebitda?: number;
  ebitdaMarginPct?: number;
  pat?: number;
  grossMarginPct?: number;
  roePct?: number;
  rocePct?: number;
  capex?: number;
  netDebt?: number;
  epsRs?: number;
  wcDays?: number;
}

/** Quarterly financials (₹ crore). */
export interface QuarterRow {
  period: string;
  revenue?: number;
  ebitda?: number;
  ebitdaMarginPct?: number;
  pat?: number;
  patMarginPct?: number;
}

export interface Valuation {
  peX?: number;
  evEbitdaX?: number;
  pbX?: number;
  targetPrice?: number;
  upsidePct?: number;
  rating?: string;
  methodology?: string;
  asOf?: string;
}

export interface OrderMixEntry {
  segment: string;
  sharePct: number;
}

export interface Operating {
  realisationRsPerWp?: number;
  ebitdaRsPerWp?: number;
  utilizationPct?: number;
  orderBookGw?: number;
  orderBookCr?: number;
  bookToBill?: number;
  dcrSharePct?: number;
  exportSharePct?: number;
  orderMix?: OrderMixEntry[];
}

export interface Shareholding {
  promoterPct?: number;
  fiiPct?: number;
  diiPct?: number;
  mfPct?: number;
  publicPct?: number;
  asOf?: string;
}

/** Full per-company model — registry identity + optional rich detail. */
export interface CompanyDetail extends CompanyIdentity {
  description?: string;
  annual?: AnnualRow[];
  quarterly?: QuarterRow[];
  valuation?: Valuation;
  operating?: Operating;
  shareholding?: Shareholding;
  highlights?: string[];
  /** True when a rich per-company detail JSON was merged in. */
  hasDetail: boolean;
}

/** Screener payload — the full registry of companies. */
export interface CompaniesData {
  companies: CompanyIdentity[];
  asOf: string;
}
