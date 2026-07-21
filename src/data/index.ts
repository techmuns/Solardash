import type { Cadence, Snapshot, SourceRef } from "./types/core";
import type { OverviewData } from "./types/overview";
import type { ReferenceData } from "./types/reference";
import type { TendersData } from "./types/tenders";
import type { DevelopersData } from "./types/developers";
import type { ManufacturingData } from "./types/manufacturing";
import type { CapacityData, DemandData } from "./types/power";
import type { CompaniesData, CompanyDetail } from "./types/companies";
import type { PolicyData } from "./types/policy";
import type {
  PriceHistoryData,
  StageEconomicsData,
  StageIrrConfigData,
} from "./types/profit-pools";
import type { WhatsNewData } from "./types/whats-new";
import overviewSummary from "./snapshots/overview/summary.json";
import tendersAwards from "./snapshots/tenders/awards.json";
import developersPortfolio from "./snapshots/developers/portfolio.json";
import manufacturingValueChain from "./snapshots/manufacturing/value-chain.json";
import capacityGrid from "./snapshots/capacity/grid.json";
import demandPower from "./snapshots/demand/power-demand.json";
import policyPolicy from "./snapshots/policy/policy.json";
import priceHistory from "./snapshots/profit-pools/price-history.json";
import stageEconomics from "./snapshots/profit-pools/stage-economics.json";
import valueChainIrr from "./snapshots/profit-pools/value-chain-irr.json";
import referenceGlossary from "./snapshots/reference/glossary.json";
import whatsNewMilestones from "./snapshots/whats-new/milestones.json";
import companiesRegistry from "./snapshots/companies/registry.json";
import detail_acme_solar from "./snapshots/companies/detail/acme-solar.json";
import detail_adani_green from "./snapshots/companies/detail/adani-green.json";
import detail_advait_energy from "./snapshots/companies/detail/advait-energy.json";
import detail_alpex_solar from "./snapshots/companies/detail/alpex-solar.json";
import detail_australian_premium_solar from "./snapshots/companies/detail/australian-premium-solar.json";
import detail_bf_utilities from "./snapshots/companies/detail/bf-utilities.json";
import detail_bondada_engineering from "./snapshots/companies/detail/bondada-engineering.json";
import detail_borosil_renewables from "./snapshots/companies/detail/borosil-renewables.json";
import detail_cesc from "./snapshots/companies/detail/cesc.json";
import detail_danish_power from "./snapshots/companies/detail/danish-power.json";
import detail_emmvee_photovoltaic from "./snapshots/companies/detail/emmvee-photovoltaic.json";
import detail_ganesh_green_bharat from "./snapshots/companies/detail/ganesh-green-bharat.json";
import detail_gensol_engineering from "./snapshots/companies/detail/gensol-engineering.json";
import detail_gre_renew from "./snapshots/companies/detail/gre-renew.json";
import detail_ind_renewable from "./snapshots/companies/detail/ind-renewable.json";
import detail_indowind_energy from "./snapshots/companies/detail/indowind-energy.json";
import detail_inox_green from "./snapshots/companies/detail/inox-green.json";
import detail_inox_wind from "./snapshots/companies/detail/inox-wind.json";
import detail_insolation_energy from "./snapshots/companies/detail/insolation-energy.json";
import detail_jsw_energy from "./snapshots/companies/detail/jsw-energy.json";
import detail_k2_infragen from "./snapshots/companies/detail/k2-infragen.json";
import detail_karma_energy from "./snapshots/companies/detail/karma-energy.json";
import detail_kaycee_energy from "./snapshots/companies/detail/kaycee-energy.json";
import detail_kp_energy from "./snapshots/companies/detail/kp-energy.json";
import detail_kp_green_engineering from "./snapshots/companies/detail/kp-green-engineering.json";
import detail_kpi_green from "./snapshots/companies/detail/kpi-green.json";
import detail_madhav_infra from "./snapshots/companies/detail/madhav-infra.json";
import detail_nhpc from "./snapshots/companies/detail/nhpc.json";
import detail_nlc_india from "./snapshots/companies/detail/nlc-india.json";
import detail_ntpc from "./snapshots/companies/detail/ntpc.json";
import detail_ntpc_green from "./snapshots/companies/detail/ntpc-green.json";
import detail_onix_solar from "./snapshots/companies/detail/onix-solar.json";
import detail_oriana_power from "./snapshots/companies/detail/oriana-power.json";
import detail_orient_green_power from "./snapshots/companies/detail/orient-green-power.json";
import detail_oswal_pumps from "./snapshots/companies/detail/oswal-pumps.json";
import detail_premier_energies from "./snapshots/companies/detail/premier-energies.json";
import detail_rajesh_power from "./snapshots/companies/detail/rajesh-power.json";
import detail_ravindra_energy from "./snapshots/companies/detail/ravindra-energy.json";
import detail_refex_renewables from "./snapshots/companies/detail/refex-renewables.json";
import detail_renew_energy from "./snapshots/companies/detail/renew-energy.json";
import detail_saatvik_green from "./snapshots/companies/detail/saatvik-green.json";
import detail_sahaj_solar from "./snapshots/companies/detail/sahaj-solar.json";
import detail_servotech_power from "./snapshots/companies/detail/servotech-power.json";
import detail_shakti_pumps from "./snapshots/companies/detail/shakti-pumps.json";
import detail_sjvn from "./snapshots/companies/detail/sjvn.json";
import detail_solarium_green from "./snapshots/companies/detail/solarium-green.json";
import detail_solarworld_energy from "./snapshots/companies/detail/solarworld-energy.json";
import detail_solex_energy from "./snapshots/companies/detail/solex-energy.json";
import detail_sterling_wilson_re from "./snapshots/companies/detail/sterling-wilson-re.json";
import detail_sungarner_energies from "./snapshots/companies/detail/sungarner-energies.json";
import detail_surana_solar from "./snapshots/companies/detail/surana-solar.json";
import detail_suzlon_energy from "./snapshots/companies/detail/suzlon-energy.json";
import detail_swelect_energy from "./snapshots/companies/detail/swelect-energy.json";
import detail_tata_power from "./snapshots/companies/detail/tata-power.json";
import detail_torrent_power from "./snapshots/companies/detail/torrent-power.json";
import detail_ujaas_energy from "./snapshots/companies/detail/ujaas-energy.json";
import detail_urja_global from "./snapshots/companies/detail/urja-global.json";
import detail_vikram_solar from "./snapshots/companies/detail/vikram-solar.json";
import detail_waa_solar from "./snapshots/companies/detail/waa-solar.json";
import detail_waaree_energies from "./snapshots/companies/detail/waaree-energies.json";
import detail_waaree_renewable from "./snapshots/companies/detail/waaree-renewable.json";
import detail_websol_energy from "./snapshots/companies/detail/websol-energy.json";
import detail_xl_energy from "./snapshots/companies/detail/xl-energy.json";
import detail_zodiac_energy from "./snapshots/companies/detail/zodiac-energy.json";

