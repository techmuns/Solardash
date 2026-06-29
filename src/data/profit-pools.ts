import { getCompaniesSnapshot, getCompanyDetail } from "./index";
import type { CompanyType } from "./types/companies";
import type { Series } from "./types/core";

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
  /** Per-group constituents (for the methodology side panel). */
  groups: ProfitPoolGroup[];
  /** FY26 aggregate listed revenue per group (₹ cr) — the economic-weight proxy. */
  revenuePoolFy26: Record<string, number>;
  /** Filings as-of (the companies snapshot's updatedAt). */
  asOf: string;
}

const fyNum = (period: string) => Number(period.replace(/[^0-9]/g, ""));
const round1 = (n: number) => Math.round(n * 10) / 10;

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
  const groups: ProfitPoolGroup[] = [];
  const revenuePoolFy26: Record<string, number> = {};

  for (const group of STAGE_GROUPS) {
    const members = registry.filter((c) => group.types.includes(c.type));
    // Σ revenue / Σ ebitda per FY across members reporting both that year.
    const sums = new Map<string, { rev: number; eb: number }>();
    const contributing = new Set<string>();

    for (const c of members) {
      const annual = getCompanyDetail(c.slug)?.data.annual ?? [];
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

    groups.push({
      key: group.key,
      label: group.label,
      color: group.color,
      companies: members.filter((c) => contributing.has(c.slug)).map((c) => c.name),
    });

    revenuePoolFy26[group.key] = Math.round(sums.get(`FY${FY_END}`)?.rev ?? 0);
  }

  return {
    periods,
    marginByStage,
    groups,
    revenuePoolFy26,
    asOf: snap.updatedAt,
  };
}
