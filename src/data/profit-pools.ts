import { getCompaniesSnapshot, getCompanyDetail, getStageIrrSnapshot } from "./index";
import { projectIrr, paybackYears } from "@/lib/finance";
import type { CompanyType } from "./types/companies";
import type { Series } from "./types/core";
import type { StageIrrRow } from "./types/profit-pools";

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
// Company value-capture — greenfield IRR at each maker's disclosed margin
// ---------------------------------------------------------------------------

/**
 * One tracked manufacturer's value-capture read: the greenfield project IRR you
 * would earn building that stage's plant AT THE COMPANY'S disclosed EBITDA
 * margin (the FACT), holding the stage's CapEx, price, utilisation and asset
 * life at their representative (modelled) values. It isolates margin — the one
 * lever that varies company-to-company — as the driver of who captures value.
 */
export type ValueCaptureStage = "cell" | "module" | "generation";

export interface CompanyValueCapture {
  slug: string;
  name: string;
  /** Which stage's economics apply (cell / module / generation). */
  stageKey: ValueCaptureStage;
  stageLabel: string;
  /** Stage name matching the stage-IRR row (for grouping under a stage). */
  stageName: string;
  /** Disclosed company EBITDA margin (%) — FACT. */
  ebitdaMarginPct: number;
  /** Stage CapEx, ₹/W of annual capacity (model). */
  capexPerW: number;
  /** Stage representative price, ₹/W (model). */
  aspPerW: number;
  utilizationPct: number;
  lifeYears: number;
  /** Annual EBITDA cash at the company's margin, ₹/W. */
  ebitdaPerWYr: number;
  paybackYears: number | null;
  /** Greenfield IRR at the company's margin (%) — Munshot analysis. */
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

/**
 * Value-capture across the listed players: apply each stage's greenfield model
 * at the company's OWN disclosed EBITDA margin (FACT), holding CapEx / price /
 * utilisation / life at the stage's representative (modelled) values — so margin
 * is the only lever that varies. Cell-line makers (with `cellGw`) read on cell
 * economics — the scarce, protected profit centre; module-only makers on module
 * economics; IPPs on the 25-yr generation model. EPCs are asset-light (no
 * capex-IRR). Diversified IPPs' blended margins understate a pure-solar IRR.
 */
export function getCompanyValueCapture(): {
  rows: CompanyValueCapture[];
  asOf: string;
} {
  const irr = getStageIrrSnapshot();
  const byNode = new Map<string, StageIrrRow>();
  for (const r of irr.data.rows) if (r.nodeId) byNode.set(r.nodeId, r);

  const registry = getCompaniesSnapshot().data.companies;
  const rows: CompanyValueCapture[] = [];

  for (const c of registry) {
    if (c.ebitdaMarginPct == null || c.ebitdaMarginPct <= 0) continue;

    // Map the company to the value-chain stage whose economics it captures.
    let stageKey: ValueCaptureStage | null = null;
    if (c.type === "manufacturer" || c.type === "integrated") {
      if ((c.cellGw ?? 0) > 0) stageKey = "cell";
      else if ((c.moduleGw ?? 0) > 0) stageKey = "module";
    } else if (c.type === "ipp") {
      stageKey = "generation";
    }
    if (!stageKey) continue;

    const meta = STAGE_META[stageKey];
    const model = byNode.get(meta.node);
    if (!model) continue;

    const ebitdaPerWYr =
      model.aspPerW * (c.ebitdaMarginPct / 100) * (model.utilizationPct / 100);
    const payback = paybackYears(model.capexPerW, ebitdaPerWYr);
    const irrFrac = projectIrr(model.capexPerW, ebitdaPerWYr, model.lifeYears);
    const recovers = ebitdaPerWYr > 0 && ebitdaPerWYr * model.lifeYears > model.capexPerW;

    rows.push({
      slug: c.slug,
      name: c.name,
      stageKey,
      stageLabel: meta.label,
      stageName: meta.name,
      ebitdaMarginPct: c.ebitdaMarginPct,
      capexPerW: model.capexPerW,
      aspPerW: model.aspPerW,
      utilizationPct: model.utilizationPct,
      lifeYears: model.lifeYears,
      ebitdaPerWYr: round2c(ebitdaPerWYr),
      paybackYears: payback == null ? null : round1c(payback),
      irrPct: irrFrac == null ? null : round1c(irrFrac * 100),
      ...(irrFrac == null && recovers ? { offChart: true } : {}),
    });
  }

  // Best value-capture first (off-chart at the top, then by IRR, then margin).
  rows.sort(
    (a, b) =>
      Number(b.offChart ?? false) - Number(a.offChart ?? false) ||
      (b.irrPct ?? -999) - (a.irrPct ?? -999) ||
      b.ebitdaMarginPct - a.ebitdaMarginPct,
  );

  return { rows, asOf: irr.updatedAt };
}
