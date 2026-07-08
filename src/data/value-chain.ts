/**
 * The solar value chain as a curated, report-sourced map config — "where money
 * is made & lost". Stages flow down the manufacturing column and up the
 * deployment column; profit-pool HEAT colours each, China import-dependence and
 * capacity are shown per stage, and listed players link to their company pages.
 *
 * FACT source: Munshot India Solar Sector research (June 2026) — MNRE · CEA ·
 * Mercom · JMK · IEEFA · BNEF · SMM · company FY26 filings. Figures are
 * indicative (nameplate / ALMM / operational differ); ASPs are volatile.
 */

export const VC_SOURCE =
  "Munshot research, Jun 2026 · MNRE · Mercom · JMK · IEEFA · BNEF · SMM · company filings";

/** Profit-pool heat — drives each stage's accent colour. */
export type Heat = "loss" | "thin" | "mod" | "fat" | "regulated" | "offtake";

export const HEAT_COLOR: Record<Heat, string> = {
  loss: "#EF4444", // red — below cash cost
  thin: "#94A3B8", // slate — commoditised / fixed
  mod: "#F59E0B", // amber — moderate
  fat: "#10B981", // emerald — expanding / high
  regulated: "#3B82F6", // blue — regulated returns
  offtake: "#8B5CF6", // violet — offtake/credit risk
};

export interface VcPlayer {
  name: string;
  /** Company-page slug when listed & tracked; else a plain chip. */
  slug?: string;
}

export interface VcStage {
  id: string;
  num: number;
  name: string;
  column: "mfg" | "deploy";
  /** Capacity headline, e.g. "~27 GW". */
  capacity?: string;
  heat: Heat;
  /** Short status, e.g. "LOSS · glut" / "FAT ~30%". */
  statusLabel: string;
  /** One-line margin read. */
  margin: string;
  /** India import-dependence on China (%), upstream stages only. */
  cnDependence?: number;
  players: VcPlayer[];
  /** Drill target (a detail tab). */
  href: string;
  /** One-line "what happens here". */
  desc: string;
  /** Policy gate that sits between this stage and the next. */
  gate?: string;
  /** Highlight (the cell profit centre). */
  emphasis?: boolean;
}

export interface VcCallout {
  id: string;
  kind: "warning" | "danger" | "positive";
  title: string;
  stat: string;
  detail: string;
  href: string;
}

export interface VcAsp {
  label: string;
  /** $/W. */
  value: number;
  display: string;
  note?: string;
  /** The policy-protected domestic premium. */
  premium?: boolean;
}

export interface VcKeyStat {
  label: string;
  value: string;
  hint: string;
}

const P = {
  waaree: { name: "Waaree", slug: "waaree-energies" },
  premier: { name: "Premier", slug: "premier-energies" },
  vikram: { name: "Vikram", slug: "vikram-solar" },
  websol: { name: "Websol", slug: "websol-energy" },
  adaniGreen: { name: "Adani Green", slug: "adani-green" },
  ntpcGreen: { name: "NTPC Green", slug: "ntpc-green" },
  jsw: { name: "JSW Energy", slug: "jsw-energy" },
  tata: { name: "Tata Power", slug: "tata-power" },
  acme: { name: "ACME Solar", slug: "acme-solar" },
} as const;

/** Manufacturing column — make the panel (flows downstream). */
export const VC_MFG: VcStage[] = [
  {
    id: "polysilicon",
    num: 1,
    name: "Polysilicon",
    column: "mfg",
    capacity: "~3.3 GW",
    heat: "loss",
    statusLabel: "LOSS · glut",
    margin: "Below cash cost globally",
    cnDependence: 100,
    players: [{ name: "Adani Ent." }, { name: "Reliance" }],
    href: "/manufacturing",
    desc: "Feedstock — ~100% imported. PLI-built; ₹0 disbursed.",
    gate: "PLI ₹24,000 cr · ₹0 disbursed",
  },
  {
    id: "wafer",
    num: 2,
    name: "Ingots & Wafers",
    column: "mfg",
    capacity: "~5.3 GW",
    heat: "thin",
    statusLabel: "THIN · imports",
    margin: "Thin / negative",
    cnDependence: 98,
    players: [{ name: "Adani Ent." }, { name: "Reliance" }, P.premier],
    href: "/manufacturing",
    desc: "Crystallise & slice — the weakest link.",
    gate: "ALMM List-III (wafers) — Jun 2028",
  },
  {
    id: "cell",
    num: 3,
    name: "Cells",
    column: "mfg",
    capacity: "~27 GW",
    heat: "fat",
    statusLabel: "FAT ~30%",
    margin: "Expanding — the new profit centre",
    cnDependence: 75,
    players: [P.waaree, P.premier, P.websol],
    href: "/manufacturing",
    desc: "TOPCon-shifting. THE bottleneck. Capex ₹550–600 cr/GW.",
    gate: "★ ALMM List-II (cells) — LIVE 1 Jun 2026",
    emphasis: true,
  },
  {
    id: "module",
    num: 4,
    name: "Modules",
    column: "mfg",
    capacity: "~210 GW",
    heat: "mod",
    statusLabel: "8% pure · ~15% integ",
    margin: "Squeezed · ~40–45% utilisation",
    cnDependence: 8,
    players: [P.waaree, P.premier, P.vikram],
    href: "/manufacturing",
    desc: "Commoditised & overbuilt. ALMM List-I gates demand.",
    gate: "ALMM List-I (modules) · DCR",
  },
  {
    id: "bos",
    num: 5,
    name: "Balance of System",
    column: "mfg",
    capacity: "Inverters · trackers",
    heat: "thin",
    statusLabel: "THIN-MOD",
    margin: "Inverters still China-led",
    players: [{ name: "Sungrow" }, { name: "Huawei" }, P.waaree],
    href: "/manufacturing",
    desc: "Inverters Chinese-dominated; trackers / mounting low-margin.",
  },
];

