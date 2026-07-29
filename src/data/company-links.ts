/**
 * Cross-section company linkage — everything the rest of the dashboard knows
 * about one listed company, resolved by slug.
 *
 * The feeds name the same company differently (the registry says "Adani Green
 * Energy", the IPP roster "Adani Green", the auction feed "Adani Green Energy
 * Ltd", the cell-capacity feed "Mundra (Adani)"), so matching is driven by an
 * explicit per-slug alias list rather than fuzzy string comparison — a wrong
 * match would silently attribute another company's capacity or auctions.
 */
import {
  getDevelopersSnapshot,
  getManufacturingSnapshot,
  getTendersSnapshot,
  getPolicySnapshot,
} from "@/data";
import { getValueChainIrr } from "@/data/profit-pools";
import type { CommissioningTranche, Developer, PpaRecord } from "@/data/types/developers";
import type { AwardRecord } from "@/data/types/tenders";
import type { CellPlayer, ModulePlayer, PliAwardee } from "@/data/types/manufacturing";
import type { CompanyValueCapture } from "@/data/profit-pools";

/**
 * Names each company appears under in the other feeds (IPP roster, auction
 * winners, commissioning tranches, cell/module capacity, PLI awards).
 * Matching is case-insensitive and exact against this list plus the registry
 * name itself. Only companies that actually appear elsewhere need an entry.
 */
const ALIASES: Record<string, string[]> = {
  "adani-green": ["Adani Green", "Adani Green Energy", "Mundra (Adani)", "Adani Solar", "Adani", "Adani (Adani Solar)"],
  "renew-energy": ["ReNew", "ReNew Energy Global", "ReNew Power", "ReNew Sun Waves", "ReNewSys"],
  "ntpc-green": ["NTPC Green", "NTPC Green Energy", "NTPC REL", "NTPC Renewable Energy"],
  ntpc: ["NTPC"],
  "tata-power": ["Tata Power", "Tata Power RE", "Tata Power Renewable Energy", "Tata Power Solar"],
  "jsw-energy": ["JSW Energy", "JSW Neo", "JSW Neo Energy", "JSW", "JSW Renewable Technologies"],
  cesc: ["CESC", "CESC (Purvah Green)", "Purvah Green", "Purvah Green Power"],
  "nlc-india": ["NLC India", "NLC India Renewables", "NLC"],
  sjvn: ["SJVN", "SJVN Green Energy"],
  nhpc: ["NHPC"],
  "torrent-power": ["Torrent Power", "Torrent Green", "Torrent Green Energy"],
  "acme-solar": ["ACME Solar", "ACME Solar Holdings", "ACME"],
  "kpi-green": ["KPI Green", "KPI Green Energy"],
  "orient-green-power": ["Orient Green Power"],
  "waaree-energies": ["Waaree", "Waaree Energies"],
  "waaree-renewable": ["Waaree Renewable", "Waaree Renewable Technologies"],
  "premier-energies": ["Premier", "Premier Energies"],
  "emmvee-photovoltaic": ["Emmvee", "Emmvee Photovoltaic Power"],
  "vikram-solar": ["Vikram Solar"],
  "saatvik-green": ["Saatvik", "Saatvik Green Energy"],
  "websol-energy": ["Websol", "Websol Energy Systems"],
  "solex-energy": ["Solex", "Solex Energy"],
  "alpex-solar": ["Alpex Solar"],
  "insolation-energy": ["Insolation Energy"],
  "onix-solar": ["Onix Solar", "Onix Solar Energy"],
  "swelect-energy": ["Swelect", "Swelect Energy Systems"],
  "borosil-renewables": ["Borosil Renewables"],
  "australian-premium-solar": ["Australian Premium Solar", "Australian Premium Solar (India)"],
  "servotech-power": ["Servotech", "Servotech Renewable Power"],
  "urja-global": ["Urja Global"],
  "surana-solar": ["Surana Solar"],
  "ujaas-energy": ["Ujaas Energy"],
  "sahaj-solar": ["Sahaj Solar"],
  "madhav-infra": ["Madhav Infra", "Madhav Infra Projects"],
  "waa-solar": ["Waa Solar"],
  "oriana-power": ["Oriana Power"],
  "kp-energy": ["K.P. Energy", "KP Energy"],
  "suzlon-energy": ["Suzlon", "Suzlon Energy"],
  "inox-wind": ["Inox Wind"],
  "inox-green": ["Inox Green", "Inox Green Energy Services"],
  "gensol-engineering": ["Gensol", "Gensol Engineering"],
  "sterling-wilson-re": ["Sterling & Wilson", "Sterling & Wilson Renewable Energy"],
};

