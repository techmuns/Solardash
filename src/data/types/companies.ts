import type { Confidence } from "./core";

export type CompanyType =
  | "manufacturer"
  | "integrated"
  | "ipp"
  | "epc"
  | "wind"
  | "utility";

/** Registry-level identity + headline metrics (powers the screener). */
export interface CompanyIdentity {
  slug: string;
  name: string;
  tickerNse?: string;
  tickerBse?: string;
  type: CompanyType;
  /** Listing venue, e.g. "NSE", "BSE", "NSE SME", "BSE SME", "US". Drives the SME tag. */
  board?: string;
  /** Approx. market capitalisation, ₹ crore (registry seed / refreshed). */
  marketCapCr?: number;
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

/** Insights distilled from a company's most recent earnings / analyst call. */
export interface Concall {
  /** Fiscal quarter of the call, e.g. "Q4 FY26". */
  quarter: string;
  /** ISO date the call was held, when known. */
  date?: string;
  /** Key takeaways / interesting points from the call. */
  insights: string[];
  /** Forward-looking management guidance (targets, capacity, margins). */
  guidance?: string[];
  /** How/when management expects to execute the current order book. */
  orderExecution?: string;
  /** Provenance note (transcript / results call / investor deck). */
  source?: string;
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
  /** Latest earnings-call insights (maintained feed). */
  concall?: Concall;
  /** True when a rich per-company detail JSON was merged in. */
  hasDetail: boolean;
}

/** Screener payload — the full registry of companies. */
export interface CompaniesData {
  companies: CompanyIdentity[];
  asOf: string;
}
