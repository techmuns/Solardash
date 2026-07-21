import {
  getCompaniesSnapshot,
  getCompanyDetail,
  getPriceHistorySnapshot,
  getStageIrrConfigSnapshot,
  getTendersSnapshot,
} from "./index";
import { projectIrr, paybackYears } from "@/lib/finance";
import type { CompanyType } from "./types/companies";
import type { Series } from "./types/core";
import type { StageIrrConfigRow } from "./types/profit-pools";

/**
 * Profit Pools — a render-time selector (like `getWhatsNewFeed`) that derives
 * stage-group profitability from data ALREADY committed in the repo: the listed
 * companies' annual filings. It writes no snapshot of its own, so `data:build`
 * stays byte-identical. Everything here is SOURCED FACT (company filings); the
 * "expanding / squeezed" reading layered on top in the UI is labelled analysis.
 */

/** FY window common to the screener's annual models. */
const FY_START = 20;
const FY_END = 26;

/**
 * Quarterly window (SEBI-LODR quarterly results). Starts where the large
 * reporters' quarterly models begin (Q1 FY24) so the pool isn't a one-company
 * artifact; SME half-yearly rows (`H1FY25`) are excluded — only true quarters
 * feed the higher-frequency view.
 */
const QFY_START = 24;
const QUARTER_RE = /^Q([1-4])FY(\d{2})$/;

/** The two value-chain stage-groups we can evidence from listed financials. */
const STAGE_GROUPS: {
  key: string;
  label: string;
  color: string;
  types: CompanyType[];
}[] = [
  {
    key: "manufacturing",
    label: "Module / cell makers",
    color: "#10B981", // emerald
    types: ["manufacturer", "integrated"],
  },
  {
    key: "generation",
    label: "IPP / generation",
    color: "#6366F1", // indigo
    types: ["ipp"],
  },
];

export interface ProfitPoolGroup {
  key: string;
  label: string;
  color: string;
  /** Constituent company names that contribute to the pool (registry order). */
  companies: string[];
}

export interface ProfitPools {
  /** FY labels (e.g. `FY20`), the x-axis of the margin trends. */
  periods: string[];
  /** Revenue-weighted EBITDA margin (%) per stage-group, FY20→FY26 — FACT. */
  marginByStage: Series[];
  /** Quarter labels (e.g. `Q1FY24`) — the higher-frequency x-axis. */
  quarterPeriods: string[];
  /**
   * Revenue-weighted EBITDA margin (%) per stage-group by quarter — FACT,
   * derived from the same committed filings via their quarterly results.
   */
  marginByStageQuarterly: Series[];
  /** Per-group constituents (for the methodology side panel). */
  groups: ProfitPoolGroup[];
  /** FY26 aggregate listed revenue per group (₹ cr) — the economic-weight proxy. */
  revenuePoolFy26: Record<string, number>;
  /** Filings as-of (the companies snapshot's updatedAt). */
  asOf: string;
}

const fyNum = (period: string) => Number(period.replace(/[^0-9]/g, ""));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Chronological sort key for `QxFYyy` labels (FY first, then quarter). */
const quarterKey = (period: string): number | null => {
  const m = QUARTER_RE.exec(period);
  if (!m) return null;
  return Number(m[2]) * 4 + Number(m[1]);
};

/**
 * Build the profit-pool view from the company registry + per-company detail.
 * Margins are revenue-weighted (Σ EBITDA ÷ Σ revenue across the group's
 * reporters that year) — the aggregate "pool margin", not a simple average —
 * so the big players dominate as they should.
 */