/** All names a company may appear under, lower-cased. */
function namesFor(slug: string, registryName: string): Set<string> {
  const list = [registryName, ...(ALIASES[slug] ?? [])];
  return new Set(list.map((n) => n.trim().toLowerCase()));
}

const hit = (names: Set<string>, value?: string) =>
  Boolean(value && names.has(value.trim().toLowerCase()));

/** One auction this company won, with the MW attributed to it. */
export interface CompanyAward {
  award: AwardRecord;
  mw?: number;
}

/** Everything the other sections know about one company. */
export interface CompanyOperating {
  /** IPP roster row — operational / UC / pipeline / target GW + tech mix. */
  roster?: Developer;
  /** Guided-COD tranches with slippage. */
  commissioning: CommissioningTranche[];
  /** PPAs / PSAs signed. */
  ppas: PpaRecord[];
  /** Auctions won over the tenders window. */
  awards: CompanyAward[];
  awardMw: number;
  /** Cell / module nameplate capacity, where this company manufactures. */
  cell?: CellPlayer;
  module?: ModulePlayer;
  /** PLI capacity awarded across tranches. */
  pli?: PliAwardee;
  /** Value-capture IRR at this company's own EBITDA margin. */
  valueCapture?: CompanyValueCapture;
  /** Policy schemes that name this company in their impact note. */
  schemes: { scheme: string; category: string; status: string; effect: string }[];
  /** True when nothing outside the financials was found. */
  isEmpty: boolean;
}

/**
 * Resolve every cross-section operating metric for a company. Pure read over
 * the committed snapshots, so it runs at build time on the static page.
 */
export function getCompanyOperating(
  slug: string,
  registryName: string,
): CompanyOperating {
  const names = namesFor(slug, registryName);

  const dev = getDevelopersSnapshot().data;
  const roster = dev.roster.find((r) => hit(names, r.name));
  const commissioning = dev.commissioning.filter((t) => hit(names, t.developer));
  const ppas = dev.ppaTracker.filter((p) => hit(names, p.developer));

  const tenders = getTendersSnapshot().data;
  const awards: CompanyAward[] = [];
  for (const a of tenders.recentAwards) {
    const w = a.winners?.find((x) => hit(names, x.developer));
    if (w) awards.push({ award: a, mw: w.mw });
  }
  awards.sort((x, y) => y.award.date.localeCompare(x.award.date));
  const awardMw = awards.reduce((s, a) => s + (a.mw ?? 0), 0);

  const mfg = getManufacturingSnapshot().data;
  const cell = mfg.cellPlayers.find((p) => hit(names, p.player));
  const modulePlayer = mfg.modulePlayers.find((p) => hit(names, p.player));
  const pli = mfg.pliAwardees.find((p) => hit(names, p.company));
  const cellFabs = mfg.cellCommissioning.filter((t) => hit(names, t.developer));

  const valueCapture = getValueChainIrr().companies.find((c) => c.slug === slug);

  const schemes = getPolicySnapshot()
    .data.schemes.filter((s) => {
      const text = (s.companiesAffected ?? "").toLowerCase();
      return [...names].some((n) => n.length > 3 && text.includes(n));
    })
    .map((s) => ({
      scheme: s.scheme,
      category: s.category,
      status: s.status,
      effect: s.companiesAffected ?? "",
    }));

  const allCommissioning = [...commissioning, ...cellFabs];

  return {
    roster,
    commissioning: allCommissioning,
    ppas,
    awards,
    awardMw,
    cell,
    module: modulePlayer,
    pli,
    valueCapture,
    schemes,
    isEmpty:
      !roster &&
      allCommissioning.length === 0 &&
      ppas.length === 0 &&
      awards.length === 0 &&
      !cell &&
      !modulePlayer &&
      !pli &&
      !valueCapture &&
      schemes.length === 0,
  };
}