// Static map of per-company detail snapshots (add an entry per new company).
const COMPANY_DETAILS: Record<string, unknown> = {
  "acme-solar": detail_acme_solar,
  "adani-green": detail_adani_green,
  "advait-energy": detail_advait_energy,
  "alpex-solar": detail_alpex_solar,
  "australian-premium-solar": detail_australian_premium_solar,
  "bf-utilities": detail_bf_utilities,
  "bondada-engineering": detail_bondada_engineering,
  "borosil-renewables": detail_borosil_renewables,
  "cesc": detail_cesc,
  "danish-power": detail_danish_power,
  "emmvee-photovoltaic": detail_emmvee_photovoltaic,
  "ganesh-green-bharat": detail_ganesh_green_bharat,
  "gensol-engineering": detail_gensol_engineering,
  "gre-renew": detail_gre_renew,
  "ind-renewable": detail_ind_renewable,
  "indowind-energy": detail_indowind_energy,
  "inox-green": detail_inox_green,
  "inox-wind": detail_inox_wind,
  "insolation-energy": detail_insolation_energy,
  "jsw-energy": detail_jsw_energy,
  "k2-infragen": detail_k2_infragen,
  "karma-energy": detail_karma_energy,
  "kaycee-energy": detail_kaycee_energy,
  "kp-energy": detail_kp_energy,
  "kp-green-engineering": detail_kp_green_engineering,
  "kpi-green": detail_kpi_green,
  "madhav-infra": detail_madhav_infra,
  "nhpc": detail_nhpc,
  "nlc-india": detail_nlc_india,
  "ntpc": detail_ntpc,
  "ntpc-green": detail_ntpc_green,
  "onix-solar": detail_onix_solar,
  "oriana-power": detail_oriana_power,
  "orient-green-power": detail_orient_green_power,
  "oswal-pumps": detail_oswal_pumps,
  "premier-energies": detail_premier_energies,
  "rajesh-power": detail_rajesh_power,
  "ravindra-energy": detail_ravindra_energy,
  "refex-renewables": detail_refex_renewables,
  "renew-energy": detail_renew_energy,
  "saatvik-green": detail_saatvik_green,
  "sahaj-solar": detail_sahaj_solar,
  "servotech-power": detail_servotech_power,
  "shakti-pumps": detail_shakti_pumps,
  "sjvn": detail_sjvn,
  "solarium-green": detail_solarium_green,
  "solarworld-energy": detail_solarworld_energy,
  "solex-energy": detail_solex_energy,
  "sterling-wilson-re": detail_sterling_wilson_re,
  "sungarner-energies": detail_sungarner_energies,
  "surana-solar": detail_surana_solar,
  "suzlon-energy": detail_suzlon_energy,
  "swelect-energy": detail_swelect_energy,
  "tata-power": detail_tata_power,
  "torrent-power": detail_torrent_power,
  "ujaas-energy": detail_ujaas_energy,
  "urja-global": detail_urja_global,
  "vikram-solar": detail_vikram_solar,
  "waa-solar": detail_waa_solar,
  "waaree-energies": detail_waaree_energies,
  "waaree-renewable": detail_waaree_renewable,
  "websol-energy": detail_websol_energy,
  "xl-energy": detail_xl_energy,
  "zodiac-energy": detail_zodiac_energy,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a snapshot's envelope and return it typed. Throws on schema drift
 * (e.g. a hand-edited snapshot missing required fields) so a broken dataset
 * fails the build instead of rendering silently-wrong UI.
 */
function assertSnapshot<T>(snapshot: Snapshot<T>, id: string): Snapshot<T> {
  const problems: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    problems.push("not an object");
  } else {
    if (!snapshot.dataset) problems.push("missing dataset");
    if (!snapshot.section) problems.push("missing section");
    if (!ISO_DATE.test(snapshot.asOf ?? "")) problems.push("asOf not ISO");
    if (!ISO_DATE.test(snapshot.updatedAt ?? "")) {
      problems.push("updatedAt not ISO");
    }
    if (!Array.isArray(snapshot.sources) || snapshot.sources.length === 0) {
      problems.push("sources must be a non-empty array");
    }
    if (snapshot.data == null) problems.push("missing data");
  }
  if (problems.length > 0) {
    throw new Error(`[data] snapshot "${id}" failed validation: ${problems.join(", ")}`);
  }
  return snapshot;
}