export function getProfitPools(): ProfitPools {
  const snap = getCompaniesSnapshot();
  const registry = snap.data.companies;
  const periods = Array.from({ length: FY_END - FY_START + 1 }, (_, i) => `FY${FY_START + i}`);

  const marginByStage: Series[] = [];
  const marginByStageQuarterly: Series[] = [];
  const groups: ProfitPoolGroup[] = [];
  const revenuePoolFy26: Record<string, number> = {};
  const quarterSet = new Set<string>();

  for (const group of STAGE_GROUPS) {
    const members = registry.filter((c) => group.types.includes(c.type));
    // Σ revenue / Σ ebitda per FY across members reporting both that year.
    const sums = new Map<string, { rev: number; eb: number }>();
    const qSums = new Map<string, { rev: number; eb: number }>();
    const contributing = new Set<string>();

    for (const c of members) {
      const detail = getCompanyDetail(c.slug)?.data;
      const annual = detail?.annual ?? [];
      for (const a of annual) {
        const n = fyNum(a.period);
        if (n < FY_START || n > FY_END) continue;
        if (a.revenue == null || a.ebitda == null) continue;
        const e = sums.get(a.period) ?? { rev: 0, eb: 0 };
        e.rev += a.revenue;
        e.eb += a.ebitda;
        sums.set(a.period, e);
        contributing.add(c.slug);
      }
      for (const q of detail?.quarterly ?? []) {
        const m = QUARTER_RE.exec(q.period);
        if (!m || Number(m[2]) < QFY_START) continue;
        if (q.revenue == null || q.ebitda == null) continue;
        const e = qSums.get(q.period) ?? { rev: 0, eb: 0 };
        e.rev += q.revenue;
        e.eb += q.ebitda;
        qSums.set(q.period, e);
        quarterSet.add(q.period);
      }
    }

    marginByStage.push({
      key: group.key,
      label: group.label,
      unit: "%",
      color: group.color,
      points: periods
        .map((p) => ({ period: p, sum: sums.get(p) }))
        .filter((x): x is { period: string; sum: { rev: number; eb: number } } =>
          Boolean(x.sum && x.sum.rev > 0),
        )
        .map((x) => ({ period: x.period, value: round1((x.sum.eb / x.sum.rev) * 100) })),
    });

    marginByStageQuarterly.push({
      key: group.key,
      label: group.label,
      unit: "%",
      color: group.color,
      points: [...qSums.entries()]
        .filter(([, sum]) => sum.rev > 0)
        .sort(([a], [b]) => (quarterKey(a) ?? 0) - (quarterKey(b) ?? 0))
        .map(([period, sum]) => ({ period, value: round1((sum.eb / sum.rev) * 100) })),
    });

    groups.push({
      key: group.key,
      label: group.label,
      color: group.color,
      companies: members.filter((c) => contributing.has(c.slug)).map((c) => c.name),
    });

    revenuePoolFy26[group.key] = Math.round(sums.get(`FY${FY_END}`)?.rev ?? 0);
  }

  const quarterPeriods = [...quarterSet].sort(
    (a, b) => (quarterKey(a) ?? 0) - (quarterKey(b) ?? 0),
  );

  return {
    periods,
    marginByStage,
    quarterPeriods,
    marginByStageQuarterly,
    groups,
    revenuePoolFy26,
    asOf: snap.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Value chain IRR — computed at render time from the FRESHEST committed data
// ---------------------------------------------------------------------------
//
// The stage IRRs and each company's IRR are derived here (not stored) so they
// always reflect the latest source: the representative price/W comes from the
// most recent month of the price stack, the generation tariff from the tenders
// feed, and every EBITDA margin from the current company registry. Only the
// slow-moving structural inputs (CapEx, utilisation, life, DCR premium and the
// pure-stage margin) are maintained in the committed config snapshot. Because
// the pages are rebuilt on every data refresh, the IRRs recompute automatically
// whenever any of those upstream feeds updates.

export type ValueCaptureStage = "cell" | "module" | "generation";

/** One value-chain stage's greenfield IRR (computed from live + config inputs). */
export interface StageIrr {
  stage: string;
  region: string;
  nodeId?: string;
  capexPerW: number;
  /** Representative price/W — DERIVED from the freshest price / tariff feed. */
  aspPerW: number;
  ebitdaMarginPct: number;
  utilizationPct: number;
  lifeYears: number;
  ebitdaPerWYr: number;
  paybackYears: number | null;
  irrPct: number | null;
  offChart?: boolean;
  source: string;
  confidence: string;
  note?: string;
}

/**
 * One tracked player's value-capture read: the greenfield project IRR of that
 * stage's plant AT THE COMPANY'S own disclosed EBITDA margin (FACT), holding the
 * (freshly-derived) stage price, CapEx, utilisation and life fixed — so margin
 * is the only lever that varies.
 */
export interface CompanyValueCapture {
  slug: string;
  name: string;
  stageKey: ValueCaptureStage;
  stageLabel: string;
  /** Stage name matching the stage-IRR row (for grouping under a stage). */
  stageName: string;
  ebitdaMarginPct: number;
  capexPerW: number;
  aspPerW: number;
  utilizationPct: number;
  lifeYears: number;
  ebitdaPerWYr: number;
  paybackYears: number | null;
  irrPct: number | null;
  offChart?: boolean;
}

const round1c = (n: number) => Math.round(n * 10) / 10;
const round2c = (n: number) => Math.round(n * 100) / 100;

const STAGE_META: Record<ValueCaptureStage, { node: string; label: string; name: string }> = {
  cell: { node: "cell", label: "Cell", name: "Cell" },
  module: { node: "modules", label: "Module", name: "Module" },
  generation: { node: "ipp", label: "IPP", name: "IPP / Generation" },
};

/** Latest value of a price-stack monthly series, in its native unit. */
function latestPrice(series: Series[], key: string): number | null {
  const s = series.find((x) => x.key === key);
  const last = s?.points[s.points.length - 1];
  return last?.value ?? null;
}

/**
 * Derive a stage's representative price/W (₹) from the freshest committed data,
 * per the config row's `priceMode`. Falls back to the maintained
 * `priceFallbackPerW` when the live source is unavailable.
 */
function derivePricePerW(
  cfg: StageIrrConfigRow,
  fx: number,
  priceSeries: Series[],
  latestSolarTariff: number | null,
): number {
  const p = cfg.priceParam ?? 0;
  switch (cfg.priceMode) {
    case "stack:cell": {
      const v = latestPrice(priceSeries, "cell"); // $/W
      return v != null ? v * fx * (p || 1) : cfg.priceFallbackPerW;
    }
    case "stack:module": {
      const v = latestPrice(priceSeries, "module"); // $/W
      return v != null ? v * fx * (p || 1) : cfg.priceFallbackPerW;
    }
    case "stack:poly": {
      const v = latestPrice(priceSeries, "poly"); // $/kg, p = g/W
      return v != null && p ? (v * p) / 1000 * fx : cfg.priceFallbackPerW;
    }
    case "stack:wafer": {
      const v = latestPrice(priceSeries, "wafer"); // $/pc, p = W/piece
      return v != null && p ? (v / p) * fx : cfg.priceFallbackPerW;
    }
    case "tariff": {
      // Annual revenue/W = tariff (₹/kWh) × CUF × 8,760 h ÷ 1,000 (Wh→kWh).
      return latestSolarTariff != null && p
        ? latestSolarTariff * (p / 100) * 8.76
        : cfg.priceFallbackPerW;
    }
    default:
      return cfg.priceFallbackPerW;
  }
}

/** Solve payback + IRR for a per-W CapEx / annual-EBITDA / life triple. */
function irrOf(capexPerW: number, ebitdaPerWYr: number, lifeYears: number) {
  const payback = paybackYears(capexPerW, ebitdaPerWYr);
  const irrFrac = projectIrr(capexPerW, ebitdaPerWYr, lifeYears);
  const recovers = ebitdaPerWYr > 0 && ebitdaPerWYr * lifeYears > capexPerW;
  return {
    paybackYears: payback == null ? null : round1c(payback),
    irrPct: irrFrac == null ? null : round1c(irrFrac * 100),
    offChart: irrFrac == null && recovers,
  };
}

export interface ValueChainIrr {
  stages: StageIrr[];
  companies: CompanyValueCapture[];
  assumptions: string[];
  sources: string[];
  /** Freshest input date across the price / tariff / margin / config feeds. */
  asOf: string;
  /** As-of of each derived-metric source (shown in the methodology dialog). */
  priceAsOf: string;
  tariffAsOf: string;
  marginAsOf: string;
}

/**
 * Build the value-chain IRR view. Stage prices are derived from the latest
 * price stack / tenders tariff and stage/company margins from the current
 * registry, so the model always uses the freshest available source; only the
 * structural inputs come from the committed config.
 */
export function getValueChainIrr(): ValueChainIrr {
  const cfgSnap = getStageIrrConfigSnapshot();
  const { fxInrPerUsd: fx, assumptions } = cfgSnap.data;
  const priceSnap = getPriceHistorySnapshot();
  const tendersSnap = getTendersSnapshot();
  const companiesSnap = getCompaniesSnapshot();

  const priceSeries = priceSnap.data.monthly;
  const solar = tendersSnap.data.tariffByType.find((s) => s.key === "solar");
  const latestSolarTariff = solar?.points[solar.points.length - 1]?.value ?? null;

  // ── Stage IRRs (derived price/tariff + maintained pure-stage margin) ──
  const priceByNode = new Map<string, number>();
  const stages: StageIrr[] = cfgSnap.data.rows.map((cfg) => {
    const aspPerW = round2c(derivePricePerW(cfg, fx, priceSeries, latestSolarTariff));
    if (cfg.nodeId) priceByNode.set(cfg.nodeId, aspPerW);
    const ebitdaPerWYr = aspPerW * (cfg.ebitdaMarginPct / 100) * (cfg.utilizationPct / 100);
    const { paybackYears: pb, irrPct, offChart } = irrOf(
      cfg.capexPerW,
      ebitdaPerWYr,
      cfg.lifeYears,
    );
    return {
      stage: cfg.stage,
      region: cfg.region,
      ...(cfg.nodeId ? { nodeId: cfg.nodeId } : {}),
      capexPerW: cfg.capexPerW,
      aspPerW,
      ebitdaMarginPct: cfg.ebitdaMarginPct,
      utilizationPct: cfg.utilizationPct,
      lifeYears: cfg.lifeYears,
      ebitdaPerWYr: round2c(ebitdaPerWYr),
      paybackYears: pb,
      irrPct,
      ...(offChart ? { offChart: true } : {}),
      source: cfg.source,
      confidence: cfg.confidence,
      ...(cfg.note ? { note: cfg.note } : {}),
    };
  });

  // Config indexed by node id, for the per-company model.
  const cfgByNode = new Map<string, StageIrrConfigRow>();
  for (const c of cfgSnap.data.rows) if (c.nodeId) cfgByNode.set(c.nodeId, c);

  // ── Company IRRs (same derived stage price, each firm's own margin) ──
  const companies: CompanyValueCapture[] = [];
  for (const c of companiesSnap.data.companies) {
    if (c.ebitdaMarginPct == null || c.ebitdaMarginPct <= 0) continue;

    let stageKey: ValueCaptureStage | null = null;
    if (c.type === "manufacturer" || c.type === "integrated") {
      if ((c.cellGw ?? 0) > 0) stageKey = "cell";
      else if ((c.moduleGw ?? 0) > 0) stageKey = "module";
    } else if (c.type === "ipp") {
      stageKey = "generation";
    }
    if (!stageKey) continue;

    const meta = STAGE_META[stageKey];
    const cfg = cfgByNode.get(meta.node);
    const aspPerW = priceByNode.get(meta.node);
    if (!cfg || aspPerW == null) continue;

    const ebitdaPerWYr = aspPerW * (c.ebitdaMarginPct / 100) * (cfg.utilizationPct / 100);
    const { paybackYears: pb, irrPct, offChart } = irrOf(
      cfg.capexPerW,
      ebitdaPerWYr,
      cfg.lifeYears,
    );
    companies.push({
      slug: c.slug,
      name: c.name,
      stageKey,
      stageLabel: meta.label,
      stageName: meta.name,
      ebitdaMarginPct: c.ebitdaMarginPct,
      capexPerW: cfg.capexPerW,
      aspPerW,
      utilizationPct: cfg.utilizationPct,
      lifeYears: cfg.lifeYears,
      ebitdaPerWYr: round2c(ebitdaPerWYr),
      paybackYears: pb,
      irrPct,
      ...(offChart ? { offChart: true } : {}),
    });
  }
  companies.sort(
    (a, b) =>
      Number(b.offChart ?? false) - Number(a.offChart ?? false) ||
      (b.irrPct ?? -999) - (a.irrPct ?? -999) ||
      b.ebitdaMarginPct - a.ebitdaMarginPct,
  );

  const priceAsOf = priceSnap.updatedAt;
  const tariffAsOf = tendersSnap.updatedAt;
  const marginAsOf = companiesSnap.updatedAt;
  const asOf = [priceAsOf, tariffAsOf, marginAsOf, cfgSnap.updatedAt].reduce((m, d) =>
    d > m ? d : m,
  );

  return {
    stages,
    companies,
    assumptions,
    sources: cfgSnap.sources.map((s) => s.name),
    asOf,
    priceAsOf,
    tariffAsOf,
    marginAsOf,
  };
}
