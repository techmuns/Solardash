/**
 * Per-stage detail shown in the value-chain map's click-through popup:
 * market size (TAM), profit pool, the leading companies globally (by revenue /
 * size) and the players in India.
 *
 * FACT source: web research, Jun 2026 — Bernreuter Research · PV-Tech · InfoLink
 * · Wood Mackenzie · Mercom India · pv magazine · IEEFA · JMK · company filings.
 * Market-size ($) estimates vary widely by research firm and are volatile (esp.
 * after the 2022-24 price crash), so they are shown as indicative ("est.").
 */

export interface DetailCompany {
  name: string;
  /** A short metric or context (revenue, capacity, share, role). */
  note: string;
}

export interface StageDetail {
  /** Market-size / TAM headline. */
  tam: string;
  /** TAM context line. */
  tamSub?: string;
  /** Profit-pool characterisation. */
  profit: string;
  /** Profit-pool context line. */
  profitSub?: string;
  /** Top companies globally, by revenue / size. */
  global: DetailCompany[];
  /** Companies in India. */
  india: DetailCompany[];
  /** Sources note. */
  source: string;
}

export const STAGE_DETAIL: Record<string, StageDetail> = {
  poly: {
    tam: "~$18 bn global (2026e)",
    tamSub: "Spot prices crashed from ~$39/kg (2022) to <$5/kg (2024) on a deep supply glut.",
    profit: "Loss-making",
    profitSub: "Most producers ran below cash cost through 2024-25; severe overcapacity.",
    global: [
      { name: "Tongwei", note: "China · ~910 kt/yr · #1 (≈2× #2)" },
      { name: "GCL Technology", note: "China · ~480 kt/yr" },
      { name: "Daqo New Energy", note: "China · ~350 kt/yr" },
      { name: "Xinte Energy", note: "China · ~300 kt/yr" },
      { name: "Wacker Chemie", note: "Germany · ~80 kt · only Western top-10" },
    ],
    india: [
      { name: "Adani Enterprises", note: "Ramping — fully-integrated poly-to-module" },
      { name: "Reliance", note: "Under construction — Jamnagar giga-complex" },
    ],
    source:
      "Top 4 makers ≈ 65% of output. Bernreuter Research · PV-Tech · Mordor (2024-25). India ~100% imported today.",
  },
  wafer: {
    tam: "~$25 bn global (2024e)",
    tamSub: "China produces ~96.6% of the world's wafers — the most concentrated step.",
    profit: "Thin / loss-making",
    profitSub: "Overbuilt; LONGi & TCL Zhonghuan each posted >$0.4-0.7 bn net losses in H1-2024.",
    global: [
      { name: "LONGi Green Energy", note: "China · world's largest mono-wafer maker" },
      { name: "TCL Zhonghuan", note: "China · neck-and-neck #2" },
      { name: "JA Solar / Jinko", note: "China · integrated in-house wafering" },
    ],
    india: [
      { name: "Adani Enterprises", note: "Planned — integrated line" },
      { name: "Reliance", note: "Planned — Jamnagar" },
      { name: "Premier Energies", note: "Early-stage backward integration" },
    ],
    source:
      "The weakest domestic link — ALMM List-III (wafers) enforced from Jun 2028. PV-Tech · ITRPV · filings (2024).",
  },
  cell: {
    tam: "~$120 bn global (2024e)",
    tamSub: "The value-add step — where sunlight-to-electricity capability is created.",
    profit: "Expanding — India's new profit centre",
    profitSub:
      "TOPCon shift; ALMM List-II protects domestic cells from 1 Jun 2026. THE bottleneck — ~27 GW India cells vs ~210 GW modules.",
    global: [
      { name: "Tongwei Solar", note: "China · world's largest cell maker" },
      { name: "Aiko Solar", note: "China · back-contact (ABC) leader" },
      { name: "Runergy", note: "China · large merchant cell supplier" },
      { name: "JA Solar", note: "China · integrated" },
    ],
    india: [
      { name: "Waaree Energies", note: "Largest Indian cell+module maker" },
      { name: "Premier Energies", note: "EBITDA margin ~30%" },
      { name: "Websol Energy", note: "Pure-play cells & modules" },
      { name: "Adani Solar", note: "Integrated Mundra line" },
    ],
    source:
      "DCR premium ≈ 2× non-DCR. Mordor · PV-Tech; Munshot research (Jun 2026).",
  },
  module: {
    tam: "~$130 bn global (2024)",
    tamSub: "Top-10 makers shipped ~502 GW in 2024 (+22% YoY).",
    profit: "Squeezed / commoditised",
    profitSub:
      "Overbuilt — the top-10 collectively lost ~$4 bn in 2024 despite record shipments. India runs ~40-45% utilisation.",
    global: [
      { name: "JinkoSolar", note: "China · 92.9 GW shipped 2024 · #1" },
      { name: "LONGi", note: "China · 82.3 GW" },
      { name: "JA Solar", note: "China · 79.4 GW" },
      { name: "Trina Solar", note: "China · ~70 GW" },
      { name: "Canadian Solar", note: "Canada/China · top-6" },
    ],
    india: [
      { name: "Waaree Energies", note: "India's largest · ~12+ GW capacity" },
      { name: "Premier Energies", note: "#2 integrated maker" },
      { name: "Vikram Solar", note: "Listed module maker" },
      { name: "Adani Solar", note: "Integrated Mundra" },
      { name: "Tata Power Solar", note: "Legacy module + EPC" },
    ],
    source: "InfoLink · PV-Tech (2024); company filings.",
  },
  bos: {
    tam: "~589 GWac inverters shipped (2024)",
    tamSub: "Balance of System = inverters, trackers, mounting, cables, transformers — ~40-50% of plant cost.",
    profit: "Mixed",
    profitSub:
      "Inverters China-led (Huawei + Sungrow ≈ 55% share); trackers / mounting low-margin & competitive.",
    global: [
      { name: "Huawei", note: "China · 176 GWac · #1 inverters" },
      { name: "Sungrow", note: "China · 148 GWac · leads US/India/ME" },
      { name: "Ginlong Solis", note: "China · #3 inverters" },
      { name: "Growatt", note: "China · #4" },
      { name: "SMA Solar", note: "Germany · top Western inverter maker" },
    ],
    india: [
      { name: "Sungrow / Huawei", note: "Dominate inverter supply to India" },
      { name: "Waaree / Tata", note: "Trackers, mounting, cabling" },
    ],
    source: "9 of top-10 inverter vendors are Chinese. Wood Mackenzie · pv magazine (2024).",
  },
  epc: {
    tam: "India built ~25 GW solar in 2024 (record)",
    tamSub: "EPC = engineer, procure & construct the plant — the build layer.",
    profit: "Thin",
    profitSub:
      "Fixed ~5-10% margins (Sterling & Wilson gross ~10%); execution- & working-capital-intensive.",
    global: [
      { name: "PowerChina", note: "China · world's largest power EPC" },
      { name: "Larsen & Toubro", note: "India · 22 GWp renewable-EPC experience" },
      { name: "Sterling & Wilson", note: "India · global solar EPC" },
    ],
    india: [
      { name: "Jakson Green", note: "~20% share · #1 (2024)" },
      { name: "Tata Power Solar", note: "~13% share · 6.4 GW EPC base" },
      { name: "Sterling & Wilson Renewable", note: "Listed pure-play EPC" },
      { name: "L&T", note: "Large-project EPC" },
      { name: "Waaree Renewables", note: "Fast-growing EPC arm" },
    ],
    source: "Top-5 ≈ 48% of India EPC market. Mercom India (2024).",
  },
  ipp: {
    tam: "$2.1 trn global clean-energy capex (2024)",
    tamSub: "IPPs own plants and sell power under long PPAs (India ~25 years).",
    profit: "High EBITDA, levered",
    profitSub:
      "~85-90% EBITDA margins; equity IRRs mid-teens and compressing. AGEL net-debt/EBITDA ~7×.",
    global: [
      { name: "NextEra Energy", note: "US · world's largest renewables IPP" },
      { name: "Iberdrola", note: "Spain · global utility-developer" },
      { name: "Brookfield Renewable", note: "Canada · global platform" },
      { name: "TotalEnergies", note: "France · ~31 GW gross capacity" },
      { name: "State Power Investment Corp", note: "China · largest solar developer" },
    ],
    india: [
      { name: "Adani Green", note: "~17-19 GW operational · #1 (~29% share)" },
      { name: "ReNew", note: "~12.6 GW" },
      { name: "NTPC Green", note: ">10 GW · state-backed" },
      { name: "Tata Power / Avaada / JSW", note: "~7 GW each" },
      { name: "ACME Solar", note: "Listed pure-play IPP" },
    ],
    source: "Mercom India · BNEF · company filings (2024-25).",
  },
  gridPlant: {
    tam: "~80% of India's solar is utility-scale",
    tamSub: "Grid-connected plants auctioned by SECI / NTPC; winning tariffs ~₹2.5-2.9/kWh.",
    profit: "Auction-driven",
    profitSub:
      "Tariffs near record lows; returns hinge on cost of capital & execution. Grid evacuation / curtailment is the binding constraint.",
    global: [
      { name: "NextEra · Iberdrola", note: "Build & own utility-scale fleets" },
      { name: "State Power Investment Corp", note: "China · largest utility solar" },
    ],
    india: [
      { name: "Adani Green · NTPC Green", note: "Largest utility-scale owners" },
      { name: "ReNew · Avaada · Tata Power", note: "Major developers" },
      { name: "Jakson · Tata Power Solar · S&W", note: "Build them (EPC)" },
    ],
    source: "Mercom India · SECI (2024).",
  },
  rooftop: {
    tam: "India installed 7.1 GW rooftop in 2025 (+122% YoY)",
    tamSub: "PM Surya Ghar targets 30 GW residential / 10 m homes by FY27 (₹75,021 cr outlay).",
    profit: "Fast-growing, fragmented",
    profitSub:
      "Residential ≈ 76% of 2025 adds; thin installer margins; only ~23% of applications reach install (financing / approval bottlenecks).",
    global: [
      { name: "Sunrun", note: "US · residential rooftop leader" },
      { name: "Enphase", note: "US · microinverters / energy systems" },
      { name: "SunPower / Maxeon", note: "US · premium rooftop" },
    ],
    india: [
      { name: "Tata Power Solar", note: "Rooftop market leader" },
      { name: "Waaree / Luminous", note: "Residential kit & install" },
      { name: "CleanMax · Fourth Partner · Amplus", note: "C&I open-access rooftop" },
    ],
    source: "pv magazine · IEEFA · JMK Research (2025).",
  },

  // --- Untracked / contextual boxes (lighter) ---
  pvMaterials: {
    tam: "Thin-film ≈ 3-5% of global PV",
    tamSub: "CdTe / CIGS feedstock — the non-silicon route.",
    profit: "Niche",
    global: [{ name: "First Solar", note: "US · world's largest thin-film (CdTe) maker" }],
    india: [{ name: "—", note: "No domestic thin-film manufacturing base" }],
    source: "Industry estimates.",
  },
  substrate: {
    tam: "Thin-film deposition step",
    tamSub: "Glass / flexible substrate coated to form the cell — bypasses ingots & wafers.",
    profit: "Niche",
    global: [{ name: "First Solar", note: "US · integrated CdTe substrates" }],
    india: [{ name: "—", note: "Not manufactured in India at scale" }],
    source: "Industry estimates.",
  },
  solarGlass: {
    tam: "~$8-10 bn global (est.)",
    tamSub: "Tempered low-iron front glass — ~10-20% of a module's bill of materials.",
    profit: "Commoditised, China-led",
    global: [
      { name: "Xinyi Solar", note: "China · world's largest solar glass" },
      { name: "Flat Glass Group", note: "China · #2" },
    ],
    india: [{ name: "Borosil Renewables", note: "India's only major solar-glass maker" }],
    source: "Company filings; industry estimates.",
  },
  solarProducts: {
    tam: "Off-grid & consumer solar",
    tamSub: "Lanterns, lights, pumps and home systems — a large rural / social market in India.",
    profit: "Scheme-driven",
    global: [{ name: "Sun King · d.light", note: "Global off-grid solar majors" }],
    india: [
      { name: "Shakti Pumps", note: "Solar pumps — PM-KUSUM leader" },
      { name: "Sun King / d.light", note: "Off-grid lighting at scale" },
    ],
    source: "MNRE · PM-KUSUM.",
  },
  sysIntegration: {
    tam: "Rooftop & C&I integrators",
    tamSub: "Design, install and O&M for distributed solar.",
    profit: "Fragmented, thin",
    global: [{ name: "Sunrun · SunPower", note: "Residential integrators (US)" }],
    india: [
      { name: "Tata Power Solar", note: "Rooftop integration leader" },
      { name: "CleanMax · Fourth Partner · Amplus", note: "C&I integrators" },
    ],
    source: "Industry estimates.",
  },
  lanterns: {
    tam: "Off-grid lighting",
    tamSub: "Solar lanterns & home lighting for un/under-electrified households.",
    profit: "Social / volume",
    global: [{ name: "Sun King (Greenlight Planet)", note: "Largest off-grid solar brand" }],
    india: [
      { name: "Sun King · d.light", note: "Lead India / Africa off-grid lighting" },
    ],
    source: "Industry estimates.",
  },
  waterPumps: {
    tam: "PM-KUSUM ≈ 3.5 m pumps targeted",
    tamSub: "Solar irrigation pumps replacing diesel — a flagship rural scheme.",
    profit: "Scheme-driven",
    global: [{ name: "Grundfos · Lorentz", note: "Global solar-pump specialists" }],
    india: [
      { name: "Shakti Pumps", note: "India's solar-pump leader (PM-KUSUM)" },
      { name: "Tata Power · Oswal", note: "Other PM-KUSUM suppliers" },
    ],
    source: "MNRE · PM-KUSUM.",
  },
  otherProducts: {
    tam: "Specialty & consumer solar",
    tamSub: "Chargers, street-lights, telecom & niche applications.",
    profit: "Fragmented",
    global: [{ name: "Various", note: "Highly fragmented globally" }],
    india: [{ name: "Many SMEs", note: "Largely unorganised in India" }],
    source: "Industry estimates.",
  },
};