/** Overview headline KPIs + quarterly RE additions. */
export function getOverviewSnapshot(): Snapshot<OverviewData> {
  return assertSnapshot(
    overviewSummary as unknown as Snapshot<OverviewData>,
    "overview/summary",
  );
}

/** Tenders & auctions — awarded MW, tariffs, mix, leaderboard, recent awards. */
export function getTendersSnapshot(): Snapshot<TendersData> {
  return assertSnapshot(
    tendersAwards as unknown as Snapshot<TendersData>,
    "tenders/awards",
  );
}

/** Developers / IPPs — capacity funnel, portfolio mix, PPA funnel & tracker. */
export function getDevelopersSnapshot(): Snapshot<DevelopersData> {
  return assertSnapshot(
    developersPortfolio as unknown as Snapshot<DevelopersData>,
    "developers/portfolio",
  );
}

/** Manufacturing — cell/module players, modelled production, demand, value chain. */
export function getManufacturingSnapshot(): Snapshot<ManufacturingData> {
  return assertSnapshot(
    manufacturingValueChain as unknown as Snapshot<ManufacturingData>,
    "manufacturing/value-chain",
  );
}

/** Capacity & Generation — commissioning, installed mix, solar segments, states. */
export function getCapacitySnapshot(): Snapshot<CapacityData> {
  return assertSnapshot(
    capacityGrid as unknown as Snapshot<CapacityData>,
    "capacity/grid",
  );
}

