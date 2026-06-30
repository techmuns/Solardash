/**
 * The Trends & Insights pillar is SYNTHESIS — a curated, vetted set of buy-side
 * theses. Every insight is ANALYSIS (rendered with the "Munshot analysis" tag);
 * each is evidenced either by a REUSED live chart (a snapshot series resolved at
 * render) or a CITED stat (source shown). The copy here is fixed — no live
 * recomputation, no fabrication.
 */

export type InsightGroup = "structural" | "anomalies" | "missed";

/** A live snapshot series the card reuses as compact evidence. */
export type SparkKey = "firmShare" | "mfgMargin" | "polyPrice" | "tariff";
export type LinesKey = "cellModule";

export interface EvidenceBar {
  label: string;
  /** Bar magnitude (for width). */
  value: number;
  /** Verbatim cited display (e.g. "−86%", "210"). */
  display: string;
  color: string;
}

/** What compact element evidences the thesis. */
export type Evidence =
  | { kind: "spark"; key: SparkKey; color: string; caption: string }
  | { kind: "lines"; key: LinesKey; caption: string }
  | { kind: "bars"; caption: string; bars: EvidenceBar[] }
  | { kind: "stat"; lines: string[] };

export interface Insight {
  id: string;
  group: InsightGroup;
  /** The thesis headline. */
  thesis: string;
  /** The killer stat, shown big. */
  stat: string;
  statCaption: string;
  /** The one-line "so what for a long-only fund". */
  soWhat: string;
  source: string;
  href: string;
  hrefLabel: string;
  evidence: Evidence;
}

export const INSIGHT_GROUPS: { id: InsightGroup; label: string }[] = [
  { id: "structural", label: "Structural trends" },
  { id: "anomalies", label: "Anomalies" },
  { id: "missed", label: "What most people miss" },
];