/** Deployment column — build & sell the power (flows upstream / ₹ down). */
export const VC_DEPLOY: VcStage[] = [
  {
    id: "epc",
    num: 6,
    name: "EPC",
    column: "deploy",
    capacity: "Engineer · procure · construct",
    heat: "thin",
    statusLabel: "THIN ~5%",
    margin: "Thin fixed margins",
    players: [{ name: "Sterling & Wilson" }, P.tata, { name: "L&T" }, P.waaree],
    href: "/developers",
    desc: "Execution-sensitive, working-capital intensive.",
  },
  {
    id: "ipp",
    num: 7,
    name: "IPP / Developers",
    column: "deploy",
    capacity: "Own projects · 25-yr PPAs",
    heat: "fat",
    statusLabel: "EBITDA ~91% · levered",
    margin: "High EBITDA, levered; IRRs compress",
    players: [P.adaniGreen, P.ntpcGreen, P.jsw, P.acme],
    href: "/developers",
    desc: "AGEL ND/EBITDA ~7.4×. Equity IRRs mid-teens, falling.",
    gate: "SECI / NTPC auctions · ₹2.70–2.86/kWh",
  },
  {
    id: "grid",
    num: 8,
    name: "Grid & Transmission",
    column: "deploy",
    capacity: "Evacuation · ISTS",
    heat: "regulated",
    statusLabel: "REGULATED",
    margin: "Regulated returns",
    players: [{ name: "Powergrid" }, { name: "State transcos" }],
    href: "/trends",
    desc: "Bottleneck · curtailment constrains timelines.",
  },
  {
    id: "offtake",
    num: 9,
    name: "End Markets",
    column: "deploy",
    capacity: "Utility · C&I · rooftop",
    heat: "offtake",
    statusLabel: "OFFTAKE RISK",
    margin: "DISCOM credit is the binding constraint",
    players: [{ name: "DISCOMs" }, { name: "C&I open-access" }, { name: "PM Surya Ghar" }],
    href: "/tenders",
    desc: "Utility ~81% · C&I open-access growing · rooftop scaling.",
  },
];

export const VC_CALLOUTS: VcCallout[] = [
  {
    id: "bottleneck",
    kind: "warning",
    title: "Structural bottleneck",
    stat: "Cells ≈ ⅛ of module capacity",
    detail:
      "~27 GW cells vs ~210 GW modules. ALMM List-II forces domestic cells 1 Jun 2026; DCR premium runs ~2×.",
    href: "/manufacturing",
  },
  {
    id: "us",
    kind: "danger",
    title: "US off-ramp — blocked",
    stat: "~234% AD + CVD",
    detail:
      "CBP ruling: cash deposits up to 271.28% (Waaree). The US order books that drove the IPO boom are at risk.",
    href: "/trends",
  },
  {
    id: "bess",
    kind: "positive",
    title: "The next inflection",
    stat: "Solar + storage ₹2.86/kWh",
    detail:
      "Below ₹3 for the first time. Standalone BESS tariffs −35.6% YoY. Volume exploding; margin unproven.",
    href: "/profit-pools",
  },
];

/** Module ASP spread ($/W) — the DCR/non-DCR gap is the whole integration thesis. */
export const VC_ASP: VcAsp[] = [
  { label: "China FOB TOPCon", value: 0.088, display: "$0.088", note: "global benchmark" },
  { label: "China M10 cell", value: 0.04, display: "$0.040", note: "pre-AD" },
  { label: "India non-DCR", value: 0.155, display: "$0.155", note: "mostly Chinese cells" },
  {
    label: "India DCR",
    value: 0.289,
    display: "$0.289",
    note: "domestic cells · policy-protected",
    premium: true,
  },
];

export const VC_KEY_STATS: VcKeyStat[] = [
  { label: "Installed base", value: "150.26 GW", hint: "+44.61 GW FY26 · +87% YoY" },
  { label: "Polysilicon crash", value: "$39 → <$4.50", hint: "/kg · 2022 → end-2024 · below cash cost" },
  { label: "DCR premium", value: "~2×", hint: "$0.289 vs $0.155 /W · the integration thesis" },
  { label: "PLI disbursed", value: "₹0", hint: "of ₹24,000 cr · 56% module / 14% poly built" },
];