/** Power Demand — monthly peak & energy, m/q/y YoY growth, demand drivers. */
export function getDemandSnapshot(): Snapshot<DemandData> {
  return assertSnapshot(
    demandPower as unknown as Snapshot<DemandData>,
    "demand/power-demand",
  );
}

/** Policy & Pricing — schemes, flagship progress, localisation, BESS curve, TAM. */
export function getPolicySnapshot(): Snapshot<PolicyData> {
  return assertSnapshot(
    policyPolicy as unknown as Snapshot<PolicyData>,
    "policy/policy",
  );
}

/** Global PV price stack — poly/wafer/cell/module native-unit annual prices. */
export function getPriceHistorySnapshot(): Snapshot<PriceHistoryData> {
  return assertSnapshot(
    priceHistory as unknown as Snapshot<PriceHistoryData>,
    "profit-pools/price-history",
  );
}

/** Per-stage margin & direction benchmark (the sourced pack). */
export function getStageEconomicsSnapshot(): Snapshot<StageEconomicsData> {
  return assertSnapshot(
    stageEconomics as unknown as Snapshot<StageEconomicsData>,
    "profit-pools/stage-economics",
  );
}

/** Structural config for the greenfield-IRR model (prices derived at render). */
export function getStageIrrConfigSnapshot(): Snapshot<StageIrrConfigData> {
  return assertSnapshot(
    valueChainIrr as unknown as Snapshot<StageIrrConfigData>,
    "profit-pools/value-chain-irr",
  );
}

/** Listed-company screener registry (all companies). */
export function getCompaniesSnapshot(): Snapshot<CompaniesData> {
  return assertSnapshot(
    companiesRegistry as unknown as Snapshot<CompaniesData>,
    "companies/registry",
  );
}

/** Full per-company model, or null when the slug is unknown. */
export function getCompanyDetail(slug: string): Snapshot<CompanyDetail> | null {
  const raw = COMPANY_DETAILS[slug];
  if (!raw) return null;
  return assertSnapshot(
    raw as unknown as Snapshot<CompanyDetail>,
    `companies/detail/${slug}`,
  );
}

/** All company slugs in registry order (for generateStaticParams in Prompt 8). */
export function getCompanySlugs(): string[] {
  return getCompaniesSnapshot().data.companies.map((c) => c.slug);
}

/** Reference glossary snapshot. */
export function getReferenceSnapshot(): Snapshot<ReferenceData> {
  return assertSnapshot(
    referenceGlossary as unknown as Snapshot<ReferenceData>,
    "reference/glossary",
  );
}

/** Sector glossary terms. */
export function getGlossary() {
  return getReferenceSnapshot().data.glossary;
}

/** Curated "What's New" milestones snapshot. */
export function getWhatsNewSnapshot(): Snapshot<WhatsNewData> {
  return assertSnapshot(
    whatsNewMilestones as unknown as Snapshot<WhatsNewData>,
    "whats-new/milestones",
  );
}

/** One provenance row per committed snapshot envelope. */
export interface ProvenanceRow {
  section: string;
  dataset: string;
  cadence: Cadence;
  asOf: string;
  updatedAt: string;
  sources: SourceRef[];
}

/**
 * Flat provenance across every section snapshot — self-maintaining: it reflects
 * whatever each loader currently reads, so it updates automatically when feeds
 * (and thus snapshots) change.
 */
export function getProvenance(): ProvenanceRow[] {
  const snapshots: Snapshot<unknown>[] = [
    getOverviewSnapshot(),
    getTendersSnapshot(),
    getDevelopersSnapshot(),
    getManufacturingSnapshot(),
    getCapacitySnapshot(),
    getDemandSnapshot(),
    getCompaniesSnapshot(),
    getPolicySnapshot(),
    getPriceHistorySnapshot(),
    getStageEconomicsSnapshot(),
    getStageIrrConfigSnapshot(),
    getReferenceSnapshot(),
  ];
  return snapshots.map((s) => ({
    section: s.section,
    dataset: s.dataset,
    cadence: s.cadence,
    asOf: s.asOf,
    updatedAt: s.updatedAt,
    sources: s.sources,
  }));
}