export const INSIGHTS: Insight[] = [
  // ── Structural trends ────────────────────────────────────────────────
  {
    id: "t1",
    group: "structural",
    thesis: "The battleground moved from the cheapest MW to the most usable MW.",
    stat: "~90%",
    statCaption:
      "firm / dispatchable (FDRE + RTC + solar-storage) share of central RE awards · 8M-FY26 — a fraction of that in 2023.",
    soWhat:
      "Own firming & storage capability; pure-solar EPC and merchant IPPs are the losing end.",
    source: "CRISIL · IEEFA-JMK · firm tariffs ₹4.25–6.75 vs solar ~₹2.5",
    href: "/tenders",
    hrefLabel: "Tender mix",
    evidence: {
      kind: "spark",
      key: "firmShare",
      color: "#10B981",
      caption: "Firm + storage share of awards — our tender feed (FY26 quarters)",
    },
  },
  {
    id: "t2",
    group: "structural",
    thesis: "India is module self-sufficient but cell-dependent — and that gap IS the value.",
    stat: "119 vs 9 GW",
    statCaption:
      "module vs cell capacity added in 2025; ALMM List-II mandates domestic cells ~Jun 2026; <1.9% of domestic cells reach the open market.",
    soWhat:
      "Cell-integrated players capture the protected margin; standalone assemblers get squeezed.",
    source: "Mercom · CRISIL · Down To Earth",
    href: "/manufacturing",
    hrefLabel: "Manufacturing",
    evidence: { kind: "lines", key: "cellModule", caption: "Cell vs module nameplate, GW (FY21→26)" },
  },
  {
    id: "t3",
    group: "structural",
    thesis: "Indian solar manufacturing re-rated from commodity to profit pool.",
    stat: "3.8% → 22.3%",
    statCaption:
      "manufacturing pool EBITDA margin, FY22 trough → FY26 (7.1% back in FY20).",
    soWhat:
      "Protection + US export turned loss-making assembly into a 20%+ pool — but the re-rating hinges on protection durability.",
    source: "Company filings",
    href: "/profit-pools",
    hrefLabel: "Profit Pools",
    evidence: {
      kind: "spark",
      key: "mfgMargin",
      color: "#10B981",
      caption: "Listed module / cell pool EBITDA margin % (FY20→26)",
    },
  },

  // ── Anomalies ────────────────────────────────────────────────────────
  {
    id: "a1",
    group: "anomalies",
    thesis: "Global PV prices fell below cash cost — yet Indian module margins ROSE.",
    stat: "−88%",
    statCaption:
      "polysilicon $36→$5/kg and Chinese modules at net losses, while Indian makers' EBITDA went 17→19%+ (Premier ~30%).",
    soWhat:
      "Trade walls decoupled Indian margins from the global rout — trade policy, not technology, sets the margin.",
    source: "BNEF · CRISIL · company",
    href: "/profit-pools",
    hrefLabel: "Profit Pools",
    evidence: {
      kind: "spark",
      key: "polyPrice",
      color: "#EA580C",
      caption: "Polysilicon $/kg (2019→2025)",
    },
  },
  {
    id: "a2",
    group: "anomalies",
    thesis: "210 GW of modules, ~58 GW of demand — the glut is exported, the bottleneck is upstream.",
    stat: "3.6×",
    statCaption:
      "module capacity vs domestic demand; cell capacity is only ~30 GW.",
    soWhat:
      "The US export window absorbs the glut and drives margin; the real chokepoint moved to cells — a US-policy reversal would expose it.",
    source: "Mercom · Wood Mackenzie",
    href: "/manufacturing",
    hrefLabel: "Manufacturing",
    evidence: {
      kind: "bars",
      caption: "GW · capacity vs demand (cited)",
      bars: [
        { label: "Module cap.", value: 210, display: "210", color: "#2563EB" },
        { label: "Demand", value: 58, display: "58", color: "#94A3B8" },
        { label: "Cell cap.", value: 30, display: "30", color: "#F59E0B" },
      ],
    },
  },
  {
    id: "a3",
    group: "anomalies",
    thesis: "Module costs fell 57% — solar tariffs fell roughly zero.",
    stat: "−57% vs +8.5%",
    statCaption:
      "ICRA: module prices vs avg solar tariff (₹2.3→₹2.5) — the windfall was competed away.",
    soWhat:
      "The saving went to offtakers and aggressive bids, compressing IRRs 14→12% — the engine of thinning pure-solar returns.",
    source: "ICRA",
    href: "/tenders",
    hrefLabel: "Tariff history",
    evidence: {
      kind: "spark",
      key: "tariff",
      color: "#EC4899",
      caption: "Lowest solar tariff ₹/kWh (by year)",
    },
  },

  // ── What most people miss ────────────────────────────────────────────
  {
    id: "m1",
    group: "missed",
    thesis: "BESS deployment is exploding; BESS profitability is unproven.",
    stat: "−86% vs −36%",
    statCaption:
      "standalone BESS tariff (₹10.83L→₹1.48L/MW/mo) vs pack-cost decline; IEEFA-JMK flag ~75% of 2025 awards as viability-risky.",
    soWhat:
      "Don't conflate the storage VOLUME boom with a storage PROFIT pool — economics are being competed away faster than costs fall.",
    source: "Mercom · IEEFA-JMK",
    href: "/profit-pools",
    hrefLabel: "Profit Pools",
    evidence: {
      kind: "bars",
      caption: "fall since 2023 · tariff vs pack cost (cited)",
      bars: [
        { label: "Tariff", value: 86, display: "−86%", color: "#EF4444" },
        { label: "Pack cost", value: 36, display: "−36%", color: "#94A3B8" },
      ],
    },
  },
  {
    id: "m2",
    group: "missed",
    thesis: "The ceiling on solar isn't panels or tariffs — it's DISCOM credit.",
    stat: "17–18 mo",
    statCaption:
      "RE developers' payment wait in AP/TN; counterparty risk adds ~107 bps to RE cost of debt.",
    soWhat:
      "The binding constraint is offtake credit — favour SECI / NTPC-intermediated and C&I-exposed developers; weak-DISCOM exposure is the hidden risk.",
    source: "CEEW · IEEFA · CPI · Mercom",
    href: "/developers",
    hrefLabel: "IPPs",
    evidence: {
      kind: "stat",
      lines: [
        "From Apr 2026, SECI becomes the sole central RE procurer",
        "C&I open access +77% (2024) — the credit-quality escape valve",
        "+107 bps RE cost-of-debt from counterparty risk",
      ],
    },
  },
  {
    id: "m3",
    group: "missed",
    thesis: "A chunk of Indian manufacturing's profit belongs to US trade policy.",
    stat: "+40–60%",
    statCaption:
      "margin premium to Indian module exporters from US anti-dumping on China / SE Asia; First Solar 39–44% GM on IRA.",
    soWhat:
      "Part of Indian module profitability is a function of US tariffs / IRA — a geopolitical dependency that can reverse. Watch US trade policy.",
    source: "company · IEEFA",
    href: "/profit-pools",
    hrefLabel: "Profit Pools",
    evidence: {
      kind: "bars",
      caption: "module margin % · India vs US (stage-economics)",
      bars: [
        { label: "India", value: 18, display: "18%", color: "#10B981" },
        { label: "US", value: 41, display: "41%", color: "#10B981" },
      ],
    },
  },
];
