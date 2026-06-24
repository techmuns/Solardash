import { NAV_ITEMS } from "@/components/layout/nav";
import {
  getCompaniesSnapshot,
  getDevelopersSnapshot,
  getTendersSnapshot,
} from "@/data";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";

/** The kind of thing a search hit points at (drives its icon + group). */
export type SearchEntryType = "section" | "company" | "developer" | "tender";

/**
 * One row in the command-palette index. Plain, serialisable data so the index
 * can be built server-side (at build time) and handed to the client palette as
 * a prop — no client-side recomputation, static-export friendly.
 */
export interface SearchEntry {
  id: string;
  label: string;
  sublabel?: string;
  type: SearchEntryType;
  href: string;
  /** Extra match terms (lowercased) beyond the label — tickers, tech, etc. */
  keywords: string[];
}

const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "per",
  "from",
  "into",
  "via",
]);

/** Split free text into lowercase keyword tokens (drop punctuation & noise). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Curated synonyms per section, layered on top of the nav description so common
 * sector terms resolve to the right page (e.g. "rooftop" → Capacity, "tariff" →
 * Tenders) even when the description doesn't spell them out verbatim.
 */
const SECTION_KEYWORDS: Record<string, string[]> = {
  "/": ["overview", "summary", "dashboard", "home"],
  "/tenders": ["tariff", "auction", "bid", "seci", "ntpc", "ppa", "pipeline"],
  "/developers": ["ipp", "developer", "portfolio", "pipeline", "operational"],
  "/capacity": ["rooftop", "utility", "installed", "plf", "cuf", "generation", "grid"],
  "/demand": ["peak", "energy", "load", "deficit", "consumption"],
  "/manufacturing": ["module", "cell", "wafer", "almm", "dcr", "pli", "polysilicon"],
  "/companies": ["stock", "screener", "valuation", "financials", "listed", "equity"],
  "/policy": ["scheme", "regulation", "subsidy", "pricing", "bcd", "localisation"],
  "/data-sources": ["methodology", "provenance", "confidence", "cadence", "definitions"],
};

/** Build the full, deterministic command-palette index from the snapshots. */
export function getSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  // --- Sections (from NAV_ITEMS, in nav order) ---
  for (const item of NAV_ITEMS) {
    const fromDescription = item.description ? tokenize(item.description) : [];
    const curated = SECTION_KEYWORDS[item.href] ?? [];
    const keywords = [...new Set([...fromDescription, ...curated])];
    entries.push({
      id: `section:${item.href}`,
      label: item.label,
      sublabel: "Section",
      type: "section",
      href: item.href,
      keywords,
    });
  }

  // --- Companies (registry order) ---
  for (const c of getCompaniesSnapshot().data.companies) {
    const ticker = c.tickerNse ?? c.tickerBse;
    const sublabel = [ticker, c.type].filter(Boolean).join(" · ");
    const keywords = [ticker, c.type, c.technology, "stock", "company"]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.toLowerCase());
    entries.push({
      id: `company:${c.slug}`,
      label: c.name,
      sublabel,
      type: "company",
      href: `/companies/${c.slug}`,
      keywords: [...new Set(keywords)],
    });
  }

  // --- Developers (roster order: operational GW desc) ---
  for (const d of getDevelopersSnapshot().data.roster) {
    const tech: string[] = [];
    if (d.mix.solar > 0) tech.push("solar");
    if (d.mix.wind > 0) tech.push("wind");
    if (d.mix.hybrid > 0) tech.push("hybrid");
    if (d.mix.fdre > 0) tech.push("fdre");
    if (d.mix.bessGwh > 0) tech.push("bess");
    entries.push({
      id: `developer:${slug(d.name)}`,
      label: d.name,
      sublabel: `Developer · ${d.operationalGw} GW`,
      type: "developer",
      href: "/developers",
      keywords: [...new Set(["developer", "ipp", ...tech])],
    });
  }

  // --- Tenders (top ~12 most-recent awards) ---
  for (const a of getTendersSnapshot().data.recentAwards.slice(0, 12)) {
    const typeLabel = TENDER_TYPE_LABELS[a.tenderType] ?? a.tenderType;
    entries.push({
      id: `tender:${a.id}`,
      label: `${a.agency} ${typeLabel}`,
      sublabel: `${a.period} · ${a.capacityMw} MW`,
      type: "tender",
      href: "/tenders",
      keywords: [...new Set([a.agency, a.tenderType, a.period, "auction", "tender"].map((v) => v.toLowerCase()))],
    });
  }

  return entries;
}
