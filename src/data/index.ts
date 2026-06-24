import type { Cadence, Snapshot, SourceRef } from "./types/core";
import type { OverviewData } from "./types/overview";
import type { ReferenceData } from "./types/reference";
import type { TendersData } from "./types/tenders";
import type { DevelopersData } from "./types/developers";
import type { ManufacturingData } from "./types/manufacturing";
import type { CapacityData, DemandData } from "./types/power";
import type { CompaniesData, CompanyDetail } from "./types/companies";
import type { PolicyData } from "./types/policy";
import type { WhatsNewData } from "./types/whats-new";
import overviewSummary from "./snapshots/overview/summary.json";
import tendersAwards from "./snapshots/tenders/awards.json";
import developersPortfolio from "./snapshots/developers/portfolio.json";
import manufacturingValueChain from "./snapshots/manufacturing/value-chain.json";
import capacityGrid from "./snapshots/capacity/grid.json";
import demandPower from "./snapshots/demand/power-demand.json";
import policyPolicy from "./snapshots/policy/policy.json";
import referenceGlossary from "./snapshots/reference/glossary.json";
import whatsNewMilestones from "./snapshots/whats-new/milestones.json";
import companiesRegistry from "./snapshots/companies/registry.json";
import detailWaaree from "./snapshots/companies/detail/waaree-energies.json";
import detailPremier from "./snapshots/companies/detail/premier-energies.json";
import detailVikram from "./snapshots/companies/detail/vikram-solar.json";
import detailWebsol from "./snapshots/companies/detail/websol-energy.json";
import detailSaatvik from "./snapshots/companies/detail/saatvik-green.json";
import detailAcme from "./snapshots/companies/detail/acme-solar.json";
import detailInsolation from "./snapshots/companies/detail/insolation-energy.json";
import detailAdaniGreen from "./snapshots/companies/detail/adani-green.json";
import detailNtpcGreen from "./snapshots/companies/detail/ntpc-green.json";
import detailJswEnergy from "./snapshots/companies/detail/jsw-energy.json";
import detailTataPower from "./snapshots/companies/detail/tata-power.json";

// Static map of per-company detail snapshots (add an entry per new company).
const COMPANY_DETAILS: Record<string, unknown> = {
  "waaree-energies": detailWaaree,
  "premier-energies": detailPremier,
  "vikram-solar": detailVikram,
  "websol-energy": detailWebsol,
  "saatvik-green": detailSaatvik,
  "acme-solar": detailAcme,
  "insolation-energy": detailInsolation,
  "adani-green": detailAdaniGreen,
  "ntpc-green": detailNtpcGreen,
  "jsw-energy": detailJswEnergy,
  "tata-power": detailTataPower,
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
